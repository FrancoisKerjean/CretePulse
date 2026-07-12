"""Client API backoffice KTEL Heraklion-Lasithi (herlas).

Endpoint : https://backoffice.ktelherlas.gr (Spring Boot + Keycloak)
Auth     : POST /oauth2/token en Basic auth (client_credentials)
Données  : GET /api/v1/departures/timetables/{date}/links   -> paires O-D valides
           GET /api/v1/booking/search/{from}/0/{to}/0?d=... -> nameEN = séquence d'arrêts

Usage principal : extraire via_stops pour toutes les routes herlas de bus_routes.

Note performance (spike 18/06/2026) : l'endpoint booking/search est lent (~34s).
Ce module tourne sur le PC Kami (pas le VPS) via la tâche Windows Kairos-Bus-Herlas-API.
"""
import base64
import logging
import os

import requests

from parsers import _route_stops

_BASE = "https://backoffice.ktelherlas.gr"
_UA = "crete.direct-bot/1.0 (+https://crete.direct)"
_TIMEOUT_FAST = (10, 30)
_TIMEOUT_SLOW = (10, 120)   # booking/search ~34s par paire (mesuré spike)

log = logging.getLogger(__name__)


def parse_route_stops_from_name_en(name_en: str) -> list[str] | None:
    """Extrait les arrêts intermédiaires depuis le nameEN de l'API herlas.

    Ex. "IRAKLEIO- BENERATO-AVGENIKI-FAISTOS-MATALA" -> ["Benerato", "Avgeniki", "Faistos"]
    Retourne None si la route est directe (0 intermédiaires) ou invalide.
    """
    stops = _route_stops(name_en)
    if not stops or len(stops) <= 2:
        return None
    return stops[1:-1]


def get_token(client_id: str, client_secret: str) -> str:
    """Obtient un Bearer token depuis le serveur OAuth2 Keycloak KTEL.

    Lève RuntimeError si l'API répond non-200.
    """
    creds = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
    resp = requests.post(
        f"{_BASE}/oauth2/token",
        headers={"Authorization": f"Basic {creds}", "User-Agent": _UA},
        data={"grant_type": "client_credentials"},
        timeout=_TIMEOUT_FAST,
    )
    if resp.status_code != 200:
        raise RuntimeError(f"token request failed: {resp.status_code} — {resp.text[:200]}")
    return resp.json()["access_token"]


def get_od_pairs(token: str, date: str) -> list[tuple[int, int]]:
    """Retourne les paires (fromDestId, toDestId) valides pour la date donnée.

    Fail-safe : retourne [] si l'API est indisponible.
    """
    url = f"{_BASE}/api/v1/departures/timetables/{date}/links"
    try:
        resp = requests.get(
            url,
            headers={"Authorization": f"Bearer {token}", "User-Agent": _UA},
            timeout=_TIMEOUT_FAST,
        )
    except requests.RequestException as e:
        log.warning("get_od_pairs network error: %s", e)
        return []
    if resp.status_code != 200:
        log.warning("get_od_pairs HTTP %s", resp.status_code)
        return []
    pairs = []
    for raw in resp.json().get("pairs", []):
        parts = raw.split(",")
        if len(parts) == 2:
            try:
                pairs.append((int(parts[0]), int(parts[1])))
            except ValueError:
                pass
    return pairs


def get_name_en(token: str, from_dest_id: int, to_dest_id: int, date: str) -> str | None:
    """Retourne le nameEN du premier trajet de la paire O-D pour la date.

    500 = paire non servable ce jour-là (normal) -> retourne None.
    Timeout ~120s car l'API est lente (~34s selon spike 18/06/2026).
    """
    url = f"{_BASE}/api/v1/booking/search/{from_dest_id}/0/{to_dest_id}/0"
    try:
        resp = requests.get(
            url,
            params={"d": date},
            headers={"Authorization": f"Bearer {token}", "User-Agent": _UA},
            timeout=_TIMEOUT_SLOW,
        )
    except requests.RequestException as e:
        log.warning("get_name_en network error (%s->%s): %s", from_dest_id, to_dest_id, e)
        return None
    if resp.status_code != 200:
        return None
    try:
        data = resp.json()
        if not data:
            return None
        routes = data[0].get("routes", [])
        if not routes:
            return None
        return routes[0].get("nameEN")
    except Exception as e:
        log.warning("get_name_en parse error: %s", e)
        return None


def enrich_herlas_via_stops(sb, client_id: str, client_secret: str, date: str) -> dict:
    """Met à jour bus_routes.via_stops pour toutes les routes herlas depuis l'API.

    Idempotent : ne touche que les routes dont via_stops est encore NULL.
    Retourne {"total": int, "enriched": int, "skipped": int, "errors": int}.
    """
    token = get_token(client_id, client_secret)
    pairs = get_od_pairs(token, date)
    log.info("enrich_herlas: %d O-D pairs from API", len(pairs))

    routes = (
        sb.table("bus_routes")
        .select("id,from_place,to_place,via_stops")
        .eq("operator_id", "herlas")
        .execute()
        .data
    ) or []

    route_index = {(r["from_place"].lower(), r["to_place"].lower()): r for r in routes}
    stats = {"total": len(routes), "enriched": 0, "skipped": 0, "errors": 0}

    for from_dest_id, to_dest_id in pairs:
        name_en = get_name_en(token, from_dest_id, to_dest_id, date)
        if not name_en:
            stats["skipped"] += 1
            continue
        via = parse_route_stops_from_name_en(name_en)
        stops = _route_stops(name_en)
        if not stops:
            stats["skipped"] += 1
            continue
        from_name, to_name = stops[0].lower(), stops[-1].lower()
        route = route_index.get((from_name, to_name))
        if not route:
            stats["skipped"] += 1
            continue
        if route.get("via_stops") is not None:
            stats["skipped"] += 1
            continue
        try:
            sb.table("bus_routes").update({"via_stops": via}).eq("id", route["id"]).execute()
            stats["enriched"] += 1
        except Exception as e:
            log.error("enrich update error route %s: %s", route["id"], e)
            stats["errors"] += 1

    return stats
