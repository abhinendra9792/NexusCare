from datetime import date

from app.prompts.common import COMMON_RULES, wrap_source

PROMPT_VERSION = "visit-summary-v1"

SYSTEM_INSTRUCTION = COMMON_RULES + """
Task: organise visit notes written by staff into a structured summary.
- visit_purpose: the reason for the visit if stated, otherwise null.
- key_points: short points restating what the notes say.
- reported_facts: each fact explicitly stated in the notes, with source_excerpt copied word for word from the notes.
- follow_up_actions: use origin "mentioned" when the notes state the action. Use origin "suggested" only for an obvious administrative next step, never a clinical one.
- Never add diagnoses, medications, measurements, or treatment instructions that are not in the notes.
- items_requiring_verification: anything staff should double-check before approving.
"""


def build_prompt(source_text: str, today: date) -> str:
    return (
        f"Today's date, for reference only: {today.isoformat()}\n\n"
        "Summarise these visit notes:\n"
        f"{wrap_source(source_text)}"
    )