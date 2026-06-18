# vps/crete_relevance.py
"""Filtre déterministe : un article parle-t-il de la Crète ?

Allowlist de mots-clés Crète (lieux + variantes EN/EL), INSENSIBLE aux accents
grecs (Ηράκλειο matche le mot-clé non accentué ηρακλ). Les sources purement
crétoises sont trustées directement, SAUF cretaone : son flux mêle du national
grec (Thessalonique, Athènes...), d'où un faux positif observé en prod. On le
soumet donc au filtre mots-clés comme une source générale.
"""
import unicodedata

CRETE_KEYWORDS = [
    "crete", "creta", "kriti", "kreta", "cretan",
    "herakl", "chania", "rethymn", "lasithi", "agios nikolaos", "ierapetra", "sitia",
    "samaria", "elafonisi", "balos", "spinalonga", "knossos", "matala",
    "κρητ", "ηρακλ", "χανι", "ρεθυμν", "λασιθ", "αγιο νικολ", "ιεραπετρ", "σητει",
]

# Sources purement crétoises : trust direct, sans filtre mots-clés.
# cretaone EXCLU volontairement : flux mêlant du national grec -> filtré comme
# une source générale (cf faux positif Thessalonique, slug cretaone-129858).
CRETE_ONLY_SOURCES = {"haniotika", "flashnews", "cretanmagazine",
                      "google_crete_el", "google_crete_en",
                      "google_crete_tourism", "google_crete_fr", "google_crete_de",
                      "reddit_crete"}


def _strip_accents(s: str) -> str:
    """Minuscule + suppression des diacritiques (tonos/dialytika grecs, accents
    latins) : les mots-clés non accentués matchent ainsi les formes accentuées."""
    return "".join(
        c for c in unicodedata.normalize("NFD", s.lower())
        if unicodedata.category(c) != "Mn"
    )


# Normalisés une fois (déjà sans accent, mais via la même fonction pour rester
# cohérent si on ajoute un jour un mot-clé accentué).
_NORM_KEYWORDS = [_strip_accents(k) for k in CRETE_KEYWORDS]


def is_crete_relevant(title: str, summary: str, source: str) -> bool:
    """Vrai si l'article concerne la Crète. Sources crete-only = vrai direct ;
    sinon (dont cretaone) il faut un mot-clé Crète dans le titre ou le résumé."""
    if source in CRETE_ONLY_SOURCES:
        return True
    text = _strip_accents(f"{title or ''} {summary or ''}")
    return any(kw in text for kw in _NORM_KEYWORDS)
