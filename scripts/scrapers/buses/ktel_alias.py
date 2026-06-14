"""Alias manuel KTEL slug -> OSM slug. Source unique : ktel_to_osm.json (commit-é).
Pas de I/O réseau. Aucune génération auto : chaque ajout est revu en code review."""
import json
import os

_HERE = os.path.dirname(os.path.abspath(__file__))
_DEFAULT_JSON = os.path.join(_HERE, "ktel_to_osm.json")


def load_aliases(path=None):
    """Charge le JSON d'alias. Retourne {} si le fichier n'existe pas."""
    p = path or _DEFAULT_JSON
    if not os.path.isfile(p):
        return {}
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def lookup_alias(ktel_slug, aliases):
    """Retourne le slug OSM cible si ktel_slug (case-insensitive) est dans le mapping."""
    if not ktel_slug:
        return None
    return aliases.get(ktel_slug.lower())
