"""Tests for AI appointment generation. Uses a fake AI provider, so Gemini is never called."""

import json

import pytest

from app.main import app
from app.services.ai_service import AIError, AIService, ProviderResponse, get_ai_service

BASE = "/api/v1/appointments"
NOTE = "Hi, this is Priya Sharma's son. She needs a knee follow-up next Tuesday morning. Please call me."

VALID_OUTPUT = json.dumps(
    {
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
)


class FakeProvider:
    """Stands in for Gemini. Set .text for a reply, or .error to simulate a failure."""

    provider_name = "fake"
    model_name = "fake-model"

    def __init__(self) -> None:
        self.text = VALID_OUTPUT
        self.error: AIError | None = None
        self.calls = 0

    def generate_json(self, *, system_instruction, prompt, schema):
        self.calls += 1
        if self.error:
            raise self.error
        return ProviderResponse(text=self.text, attempts=1)


@pytest.fixture
def fake_ai(client):
    provider = FakeProvider()
    app.dependency_overrides[get_ai_service] = lambda: AIService(provider)
    return provider


def _only_record(client):
    records = client.get(BASE).json()
    assert len(records) == 1
    return records[0]


def test_generate_success_creates_draft_awaiting_review(client, fake_ai):
    response = client.post(f"{BASE}/generate", json={"sourceText": NOTE})

    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "awaiting_review"
    assert body["draftContent"]["date_is_ambiguous"] is True
    assert body["draftContent"]["requested_date"] is None
    assert body["approvedContent"] is None
    assert body["approvedAt"] is None
    assert body["aiModel"] == "fake-model"
    assert body["errorMessage"] is None
    assert fake_ai.calls == 1


def test_generate_malformed_output_fails_visibly(client, fake_ai):
    fake_ai.text = '{"patient_reference": "Priya"'  # broken JSON

    response = client.post(f"{BASE}/generate", json={"sourceText": NOTE})

    assert response.status_code == 502
    assert response.json()["error"]["code"] == "AI_INVALID_OUTPUT"
    record = _only_record(client)
    assert record["status"] == "failed"
    assert record["draftContent"] is None
    assert record["errorMessage"]


def test_generate_timeout_marks_record_failed(client, fake_ai):
    fake_ai.error = AIError("AI_TIMEOUT", "The AI service took too long to respond.", 504)

    response = client.post(f"{BASE}/generate", json={"sourceText": NOTE})

    assert response.status_code == 504
    assert _only_record(client)["status"] == "failed"


def test_retry_after_failure_succeeds(client, fake_ai):
    fake_ai.error = AIError("AI_BUSY", "The AI service is busy.", 503)
    client.post(f"{BASE}/generate", json={"sourceText": NOTE})
    record_id = _only_record(client)["id"]

    fake_ai.error = None
    response = client.post(f"{BASE}/{record_id}/retry")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "awaiting_review"
    assert body["errorMessage"] is None
    assert body["draftContent"]["reason"] == "Knee follow-up"


def test_retry_cancelled_record_is_rejected(client, fake_ai):
    record_id = client.post(BASE, json={"sourceText": NOTE}).json()["id"]
    client.post(f"{BASE}/{record_id}/cancel")

    response = client.post(f"{BASE}/{record_id}/retry")

    assert response.status_code == 409
    assert fake_ai.calls == 0


def test_short_note_is_rejected_without_calling_ai(client, fake_ai):
    response = client.post(f"{BASE}/generate", json={"sourceText": "too short"})

    assert response.status_code == 422
    assert fake_ai.calls == 0
    assert client.get(BASE).json() == []


def test_ai_not_configured_saves_nothing(client):
    def not_configured():
        raise AIError("AI_NOT_CONFIGURED", "AI is not configured on the server.", 503)

    app.dependency_overrides[get_ai_service] = not_configured

    response = client.post(f"{BASE}/generate", json={"sourceText": NOTE})

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "AI_NOT_CONFIGURED"
    assert client.get(BASE).json() == []