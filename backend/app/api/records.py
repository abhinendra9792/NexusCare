from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, selectinload

from app.core.emergency import may_be_emergency
from app.db import models
from app.db.enums import RecordStatus
from app.db.session import get_db
from app.prompts import service_request as service_prompt
from app.prompts import visit_summary as visit_prompt
from app.schemas.ai_outputs import ServiceClassification, VisitSummaryDraft
from app.schemas.records import (
    CarePlanCreate,
    CarePlanRead,
    ServiceRequestCreate,
    ServiceRequestRead,
    VisitSummaryCreate,
    VisitSummaryRead,
)
from app.services import record_service as svc
from app.services.ai_service import AIService, get_ai_service

StatusFilter = Query(default=None, alias="status")
Limit = Query(default=50, ge=1, le=200)

# ---------- Visit summaries ----------
visit_summaries_router = APIRouter(prefix="/api/v1/visit-summaries", tags=["visit summaries"])
VISIT = {"entity_type": "visit_summary", "label": "Visit summary"}


@visit_summaries_router.post("", response_model=VisitSummaryRead, status_code=201)
def create_visit_summary(payload: VisitSummaryCreate, db: Session = Depends(get_db)):
    return svc.create_record(db, models.VisitSummary(source_text=payload.source_text), **VISIT)


@visit_summaries_router.get("", response_model=list[VisitSummaryRead])
def list_visit_summaries(status_filter: RecordStatus | None = StatusFilter, limit: int = Limit, db: Session = Depends(get_db)):
    return svc.list_records(db, models.VisitSummary, status=status_filter, limit=limit)


@visit_summaries_router.get("/{record_id}", response_model=VisitSummaryRead)
def get_visit_summary(record_id: UUID, db: Session = Depends(get_db)):
    return svc.get_record(db, models.VisitSummary, str(record_id), label=VISIT["label"])


@visit_summaries_router.post("/{record_id}/cancel", response_model=VisitSummaryRead)
def cancel_visit_summary(record_id: UUID, db: Session = Depends(get_db)):
    return svc.cancel_record(db, models.VisitSummary, str(record_id), **VISIT)


def _run_visit_ai(db: Session, record: models.VisitSummary, ai: AIService) -> models.VisitSummary:
    return svc.run_ai_generation(
        db,
        record,
        ai,
        schema=VisitSummaryDraft,
        system_instruction=visit_prompt.SYSTEM_INSTRUCTION,
        prompt=visit_prompt.build_prompt(record.source_text, date.today()),
        prompt_version=visit_prompt.PROMPT_VERSION,
        **VISIT,
    )


@visit_summaries_router.post("/generate", response_model=VisitSummaryRead, status_code=201)
def generate_visit_summary(
    payload: VisitSummaryCreate,
    db: Session = Depends(get_db),
    ai: AIService = Depends(get_ai_service),
):
    record = svc.create_record(db, models.VisitSummary(source_text=payload.source_text), **VISIT)
    return _run_visit_ai(db, record, ai)


@visit_summaries_router.post("/{record_id}/retry", response_model=VisitSummaryRead)
def retry_visit_summary(
    record_id: UUID,
    db: Session = Depends(get_db),
    ai: AIService = Depends(get_ai_service),
):
    record = svc.get_record(db, models.VisitSummary, str(record_id), label=VISIT["label"])
    return _run_visit_ai(db, record, ai)


# ---------- Service requests ----------
service_requests_router = APIRouter(prefix="/api/v1/service-requests", tags=["service requests"])
SERVICE = {"entity_type": "service_request", "label": "Service request"}


def _new_service_request(db: Session, source_text: str) -> models.ServiceRequest:
    """Save the inquiry. The emergency keyword check always runs before any AI call."""
    flagged = may_be_emergency(source_text)
    record = models.ServiceRequest(source_text=source_text, possible_emergency=flagged)
    summary = "Service request created (possible emergency flagged)" if flagged else "Service request created"
    return svc.create_record(db, record, summary=summary, **SERVICE)


def _store_service_result(record: models.ServiceRequest, result: ServiceClassification) -> None:
    record.draft_content = result.model_dump(mode="json")
    # The AI may raise the emergency flag, but can never clear a keyword flag.
    if result.possible_emergency:
        record.possible_emergency = True


def _run_service_ai(db: Session, record: models.ServiceRequest, ai: AIService) -> models.ServiceRequest:
    return svc.run_ai_generation(
        db,
        record,
        ai,
        schema=ServiceClassification,
        system_instruction=service_prompt.SYSTEM_INSTRUCTION,
        prompt=service_prompt.build_prompt(record.source_text, date.today()),
        prompt_version=service_prompt.PROMPT_VERSION,
        apply_result=_store_service_result,
        **SERVICE,
    )


@service_requests_router.post("", response_model=ServiceRequestRead, status_code=201)
def create_service_request(payload: ServiceRequestCreate, db: Session = Depends(get_db)):
    return _new_service_request(db, payload.source_text)


@service_requests_router.post("/generate", response_model=ServiceRequestRead, status_code=201)
def generate_service_request(
    payload: ServiceRequestCreate,
    db: Session = Depends(get_db),
    ai: AIService = Depends(get_ai_service),
):
    record = _new_service_request(db, payload.source_text)
    return _run_service_ai(db, record, ai)


@service_requests_router.get("", response_model=list[ServiceRequestRead])
def list_service_requests(status_filter: RecordStatus | None = StatusFilter, limit: int = Limit, db: Session = Depends(get_db)):
    return svc.list_records(db, models.ServiceRequest, status=status_filter, limit=limit)


@service_requests_router.get("/{record_id}", response_model=ServiceRequestRead)
def get_service_request(record_id: UUID, db: Session = Depends(get_db)):
    return svc.get_record(db, models.ServiceRequest, str(record_id), label=SERVICE["label"])


@service_requests_router.post("/{record_id}/cancel", response_model=ServiceRequestRead)
def cancel_service_request(record_id: UUID, db: Session = Depends(get_db)):
    return svc.cancel_record(db, models.ServiceRequest, str(record_id), **SERVICE)


@service_requests_router.post("/{record_id}/retry", response_model=ServiceRequestRead)
def retry_service_request(
    record_id: UUID,
    db: Session = Depends(get_db),
    ai: AIService = Depends(get_ai_service),
):
    record = svc.get_record(db, models.ServiceRequest, str(record_id), label=SERVICE["label"])
    return _run_service_ai(db, record, ai)


# ---------- Care plans ----------
care_plans_router = APIRouter(prefix="/api/v1/care-plans", tags=["care plans"])
CARE = {"entity_type": "care_plan", "label": "Care plan"}
WITH_TASKS = [selectinload(models.CarePlan.tasks)]


def _with_tasks(plan: models.CarePlan) -> models.CarePlan:
    _ = plan.tasks  # load tasks while the database session is still open
    return plan


@care_plans_router.post("", response_model=CarePlanRead, status_code=201)
def create_care_plan(payload: CarePlanCreate, db: Session = Depends(get_db)):
    plan = models.CarePlan(source_text=payload.source_text, title=payload.title)
    return _with_tasks(svc.create_record(db, plan, **CARE))


@care_plans_router.get("", response_model=list[CarePlanRead])
def list_care_plans(status_filter: RecordStatus | None = StatusFilter, limit: int = Limit, db: Session = Depends(get_db)):
    return svc.list_records(db, models.CarePlan, status=status_filter, limit=limit, options=WITH_TASKS)


@care_plans_router.get("/{record_id}", response_model=CarePlanRead)
def get_care_plan(record_id: UUID, db: Session = Depends(get_db)):
    return svc.get_record(db, models.CarePlan, str(record_id), label=CARE["label"], options=WITH_TASKS)


@care_plans_router.post("/{record_id}/cancel", response_model=CarePlanRead)
def cancel_care_plan(record_id: UUID, db: Session = Depends(get_db)):
    return _with_tasks(svc.cancel_record(db, models.CarePlan, str(record_id), options=WITH_TASKS, **CARE))