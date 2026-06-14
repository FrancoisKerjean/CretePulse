"""Tracé routier réel via OSRM (route service public, pré-calculé offline) +
distances inter-arrêts. Fallback segments droits (haversine) si OSRM échoue ou
si un arrêt n'est pas géocodé. Le fetch HTTP est injecté (testable sans réseau)."""
import time
from prices import haversine_km

OSRM_BASE = "http://router.project-osrm.org/route/v1/driving/"


def _http_fetch(url):
    import requests
    r = requests.get(url, timeout=30, headers={"User-Agent": "crete.direct-bot/1.0"})
    if r.status_code != 200:
        return None
    return r.json()


def osrm_route(coords, fetch=None):
    """coords : liste (lat,lng). Retourne {geometry:[[lng,lat],...], leg_km:[...]} ou None."""
    fetch = fetch or _http_fetch
    pts = ";".join(f"{lng},{lat}" for lat, lng in coords)
    url = f"{OSRM_BASE}{pts}?overview=full&geometries=geojson"
    data = fetch(url)
    if not data or data.get("code") != "Ok" or not data.get("routes"):
        return None
    route = data["routes"][0]
    geometry = [[c[0], c[1]] for c in route["geometry"]["coordinates"]]
    leg_km = [round(leg["distance"] / 1000.0, 2) for leg in route.get("legs", [])]
    return {"geometry": geometry, "leg_km": leg_km}


def _haversine_fallback(stops):
    geometry, leg_km = [], []
    for i, s in enumerate(stops):
        if s["lat"] is not None and s["lng"] is not None:
            geometry.append([s["lng"], s["lat"]])
        if i > 0:
            a, b = stops[i - 1], stops[i]
            if None in (a["lat"], a["lng"], b["lat"], b["lng"]):
                leg_km.append(0.0)
            else:
                leg_km.append(round(haversine_km((a["lat"], a["lng"]), (b["lat"], b["lng"])), 2))
    return {"geometry": geometry, "leg_km": leg_km, "length_km": round(sum(leg_km), 2), "partial": True}


def build_geometry(stops, fetch=None, throttle=0.0):
    """stops : liste {slug,lat,lng} ordonnée. Tente OSRM si tous géocodés, sinon
    fallback haversine. Retourne {geometry, leg_km, length_km, partial}."""
    coords = [(s["lat"], s["lng"]) for s in stops]
    if any(lat is None or lng is None for lat, lng in coords):
        return _haversine_fallback(stops)
    if throttle:
        time.sleep(throttle)
    res = osrm_route(coords, fetch=fetch)
    if res is None:
        return _haversine_fallback(stops)
    return {
        "geometry": res["geometry"],
        "leg_km": res["leg_km"],
        "length_km": round(sum(res["leg_km"]), 2),
        "partial": False,
    }
