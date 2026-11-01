from types import SimpleNamespace

import httpx
import pytest
from google.genai import errors as genai_errors
from pydantic import BaseModel

from app.core.config import Settings
from app.services import ai_service as ai_module
from app.services.ai_service import MAX_PROMPT_CHARS, AIError, AIService, GeminiProvider

VALID_JSON = '{"category": "billing", "reason": "Charged twice"}'
SECRET_TEXT = "Fictional patient PT-9999 private note"


class Sample(BaseModel):
    category: str
    reason: str


class FakeAPIError(genai_errors.APIError):
    """Stands in for a real Gemini HTTP error without needing a network call."""

    def __init__(self, code: int) -> None:
        Exception.__init__(self, f"HTTP {code}")
        self.code = code
        self.message = f"HTTP {code}"
        self.status = None
        self.details = None


class FakeModels:
    def __init__(self, outcomes) -> None:
        self.outcomes = list(outcomes)
        self.calls = 0

    def generate_content(self, **_kwargs):
        self.calls += 1
        outcome = self.outcomes.pop(0)
        if isinstance(outcome, Exception):
            raise outcome
        return outcome


def response(text):
    return SimpleNamespace(text=text, prompt_feedback=None)


def make_service(outcomes, max_retries: int = 2):
    models = FakeModels(outcomes)
    sleeps: list[float] = []
    provider = GeminiProvider(
        api_key="test-key",
        model_name="test-model",
        max_retries=max_retries,
        client=SimpleNamespace(models=models),
        sleep=sleeps.append,
    )
    return AIService(provider), models, sleeps


def run(service, prompt: str = SECRET_TEXT):
    return service.generate(schema=Sample, system_instruction="Classify the inquiry.", prompt=prompt)


def test_valid_output_is_parsed_with_metadata():
    service, models, _ = make_service([response(VALID_JSON)])
    parsed, metadata = run(service)
    assert parsed == Sample(category="billing", reason="Charged twice")
    assert metadata["model"] == "test-model"
    assert metadata["attempts"] == 1
    assert models.calls == 1


def test_busy_error_is_retried_then_succeeds():
    service, models, sleeps = make_service([FakeAPIError(503), response(VALID_JSON)])
    _, metadata = run(service)
    assert metadata["attempts"] == 2
    assert models.calls == 2
    assert sleeps == [1]


def test_gives_up_after_bounded_retries():
    service, models, sleeps = make_service([FakeAPIError(503)] * 3)
    with pytest.raises(AIError) as error:
        run(service)
    assert error.value.code == "AI_BUSY"
    assert error.value.status_code == 503
    assert models.calls == 3
    assert sleeps == [1, 2]


def test_rate_limit_is_not_retried():
    service, models, _ = make_service([FakeAPIError(429)])
    with pytest.raises(AIError) as error:
        run(service)
    assert error.value.code == "AI_RATE_LIMITED"
    assert models.calls == 1


def test_bad_request_is_not_retried():
    service, models, _ = make_service([FakeAPIError(400)])
    with pytest.raises(AIError) as error:
        run(service)
    assert error.value.code == "AI_PROVIDER_ERROR"
    assert models.calls == 1


def test_timeouts_are_retried_then_reported():
    service, models, _ = make_service([httpx.ReadTimeout("timed out")] * 3)
    with pytest.raises(AIError) as error:
        run(service)
    assert error.value.code == "AI_TIMEOUT"
    assert error.value.status_code == 504
    assert models.calls == 3


def test_malformed_json_is_rejected_not_repaired():
    service, _, _ = make_service([response("this is not json")])
    with pytest.raises(AIError) as error:
        run(service)
    assert error.value.code == "AI_INVALID_OUTPUT"


def test_missing_fields_are_rejected():
    service, _, _ = make_service([response('{"category": "billing"}')])
    with pytest.raises(AIError) as error:
        run(service)
    assert error.value.code == "AI_INVALID_OUTPUT"


def test_empty_response_is_rejected():
    service, _, _ = make_service([response("")])
    with pytest.raises(AIError) as error:
        run(service)
    assert error.value.code == "AI_EMPTY_RESPONSE"


def test_blocked_prompt_is_reported_as_refusal():
    blocked = SimpleNamespace(text=None, prompt_feedback=SimpleNamespace(block_reason="SAFETY"))
    service, _, _ = make_service([blocked])
    with pytest.raises(AIError) as error:
        run(service)
    assert error.value.code == "AI_REFUSED"


def test_oversized_input_is_rejected_before_calling_ai():
    service, models, _ = make_service([response(VALID_JSON)])
    with pytest.raises(AIError) as error:
        run(service, prompt="x" * (MAX_PROMPT_CHARS + 1))
    assert error.value.code == "INPUT_TOO_LARGE"
    assert models.calls == 0


def test_error_messages_never_include_input_text():
    service, _, _ = make_service([response("not json")])
    with pytest.raises(AIError) as error:
        run(service)
    assert SECRET_TEXT not in error.value.message
    assert "PT-9999" not in error.value.message


def test_missing_configuration_gives_clear_error(monkeypatch):
    unconfigured = Settings(_env_file=None, gemini_api_key=None, gemini_model=None)
    monkeypatch.setattr(ai_module, "get_settings", lambda: unconfigured)
    with pytest.raises(AIError) as error:
        ai_module.get_ai_service()
    assert error.value.code == "AI_NOT_CONFIGURED"
    assert error.value.status_code == 503