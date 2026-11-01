"""Tests for AI service request classification. Uses a fake AI provider, so Gemini is never called."""

import json

import pytest

from app.main import app
from app.services.ai_service import AIService, ProviderResponse, get_ai_service

BASE = "/api/v1/service-requests"
INQUIRY = "I was charged twice for my visit on 20 October. Please refund the extra amount."


def classification(*, category="billing", possible_emergency=False) -> str:
    return json.dumps(
        {
            "summary": "Refund request for a double charge.",
            "category": category,
            "suggested_department": "Billing",
            "urgency": "normal",
            "urgency_reason": None,
            "explanation": "The inquiry is about a duplicate payment.",
            "missing_information": [],
            "confidence": "high",
            "possible_emergency": possible_emergency,
        }
    )


class FakeProvider:
    provider_name = "fake"
    model_name = "fake-model"

    def __init__(self) -> None:
        self.text = classification()
        self.calls = 0

    def generate_json(self, *, system_instruction, prompt, schema):
        self.calls += 1
        return ProviderResponse(text=self.text, attempts=1)


@pytest.fixture
def fake_ai(client):
    provider = FakeProvider()
    app.dependency_overrides[get_ai_service] = lambda: AIService(provider)
    return provider


def test_generate_billing_request(client, fake_ai, monkeypatch):
    monkeypatch.setattr("app.api.records.may_be_emergency", lambda text: False)

    response = client.post(f"{BASE}/generate", json={"sourceText": INQUIRY})

    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "awaiting_review"
    assert body["draftContent"]["category"] == "billing"
    assert body["possibleEmergency"] is False
    assert body["category"] is None  # only set when staff approve
    assert body["approvedContent"] is None


def test_ai_can_raise_emergency_flag(client, fake_ai, monkeypatch):
    monkeypatch.setattr("app.api.records.may_be_emergency", lambda text: False)
    fake_ai.text = classification(category="other_needs_review", possible_emergency=True)

    response = client.post(f"{BASE}/generate", json={"sourceText": INQUIRY})

    assert response.status_code == 201
    assert response.json()["possibleEmergency"] is True


def test_ai_cannot_clear_keyword_emergency_flag(client, fake_ai, monkeypatch):
    monkeypatch.setattr("app.api.records.may_be_emergency", lambda text: True)
    fake_ai.text = classification(possible_emergency=False)  # AI says "no emergency"

    response = client.post(f"{BASE}/generate", json={"sourceText": INQUIRY})

    assert response.status_code == 201
    assert response.json()["possibleEmergency"] is True  # keyword flag survives


def test_invalid_classification_fails_visibly(client, fake_ai):
    fake_ai.text = classification(category="not_a_real_category")

    response = client.post(f"{BASE}/generate", json={"sourceText": INQUIRY})

    assert response.status_code == 502
    records = client.get(BASE).json()
    assert records[0]["status"] == "failed"
    assert records[0]["draftContent"] is None