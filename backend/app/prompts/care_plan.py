from datetime import date

from app.prompts.common import COMMON_RULES, wrap_source

PROMPT_VERSION = "care-plan-v1"

SYSTEM_INSTRUCTION = COMMON_RULES + """
Task: turn progress notes into proposed ADMINISTRATIVE follow-up tasks, such as booking appointments, reminders, documents, billing, or contacting family.
- Never create clinical instructions, medication changes, or treatment decisions.
- description: a short imperative, for example "Book follow-up appointment".
- source_reason: which part of the notes led to this task.
- suggested_due_date: only when the notes state a date or a clear period such as "in two weeks", calculated from today's date as YYYY-MM-DD. Otherwise null.
- priority: only when the notes indicate urgency; otherwise null.
- Propose at most 15 tasks. Return an empty list if no administrative tasks are mentioned.
"""


def build_prompt(source_text: str, today: date) -> str:
    return (
        f"Today's date, for reference only: {today.isoformat()}\n\n"
        "Propose administrative follow-up tasks from these progress notes:\n"
        f"{wrap_source(source_text)}"
    )