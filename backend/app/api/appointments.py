from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.enums import RecordStatus
from app.db.session import get_db
from app.schemas.appointments import AppointmentCreate, AppointmentDraftUpdate, AppointmentRead
from app.services import appointment_service
from app.services.ai_service import AIService, get_ai_service

router = APIRouter(prefix="/api/v1/appointments", tags=["appointments"])


@router.post("", response_model=AppointmentRead, status_code=201)
def create_appointment(payload: AppointmentCreate, db: Session = Depends(get_db)):
    return appointment_service.create_appointment(db, payload)


@router.get("", response_model=list[AppointmentRead])
def list_appointments(
    status_filter: RecordStatus | None = Query(default=None, alias="status"),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    return appointment_service.list_appointments(db, status=status_filter, limit=limit)


@router.post("/generate", response_model=AppointmentRead, status_code=201)
def generate_appointment(
    payload: AppointmentCreate,
    db: Session = Depends(get_db),
    ai: AIService = Depends(get_ai_service),
):
    """Save the note and run AI extraction. Returns the draft for review."""
    return appointment_service.generate_appointment(db, payload, ai)


@router.get("/{appointment_id}", response_model=AppointmentRead)
def get_appointment(appointment_id: UUID, db: Session = Depends(get_db)):
    return appointment_service.get_appointment(db, str(appointment_id))


@router.patch("/{appointment_id}", response_model=AppointmentRead)
def update_appointment(appointment_id: UUID, payload: AppointmentDraftUpdate, db: Session = Depends(get_db)):
    """Save reviewer edits to the draft. Only allowed while awaiting review."""
    return appointment_service.update_appointment_draft(db, str(appointment_id), payload.draft_content)


@router.post("/{appointment_id}/approve", response_model=AppointmentRead)
def approve_appointment(appointment_id: UUID, db: Session = Depends(get_db)):
    """Approve the reviewed draft. This records the request; it does not book an appointment."""
    return appointment_service.approve_appointment(db, str(appointment_id))


@router.post("/{appointment_id}/reject", response_model=AppointmentRead)
def reject_appointment(appointment_id: UUID, db: Session = Depends(get_db)):
    return appointment_service.reject_appointment(db, str(appointment_id))


@router.post("/{appointment_id}/cancel", response_model=AppointmentRead)
def cancel_appointment(appointment_id: UUID, db: Session = Depends(get_db)):
    return appointment_service.cancel_appointment(db, str(appointment_id))


@router.post("/{appointment_id}/retry", response_model=AppointmentRead)
def retry_appointment(
    appointment_id: UUID,
    db: Session = Depends(get_db),
    ai: AIService = Depends(get_ai_service),
):
    """Re-run AI on a failed or awaiting-review request."""
    return appointment_service.retry_appointment(db, str(appointment_id), ai)