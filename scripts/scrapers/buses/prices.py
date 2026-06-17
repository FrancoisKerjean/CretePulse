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
    # Orthographes DB alternatives constatées le 13/06/2026 (mêmes lieux) :
    # sans ces clés, l'estimation au km ne s'applique pas (lookup exact).
    "elafonisi": (35.2706, 23.5400),     # = elafonissi
    "almirida": (35.4569, 24.1614),      # = almyrida
    "anogia": (35.2899, 24.8826),        # = anogeia
    # Villages/sites ouest desservis par e-ktel (ajout chantier 3, 13/06/2026).
    # Précision ~1 km, suffisante pour une estimation au km flaggée indicatif.
    "maleme": (35.5220, 23.8280),
    "spili": (35.2130, 24.5370),
    "perama": (35.3680, 24.6920),
    "arkadi": (35.3100, 24.6290),
    "ancient eleftherna museum": (35.3296, 24.6726),
    "theriso": (35.4130, 23.9920),
    "meskla": (35.4080, 23.9380),
    "vamos": (35.4120, 24.2000),
    "sternes": (35.5210, 24.1310),
    "voukolies": (35.4600, 23.7850),
    "ano mero": (35.2320, 24.6330),
    "ano meros": (35.2320, 24.6330),
    "falasarna": (35.4770, 23.5810),
    "platanos": (35.4640, 23.5940),
    "fragokastelo": (35.1810, 24.2320),
    "anopoli": (35.2130, 24.0850),
    "xyloskalo": (35.3080, 23.9180),     # entrée gorge de Samaria (Omalos)
    "agia roumeli": (35.2290, 23.9640),
    "preveli": (35.1560, 24.4670),
    "myrthio": (35.2050, 24.4010),
    "myrthios": (35.2050, 24.4010),
    "tavronitis": (35.5120, 23.7490),
    "gerani": (35.5180, 23.8790),
    "pano stalos": (35.5120, 23.9510),
    "stalos": (35.5120, 23.9510),
    "kamisiana": (35.5130, 23.7280),
    "kissamos port": (35.5030, 23.6450),
    "aradena": (35.2220, 24.0620),
    "kefalas": (35.4310, 24.2520),
    # Villages desservis ajoutés au chantier curation réseau (14/06/2026) :
    # géocodés via Nominatim PUIS validés par garde-fou de cohérence (coord à < 45 km
    # d'un terminus fiable de la même ligne) — les homonymes mal placés ont été rejetés.
    "afrata": (35.5706, 23.7661),
    "ag. konstantinos": (35.1562, 25.5156),
    "ag. paraskevi": (35.3604, 24.5713),
    "aloides": (35.3648, 24.8756),
    "amari": (35.2042, 24.6890),
    "ano asites": (35.1947, 24.9994),
    "armeni": (35.3039, 24.4610),
    "asimi": (35.0424, 25.0935),
    "charaso": (35.2713, 25.3098),
    "chordaki": (35.5525, 24.1625),
    "chromonastiri": (35.3268, 24.5104),
    "dafnes": (35.2161, 25.0505),
    "deliana": (35.4493, 23.7390),
    "eleftherna": (35.3331, 24.6749),
    "erfi": (35.3590, 24.6347),
    "fodele beach": (35.4023, 24.9557),
    "galipe": (35.2797, 25.2675),
    "garazo": (35.3440, 24.7879),
    "garipa": (35.0763, 25.2465),
    "grammeno": (35.2333, 23.6362),
    "kalo chorio pediados": (35.1185, 25.2804),
    "kalyvos": (35.3133, 24.7956),
    "kampi": (35.4178, 24.0693),
    "kastellakia": (35.3594, 24.4992),
    "kato metochi": (35.1855, 25.4315),
    "korfes": (35.2594, 25.0069),
    "koumoi": (35.2740, 24.4416),
    "kountoura": (35.2402, 23.6235),
    "krios": (35.2316, 23.5906),
    "kyriana": (35.3432, 24.6034),
    "larani": (35.1058, 25.0658),
    "lochria": (35.1563, 24.7850),
    "malaki": (35.2851, 24.4141),
    "manoliopoulo": (35.4697, 23.8563),
    "maroula": (35.3586, 24.5495),
    "milliarades": (35.0941, 25.3960),
    "moni": (35.2886, 25.0120),
    "moundros": (35.2767, 24.3675),
    "mountros": (35.2767, 24.3675),
    "nteres": (35.4367, 23.8436),
    "orthes": (35.3369, 24.6972),
    "palaia roumata": (35.4004, 23.7799),
    "pantanassa": (35.2561, 24.5945),
    "patelari": (35.4886, 23.9082),
    "perivolia": (35.4847, 23.9933),
    "pontikiana": (35.4982, 23.7925),
    "prinias": (35.1605, 24.9933),
    "prinos": (35.3847, 24.6190),
    "ramni": (35.4001, 24.1046),
    "ravdoucha": (35.5404, 23.7341),
    "rodia": (35.3652, 25.0202),
    "rodopou": (35.6195, 23.7438),
    "roupes": (35.3427, 24.6356),
    "roustika": (35.2872, 24.3737),
    "saitoures": (35.2795, 24.3873),
    "sarchos": (35.2248, 24.9981),
    "sempronas": (35.3822, 23.8156),
    "skouloufia": (35.3477, 24.6388),
    "somata": (35.4094, 24.0147),
    "souda": (35.4871, 24.0659),
    "tria monastiria": (35.3480, 24.4655),
    "tsesmes": (35.3663, 24.5368),
    "valsamonero": (35.3014, 24.4210),
    "varipetro": (35.4654, 23.9626),
    "vederi": (35.3425, 24.4143),
    "vrisses": (35.3770, 24.2007),
    # Micro-fix data 18/06/2026 (post-audit appariement GPS) : lieux réels manquants,
    # coords sûres. Sert surtout l'estimation de prix + le géocodage des arrêts
    # (gtfs_stops_build), pas forcément l'appariement (pas de ligne OSM vers Vai).
    "vai": (35.2543, 26.2640),            # plage/palmeraie NE (route Siteia<->Vai)
    "maleme beach": (35.5220, 23.8280),   # = maleme + suffixe "beach"
    "rodakino": (35.1936, 24.3447),       # village côte sud (préfecture Rethymno)
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
