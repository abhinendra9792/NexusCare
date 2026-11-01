"""One fictional test call to confirm the configured model returns schema-valid JSON."""

import time
from typing import Literal

from google import genai
from google.genai import errors, types
from pydantic import BaseModel

from app.core.config import get_settings


class TestClassification(BaseModel):
    category: Literal["billing", "medical_records", "appointment_desk"]
    reason: str


def main() -> None:
    settings = get_settings()
    if not settings.gemini_configured:
        raise SystemExit("Set GEMINI_API_KEY and GEMINI_MODEL in backend/.env")

    print(f"Model: {settings.gemini_model}")
    print("Calling Gemini (waits up to 60 seconds)...", flush=True)

    client = genai.Client(
        api_key=settings.gemini_api_key.get_secret_value(),
        http_options=types.HttpOptions(timeout=60_000),  # milliseconds
    )

    started = time.perf_counter()
    try:
        response = client.models.generate_content(
            model=settings.gemini_model,
            contents="Classify this fictional inquiry: 'I was charged twice for my visit last week.'",
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=TestClassification,
                temperature=0,
            ),
        )
    except errors.APIError as error:
        raise SystemExit(f"Gemini API error {error.code}: {error.message}") from None
    except Exception as error:
        raise SystemExit(f"Request failed: {type(error).__name__}") from None

    elapsed = time.perf_counter() - started
    print(f"Answered in {elapsed:.1f} seconds")
    print("Raw JSON:", response.text)
    print("Validated:", TestClassification.model_validate_json(response.text))


if __name__ == "__main__":
    main()