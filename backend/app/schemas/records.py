from datetime import date
from typing import Annotated

from pydantic import StringConstraints

from app.db.enums import RecordStatus, ServiceCategory, TaskOrigin, TaskPriority, TaskReviewStatus, TaskStatus
from app.schemas.appointments import SourceText
from app.schemas.common import CamelModel, UtcDatetime

ShortSourceText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=10, max_length=5000)]
Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]


class VisitSummaryCreate(CamelModel):
    source_text: SourceText


class ServiceRequestCreate(CamelModel):
    source_text: ShortSourceText


class CarePlanCreate(CamelModel):
    source_text: SourceText
    title: Title | None = None


class RecordReadBase(CamelModel):
    id: str
    created_at: UtcDatetime
    updated_at: UtcDatetime
    source_text: str
    status: RecordStatus
    ai_model: str | None
    error_message: str | None
    approved_at: UtcDatetime | None


class VisitSummaryRead(RecordReadBase):
    draft_content: dict | None
    approved_content: dict | None


class ServiceRequestRead(RecordReadBase):
    draft_content: dict | None
    approved_content: dict | None
    category: ServiceCategory | None
    possible_emergency: bool


class CarePlanTaskRead(CamelModel):
    id: str
    description: str
    source_reason: str | None
    suggested_due_date: date | None
    priority: TaskPriority | None
    task_status: TaskStatus
    review_status: TaskReviewStatus
    origin: TaskOrigin
    sort_order: int


class CarePlanRead(RecordReadBase):
    title: str | None
    tasks: list[CarePlanTaskRead]