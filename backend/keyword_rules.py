import re
import unicodedata
from datetime import date


_STOP_WORDS = {
    "a", "au", "aux", "avec", "ce", "ces", "dans", "de", "des", "du",
    "en", "et", "la", "le", "les", "ma", "mes", "mon", "ou", "par", "pour",
    "quelle", "quelles", "quel", "quels", "que", "qui", "quoi", "sur", "un",
    "une", "vos", "votre", "vous", "est", "sont", "je", "me", "moi", "j",
    "l",
}
_DATE_PATTERNS = (
    re.compile(r"\b(?P<day>[0-3]?\d)[/-](?P<month>[01]?\d)[/-](?P<year>20\d{2})\b"),
    re.compile(r"\b(?P<year>20\d{2})-(?P<month>[01]\d)-(?P<day>[0-3]\d)\b"),
)
_LEVEL_PATTERN = re.compile(
    r"\b(?:licence|lic|l)\s*([1-3])\b|\b(?:master|m)\s*([1-2])\b|\bdoctorat\b",
    re.IGNORECASE,
)


def _fold(text: str) -> str:
    normalized = unicodedata.normalize("NFKD", text.casefold())
    return "".join(char for char in normalized if not unicodedata.combining(char))


def _terms(text: str) -> set[str]:
    return {
        term
        for term in re.findall(r"[a-z0-9]+", _fold(text))
        if term not in _STOP_WORDS
    }


def match_intent(question: str, rules: list[tuple[str, str]]) -> str | None:
    question_terms = _terms(question)
    if not question_terms:
        return None

    best_by_intent: dict[str, int] = {}
    for intent, phrase in rules:
        phrase_terms = _terms(phrase)
        if not phrase_terms:
            continue
        folded_phrase = " ".join(re.findall(r"[a-z0-9]+", _fold(phrase)))
        folded_question = " ".join(re.findall(r"[a-z0-9]+", _fold(question)))
        if folded_phrase == folded_question or (
            len(phrase_terms) >= 2 and phrase_terms.issubset(question_terms)
        ):
            best_by_intent[intent] = max(
                best_by_intent.get(intent, 0), len(phrase_terms)
            )

    if not best_by_intent:
        return None
    best_score = max(best_by_intent.values())
    winners = [
        intent for intent, score in best_by_intent.items() if score == best_score
    ]
    return winners[0] if len(winners) == 1 else None


def extract_entities(
    text: str, known_programs: list[str] | None = None
) -> dict[str, str]:
    entities: dict[str, str] = {}
    folded_text = _fold(text)
    for pattern in _DATE_PATTERNS:
        match = pattern.search(text)
        if match:
            year, month, day = (
                int(match.group("year")),
                int(match.group("month")),
                int(match.group("day")),
            )
            try:
                entities["date"] = date(year, month, day).isoformat()
            except ValueError:
                continue
            else:
                break

    level = _LEVEL_PATTERN.search(text)
    if level:
        if "doctorat" in level.group(0).casefold():
            entities["niveau"] = "Doctorat"
        elif level.group(1):
            entities["niveau"] = f"Licence {level.group(1)}"
        else:
            entities["niveau"] = f"Master {level.group(2)}"

    for program in known_programs or []:
        normalized_program = _fold(program.strip())
        if normalized_program and re.search(
            rf"(?<!\w){re.escape(normalized_program)}(?!\w)", folded_text
        ):
            entities["filiere"] = program.strip()
            break
    return entities
