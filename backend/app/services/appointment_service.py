from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.db import models
from app.db.enums import RecordStatus
from app.prompts import appointment as appointment_prompt
from app.schemas.ai_outputs import AppointmentExtraction
from app.schemas.appointments import AppointmentCreate
from app.services.activity_service import log_activity
from app.services.ai_service import AIError, AIService
from app.services.status_service import apply_transition

ENTITY_TYPE = "appointment_request"


def create_appointment(db: Session, data: AppointmentCreate) -> models.AppointmentRequest:
    record = models.AppointmentRequest(
        source_type=data.source_type,
        source_text=data.source_text,
        status=RecordStatus.DRAFT,
    )
    db.add(record)
    db.flush()
    log_activity(
        db,
        entity_type=ENTITY_TYPE,
        entity_id=record.id,
        action="created",
        to_status=RecordStatus.DRAFT,
        summary=f"Appointment request created from {data.source_type.value} input",
    )
    db.commit()
    db.refresh(record)
    return record


def list_appointments(
    db: Session, *, status: RecordStatus | None = None, limit: int = 50
) -> list[models.AppointmentRequest]:
    statement = select(models.AppointmentRequest)
    if status:
        statement = statement.where(models.AppointmentRequest.status == status)
    statement = statement.order_by(models.AppointmentRequest.created_at.desc()).limit(limit)
    return list(db.scalars(statement))


def get_appointment(db: Session, appointment_id: str) -> models.AppointmentRequest:
    record = db.get(models.AppointmentRequest, appointment_id)
    if record is None:
        raise AppError("NOT_FOUND", "Appointment request not found.", 404)
    return record


def cancel_appointment(db: Session, appointment_id: str) -> models.AppointmentRequest:
    record = get_appointment(db, appointment_id)
    apply_transition(
        db,
        record,
        RecordStatus.CANCELLED,
        entity_type=ENTITY_TYPE,
        action="cancelled",
        summary="Appointment request cancelled",
    )
    db.commit()
    db.refresh(record)
    return record


# ---------- AI generation ----------


def _run_ai_extraction(
    db: Session,
    record: models.AppointmentRequest,
    ai: AIService,
    today: date | None = None,
) -> models.AppointmentRequest:
    """Run Gemini on a record: processing -> awaiting_review, or -> failed."""
    apply_transition(
        db,
        record,
        RecordStatus.PROCESSING,
        entity_type=ENTITY_TYPE,
        action="ai_started",
        summary="AI extraction started",
    )
    db.commit()

    try:
        result, metadata = ai.generate(
            schema=AppointmentExtraction,
            system_instruction=appointment_prompt.SYSTEM_INSTRUCTION,
            prompt=appointment_prompt.build_prompt(record.source_text, today or date.today()),
        )
    except AIError as error:
        error_code = getattr(error, "code", "AI_ERROR")
        record.error_message = getattr(error, "message", "AI processing failed. Please try again.")
        apply_transition(
            db,
            record,
            RecordStatus.FAILED,
            entity_type=ENTITY_TYPE,
            action="ai_failed",
            summary=f"AI extraction failed ({error_code})",
        )
        db.commit()
        raise

    metadata["prompt_version"] = appointment_prompt.PROMPT_VERSION
    record.draft_content = result.model_dump(mode="json")
    record.ai_model = metadata["model"]
    record.ai_metadata = metadata
    record.error_message = None
    apply_transition(
        db,
        record,
        RecordStatus.AWAITING_REVIEW,
        entity_type=ENTITY_TYPE,
        action="ai_completed",
        summary="AI draft ready for review",
    )
    db.commit()
    db.refresh(record)
    return record


def generate_appointment(
    db: Session, data: AppointmentCreate, ai: AIService, today: date | None = None
) -> models.AppointmentRequest:
    """Save the note, then run AI extraction on it."""
    record = create_appointment(db, data)
    return _run_ai_extraction(db, record, ai, today)


def retry_appointment(
    db: Session, appointment_id: str, ai: AIService, today: date | None = None
) -> models.AppointmentRequest:
    """Re-run AI on a failed or awaiting_review record."""
    record = get_appointment(db, appointment_id)
    return _run_ai_extraction(db, record, ai, today)


# ---------- Review and approval ----------


def update_appointment_draft(
    db: Session, appointment_id: str, draft: AppointmentExtraction
) -> models.AppointmentRequest:
    """Save a reviewer's edits. Only allowed while the record awaits review."""
    record = get_appointment(db, appointment_id)
    if record.status != RecordStatus.AWAITING_REVIEW:
        raise AppError("NOT_EDITABLE", "Only drafts that are awaiting review can be edited.", 409)
    record.draft_content = draft.model_dump(mode="json")
    log_activity(
        db,
        entity_type=ENTITY_TYPE,
        entity_id=record.id,
        action="edited",
        summary="Appointment draft edited by reviewer",
    )
    db.commit()
    db.refresh(record)
    return record


def approve_appointment(db: Session, appointment_id: str) -> models.AppointmentRequest:
    """Copy the reviewed draft into approved_content. This does not book an appointment."""
    record = get_appointment(db, appointment_id)
    if record.draft_content is None:
        raise AppError("NOTHING_TO_APPROVE", "There is no draft to approve.", 409)
    apply_transition(
        db,
        record,
        RecordStatus.APPROVED,
        entity_type=ENTITY_TYPE,
        action="approved",
        summary="Appointment request approved",
    )
    record.approved_content = dict(record.draft_content)
    record.approved_at = models.utcnow()
    db.commit()
    db.refresh(record)
    return record


def reject_appointment(db: Session, appointment_id: str) -> models.AppointmentRequest:
    record = get_appointment(db, appointment_id)
    apply_transition(
        db,
        record,
        RecordStatus.REJECTED,
        entity_type=ENTITY_TYPE,
        action="rejected",
        summary="Appointment request rejected",
    )
    db.commit()
    db.refresh(record)
    return record