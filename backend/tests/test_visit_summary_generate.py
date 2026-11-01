"""Tests for AI visit summary generation. Uses a fake AI provider, so Gemini is never called."""

import json

import pytest

from app.main import app
from app.services.ai_service import AIError, AIService, ProviderResponse, get_ai_service

BASE = "/api/v1/visit-summaries"
NOTE = (
    "Visit with Rahul Verma on 28 Oct. Discussed ongoing lower back pain. "
    "Asked to book physio again and bring his previous X-ray report."
)

VALID_OUTPUT = json.dumps(
    {
        "visit_purpose": "Discussion of ongoing lower back pain",
        "key_points": ["Ongoing lower back pain discussed."],
        "reported_facts": [
            {"fact": "Patient has ongoing lower back pain.", "source_excerpt": "Discussed ongoing lower back pain."}
        ],
        "follow_up_actions": [
            {"action": "Book physiotherapy again", "origin": "mentioned"},
            {"action": "Bring previous X-ray report", "origin": "mentioned"},
        ],
        "missing_information": [],
        "items_requiring_verification": [],
    }
)


class FakeProvider:
    provider_name = "fake"
    model_name = "fake-model"

    def __init__(self) -> None:
        self.text = VALID_OUTPUT
        self.error: AIError | None = None
        self.calls = 0
        self.last_prompt = ""

    def generate_json(self, *, system_instruction, prompt, schema):
        self.calls += 1
        self.last_prompt = prompt
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


def test_generate_visit_summary_success(client, fake_ai):
    response = client.post(f"{BASE}/generate", json={"sourceText": NOTE})

    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "awaiting_review"
    assert body["draftContent"]["follow_up_actions"][0]["origin"] == "mentioned"
    assert body["approvedContent"] is None
    assert body["aiModel"] == "fake-model"
    assert fake_ai.calls == 1
    assert "Rahul Verma" in fake_ai.last_prompt  # the note really reached the AI


def test_generate_visit_summary_invalid_output_fails(client, fake_ai):
    fake_ai.text = '{"visit_purpose": 123}'  # wrong types, missing fields

    response = client.post(f"{BASE}/generate", json={"sourceText": NOTE})

    assert response.status_code == 502
    record = _only_record(client)
    assert record["status"] == "failed"
    assert record["draftContent"] is None


def test_retry_visit_summary_after_failure(client, fake_ai):
    fake_ai.error = AIError("AI_BUSY", "The AI service is busy.", 503)
    client.post(f"{BASE}/generate", json={"sourceText": NOTE})
    record_id = _only_record(client)["id"]

    fake_ai.error = None
    response = client.post(f"{BASE}/{record_id}/retry")

    assert response.status_code == 200
    assert response.json()["status"] == "awaiting_review"