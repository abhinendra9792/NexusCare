"""Provider-agnostic AI service. Every model call in NexusCare goes through this module.

Rules enforced here:
- Output must be JSON that validates against a Pydantic schema, or the call fails visibly.
- Only transient failures are retried, and only a bounded number of times.
- Errors and logs never contain prompt text, document text, or API keys.
"""

import logging
import time
from collections.abc import Callable
from dataclasses import dataclass
from functools import lru_cache
from typing import Protocol, TypeVar

import httpx
from google import genai
from google.genai import errors as genai_errors
from google.genai import types
from pydantic import BaseModel, ValidationError

from app.core.config import get_settings
from app.core.errors import AppError

logger = logging.getLogger("nexuscare.ai")

T = TypeVar("T", bound=BaseModel)

MAX_PROMPT_CHARS = 40_000
RETRYABLE_STATUS_CODES = {500, 502, 503, 504}


class AIError(AppError):
    """An AI failure with a safe, user-facing message."""


@dataclass
class ProviderResponse:
    text: str
    attempts: int


class AIProvider(Protocol):
    """Interface any AI provider must implement, so Gemini can be swapped later."""

    provider_name: str
    model_name: str

    def generate_json(self, *, system_instruction: str, prompt: str, schema: type[BaseModel]) -> ProviderResponse: ...


def _map_api_error(status: int | None) -> AIError:
    if status == 429:
        return AIError("AI_RATE_LIMITED", "The AI usage limit was reached. Please wait a minute and try again.", 429)
    if status in (500, 502, 503):
        return AIError("AI_BUSY", "The AI service is busy right now. Please try again in a moment.", 503)
    if status == 504:
        return AIError("AI_TIMEOUT", "The AI service took too long to respond. Please try again.", 504)
    if status in (401, 403):
        return AIError("AI_AUTH_FAILED", "The AI service rejected the API key. Check GEMINI_API_KEY on the server.", 502)
    if status == 404:
        return AIError("AI_MODEL_NOT_FOUND", "The configured AI model is not available. Check GEMINI_MODEL on the server.", 502)
    return AIError("AI_PROVIDER_ERROR", "The AI service returned an error. Please try again.", 502)


def _extract_text(response) -> str:
    feedback = getattr(response, "prompt_feedback", None)
    if feedback is not None and getattr(feedback, "block_reason", None):
        raise AIError("AI_REFUSED", "The AI declined to process this input. Please review the text and try again.", 422)
    text = getattr(response, "text", None)
    if not text or not text.strip():
        raise AIError("AI_EMPTY_RESPONSE", "The AI returned an empty response. Nothing was saved. Please try again.", 502)
    return text


class GeminiProvider:
    provider_name = "gemini"

    def __init__(
        self,
        *,
        api_key: str,
        model_name: str,
        timeout_seconds: float = 30,
        max_retries: int = 2,
        client=None,
        sleep: Callable[[float], None] = time.sleep,
    ) -> None:
        self.model_name = model_name
        self._max_retries = max_retries
        self._sleep = sleep
        self._client = client or genai.Client(
            api_key=api_key,
            http_options=types.HttpOptions(timeout=int(timeout_seconds * 1000)),
        )

    def _backoff(self, attempt: int, reason: str) -> None:
        delay = min(2 ** (attempt - 1), 4)
        logger.warning("AI call failed (%s); retrying in %ss", reason, delay)
        self._sleep(delay)

    def generate_json(self, *, system_instruction: str, prompt: str, schema: type[BaseModel]) -> ProviderResponse:
        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            response_mime_type="application/json",
            response_schema=schema,
            temperature=0.1,
        )
        attempts = 0
        while True:
            attempts += 1
            try:
                response = self._client.models.generate_content(
                    model=self.model_name,
                    contents=prompt,
                    config=config,
                )
                return ProviderResponse(text=_extract_text(response), attempts=attempts)
            except AIError:
                raise
            except genai_errors.APIError as error:
                status = getattr(error, "code", None)
                if status in RETRYABLE_STATUS_CODES and attempts <= self._max_retries:
                    self._backoff(attempts, f"HTTP {status}")
                    continue
                raise _map_api_error(status) from None
            except httpx.TimeoutException:
                if attempts <= self._max_retries:
                    self._backoff(attempts, "timeout")
                    continue
                raise AIError("AI_TIMEOUT", "The AI service took too long to respond. Please try again.", 504) from None
            except httpx.TransportError:
                if attempts <= self._max_retries:
                    self._backoff(attempts, "network error")
                    continue
                raise AIError(
                    "AI_UNAVAILABLE",
                    "Could not connect to the AI service. Check the internet connection and try again.",
                    503,
                ) from None


class AIService:
    def __init__(self, provider: AIProvider) -> None:
        self.provider = provider

    def generate(self, *, schema: type[T], system_instruction: str, prompt: str) -> tuple[T, dict]:
        if len(prompt) > MAX_PROMPT_CHARS:
            raise AIError("INPUT_TOO_LARGE", "The input is too long for AI processing.", 413)

        started = time.perf_counter()
        result = self.provider.generate_json(system_instruction=system_instruction, prompt=prompt, schema=schema)
        latency_ms = round((time.perf_counter() - started) * 1000)

        try:
            parsed = schema.model_validate_json(result.text)
        except ValidationError:
            logger.warning("AI output failed schema validation: schema=%s", schema.__name__)
            raise AIError(
                "AI_INVALID_OUTPUT",
                "The AI returned data in an unexpected format. Nothing was saved. Please try again.",
                502,
            ) from None

        metadata = {
            "provider": self.provider.provider_name,
            "model": self.provider.model_name,
            "schema": schema.__name__,
            "latency_ms": latency_ms,
            "attempts": result.attempts,
        }
        logger.info(
            "AI call succeeded: schema=%s model=%s attempts=%s latency_ms=%s",
            schema.__name__,
            self.provider.model_name,
            result.attempts,
            latency_ms,
        )
        return parsed, metadata


@lru_cache(maxsize=1)
def _gemini_provider(api_key: str, model_name: str, timeout_seconds: float, max_retries: int) -> GeminiProvider:
    return GeminiProvider(
        api_key=api_key,
        model_name=model_name,
        timeout_seconds=timeout_seconds,
        max_retries=max_retries,
    )


def get_ai_service() -> AIService:
    """FastAPI dependency. Tests replace it with a fake provider."""
    settings = get_settings()
    if not settings.gemini_configured:
        raise AIError(
            "AI_NOT_CONFIGURED",
            "AI is not configured on the server. Set GEMINI_API_KEY and GEMINI_MODEL in backend/.env.",
            503,
        )
    provider = _gemini_provider(
        settings.gemini_api_key.get_secret_value(),
        settings.gemini_model,
        settings.ai_timeout_seconds,
        settings.ai_max_retries,
    )
    return AIService(provider)