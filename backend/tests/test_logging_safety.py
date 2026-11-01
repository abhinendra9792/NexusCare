"""Checks that unexpected errors never put request data into the logs."""

import logging

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.errors import SafeErrorMiddleware

SECRET = "Fictional patient note that must never be logged"


def make_app() -> FastAPI:
    app = FastAPI()
    app.add_middleware(SafeErrorMiddleware)

    @app.get("/boom")
    def boom():
        raise RuntimeError(SECRET)

    return app


def test_unexpected_error_returns_generic_message(caplog):
    with caplog.at_level(logging.ERROR):
        response = TestClient(make_app()).get("/boom")

    assert response.status_code == 500
    assert response.json()["error"]["code"] == "INTERNAL_ERROR"
    assert SECRET not in response.text


def test_unexpected_error_logs_only_the_error_type(caplog):
    with caplog.at_level(logging.ERROR):
        TestClient(make_app()).get("/boom")

    assert "RuntimeError" in caplog.text
    assert SECRET not in caplog.text