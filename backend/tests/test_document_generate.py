"""Tests for PDF AI extraction. Uses a fake AI provider, so Gemini is never called."""

import json

import pymupdf
import pytest

from app.db import models
from app.main import app
from app.services.ai_service import AIService, ProviderResponse, get_ai_service

BASE = "/api/v1/documents"

VALID_OUTPUT = json.dumps(
    {
        "appointments": [
            {
                "date": "2026-11-20",
                "time": "10:30",
                "department_or_provider": "Cardiology",
                "location": "Block B",
                "purpose": "Consultation",
                "source_excerpt": "Appointment on 20 November 2026 at 10:30.",
            }
        ],
        "follow_up_actions": [
            {"action": "Bring ECG reports", "due_date": None, "source_excerpt": "Bring ECG reports."},
            {"action": "Complete pre-visit form", "due_date": "2026-11-18", "source_excerpt": "Complete the form."},
        ],
        "missing_information": [],
    }
)


def make_pdf(text: str) -> bytes:
    document = pymupdf.open()
    page = document.new_page()
    page.insert_text((50, 72), text, fontsize=11)
    return document.tobytes()


PDF_BYTES = make_pdf("Referral letter.\nAppointment on 20 November 2026 at 10:30.\nBring ECG reports.")


def upload(client, data=PDF_BYTES, name="letter.pdf", content_type="application/pdf"):
    return client.post(f"{BASE}/generate", files={"file": (name, data, content_type)})


class FakeProvider:
    provider_name = "fake"
    model_name = "fake-model"

    def __init__(self) -> None:
        self.text = VALID_OUTPUT
        self.calls = 0
        self.last_prompt = ""

    def generate_json(self, *, system_instruction, prompt, schema):
        self.calls += 1
        self.last_prompt = prompt
        return ProviderResponse(text=self.text, attempts=1)


@pytest.fixture
def fake_ai(client):
    provider = FakeProvider()
    app.dependency_overrides[get_ai_service] = lambda: AIService(provider)
    return provider


def test_generate_creates_items_awaiting_review(client, fake_ai):
    response = upload(client)

    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "awaiting_review"
    assert [item["itemType"] for item in body["items"]] == ["appointment", "follow_up", "follow_up"]
    for item in body["items"]:
        assert item["status"] == "awaiting_review"
        assert item["approvedContent"] is None
    assert "Bring ECG reports" in fake_ai.last_prompt  # extracted text really reached the AI


def test_long_text_is_capped_before_ai(client, fake_ai, db_session, monkeypatch):
    monkeypatch.setattr("app.services.document_service.MAX_AI_CHARS", 40)
    pdf = make_pdf("Short start of the letter.\n" + "Filler line.\n" * 20 + "END_MARKER")

    response = upload(client, data=pdf)

    assert response.status_code == 201
    assert "END_MARKER" not in fake_ai.last_prompt
    job = db_session.get(models.DocumentJob, response.json()["id"])
    assert job.ai_metadata["text_truncated"] is True


def test_invalid_ai_output_fails_without_items(client, fake_ai):
    fake_ai.text = json.dumps({"appointments": "not a list"})

    response = upload(client)

    assert response.status_code == 502
    job = client.get(BASE).json()[0]
    assert job["status"] == "failed"
    assert job["items"] == []


def test_non_pdf_is_rejected_before_ai(client, fake_ai):
    response = upload(client, data=b"hello", name="notes.txt", content_type="text/plain")

    assert response.status_code == 415
    assert fake_ai.calls == 0
    assert client.get(BASE).json() == []