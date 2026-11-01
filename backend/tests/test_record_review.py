"""Review tests for visit summaries and service requests: edit, approve, reject. Gemini is never called."""

import json

import pytest

from app.main import app
from app.services.ai_service import AIService, ProviderResponse, get_ai_service

VISITS = "/api/v1/visit-summaries"
SERVICES = "/api/v1/service-requests"

VISIT_DRAFT = {
    "visit_purpose": "Discussion of lower back pain",
    "key_points": ["Back pain worse in the mornings."],
    "reported_facts": [{"fact": "Stopped physiotherapy.", "source_excerpt": "stopped physiotherapy"}],
    "follow_up_actions": [{"action": "Book physiotherapy", "origin": "mentioned"}],
    "missing_information": [],
    "items_requiring_verification": [],
}

SERVICE_DRAFT = {
    "summary": "Unclear request about a bill and a portal problem.",
    "category": "other_needs_review",
    "suggested_department": "General Support",
    "urgency": "normal",
    "urgency_reason": None,
    "explanation": "The message mixes two topics.",
    "missing_information": [],
    "confidence": "low",
    "possible_emergency": True,
}


class FakeProvider:
    """Returns a visit summary or a service classification depending on the requested schema."""

    provider_name = "fake"
    model_name = "fake-model"

    def generate_json(self, *, system_instruction, prompt, schema):
        draft = VISIT_DRAFT if schema.__name__ == "VisitSummaryDraft" else SERVICE_DRAFT
        return ProviderResponse(text=json.dumps(draft), attempts=1)


@pytest.fixture(autouse=True)
def fake_ai(client):
    app.dependency_overrides[get_ai_service] = lambda: AIService(FakeProvider())


def _generate(client, base, text="Fictional note used for testing the review workflow."):
    response = client.post(f"{base}/generate", json={"sourceText": text})
    assert response.json()["status"] == "awaiting_review"
    return response.json()["id"]


# ---------- Visit summaries ----------


def test_visit_summary_edit_then_approve(client):
    record_id = _generate(client, VISITS)
    edited = {**VISIT_DRAFT, "missing_information": ["Year of the visit"]}

    assert client.patch(f"{VISITS}/{record_id}", json={"draftContent": edited}).status_code == 200
    response = client.post(f"{VISITS}/{record_id}/approve")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "approved"
    assert body["approvedContent"]["missing_information"] == ["Year of the visit"]
    assert body["approvedAt"] is not None


def test_approved_visit_summary_is_locked(client):
    record_id = _generate(client, VISITS)
    client.post(f"{VISITS}/{record_id}/approve")

    assert client.patch(f"{VISITS}/{record_id}", json={"draftContent": VISIT_DRAFT}).status_code == 409
    assert client.post(f"{VISITS}/{record_id}/reject").status_code == 409


def test_visit_summary_reject(client):
    record_id = _generate(client, VISITS)

    response = client.post(f"{VISITS}/{record_id}/reject")

    assert response.status_code == 200
    assert response.json()["status"] == "rejected"
    assert response.json()["approvedContent"] is None


# ---------- Service requests ----------


def test_staff_correct_category_then_approve_sets_category_column(client):
    record_id = _generate(client, SERVICES)
    corrected = {**SERVICE_DRAFT, "category": "billing", "suggested_department": "Billing"}

    client.patch(f"{SERVICES}/{record_id}", json={"draftContent": corrected})
    response = client.post(f"{SERVICES}/{record_id}/approve")

    assert response.status_code == 200
    body = response.json()
    assert body["category"] == "billing"
    assert body["approvedContent"]["suggested_department"] == "Billing"


def test_category_column_empty_until_approved(client):
    record_id = _generate(client, SERVICES)

    assert client.get(f"{SERVICES}/{record_id}").json()["category"] is None


def test_editing_cannot_clear_emergency_flag(client):
    record_id = _generate(client, SERVICES)  # fake AI flags a possible emergency
    cleared = {**SERVICE_DRAFT, "possible_emergency": False}

    client.patch(f"{SERVICES}/{record_id}", json={"draftContent": cleared})
    response = client.post(f"{SERVICES}/{record_id}/approve")

    assert response.json()["possibleEmergency"] is True  # the record-level flag survives


def test_invalid_category_edit_is_rejected(client):
    record_id = _generate(client, SERVICES)
    invalid = {**SERVICE_DRAFT, "category": "emergency_room"}

    response = client.patch(f"{SERVICES}/{record_id}", json={"draftContent": invalid})

    assert response.status_code == 422
    assert client.get(f"{SERVICES}/{record_id}").json()["draftContent"]["category"] == "other_needs_review"