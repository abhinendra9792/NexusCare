"""Tests for the AI rate limit, security headers, and CORS."""

from app.core.config import get_settings
from app.core.rate_limit import SlidingWindowLimiter
from app.main import app

GENERATE = "/api/v1/appointments/generate"


def test_ai_endpoints_are_rate_limited(client, monkeypatch):
    monkeypatch.setattr(app.state.ai_rate_limiter, "max_calls", 2)
    short = {"sourceText": "too short"}  # rejected by validation, so the AI is never called

    assert client.post(GENERATE, json=short).status_code == 422
    assert client.post(GENERATE, json=short).status_code == 422
    response = client.post(GENERATE, json=short)

    assert response.status_code == 429
    assert response.json()["error"]["code"] == "RATE_LIMITED"
    assert int(response.headers["Retry-After"]) > 0


def test_normal_requests_are_not_rate_limited(client, monkeypatch):
    monkeypatch.setattr(app.state.ai_rate_limiter, "max_calls", 1)

    for _ in range(5):
        assert client.get("/api/v1/appointments").status_code == 200


def test_limiter_window_expires():
    now = [0.0]
    limiter = SlidingWindowLimiter(max_calls=1, window_seconds=60, clock=lambda: now[0])

    assert limiter.allow("client")[0] is True
    assert limiter.allow("client")[0] is False
    now[0] = 61.0
    assert limiter.allow("client")[0] is True


def test_security_headers_are_set(client):
    response = client.get("/api/v1/appointments")

    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"
    assert response.headers["Referrer-Policy"] == "no-referrer"
    assert response.headers["Cache-Control"] == "no-store"


def test_cors_allows_only_the_configured_frontend(client):
    allowed_origin = get_settings().cors_origins[0]

    allowed = client.get("/health", headers={"Origin": allowed_origin})
    blocked = client.get("/health", headers={"Origin": "https://evil.example"})

    assert allowed.headers.get("access-control-allow-origin") == allowed_origin
    assert "access-control-allow-origin" not in blocked.headers