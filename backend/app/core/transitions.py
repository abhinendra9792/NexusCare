from app.core.errors import AppError
from app.db.enums import RecordStatus as S

# The single source of truth for allowed status changes (see docs/PLAN.md section 3).
ALLOWED_TRANSITIONS: dict[S, frozenset[S]] = {
    S.DRAFT: frozenset({S.PROCESSING, S.CANCELLED}),
    S.PROCESSING: frozenset({S.AWAITING_REVIEW, S.FAILED}),
    S.AWAITING_REVIEW: frozenset({S.APPROVED, S.REJECTED, S.CANCELLED, S.PROCESSING}),
    S.FAILED: frozenset({S.PROCESSING, S.CANCELLED}),
    S.APPROVED: frozenset(),
    S.REJECTED: frozenset(),
    S.CANCELLED: frozenset(),
}


def _label(status: S) -> str:
    return status.value.replace("_", " ")


def can_transition(current: S, target: S) -> bool:
    return target in ALLOWED_TRANSITIONS[current]


def ensure_transition(current: S, target: S) -> None:
    if not can_transition(current, target):
        raise AppError(
            code="INVALID_TRANSITION",
            message=f"Cannot change status from '{_label(current)}' to '{_label(target)}'.",
            status_code=409,
        )
