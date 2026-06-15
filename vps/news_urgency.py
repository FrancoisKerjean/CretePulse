# vps/news_urgency.py
"""Classifieur d'urgence déterministe pour le web push.

Allowlist FERMÉE de thèmes urgents ET actionnables pour un voyageur
(grève transport, fermeture route/aéroport, météo extrême, incendie,
séisme, alerte baignade). Multilingue EN/FR/EL/DE. Précision priorisée
sur le rappel : au pire on rate une urgence borderline, jamais de spam.
"""
import re

_KEYWORDS = [
    # grèves / transport bloqué
    r"\bstrike\b", r"\bwalkout\b", r"gr[eè]ve", r"απεργ",
    # fermetures route / aéroport / port
    r"road closed", r"road closure", r"route ferm", r"route coup",
    r"airport closed", r"a[eé]roport ferm", r"port closed",
    r"ferries? (?:cancel|suspend)", r"ferry (?:cancel|suspend)",
    r"flights? (?:cancel|grounded)", r"vols? annul",
    # incendie
    r"wildfire", r"\bblaze\b", r"forest fire", r"incendie", r"φωτι",
    # séisme
    r"earthquake", r"s[eé]isme", r"σεισμ",
    # météo extrême / inondation
    r"\bflood", r"inondation", r"πλημμ",
    r"storm warning", r"severe storm", r"tempête",
    r"heat ?wave warning", r"canicule",
    r"red (?:flag|alert) warning", r"alerte rouge",
    # baignade
    r"shark", r"requin", r"red flag",
]
_COMPILED = [re.compile(p, re.IGNORECASE) for p in _KEYWORDS]


def classify_urgency(title: str, summary: str = "") -> bool:
    text = f"{title or ''} {summary or ''}"
    return any(p.search(text) for p in _COMPILED)
