from datetime import date

from app.prompts.common import COMMON_RULES, wrap_source

PROMPT_VERSION = "appointment-v1"

SYSTEM_INSTRUCTION = COMMON_RULES + """
Task: extract a structured appointment REQUEST from a patient or caregiver note.
- A request is not a booking. Never state or imply that an appointment is confirmed.
- patient_reference: a name or ID exactly as written, otherwise null.
- requested_date: fill only when an explicit calendar date is written, as YYYY-MM-DD. If the year is missing, use the next occurrence on or after today's date and add a note to uncertainty_notes.
- Relative or vague dates (for example "next Monday", "tomorrow", "early next week"): set requested_date to null, copy the exact words into date_original_text, set date_is_ambiguous to true, and add "Exact appointment date" to missing_information.
- requested_time: 24-hour HH:MM only when an exact time is written. For "morning" or "afternoon" use null and mention the preference in additional_notes.
- request_type: one of new, follow_up, reschedule, cancellation, other.
- contact_preference: only if the note says how to reply; otherwise null.
- uncertainty_notes: anything unclear or contradictory.
"""


def build_prompt(source_text: str, today: date) -> str:
    return (
        f"Today's date, for reference only: {today.isoformat()}\n\n"
        "Extract the appointment request from this note:\n"
        f"{wrap_source(source_text)}"
    )