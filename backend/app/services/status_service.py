from sqlalchemy.orm import Session

from app.core.transitions import ensure_transition
from app.db.enums import RecordStatus
from app.services.activity_service import log_activity


def apply_transition(
    db: Session,
    record,
    target: RecordStatus,
    *,
    entity_type: str,
    action: str,
    summary: str,
) -> None:
    """Validate a status change, apply it, and record it in the activity log."""
    current = RecordStatus(record.status)
    ensure_transition(current, target)
    record.status = target
    log_activity(
        db,
        entity_type=entity_type,
        entity_id=record.id,
        action=action,
        from_status=current,
        to_status=target,
        summary=summary,
    )
