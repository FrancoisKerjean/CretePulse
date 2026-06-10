"""Prix des routes bus (est-Crete, herlas).

Plan A : tarifs officiels via l'API billetterie ktelherlas (voir
PRICES_INVESTIGATION.md). Aucune API exploitable identifiee (10/06/2026) :
fetch_official_fares retourne {} et le plan B s'applique.
Plan B (valide Kami 10/06/2026) :
  1. CURATED_PRICES : liaisons principales, sources recoupees (tableau et
     sources dans PRICES_INVESTIGATION.md) -> price_estimated=False.
  2. Estimation au km : haversine entre PLACE_COORDS, tarif BASE + EUR_PER_KM
     calibre sur les prix cures -> price_estimated=True, l'UI affiche
     « indicatif ».
  3. Coordonnees inconnues (arrets hotels, supermarches...) -> pas de prix
     (UI : « tarif au guichet »).
"""
from math import asin, cos, radians, sin, sqrt

# (from, to) en minuscules, orthographe DB ; lookup symetrique.
# Sources : PRICES_INVESTIGATION.md (greeka.com 10/06/2026 + grille e-ktel).
CURATED_PRICES: dict[tuple[str, str], float] = {
    ("heraklion", "kokkini hani"): 2.10,
    ("heraklion", "malia"): 4.20,
    ("heraklion", "matala"): 8.50,
    ("heraklion", "chania"): 15.00,
    ("heraklion", "chania-express"): 15.00,  # meme liaison, libelle express herlas
    ("heraklion", "rethymno"): 8.00,
    ("heraklion", "agios nikolaos"): 7.80,
    ("heraklion", "ierapetra"): 12.00,
    ("heraklion", "siteia"): 16.00,
    ("heraklion", "moires"): 6.00,
    ("heraklion", "agia galini"): 8.80,
    ("heraklion", "tympaki"): 7.50,
    ("heraklion", "anogeia"): 4.20,
    ("heraklion", "kalessa"): 2.00,
    ("heraklion", "stayrakia"): 2.00,
    ("heraklion", "ano asites"): 2.90,
    ("heraklion", "prinias"): 3.50,
    ("heraklion", "prof.ilias"): 2.30,
    ("heraklion", "rodia"): 2.10,
    ("heraklion", "dafnes"): 2.80,
    ("heraklion", "ano archanes"): 2.10,
    ("heraklion", "arkalochori"): 4.00,
    ("heraklion", "ano viannos"): 7.60,
    ("heraklion", "mesochorio"): 5.70,
    ("heraklion", "asimi"): 5.70,
    ("heraklion", "sgoyrokefali"): 2.30,
    ("agios nikolaos", "kalo chorio lasithioy"): 2.00,
    ("agios nikolaos", "ierapetra"): 4.10,
    ("agios nikolaos", "siteia"): 8.30,
    # Ouest (e-ktel), source greeka.com chania + rethymno 10/06/2026.
    # Kissamos exclu : CURATED_EKTEL (operateur) dit 5.50, greeka 5.10.
    ("chania", "sfakia"): 8.30,
    ("chania", "chora sfakion"): 8.30,
    ("chania", "sougia"): 4.40,
    ("chania", "paleochora"): 8.30,
    ("chania", "voukolies"): 3.80,
    ("chania", "stavros"): 2.30,
    ("chania", "sternes"): 2.30,
    ("chania", "almyrida"): 3.20,
    ("chania", "kalyves"): 2.70,
    ("chania", "kalives"): 2.70,
    ("rethymno", "plakias"): 5.00,
    ("rethymno", "ancient eleftherna"): 3.80,
    ("rethymno", "margarites"): 3.80,
    ("rethymno", "ano mero"): 5.70,
    ("rethymno", "agia galini"): 6.70,
    ("rethymno", "koumoi"): 2.00,
    ("rethymno", "chania airport"): 8.00,
}

# Lieux principaux est-Crete (lat, lng), orthographe DB en minuscules.
# Couvre les liaisons intercity ; les arrets hotels/supermarches restent
# sans coordonnees donc sans prix (tarif au guichet).
PLACE_COORDS: dict[str, tuple[float, float]] = {
    "heraklion": (35.3387, 25.1442),
    "agios nikolaos": (35.1909, 25.7136),
    "ierapetra": (35.0114, 25.7411),
    "siteia": (35.2078, 26.1029),
    "malia": (35.2853, 25.4624),
    "hersonisos": (35.3186, 25.3928),
    "matala": (34.9959, 24.7492),
    "moires": (35.0511, 24.8728),
    "anogeia": (35.2899, 24.8826),
    "ano viannos": (35.0461, 25.4067),
    "kokkini hani": (35.3306, 25.2419),
    "eloynta": (35.2576, 25.7204),
    "kritsa": (35.1601, 25.6471),
    "makry gyalos": (35.0394, 25.9728),
    "myrtos": (35.0042, 25.5879),
    "mochos": (35.2864, 25.4427),
    "stalida": (35.2937, 25.4378),
    "sisi": (35.3092, 25.5237),
    "gouves": (35.3271, 25.3066),
    "tympaki": (35.0719, 24.7681),
    "agia galini": (35.0967, 24.6906),
    "faistos": (35.0514, 24.8136),
    "arkalochori": (35.1481, 25.2622),
    "kastelli pediados": (35.2069, 25.3361),
    "ano archanes": (35.2381, 25.1611),
    "thrapsano": (35.2167, 25.2833),
    "myrtia": (35.2433, 25.2103),
    "zakros": (35.0989, 26.2186),
    "palaiokastro sitia": (35.1986, 26.2486),
    "ziros": (35.0931, 26.1306),
    "mochlos": (35.1856, 25.9061),
    "kalo chorio lasithioy": (35.1497, 25.7956),
    "ferma": (35.0119, 25.8003),
    "peykos": (35.0306, 25.5169),
    "sykologos": (35.0292, 25.4831),
    "mesochorio": (35.0394, 25.3550),
    "demati": (35.0617, 25.3083),
    "kroysonas": (35.2306, 24.9617),
    "cretaquarium": (35.3325, 25.2792),            # Gournes
    "cretaquarium (gournes)": (35.3325, 25.2792),
    "plaka(ag.nikolaos)": (35.2828, 25.7367),
    "kroystas": (35.1392, 25.6442),
    "aygeniki": (35.2106, 25.0806),
    "kamares": (35.1392, 24.8294),
    "chania": (35.5138, 24.0180),
    "rethymno": (35.3644, 24.4821),
    # Ouest (e-ktel)
    "chania airport": (35.5317, 24.1497),
    "kissamos": (35.4944, 23.6558),
    "kasteli": (35.4944, 23.6558),       # = Kissamos (libelle PDF possible)
    "elafonissi": (35.2706, 23.5400),
    "paleochora": (35.2261, 23.6786),
    "sougia": (35.2486, 23.8089),
    "chora sfakion": (35.2008, 24.1364),
    "sfakia": (35.2008, 24.1364),
    "omalos": (35.3294, 23.8956),
    "georgioupolis": (35.3617, 24.2581),
    "kavros": (35.3681, 24.2767),
    "bali": (35.4106, 24.7831),
    "plakias": (35.1894, 24.3992),
    "platanias": (35.5158, 23.9075),
    "agia marina": (35.5161, 23.9219),
    "kolymbari": (35.5394, 23.7800),
    "almyrida": (35.4569, 24.1614),
    "kalyves": (35.4628, 24.1283),
    "kalives": (35.4628, 24.1283),
    "stavros": (35.5919, 24.0958),
    "panormo": (35.4144, 24.6906),
    "margarites": (35.3247, 24.6594),
    "vryses": (35.3700, 24.2069),
}

BASE_FARE = 1.20    # plancher (ticket zone urbaine herlas, greeka 10/06/2026)
EUR_PER_KM = 0.145  # calibre sur CURATED_PRICES (cf test_eur_per_km_calibration)


def _norm(place: str) -> str:
    return place.lower().strip()


def haversine_km(a: tuple[float, float], b: tuple[float, float]) -> float:
    lat1, lng1, lat2, lng2 = map(radians, (a[0], a[1], b[0], b[1]))
    h = sin((lat2 - lat1) / 2) ** 2 + cos(lat1) * cos(lat2) * sin((lng2 - lng1) / 2) ** 2
    return 2 * 6371.0 * asin(sqrt(h))


def lookup_curated(from_place: str, to_place: str) -> float | None:
    key = (_norm(from_place), _norm(to_place))
    return CURATED_PRICES.get(key) or CURATED_PRICES.get((key[1], key[0]))


def estimate_price(from_place: str, to_place: str) -> float | None:
    ca, cb = PLACE_COORDS.get(_norm(from_place)), PLACE_COORDS.get(_norm(to_place))
    if not ca or not cb:
        return None
    km = haversine_km(ca, cb)
    return max(BASE_FARE, round((BASE_FARE + km * EUR_PER_KM) * 10) / 10)


def fetch_official_fares() -> dict[tuple[str, str], float]:
    """Plan A : tarifs officiels par paire d'arrets via l'API billetterie.
    Aucune API exploitable identifiee (PRICES_INVESTIGATION.md) -> {}."""
    return {}


def enrich_prices(routes: list[dict]) -> list[dict]:
    """Complete price_eur/price_estimated in-place. Priorite :
    prix deja scrape > officiel API > cure > estime > rien."""
    official = fetch_official_fares()
    for r in routes:
        if r.get("price_eur") is not None:
            r["price_estimated"] = False
            continue
        key = (_norm(r["from_place"]), _norm(r["to_place"]))
        off = official.get(key) or official.get((key[1], key[0]))
        if off is not None:
            r["price_eur"], r["price_estimated"] = off, False
            continue
        cur = lookup_curated(r["from_place"], r["to_place"])
        if cur is not None:
            r["price_eur"], r["price_estimated"] = cur, False
            continue
        est = estimate_price(r["from_place"], r["to_place"])
        if est is not None:
            r["price_eur"], r["price_estimated"] = est, True
        else:
            r["price_eur"], r["price_estimated"] = None, False
    return routes
