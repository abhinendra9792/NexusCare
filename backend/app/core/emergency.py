import re

# Simple keyword check that runs before any AI call. Errs on the side of warning.
EMERGENCY_PATTERNS = [
    re.compile(pattern, re.IGNORECASE)
    for pattern in [
        r"chest pain",
        r"can'?t breathe|cannot breathe|difficulty breathing|not breathing",
        r"unconscious|unresponsive|passed out",
        r"severe bleeding|bleeding heavily",
        r"heart attack",
        r"\bstroke\b",
        r"seizure",
        r"overdose",
        r"suicid|kill myself|end my life",
    ]
]


def may_be_emergency(text: str) -> bool:
    return any(pattern.search(text) for pattern in EMERGENCY_PATTERNS)