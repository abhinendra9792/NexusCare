from datetime import datetime, timezone
from typing import Annotated

from pydantic import AfterValidator, BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


def _as_utc(value: datetime) -> datetime:
    """SQLite drops time zones; all stored times are UTC, so mark them as UTC."""
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


UtcDatetime = Annotated[datetime, AfterValidator(_as_utc)]


class CamelModel(BaseModel):
    """Base schema: snake_case in Python, camelCase in JSON for the frontend."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)
