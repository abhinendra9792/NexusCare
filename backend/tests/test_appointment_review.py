"""Tests for reviewing AI appointment drafts: edit, approve, reject. Gemini is never called."""

import json

import pytest

from app.main import app
from app.services.ai_service import AIService, ProviderResponse, get_ai_service

BASE = "/api/v1/appointments"
NOTE = "Hi, this is Priya Sharma's son. She needs a knee follow-up next Tuesday morning. Please call me."

DRAFT = {
    "patient_reference": "Priya Sharma",
    "requested_date": None,
    "requested_time": None,
    "date_original_text": "next Tuesday",
    "date_is_ambiguous": True,
    "reason": "Knee follow-up",
    "request_type": "follow_up",
    "contact_preference": "phone",
    "additional_notes": "Morning preferred.",
    "missing_information": ["Exact appointment date"],
    "uncertainty_notes": [],
}


class FakeProvider:
    provider_name = "fake"
    model_name = "fake-model"

    def generate_json(self, *, system_instruction, prompt, schema):
        return ProviderResponse(text=json.dumps(DRAFT), attempts=1)


@pytest.fixture
def awaiting_id(client):
    """Create one appointment that is awaiting review and return its id."""
    app.dependency_overrides[get_ai_service] = lambda: AIService(FakeProvider())
    response = client.post(f"{BASE}/generate", json={"sourceText": NOTE})
    assert response.json()["status"] == "awaiting_review"
    return response.json()["id"]


def edited(**changes):
    return {"draftContent": {**DRAFT, **changes}}


def test_edit_then_approve_saves_edited_version(client, awaiting_id):
    edit = client.patch(f"{BASE}/{awaiting_id}", json=edited(requested_date="2026-11-10", date_is_ambiguous=False))
    assert edit.status_code == 200
    assert edit.json()["approvedContent"] is None  # editing never approves

    response = client.post(f"{BASE}/{awaiting_id}/approve")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "approved"
    assert body["approvedContent"]["requested_date"] == "2026-11-10"
    assert body["approvedContent"]["date_is_ambiguous"] is False
    assert body["approvedAt"] is not None


def test_approved_record_cannot_be_edited_or_approved_again(client, awaiting_id):
    client.post(f"{BASE}/{awaiting_id}/approve")

    assert client.patch(f"{BASE}/{awaiting_id}", json=edited(reason="Changed")).status_code == 409
    assert client.post(f"{BASE}/{awaiting_id}/approve").status_code == 409
    assert client.post(f"{BASE}/{awaiting_id}/reject").status_code == 409

    record = client.get(f"{BASE}/{awaiting_id}").json()
    assert record["approvedContent"]["reason"] == "Knee follow-up"  # never silently overwritten


def test_reject_is_final(client, awaiting_id):
    response = client.post(f"{BASE}/{awaiting_id}/reject")

    assert response.status_code == 200
    assert response.json()["status"] == "rejected"
    assert response.json()["approvedContent"] is None
    assert client.post(f"{BASE}/{awaiting_id}/approve").status_code == 409


def test_invalid_edit_is_rejected_and_draft_unchanged(client, awaiting_id):
    response = client.patch(f"{BASE}/{awaiting_id}", json=edited(request_type="definitely_booked"))

    assert response.status_code == 422
    record = client.get(f"{BASE}/{awaiting_id}").json()
    assert record["draftContent"]["request_type"] == "follow_up"


def test_cannot_approve_record_without_ai_draft(client):
    record_id = client.post(BASE, json={"sourceText": NOTE}).json()["id"]  # plain draft, no AI

    response = client.post(f"{BASE}/{record_id}/approve")

    assert response.status_code == 409
    assert client.get(f"{BASE}/{record_id}").json()["status"] == "draft"


def test_activity_log_records_review_without_patient_details(client, awaiting_id):
    client.patch(f"{BASE}/{awaiting_id}", json=edited(reason="Knee review"))
    client.post(f"{BASE}/{awaiting_id}/approve")

    entries = client.get("/api/v1/activity").json()
    actions = [entry["action"] for entry in entries]
    assert "edited" in actions
    assert "approved" in actions
    assert all("Priya" not in entry["summary"] for entry in entries)