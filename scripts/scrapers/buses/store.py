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
    """Met les routes scrapees au format de la table bus_routes.

    `departures_by_day` est la nouvelle source de verite (sous-grilles
    Mon-Fri / Sat / Sun). `departures` reste persiste en flat sorted unique
    pour retrocompat lecture (range affiche, recherche).
    """
    now = datetime.now(timezone.utc).isoformat()
    return [{
        "operator_id": operator_id,
        "from_place": r["from_place"],
        "to_place": r["to_place"],
        "to_slug": r.get("to_slug"),
        "via_stops": r.get("via_stops"),
        "season": r.get("season", "all"),
        "duration": r.get("duration"),
        "duration_estimated": r.get("duration_estimated", False),
        "price_eur": r.get("price_eur"),
        "price_estimated": r.get("price_estimated", False),
        "frequency": r.get("frequency"),
        "departures": r.get("departures"),
        "departures_by_day": r.get("departures_by_day"),
        "source_url": source_url,
        "scraped_at": now,
    } for r in rows]


def _route_key(r: dict) -> tuple:
    """Identite stable d'une route, pour comparer le scrape N au scrape N-1."""
    return (r.get("from_place"), r.get("to_place"), r.get("season") or "all")


def _same_timetable(a: dict, b: dict) -> bool:
    """Horaires inchanges = meme liste `departures` (l'info qui pilote le lastmod SEO)."""
    return (a.get("departures") or []) == (b.get("departures") or [])


def _preserve_scraped_at(sb, operator_id: str, payload: list) -> None:
    """Fraicheur honnete : si une route a exactement les memes horaires que la
    derniere fois, on garde son `scraped_at` d'origine. Le `lastmod` du sitemap
    ne bouge alors que sur un VRAI changement, pas a chaque scrape quotidien
    (sinon Google apprend a ignorer un site qui "crie au loup").
    Aussi : preserve via_stops enrichis (API herlas) pour eviter de les perdre
    a chaque scrape hebdo qui repart de HTML seul (via_stops=None). Si le
    scrape frais produit deja via_stops (ektel PDF), il n'est pas ecrase.
    Fail-open : si la lecture echoue, on garde le now() deja pose."""
    try:
        existing = (
            sb.table("bus_routes")
            .select("from_place,to_place,season,departures,scraped_at,via_stops")
            .eq("operator_id", operator_id)
            .execute()
            .data
        ) or []
    except Exception:
        return
    prev = {_route_key(e): e for e in existing}
    for p in payload:
        old = prev.get(_route_key(p))
        if old:
            if old.get("scraped_at") and _same_timetable(old, p):
                p["scraped_at"] = old["scraped_at"]
            if old.get("via_stops") is not None and p.get("via_stops") is None:
                p["via_stops"] = old["via_stops"]


def replace_operator_routes(sb, operator_id: str, source_url: str, rows: list) -> int:
    """Remplace toutes les routes de l'operateur en une passe (delete puis insert).
    Retourne le nombre de lignes ecrites. Leve si should_commit est False."""
    if not should_commit(rows):
        raise ValueError(f"refuse commit: only {len(rows)} routes for {operator_id}")
    payload = normalize_for_db(operator_id, source_url, rows)
    _preserve_scraped_at(sb, operator_id, payload)
    sb.table("bus_routes").delete().eq("operator_id", operator_id).execute()
    sb.table("bus_routes").insert(payload).execute()
    return len(payload)
