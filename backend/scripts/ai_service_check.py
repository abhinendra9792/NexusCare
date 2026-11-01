"""Make one real, fictional call through the AIService to verify the full path."""

from typing import Literal

from pydantic import BaseModel

from app.core.errors import AppError
from app.services.ai_service import get_ai_service


class CheckClassification(BaseModel):
    category: Literal["billing", "medical_records", "appointment_desk"]
    reason: str


def main() -> None:
    try:
        service = get_ai_service()
        parsed, metadata = service.generate(
            schema=CheckClassification,
            system_instruction="Classify the administrative inquiry. Respond only with the requested JSON.",
            prompt="Fictional inquiry: 'Please send me a copy of my last lab report.'",
        )
    except AppError as error:
        raise SystemExit(f"{error.code}: {error.message}") from None

    print("Result:", parsed)
    print("Metadata:", metadata)


if __name__ == "__main__":
    main()