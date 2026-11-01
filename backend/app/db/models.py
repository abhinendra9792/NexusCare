from datetime import date, datetime, timezone
from uuid import uuid4

from sqlalchemy import JSON, Boolean, Date, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.enums import (
    DocumentItemType,
    RecordStatus,
    ServiceCategory,
    SourceType,
    TaskOrigin,
    TaskPriority,
    TaskReviewStatus,
    TaskStatus,
)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def new_id() -> str:
    return str(uuid4())


def enum_column(enum_cls, **kwargs):
    """Store enums as readable lowercase strings (portable to PostgreSQL later)."""
    return mapped_column(
        SAEnum(
            enum_cls,
            native_enum=False,
            length=32,
            values_callable=lambda members: [member.value for member in members],
            validate_strings=True,
        ),
        **kwargs,
    )


class IdTimestampMixin:
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )


class AIProcessingMixin:
    ai_model: Mapped[str | None] = mapped_column(String(100))
    ai_metadata: Mapped[dict | None] = mapped_column(JSON)
    error_message: Mapped[str | None] = mapped_column(String(500))


class AppointmentRequest(IdTimestampMixin, AIProcessingMixin, Base):
    __tablename__ = "appointment_requests"

    source_type: Mapped[SourceType] = enum_column(SourceType, nullable=False)
    source_text: Mapped[str] = mapped_column(Text, nullable=False)
    draft_content: Mapped[dict | None] = mapped_column(JSON)
    approved_content: Mapped[dict | None] = mapped_column(JSON)
    status: Mapped[RecordStatus] = enum_column(RecordStatus, default=RecordStatus.DRAFT, nullable=False, index=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class DocumentJob(IdTimestampMixin, AIProcessingMixin, Base):
    __tablename__ = "document_jobs"

    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    page_count: Mapped[int | None] = mapped_column(Integer)
    extracted_char_count: Mapped[int | None] = mapped_column(Integer)
    text_preview: Mapped[str | None] = mapped_column(Text)
    status: Mapped[RecordStatus] = enum_column(RecordStatus, default=RecordStatus.DRAFT, nullable=False, index=True)

    items: Mapped[list["ExtractedDocumentItem"]] = relationship(
        back_populates="document_job", cascade="all, delete-orphan"
    )


class ExtractedDocumentItem(IdTimestampMixin, Base):
    __tablename__ = "extracted_document_items"

    document_job_id: Mapped[str] = mapped_column(
        ForeignKey("document_jobs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    item_type: Mapped[DocumentItemType] = enum_column(DocumentItemType, nullable=False)
    draft_content: Mapped[dict] = mapped_column(JSON, nullable=False)
    approved_content: Mapped[dict | None] = mapped_column(JSON)
    status: Mapped[RecordStatus] = enum_column(
        RecordStatus, default=RecordStatus.AWAITING_REVIEW, nullable=False, index=True
    )
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    document_job: Mapped[DocumentJob] = relationship(back_populates="items")


class VisitSummary(IdTimestampMixin, AIProcessingMixin, Base):
    __tablename__ = "visit_summaries"

    source_text: Mapped[str] = mapped_column(Text, nullable=False)
    draft_content: Mapped[dict | None] = mapped_column(JSON)
    approved_content: Mapped[dict | None] = mapped_column(JSON)
    status: Mapped[RecordStatus] = enum_column(RecordStatus, default=RecordStatus.DRAFT, nullable=False, index=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class CarePlan(IdTimestampMixin, AIProcessingMixin, Base):
    __tablename__ = "care_plans"

    title: Mapped[str | None] = mapped_column(String(200))
    source_text: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[RecordStatus] = enum_column(RecordStatus, default=RecordStatus.DRAFT, nullable=False, index=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    tasks: Mapped[list["CarePlanTask"]] = relationship(
        back_populates="care_plan", cascade="all, delete-orphan", order_by="CarePlanTask.sort_order"
    )


class CarePlanTask(IdTimestampMixin, Base):
    __tablename__ = "care_plan_tasks"

    care_plan_id: Mapped[str] = mapped_column(
        ForeignKey("care_plans.id", ondelete="CASCADE"), nullable=False, index=True
    )
    description: Mapped[str] = mapped_column(String(300), nullable=False)
    source_reason: Mapped[str | None] = mapped_column(String(500))
    suggested_due_date: Mapped[date | None] = mapped_column(Date)
    priority: Mapped[TaskPriority | None] = enum_column(TaskPriority, nullable=True)
    task_status: Mapped[TaskStatus] = enum_column(TaskStatus, default=TaskStatus.PENDING, nullable=False)
    review_status: Mapped[TaskReviewStatus] = enum_column(
        TaskReviewStatus, default=TaskReviewStatus.DRAFT, nullable=False
    )
    origin: Mapped[TaskOrigin] = enum_column(TaskOrigin, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    care_plan: Mapped[CarePlan] = relationship(back_populates="tasks")


class ServiceRequest(IdTimestampMixin, AIProcessingMixin, Base):
    __tablename__ = "service_requests"

    source_text: Mapped[str] = mapped_column(Text, nullable=False)
    draft_content: Mapped[dict | None] = mapped_column(JSON)
    approved_content: Mapped[dict | None] = mapped_column(JSON)
    category: Mapped[ServiceCategory | None] = enum_column(ServiceCategory, nullable=True, index=True)
    possible_emergency: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    status: Mapped[RecordStatus] = enum_column(RecordStatus, default=RecordStatus.DRAFT, nullable=False, index=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class ActivityLog(IdTimestampMixin, Base):
    """Audit trail. Stores IDs and short summaries only, never patient details."""

    __tablename__ = "activity_logs"
    __table_args__ = (
        Index("ix_activity_logs_created_at", "created_at"),
        Index("ix_activity_logs_entity", "entity_type", "entity_id"),
    )

    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_id: Mapped[str] = mapped_column(String(36), nullable=False)
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    from_status: Mapped[str | None] = mapped_column(String(32))
    to_status: Mapped[str | None] = mapped_column(String(32))
    summary: Mapped[str] = mapped_column(String(255), nullable=False)
