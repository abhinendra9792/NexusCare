from enum import StrEnum


class RecordStatus(StrEnum):
    DRAFT = "draft"
    PROCESSING = "processing"
    AWAITING_REVIEW = "awaiting_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    FAILED = "failed"
    CANCELLED = "cancelled"


class SourceType(StrEnum):
    TEXT = "text"
    VOICE = "voice"


class DocumentItemType(StrEnum):
    APPOINTMENT = "appointment"
    FOLLOW_UP = "follow_up"


class TaskPriority(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class TaskStatus(StrEnum):
    PENDING = "pending"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class TaskReviewStatus(StrEnum):
    DRAFT = "draft"
    APPROVED = "approved"
    REJECTED = "rejected"


class TaskOrigin(StrEnum):
    AI = "ai"
    MANUAL = "manual"


class ServiceCategory(StrEnum):
    APPOINTMENT_DESK = "appointment_desk"
    BILLING = "billing"
    MEDICAL_RECORDS = "medical_records"
    TECHNICAL_SUPPORT = "technical_support"
    GENERAL_SUPPORT = "general_support"
    OTHER_NEEDS_REVIEW = "other_needs_review"
