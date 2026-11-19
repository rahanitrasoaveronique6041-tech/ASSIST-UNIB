import os

try:
    from .keyword_rules import match_intent
except ImportError:
    from keyword_rules import match_intent


DEMO_SOURCE = "FICTIF — Université Exemple (mode démonstration uniquement)"

_DEMO_RULES = [
    ("DEMO_INSCRIPTION", "dates fictives inscription université exemple"),
    ("DEMO_FRAIS", "frais fictifs inscription université exemple"),
    ("DEMO_HORAIRES", "horaires fictifs bureau scolarité"),
    ("DEMO_CALENDRIER", "calendrier fictif début cours université exemple"),
]
_DEMO_RESPONSES = {
    "DEMO_INSCRIPTION": (
        "FICTIF — Université Exemple : dans ce scénario de démonstration, "
        "les inscriptions auraient lieu du 1er au 30 septembre."
    ),
    "DEMO_FRAIS": (
        "FICTIF — Université Exemple : dans ce scénario de démonstration, "
        "les frais d’inscription seraient de 50 000 unités fictives."
    ),
    "DEMO_HORAIRES": (
        "FICTIF — Université Exemple : dans ce scénario de démonstration, "
        "le bureau de scolarité serait ouvert du lundi au vendredi, de 9 h à 15 h."
    ),
    "DEMO_CALENDRIER": (
        "FICTIF — Université Exemple : dans ce scénario de démonstration, "
        "les cours commenceraient le 15 octobre."
    ),
}


def demo_answer(question: str) -> str | None:
    if os.getenv("APP_ENV", "").casefold() != "development":
        return None
    if os.getenv("ENABLE_DEMO_KNOWLEDGE", "").casefold() != "true":
        return None

    intent = match_intent(question, _DEMO_RULES)
    if intent is None:
        return None
    return _DEMO_RESPONSES[intent]
