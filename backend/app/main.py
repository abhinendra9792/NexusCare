import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import activity, appointments, dashboard, documents, health, records
from app.core.config import get_settings
from app.core.errors import register_error_handlers

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