"""List Gemini models available to the configured API key. The key is never printed."""

from google import genai

from app.core.config import get_settings


def main() -> None:
    settings = get_settings()
    key = settings.gemini_api_key.get_secret_value().strip() if settings.gemini_api_key else ""
    if not key:
        raise SystemExit("GEMINI_API_KEY is not set in backend/.env")

    client = genai.Client(api_key=key)
    names = []
    for model in client.models.list():
        actions = getattr(model, "supported_actions", None) or []
        if "generateContent" in actions:
            names.append(model.name)

    for name in sorted(names):
        print(name)
    print(f"\n{len(names)} models support text generation.")


if __name__ == "__main__":
    main()