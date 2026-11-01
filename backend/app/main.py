import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import activity, appointments, dashboard, documents, health, records
from app.core.config import get_settings
from app.core.errors import SafeErrorMiddleware, register_error_handlers
from app.core.rate_limit import (
    AI_RATE_LIMIT_PER_MINUTE,
    AIRateLimitMiddleware,
    SecurityHeadersMiddleware,
    SlidingWindowLimiter,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


def create_app() -> FastAPI:
    settings = get_settings()
    is_production = settings.app_env == "production"

    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        description="Academic prototype. Not for clinical use.",
        docs_url=None if is_production else "/docs",
        redoc_url=None,
    )

    # Middleware added later runs first. CORS is added last so that it wraps
    # everything, including 429 and 500 responses, and the browser can read them.

    # Production only: keep full tracebacks (which may contain request data) out of the logs.
    # In development it stays off, so tracebacks remain available for debugging.
    if is_production:
        app.add_middleware(SafeErrorMiddleware)

    limiter = SlidingWindowLimiter(AI_RATE_LIMIT_PER_MINUTE)
    app.state.ai_rate_limiter = limiter
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(AIRateLimitMiddleware, limiter=limiter)

    # Only the configured frontend may call this API from a browser.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PATCH", "DELETE"],
        allow_headers=["Content-Type"],
    )

    register_error_handlers(app)
    app.include_router(health.router)
    app.include_router(dashboard.router)
    app.include_router(activity.router)
    app.include_router(appointments.router)
    app.include_router(records.visit_summaries_router)
    app.include_router(records.service_requests_router)
    app.include_router(records.care_plans_router)
    app.include_router(documents.router)
    return app


app = create_app()