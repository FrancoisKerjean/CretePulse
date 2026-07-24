"""Durées des routes bus — même plan B que prices.py (validé Kami 10/06/2026,
étendu aux durées le 13/06/2026, chantier 2 feedback crétois).

  1. CURATED_DURATIONS : liaisons sourcées (greeka.com 13/06/2026, grilles
     opérateur déjà dans CURATED_HERLAS_DURATIONS_PRICES / CURATED_EKTEL)
     -> duration_estimated=False.
  2. Estimation ENVELOPPE au km : haversine x MIN_PER_KM + BASE_MIN, calibrée
     HAUTE (test : estimation >= durée réelle sur toutes les paires curées).
     Surestimer est sans danger pour le filtre de correspondance (on attend
     un peu plus) ; sous-estimer ferait rater un bus. duration_estimated=True,
     l'UI affiche « indicatif ».
  3. Coordonnées inconnues -> duration None (correspondance non garantie).

Ne JAMAIS écraser une durée déjà présente (scrape ou overlay opérateur).
"""
from prices import PLACE_COORDS, haversine_km, _norm

# (from, to) en minuscules, orthographe DB ; lookup symétrique.
# Source [G-R]/[G-H]/[G-L] : greeka.com rethymno/heraklion/lassithi car-bus,
# consultées le 13/06/2026. Les conflits avec une grille opérateur existante
# (CURATED_HERLAS_DURATIONS_PRICES, CURATED_EKTEL) sont tranchés opérateur :
# ces paires ne sont PAS dupliquées ici (l'overlay opérateur passe avant).
CURATED_DURATIONS: dict[tuple[str, str], str] = {
    # Rethymno [G-R]
    ("rethymno", "chania airport"): "1h 30min",
    ("rethymno", "plakias"): "40min",
    ("rethymno", "agia galini"): "55min",
    ("rethymno", "margarites"): "1h 10min",
    ("rethymno", "ano mero"): "1h 30min",
    ("rethymno", "ano meros"): "1h 30min",
    ("rethymno", "koumoi"): "55min",
    ("rethymno", "ancient eleftherna museum"): "1h 25min",
    # Heraklion [G-H]
    ("heraklion", "moires"): "1h 15min",
    ("heraklion", "tympaki"): "1h 30min",
    ("heraklion", "kalessa"): "30min",
    ("heraklion", "prinias"): "1h",
    ("heraklion", "prof.ilias"): "40min",
    ("heraklion", "rodia"): "35min",
    ("heraklion", "arkalochori"): "1h",
    ("heraklion", "ano viannos"): "2h",
    ("heraklion", "asimi"): "1h 45min",
    # Lassithi [G-L]
    ("agios nikolaos", "ierapetra"): "40min",
    ("agios nikolaos", "kalo chorio lasithioy"): "15min",
}

# Calibration ENVELOPPE (cf test_duration_envelope_calibration) : la pire
# pente observée sur les paires de référence est Agios Nikolaos-Siteia
# (côte sinueuse, ~3.0 min/km haversine après BASE_MIN). Les axes rapides
# (Chania-Rethymno 1.4 min/km) sont nettement surestimés : voulu, c'est le
# sens sûr pour une correspondance.
BASE_MIN = 10
MIN_PER_KM = 2.7


def _fmt(minutes: int) -> str:
    h, m = divmod(int(minutes), 60)
    if h and m:
        return f"{h}h {m}min"
    if h:
        return f"{h}h"
    return f"{m}min"


def lookup_curated_duration(from_place: str, to_place: str) -> str | None:
    key = (_norm(from_place), _norm(to_place))
    return CURATED_DURATIONS.get(key) or CURATED_DURATIONS.get((key[1], key[0]))


def estimate_duration(from_place: str, to_place: str) -> str | None:
    ca, cb = PLACE_COORDS.get(_norm(from_place)), PLACE_COORDS.get(_norm(to_place))
    if not ca or not cb:
        return None
    km = haversine_km(ca, cb)
    # arrondi aux 5 min supérieures (enveloppe, pas de fausse précision)
    minutes = BASE_MIN + km * MIN_PER_KM
    return _fmt(5 * -(-int(minutes) // 5))


def enrich_durations(routes: list[dict]) -> list[dict]:
    """Complète duration/duration_estimated in-place. Priorité :
    durée déjà présente (scrape/overlay opérateur) > curée > estimée > rien."""
    for r in routes:
        if r.get("duration") is not None:
            r["duration_estimated"] = False
            continue
        cur = lookup_curated_duration(r["from_place"], r["to_place"])
        if cur is not None:
            r["duration"], r["duration_estimated"] = cur, False
            continue
        est = estimate_duration(r["from_place"], r["to_place"])
        if est is not None:
            r["duration"], r["duration_estimated"] = est, True
        else:
            r["duration_estimated"] = False
    return routes
