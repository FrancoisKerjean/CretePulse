"""Ecriture transactionnelle des lignes scrapees avec garde-fou.

On ne remplace les routes d'un operateur QUE si le scrape renvoie un nombre
plausible de lignes. Sinon on conserve la derniere donnee valide (garde-fou)
et l'orchestrateur (buses.py) declenche une alerte Telegram.
"""
from datetime import datetime, timezone

MIN_ROUTES = 3  # sous ce seuil = scrape suspect, on ne touche pas la DB


def should_commit(rows) -> bool:
    return isinstance(rows, list) and len(rows) >= MIN_ROUTES


def normalize_for_db(operator_id: str, source_url: str, rows: list) -> list:
    """Met les routes scrapees au format de la table bus_routes."""
    now = datetime.now(timezone.utc).isoformat()
    return [{
        "operator_id": operator_id,
        "from_place": r["from_place"],
        "to_place": r["to_place"],
        "to_slug": r.get("to_slug"),
        "season": r.get("season", "all"),
        "duration": r.get("duration"),
        "price_eur": r.get("price_eur"),
        "frequency": r.get("frequency"),
        "departures": r.get("departures"),
        "source_url": source_url,
        "scraped_at": now,
    } for r in rows]


def replace_operator_routes(sb, operator_id: str, source_url: str, rows: list) -> int:
    """Remplace toutes les routes de l'operateur en une passe (delete puis insert).
    Retourne le nombre de lignes ecrites. Leve si should_commit est False."""
    if not should_commit(rows):
        raise ValueError(f"refuse commit: only {len(rows)} routes for {operator_id}")
    payload = normalize_for_db(operator_id, source_url, rows)
    sb.table("bus_routes").delete().eq("operator_id", operator_id).execute()
    sb.table("bus_routes").insert(payload).execute()
    return len(payload)
