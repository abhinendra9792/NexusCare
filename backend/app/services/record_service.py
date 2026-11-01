from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.db.enums import RecordStatus
from app.services.activity_service import log_activity
from app.services.status_service import apply_transition


def create_record(db: Session, record, *, entity_type: str, label: str, summary: str | None = None):
    record.status = RecordStatus.DRAFT
    db.add(record)
    db.flush()
    log_activity(
        db,
        entity_type=entity_type,
        entity_id=record.id,
        action="created",
        to_status=RecordStatus.DRAFT,
        summary=summary or f"{label} created",
    )
    db.commit()
    db.refresh(record)
    return record


def list_records(db: Session, model, *, status: RecordStatus | None = None, limit: int = 50, options: Sequence = ()):
    statement = select(model).options(*options)
    if status:
        statement = statement.where(model.status == status)
    statement = statement.order_by(model.created_at.desc()).limit(limit)
    return list(db.scalars(statement))


def get_record(db: Session, model, record_id: str, *, label: str, options: Sequence = ()):
    record = db.get(model, record_id, options=list(options))
    if record is None:
        raise AppError("NOT_FOUND", f"{label} not found.", 404)
    return record


def cancel_record(db: Session, model, record_id: str, *, entity_type: str, label: str, options: Sequence = ()):
    record = get_record(db, model, record_id, label=label, options=options)
    apply_transition(
        db,
        record,
        RecordStatus.CANCELLED,
        entity_type=entity_type,
        action="cancelled",
        summary=f"{label} cancelled",
    )
    db.commit()
    db.refresh(record)
    return record