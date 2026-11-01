from collections.abc import Callable, Sequence

from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.db.enums import RecordStatus
from app.services.activity_service import log_activity
from app.services.ai_service import AIError, AIService
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

def _store_as_draft(record, result: BaseModel) -> None:
    record.draft_content = result.model_dump(mode="json")


def run_ai_generation(
    db: Session,
    record,
    ai: AIService,
    *,
    entity_type: str,
    label: str,
    schema: type[BaseModel],
    system_instruction: str,
    prompt: str,
    prompt_version: str,
    apply_result: Callable[[object, BaseModel], None] = _store_as_draft,
):
    """Shared AI flow: processing -> awaiting_review on success, -> failed on error.

    apply_result decides where the validated output is stored. By default it goes
    into draft_content; care plans pass their own function to create task rows.
    approved_content is never touched here.
    """
    apply_transition(
        db,
        record,
        RecordStatus.PROCESSING,
        entity_type=entity_type,
        action="ai_started",
        summary=f"{label}: AI generation started",
    )
    db.commit()

    try:
        result, metadata = ai.generate(
            schema=schema,
            system_instruction=system_instruction,
            prompt=prompt,
        )
    except AIError as error:
        error_code = getattr(error, "code", "AI_ERROR")
        record.error_message = getattr(error, "message", "AI processing failed. Please try again.")
        apply_transition(
            db,
            record,
            RecordStatus.FAILED,
            entity_type=entity_type,
            action="ai_failed",
            summary=f"{label}: AI generation failed ({error_code})",
        )
        db.commit()
        raise

    metadata["prompt_version"] = prompt_version
    apply_result(record, result)
    record.ai_model = metadata["model"]
    record.ai_metadata = metadata
    record.error_message = None
    apply_transition(
        db,
        record,
        RecordStatus.AWAITING_REVIEW,
        entity_type=entity_type,
        action="ai_completed",
        summary=f"{label}: AI draft ready for review",
    )
    db.commit()
    db.refresh(record)
    return record