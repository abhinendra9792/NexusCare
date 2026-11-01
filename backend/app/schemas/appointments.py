from typing import Annotated

from pydantic import StringConstraints

from app.db.enums import RecordStatus, SourceType
from app.schemas.ai_outputs import AppointmentExtraction
from app.schemas.common import CamelModel, UtcDatetime

MAX_TEXT_LENGTH = 5000

SourceText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=20, max_length=MAX_TEXT_LENGTH)]


class AppointmentCreate(CamelModel):
    source_text: SourceText
    source_type: SourceType = SourceType.TEXT


class AppointmentDraftUpdate(CamelModel):
    """A reviewer's edited draft. It must still match the AI output schema."""

    draft_content: AppointmentExtraction


class AppointmentRead(CamelModel):
    id: str
    created_at: UtcDatetime
    updated_at: UtcDatetime
    source_type: SourceType
    source_text: str
    status: RecordStatus
    draft_content: dict | None
    approved_content: dict | None
    ai_model: str | None
    error_message: str | None
    approved_at: UtcDatetime | None