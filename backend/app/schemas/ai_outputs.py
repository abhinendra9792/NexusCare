"""Schemas that every AI response must match. Anything that fails validation is rejected, never repaired."""

from datetime import datetime
from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel


def _iso_date(value: str | None) -> str | None:
    if value is None:
        return None
    datetime.strptime(value, "%Y-%m-%d")
    return value


def _time_24h(value: str | None) -> str | None:
    if value is None:
        return None
    datetime.strptime(value, "%H:%M")
    return value


def _max_items(limit: int):
    def check(items: list) -> list:
        if len(items) > limit:
            raise ValueError(f"at most {limit} items are allowed")
        return items

    return check


IsoDate = Annotated[str | None, AfterValidator(_iso_date)]
Time24h = Annotated[str | None, AfterValidator(_time_24h)]
TextList = Annotated[list[str], AfterValidator(_max_items(20))]


# ---------- A. Appointment requests ----------
class AppointmentExtraction(BaseModel):
    patient_reference: str | None
    requested_date: IsoDate
    requested_time: Time24h
    date_original_text: str | None
    date_is_ambiguous: bool
    reason: str | None
    request_type: Literal["new", "follow_up", "reschedule", "cancellation", "other"]
    contact_preference: Literal["phone", "email", "sms", "any"] | None
    additional_notes: str | None
    missing_information: TextList
    uncertainty_notes: TextList


# ---------- B. Document intelligence ----------
class DocumentAppointment(BaseModel):
    date: IsoDate
    time: Time24h
    department_or_provider: str | None
    location: str | None
    purpose: str | None
    source_excerpt: str


class DocumentFollowUp(BaseModel):
    action: str
    due_date: IsoDate
    source_excerpt: str


class DocumentExtraction(BaseModel):
    appointments: Annotated[list[DocumentAppointment], AfterValidator(_max_items(10))]
    follow_up_actions: Annotated[list[DocumentFollowUp], AfterValidator(_max_items(15))]
    missing_information: TextList


# ---------- C. Visit summaries ----------
class ReportedFact(BaseModel):
    fact: str
    source_excerpt: str


class SummaryFollowUp(BaseModel):
    action: str
    origin: Literal["mentioned", "suggested"]


class VisitSummaryDraft(BaseModel):
    visit_purpose: str | None
    key_points: TextList
    reported_facts: Annotated[list[ReportedFact], AfterValidator(_max_items(20))]
    follow_up_actions: Annotated[list[SummaryFollowUp], AfterValidator(_max_items(15))]
    missing_information: TextList
    items_requiring_verification: TextList


# ---------- D. Care-plan tasks ----------
class ProposedTask(BaseModel):
    description: str
    source_reason: str
    suggested_due_date: IsoDate
    priority: Literal["low", "medium", "high"] | None


class CarePlanDraft(BaseModel):
    tasks: Annotated[list[ProposedTask], AfterValidator(_max_items(15))]
    notes: str | None


# ---------- E. Service request routing ----------
class ServiceClassification(BaseModel):
    summary: str
    category: Literal[
        "appointment_desk",
        "billing",
        "medical_records",
        "technical_support",
        "general_support",
        "other_needs_review",
    ]
    suggested_department: str
    urgency: Literal["low", "normal", "high"]
    urgency_reason: str | None
    explanation: str
    missing_information: TextList
    confidence: Literal["low", "medium", "high"]
    possible_emergency: bool