from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.db import models
from app.db.enums import RecordStatus
from app.schemas.appointments import AppointmentCreate
from app.services.activity_service import log_activity
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
