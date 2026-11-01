import pytest

from app.core.errors import AppError
from app.core.transitions import ALLOWED_TRANSITIONS, can_transition, ensure_transition
from app.db.enums import RecordStatus as S


@pytest.mark.parametrize(
    ("current", "target"),
    [
        (S.DRAFT, S.PROCESSING),
        (S.PROCESSING, S.AWAITING_REVIEW),
        (S.AWAITING_REVIEW, S.APPROVED),
        (S.FAILED, S.PROCESSING),
    ],
)
def test_valid_transitions_are_allowed(current, target):
    assert can_transition(current, target)
    ensure_transition(current, target)


@pytest.mark.parametrize(
    ("current", "target"),
    [
        (S.APPROVED, S.DRAFT),
        (S.REJECTED, S.APPROVED),
        (S.DRAFT, S.APPROVED),
        (S.CANCELLED, S.PROCESSING),
        (S.PROCESSING, S.APPROVED),
    ],
)
def test_invalid_transitions_raise_conflict(current, target):
    with pytest.raises(AppError) as error:
        ensure_transition(current, target)
    assert error.value.status_code == 409
    assert error.value.code == "INVALID_TRANSITION"


def test_final_states_have_no_exits():
    for status in (S.APPROVED, S.REJECTED, S.CANCELLED):
        assert ALLOWED_TRANSITIONS[status] == frozenset()


def test_every_status_has_a_rule():
    assert set(ALLOWED_TRANSITIONS) == set(S)
