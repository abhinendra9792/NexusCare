from datetime import date

from app.prompts.common import COMMON_RULES, wrap_source

PROMPT_VERSION = "service-request-v1"

SYSTEM_INSTRUCTION = COMMON_RULES + """
Task: classify an administrative service inquiry and suggest the department that should handle it.
Categories:
- appointment_desk: booking, rescheduling, or cancelling appointments
- billing: invoices, payments, refunds, insurance claims
- medical_records: copies of reports, results, or records
- technical_support: patient portal or app problems
- general_support: directions, opening hours, general questions
- other_needs_review: unclear or mixed requests; choose this whenever you are unsure
Rules:
- urgency reflects administrative indicators only (a stated deadline, repeated contact, payment due). Never judge medical severity.
- possible_emergency: true if the message describes a possible medical emergency, such as chest pain or breathing difficulty. Do not triage; only flag it.
- confidence: low, medium, or high, reflecting how clear the request is.
"""


def build_prompt(source_text: str, today: date) -> str:
    return (
        f"Today's date, for reference only: {today.isoformat()}\n\n"
        "Classify this inquiry:\n"
        f"{wrap_source(source_text)}"
    )