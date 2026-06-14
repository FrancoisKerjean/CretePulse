"""Fetch Overpass : requête réseau bus Crète, retry + miroir de secours.
Le POST HTTP est injecté (testable sans réseau)."""
import time

OVERPASS_QUERY = (
    '[out:json][timeout:180];'
    'relation["route"="bus"](34.78,23.40,35.75,26.40);'
    'out body;node(r);out body;'
)
MIRRORS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]


def _http_post(url, query):
    import requests
    try:
        r = requests.post(url, data={"data": query},
                          headers={"User-Agent": "crete.direct-bot/1.0 (+https://crete.direct)"},
                          timeout=200)
        return r.json() if r.status_code == 200 else None
    except Exception:
        return None


def fetch_overpass(query=OVERPASS_QUERY, fetch=None, mirrors=MIRRORS, throttle=0.0):
    """Retourne la liste `elements` (>0) ou None si tous les miroirs échouent."""
    fetch = fetch or _http_post
    for url in mirrors:
        for _ in (1, 2):
            data = fetch(url, query)
            if data and data.get("elements"):
                return data["elements"]
            if throttle:
                time.sleep(throttle)
    return None
