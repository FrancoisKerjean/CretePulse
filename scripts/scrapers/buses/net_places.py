"""Curation des arrêts (filtrage hybride). Source unique du référentiel des lieux
dignes = src/data/bus-places.json (partagé avec le front bus-pairs.ts).

Trois statuts :
- allowlist : lieu présent dans bus-places.json -> slug canonique sûr.
- noise     : arrêt hôtel/supermarché/code -> exclu du réseau.
- admitted  : autre lieu (vrai village probable) -> admis, à géocoder + valider.
"""
import json
import os
import re
from prices import _norm
from net_geocode import stop_slug

_HERE = os.path.dirname(os.path.abspath(__file__))
_JSON = os.path.normpath(os.path.join(_HERE, "..", "..", "..", "src", "data", "bus-places.json"))

# Typos de scraping constatées (14/06) -> orthographe DB canonique.
ALIAS_FIX = {
    "rerhymno": "Rethymno",
    "chromonastiti": "Chromonastiri",
    "manopiopoulo": "Manoliopoulo",
    "hrakleio old road": "Heraklion",
    "hrakleio": "Heraklion",
}

# Patterns de bruit : arrêts qui ne sont pas des localités desservies.
_NOISE = [
    re.compile(r"\bhotels?\b", re.I),
    re.compile(r"hotels?\)", re.I),
    re.compile(r"super\s*market", re.I),
    re.compile(r"\bsupermarket\b", re.I),
    re.compile(r"^a\d+\b", re.I),
    re.compile(r"\bvillage\b", re.I),
    re.compile(r"\bon the national\b", re.I),
    re.compile(r"\(.*hotels?\)", re.I),
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


def status_of(name):
    fixed = _fixed(name)
    if fixed in load_allowlist():
        return "allowlist"
    if any(p.search(name) for p in _NOISE):
        return "noise"
    return "admitted"


def canonical_slug(name):
    """slug canonique, ou None si bruit."""
    fixed = _fixed(name)
    al = load_allowlist()
    if fixed in al:
        return al[fixed]
    if any(p.search(name) for p in _NOISE):
        return None
    return stop_slug(fixed)


def display_name(name):
    """Nom d'affichage propre dérivé du slug canonique (title-case)."""
    slug = canonical_slug(name)
    if slug is None:
        return name
    return slug.replace("-", " ").title()
