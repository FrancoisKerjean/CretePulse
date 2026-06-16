"""Curation des arrêts pour le référentiel GTFS (adapté de net_places).

Différence clé vs net_places (SEO) : un arrêt GTFS est tout point d'embarquement
réel. On ne droppe QUE des artefacts STRUCTURELS (codes route, segments routiers,
chaînes vides), JAMAIS sur la base d'un nom. Les hôtels/resorts/POI nommés sont
gardés comme arrêts (needs_review jusqu'à validation).

Statuts : allowlist (bus-places.json) / stop (tout lieu nommé) / drop (artefact).
"""
import json
import os
import re

from prices import _norm
from net_geocode import stop_slug

_HERE = os.path.dirname(os.path.abspath(__file__))


def _resolve_json():
    """Trouve bus-places.json quel que soit le layout (repo OU déploiement plat VPS).
    Priorité : env GTFS_BUS_PLACES > fichier co-localisé > chemin repo."""
    cands = [
        os.environ.get("GTFS_BUS_PLACES"),
        os.path.join(_HERE, "bus-places.json"),
        os.path.normpath(os.path.join(_HERE, "..", "..", "..", "src", "data", "bus-places.json")),
    ]
    for c in cands:
        if c and os.path.exists(c):
            return c
    return cands[-1]


_JSON = _resolve_json()

# Typos de scraping constatées -> orthographe DB canonique.
ALIAS_FIX = {
    "rerhymno": "Rethymno",
    "chromonastiti": "Chromonastiri",
    "manopiopoulo": "Manoliopoulo",
    "hrakleio old road": "Heraklion",
    "hrakleio": "Heraklion",
}

# Artefacts STRUCTURELS uniquement (jamais un nom de lieu).
_ARTIFACT = [
    re.compile(r"^[a-z]?\d+[a-z]?$", re.I),     # code seul : "90", "A90", "E75"
    re.compile(r"\bon the national\b", re.I),   # segment routier
    re.compile(r"^\s*$"),                       # vide / espaces
]

_allowlist_cache = None


def load_allowlist():
    global _allowlist_cache
    if _allowlist_cache is None:
        with open(_JSON, encoding="utf-8") as f:
            _allowlist_cache = json.load(f)
    return _allowlist_cache


def _fixed(name):
    return ALIAS_FIX.get(_norm(name), name)


def _is_artifact(name):
    if name is None:
        return True
    return any(p.search(name) for p in _ARTIFACT)


def status_of(name):
    if not name or not str(name).strip():
        return "drop"
    fixed = _fixed(name)
    if fixed in load_allowlist():
        return "allowlist"
    if _is_artifact(name):
        return "drop"
    return "stop"


def canonical_slug(name):
    """slug canonique, ou None si artefact à dropper."""
    if not name or not str(name).strip():
        return None
    fixed = _fixed(name)
    al = load_allowlist()
    if fixed in al:
        return al[fixed]
    if _is_artifact(name):
        return None
    return stop_slug(fixed)


def display_name(name):
    """Nom d'affichage propre dérivé du slug canonique (title-case)."""
    slug = canonical_slug(name)
    if slug is None:
        return name
    return slug.replace("-", " ").title()
