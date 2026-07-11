"""Parsers KTEL -> schema normalise commun.

Architecture reelle (verifiee sur fixtures 21/05, decision Kami Option 1) :
  - herlas (Heraklion-Lasithi, EST) : site Next.js.
      * page index `/en/timetables` -> liens vers pages detail `?ds=fromID,toID`
      * page detail -> blocs `timetable_box` (titre "FROM - TO", jours, horaires)
      Selecteurs matches par PREFIXE de classe car les hash CSS-module
      (`__gq8SF`, `__iH0GL`...) changent a chaque build du site KTEL.
  - ektel (Chania-Rethymno, OUEST) : site Joomla.
      * page index = groupes + dates "valid from" pointant vers des PDF.
      * routes ouest = CURATED_EKTEL (curation terrain) datees via l'index.

Chaque route normalisee : from_place, to_place, duration, price_eur,
frequency, departures(list|None).
"""
import re
from html import unescape
from urllib.parse import urljoin

import bs4
from bs4 import BeautifulSoup

HERLAS_BASE = "https://www.ktelherlas.gr"
EKTEL_BASE = "https://www.e-ktel.com"

_DATE_RE = re.compile(r"(\d{2})-(\d{2})-(\d{4})")
_PRICE_RE = re.compile(r"(\d+[.,]\d{1,2})")
_TIME_RE = re.compile(r"^\d{1,2}:\d{2}$")  # un seul horaire HH:MM exact
_HHMM_RE = re.compile(r"\b(\d{1,2}:\d{2})\b")

# Le PDF e-ktel double chaque label : GREEK/ENGLISH. On ignore le grec et on
# matche tous les segments anglais derrière `/`. Un segment route contient un
# tiret ('CHANIA-HERAKLION'), un segment frequency commence par un jour ou EVERY.
# Le `(` est aussi un terminateur : sans lui, un suffixe entre parentheses
# ('CHANIA-KASTELI (KISSAMOS)') empechait le segment de matcher (la lookahead
# exigeait /, une heure ou la fin de ligne) -> ligne Kissamos jetee (fix 13/06).
_PDF_SEG_RE = re.compile(r"/\s*([A-Z][A-Z0-9 .\-]+?)(?=\s*[/(]|\s*\d{1,2}:\d{2}|\s*$)")

_FREQ_HEAD = (
    "EVERY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY",
    "SATURDAY", "SUNDAY", "DAILY", "WEEKDAYS", "WEEKEND",
)

# Mots à ignorer en début/fin de nom de route (résidus Joomla).
# NB : XANIA n'est PAS du bruit, c'est la translittération grecque de Chania
# (bug pré-13/06 : jeté comme noise -> endpoints faux type 'Maleme-Creta Paradise').
_NAME_NOISE = {"EXPRESS", "KA", "EI", "BAR"}

# Translittérations/abréviations -> orthographe DB canonique.
# Les 2 formes 'MUSEUM OF ANCIENT...' viennent du wrap des PDF 2 colonnes
# (nom coupé selon la colonne) : même lieu canonique.
_STOP_ALIASES = {
    "XANIA": "CHANIA",
    "CHANIA": "CHANIA",
    "AG. MARINA": "AGIA MARINA",
    "AG MARINA": "AGIA MARINA",
    "MUSEUM OF ANCIENT": "ANCIENT ELEFTHERNA MUSEUM",
    "MUSEUM OF ANCIENT ELEFTHERNA": "ANCIENT ELEFTHERNA MUSEUM",
    # Kasteli = chef-lieu de l'eparchie de Kissamos : meme ville, l'index/DB
    # et bus-pairs canonisent en "Kissamos" (la ligne CHANIA-KASTELI est LA
    # liaison Chania-Kissamos, horaires reels 06:00->21:30).
    "KASTELI": "KISSAMOS",
    "KASTELI (KISSAMOS)": "KISSAMOS",
    # PDF e-ktel ecrit "ELAFONISI" (1 s) ; DB/bus-pairs/CURATED canonisent en
    # "Elafonissi" (2 s) -> sans alias, la ligne scrapee (horaires) et la curee
    # (prix) restent 2 routes distinctes dont une vide (constat prod 13/06).
    "ELAFONISI": "ELAFONISSI",
    # Typos du PDF RETHYMNO (audit bus_search_zero 11/07/2026) : 'RERHYMNO'
    # (boucle villages) et 'HRAKLEIO' devenaient des LIEUX en DB (4+14
    # recherches/mois a 0 resultat). 'OLD ROAD' = variante d'itineraire de la
    # ligne Rethymno-Heraklion, pas une destination : canonise vers la ville
    # (la variante dedup ensuite contre la ligne principale, perte assumee —
    # memes terminus, seuls les horaires varient).
    "RERHYMNO": "RETHYMNO",
    "HRAKLEIO": "HERAKLION",
    "HRAKLEIO OLD ROAD": "HERAKLION",
    "RETHYMNO OLD ROAD": "RETHYMNO",
    "HERAKLION OLD ROAD": "HERAKLION",
}

# Un arrêt contenant un de ces mots est un point hôtel/POI de navette,
# pas un lieu desservi publiable (constaté PDF CHANIA 06/06/2026 :
# 'CRETA PARADISE', 'VILLA HELIOS', 'AEGEAN PALACE HOTELS').
_HOTEL_STOP_WORDS = {"HOTEL", "HOTELS", "VILLA", "PALACE", "PARADISE", "RESORT", "BEACH CLUB"}

# Un segment PDF contenant un de ces mots est une footnote (note de
# correspondance ferry, itinéraire détaillé), pas un nom de route.
# Constaté en prod 10/06/2026 : "DEPARTURE AFTER THE ARRIVAL OF THE FERRY
# BOAT FROM BALOS - GRAMVOUSA", "THROUGH MILONIANA", "PASSES THROUGH MYRTHIOS".
_FOOTNOTE_WORDS = {"THROUGH", "DEPARTURE", "ARRIVAL", "PASSES", "FERRY", "VIA"}

# Validation d'endpoint herlas (audit 11/07/2026) : le HTML herlas n'appliquait
# AUCUN des filtres du chemin ektel -> 16 routes navettes hotels ('Malia Palace',
# 'Annabelle-(Anissaras Hotels)', 'Α14 Panorama Village'…) et une footnote
# ('Return 09:40 From Ampelos (Potamos)') etaient des LIEUX selectionnables en
# prod. VILLAGE ne vaut que pour les complexes hoteliers ('Zorbas Village') :
# les villages reels herlas n'utilisent jamais le mot anglais dans leur nom.
_HOTEL_ENDPOINT_WORDS = _HOTEL_STOP_WORDS | {"VILLAGE"}
_ENDPOINT_NOISE_WORDS = _FOOTNOTE_WORDS | {"RETURN", "FROM"}


def _is_public_endpoint(name: str) -> bool:
    """False si le nom est une navette hotel, une footnote ou contient un horaire
    (donc pas un lieu publiable comme terminus de route)."""
    if _HHMM_RE.search(name):
        return False
    tokens = set(re.sub(r"[^0-9A-Za-zΆ-ώ]+", " ", name).upper().split())
    if tokens & _HOTEL_ENDPOINT_WORDS:
        return False
    if tokens & _ENDPOINT_NOISE_WORDS:
        return False
    return True


def _price(text):
    if not text:
        return None
    m = _PRICE_RE.search(text)
    return float(m.group(1).replace(",", ".")) if m else None


def _has_class_prefix(prefix):
    """Predicat bs4 : element dont une classe commence par `prefix`."""
    def pred(tag):
        return tag.has_attr("class") and any(c.startswith(prefix) for c in tag["class"])
    return pred


def _to_iso(text):
    """'19-05-2026' -> '2026-05-19' (premiere date trouvee), sinon None."""
    m = _DATE_RE.search(text or "")
    if not m:
        return None
    d, mo, y = m.groups()
    return f"{y}-{mo}-{d}"


# Villes du continent grec listees par KTEL (liaisons longue distance via ferry).
# crete.direct = data Crete uniquement -> on exclut tout trajet qui les touche.
MAINLAND_PLACES = {
    "athens", "athina", "athina (kifisos)", "thessaloniki", "larisa", "larissa",
    "lamia", "ioannina", "patra", "patras", "volos", "trikala", "katerini",
    "kavala", "kalamata", "tripoli", "korinthos", "corinth", "xanthi", "drama",
    "serres", "veria", "kozani", "agrinio", "pyrgos", "alexandroupoli", "kilkis",
    "ekt​os krhths", "ektos kritis", "mainland",
}


def is_crete_route(from_place: str, to_place: str) -> bool:
    """True seulement si les deux extremites sont en Crete (ni l'une ni l'autre
    n'est une ville du continent grec)."""
    a, b = from_place.strip().lower(), to_place.strip().lower()
    return a not in MAINLAND_PLACES and b not in MAINLAND_PLACES


def _split_route(title):
    """'HERAKLION - RETHYMNO' -> ('Heraklion', 'Rethymno')."""
    parts = re.split(r"\s+[-–→]\s+", title.strip(), maxsplit=1)
    if len(parts) != 2:
        return None
    f, t = parts[0].strip(), parts[1].strip()
    return (f.title(), t.title()) if f and t else None


# --- herlas (EST) -----------------------------------------------------------

def parse_herlas_index(html: str) -> list[str]:
    """Liste dedupliquee des URLs detail (absolues) trouvees sur l'index."""
    soup = BeautifulSoup(html, "html.parser")
    seen, urls = set(), []
    for a in soup.select("a[href]"):
        href = unescape(a["href"])
        if "/timetables/timetable" in href and "ds=" in href:
            full = urljoin(HERLAS_BASE, href)
            if full not in seen:
                seen.add(full)
                urls.append(full)
    return urls


def parse_herlas_detail(html: str) -> list[dict]:
    """Parse une page detail herlas -> routes (un bloc `timetable_box` par route).

    Un `timetable_box` peut contenir PLUSIEURS `timetable_valuesWrapper`, chacun
    portant un `daysWrapper` (ex: 'Mon-Fri', 'Sat', 'Sun') + sa propre liste
    `timetable_time__`. On extrait chaque sous-grille distincte dans
    `departures_by_day` au lieu de fusionner (bug doublons 02/06/2026).

    Sortie :
      - `departures_by_day`: [{days: 'Mon, Tue, ...', times: ['07:20', '10:00']}, ...]
      - `departures`: liste flat triee+dedupliquee (retrocompat affichage, range).
      - `frequency`: jours de la PREMIERE sous-grille (descripteur principal).
    """
    soup = BeautifulSoup(html, "html.parser")
    routes = []
    for box in soup.find_all(_has_class_prefix("timetable_box")):
        title_el = box.find(_has_class_prefix("timetable_title"))
        if not title_el:
            continue
        rt = _split_route(title_el.get_text(strip=True))
        if not rt:
            continue
        from_place, to_place = rt
        if not is_crete_route(from_place, to_place):
            continue  # exclut les liaisons continent (data Crete only)
        if not (_is_public_endpoint(from_place) and _is_public_endpoint(to_place)):
            continue  # navettes hotels / footnotes : pas des lieux publiables

        # Itere chaque sous-grille (valuesWrapper = days + times).
        # ATTENTION : `timetable_time__<hash>` = un horaire ; `timetable_times__<hash>`
        # = le conteneur (texte = tous les horaires colles). On prend le prefixe avec
        # double underscore + on filtre sur HH:MM exact pour exclure le conteneur.
        by_day: list[dict] = []
        for vw in box.find_all(_has_class_prefix("timetable_valuesWrapper")):
            days_el = vw.find(_has_class_prefix("timetable_daysWrapper")) or vw.find(
                _has_class_prefix("timetable_days")
            )
            days = days_el.get_text(" ", strip=True).rstrip(":") if days_el else None
            sub_times = [t.get_text(strip=True) for t in vw.find_all(_has_class_prefix("timetable_time__"))]
            sub_times = [t for t in sub_times if _TIME_RE.match(t)]
            if not sub_times:
                continue
            by_day.append({"days": days or "Daily", "times": sub_times})

        # Fallback : si aucun valuesWrapper trouve (markup different), retombe
        # sur l'ancienne logique (1 grille fusionnee au niveau du box).
        if not by_day:
            days_el = box.find(_has_class_prefix("timetable_daysWrapper")) or box.find(
                _has_class_prefix("timetable_days")
            )
            days = days_el.get_text(" ", strip=True).rstrip(":") if days_el else None
            times = [t.get_text(strip=True) for t in box.find_all(_has_class_prefix("timetable_time__"))]
            times = [t for t in times if _TIME_RE.match(t)]
            if times:
                by_day.append({"days": days or "Daily", "times": times})

        flat = sorted({t for grp in by_day for t in grp["times"]})
        frequency = by_day[0]["days"] if by_day else None
        routes.append({
            "from_place": from_place,
            "to_place": to_place,
            "duration": None,
            "price_eur": None,
            "frequency": frequency,
            "departures": flat or None,
            "departures_by_day": by_day or None,
        })
    return routes


# --- ektel (OUEST) ----------------------------------------------------------

def parse_ektel_index(html: str) -> list[dict]:
    """Groupes d'horaires ouest + date 'valid from' + lien PDF (curation freshness)."""
    soup = BeautifulSoup(html, "html.parser")
    table = soup.select_one("table.table-striped")
    groups = []
    if not table:
        return groups
    for tr in table.select("tr"):
        text = tr.get_text(" ", strip=True)
        if not text or "VALID" not in text.upper():
            continue
        label = re.split(r"[›>]", text, maxsplit=1)[0].strip()  # avant le '>'
        pdf = None
        a = tr.find("a", href=True)
        if a:
            pdf = urljoin(EKTEL_BASE, a["href"])
        groups.append({"label": label, "valid_from": _to_iso(text), "pdf": pdf})
    return groups


# Routes ouest curees (liaisons reelles, verifiables sur l'index/PDF KTEL).
# valid_from rafraichi a l'execution via parse_ektel_index. Duree/prix laisses
# a None : non verifies ici (regle no-invention) -> la page renvoie au PDF KTEL
# date pour le detail. frequency = descripteur qualitatif sur (KTEL dessert ces
# liaisons quotidiennement).
CURATED_EKTEL = [
    {"from_place": "Chania", "to_place": "Rethymno", "duration": "1h", "price_eur": 6.20, "frequency": "Daily"},
    {"from_place": "Chania", "to_place": "Heraklion", "duration": "2h 30min", "price_eur": 15.00, "frequency": "Daily"},
    {"from_place": "Rethymno", "to_place": "Heraklion", "duration": "1h 30min", "price_eur": 8.00, "frequency": "Daily"},
    {"from_place": "Chania", "to_place": "Chania Airport", "duration": "25min", "price_eur": 2.50, "frequency": "Daily"},
    {"from_place": "Chania", "to_place": "Elafonissi", "duration": "2h 30min", "price_eur": 11.00, "frequency": "Daily (summer)"},
    {"from_place": "Chania", "to_place": "Kissamos", "duration": "50min", "price_eur": 5.50, "frequency": "Daily"},
]


# Surcharge curée duration + price_eur pour les routes herlas où le HTML KTEL
# n'expose pas ces champs. Source : pages /getting-around/[route]/page.tsx
# ROUTES[] (curation Kami, vérifiée contre tarifs KTEL Heraklion-Lasithi publics).
# Appliqué par scrape_herlas() après parsing pour respecter no-invention :
# data validée externe, pas devinée.
# Clé : (from_place lowercased, to_place lowercased) → (duration str, price float).
CURATED_HERLAS_DURATIONS_PRICES: dict[tuple[str, str], tuple[str, float]] = {
    ("heraklion", "chania"):           ("2h 30min", 15.00),
    ("chania", "heraklion"):           ("2h 30min", 15.00),
    ("heraklion", "rethymno"):         ("1h 30min", 8.00),
    ("rethymno", "heraklion"):         ("1h 30min", 8.00),
    ("heraklion", "agios nikolaos"):   ("1h 30min", 8.00),
    ("agios nikolaos", "heraklion"):   ("1h 30min", 8.00),
    # NB orthographes DB (constat 13/06/2026) : "Siteia", "Eloynta",
    # "Hersonisos" — les deux graphies sont clees pour survivre aux variantes.
    ("heraklion", "sitia"):            ("3h 30min", 16.00),
    ("sitia", "heraklion"):            ("3h 30min", 16.00),
    ("heraklion", "siteia"):           ("3h 30min", 16.00),
    ("siteia", "heraklion"):           ("3h 30min", 16.00),
    ("heraklion airport", "heraklion"): ("15min", 1.20),
    ("heraklion", "heraklion airport"): ("15min", 1.20),
    ("agios nikolaos", "elounta"):     ("20min", 1.80),
    ("elounta", "agios nikolaos"):     ("20min", 1.80),
    ("agios nikolaos", "eloynta"):     ("20min", 1.80),
    ("eloynta", "agios nikolaos"):     ("20min", 1.80),
    ("agios nikolaos", "sitia"):       ("1h 45min", 8.10),
    ("sitia", "agios nikolaos"):       ("1h 45min", 8.10),
    ("agios nikolaos", "siteia"):      ("1h 45min", 8.10),
    ("siteia", "agios nikolaos"):      ("1h 45min", 8.10),
    ("heraklion", "malia"):            ("45min", 4.30),
    ("malia", "heraklion"):            ("45min", 4.30),
    ("heraklion", "hersonissos"):      ("35min", 3.90),
    ("hersonissos", "heraklion"):      ("35min", 3.90),
    ("heraklion", "hersonisos"):       ("35min", 3.90),
    ("hersonisos", "heraklion"):       ("35min", 3.90),
    # Liaison express herlas (libelle DB "Chania-Express") : memes terminus
    # que Chania, duree/prix operateur identiques a la ligne standard.
    ("heraklion", "chania-express"):   ("2h 30min", 15.00),
    ("chania-express", "heraklion"):   ("2h 30min", 15.00),
    ("heraklion", "ierapetra"):        ("2h 30min", 10.50),
    ("ierapetra", "heraklion"):        ("2h 30min", 10.50),
    ("heraklion", "matala"):           ("2h", 8.30),
    ("matala", "heraklion"):           ("2h", 8.30),
}


def _clean_route_name(raw: str) -> str:
    """Nettoie un nom de route brut du PDF e-ktel : retire noise + collapse spaces."""
    s = raw.strip()
    # Retire les mots-noise en début OU fin (EXPRESS, KA, XANIA…)
    parts = s.split()
    while parts and parts[0] in _NAME_NOISE:
        parts.pop(0)
    while parts and parts[-1] in _NAME_NOISE:
        parts.pop()
    # Tronque au premier mot de fréquence : le box EXPRESS du PDF CHANIA colle
    # 'CHANIA-HERAKLION EVERY DAY' sur une ligne -> sans coupe, 'Heraklion Every
    # Day' devenait un LIEU en DB (pollution combobox, constat prod 11/07/2026).
    for i, p in enumerate(parts):
        if p in _FREQ_HEAD:
            parts = parts[:i]
            break
    s = " ".join(parts)
    # Normalise tirets / espaces multiples
    s = re.sub(r"\s*-\s*", "-", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def _clean_stop(raw: str) -> str | None:
    """Normalise un segment d'arrêt : retire '*' (renvoi footnote), applique
    les alias (XANIA->CHANIA, AG. MARINA->AGIA MARINA), filtre bruit et
    arrêts hôtels. None = segment à jeter."""
    s = raw.strip().strip("*").strip()
    if not s or s in _NAME_NOISE:
        return None
    s = _STOP_ALIASES.get(s, s)
    words = set(s.split())
    if words & _HOTEL_STOP_WORDS:
        return None
    return s.title()


def _route_stops(name: str) -> list[str] | None:
    """De 'CHANIA-GEORGIOUPOLIS-KAVROS-RETHYMNO-BALI-HERAKLION' renvoie la
    séquence complète ['Chania', 'Georgioupolis', ..., 'Heraklion'].
    Les arrêts hôtels/bruit sont filtrés ; None si < 2 arrêts valides."""
    cleaned = [s for p in name.split("-") if (s := _clean_stop(p)) is not None]
    # dédoublonne en préservant l'ordre (PDF répète parfois un arrêt)
    seen: set[str] = set()
    stops = [s for s in cleaned if not (s in seen or seen.add(s))]
    # Ligne en BOUCLE ('RETHYMNO-ERFI-...-RETHYMNO', villages autour d'un hub) :
    # le dédup ne doit pas transformer la boucle en 'hub -> dernier village',
    # on re-pose le terminus identique au départ (self-loop, via_stops intacts).
    if len(cleaned) >= 2 and cleaned[-1] == cleaned[0] and stops and stops[-1] != cleaned[-1]:
        stops.append(cleaned[-1])
    if len(stops) < 2:
        return None
    return stops


def _route_endpoints(name: str) -> tuple[str, str] | None:
    """Terminus (premier, dernier) de la séquence d'arrêts, None si invalide."""
    stops = _route_stops(name)
    return (stops[0], stops[-1]) if stops else None


def _is_freq(s: str) -> bool:
    """Une frequency commence par un jour, EVERY, DAILY, etc."""
    return any(s.upper().startswith(h) for h in _FREQ_HEAD)


def _is_route_name(s: str) -> bool:
    """Un nom de route contient au moins un tiret entre 2 segments uppercase,
    et n'est ni une frequency ni une footnote."""
    if _is_freq(s):
        return False
    if any(w in s.upper().split() for w in _FOOTNOTE_WORDS):
        return False
    parts = [p for p in s.split("-") if p.strip()]
    return len(parts) >= 2 and all(p.strip()[0].isupper() for p in parts[:2])


def columnize_words(words: list[dict], page_width: float,
                    row_tol: float = 3.0, gutter_min: float = 22.0) -> str:
    """Dé-entrelace une page e-ktel en 2 colonnes à partir des coordonnées mots.

    Les PDF e-ktel posent les paires aller/retour côte à côte (gauche=aller,
    droite=retour). `extract_text()` aplatit chaque ligne visuelle en
    'ALLER ... RETOUR ...' -> horaires de l'aller et du retour mélangés
    (bug Chora Sfakion/Elafonisi). On regroupe les mots par ligne (même `top`),
    et si une ligne a une vraie gouttière qui enjambe le centre de page, on la
    coupe en gauche/droite. On émet ensuite toute la colonne gauche (ordre
    haut->bas, les lignes pleine largeur restent inline) puis toute la colonne
    droite. Chaque bloc de route reste ainsi contigu et `parse_ektel_pdf` le
    lit comme une grille mono-colonne propre.

    Chaque mot : {text, x0, x1, top}. Robuste au mono-colonne (aucune coupe).
    """
    rows: list[tuple[float, list[dict]]] = []
    for w in sorted(words, key=lambda w: (w["top"], w["x0"])):
        if rows and abs(w["top"] - rows[-1][0]) <= row_tol:
            rows[-1][1].append(w)
        else:
            rows.append((w["top"], [w]))

    center = page_width / 2.0
    left_lines: list[str] = []
    right_lines: list[str] = []
    for _top, ws in rows:
        ws = sorted(ws, key=lambda w: w["x0"])
        # Cherche la coupe : plus grand vide entre 2 mots consecutifs qui
        # enjambe le centre (fin du mot gauche <= centre <= debut du mot droit).
        split_idx = None
        best_gap = gutter_min
        for i in range(len(ws) - 1):
            gap = ws[i + 1]["x0"] - ws[i]["x1"]
            if gap > best_gap and ws[i]["x1"] <= center <= ws[i + 1]["x0"]:
                best_gap = gap
                split_idx = i + 1
        if split_idx is not None:
            left_lines.append(" ".join(w["text"] for w in ws[:split_idx]))
            right_lines.append(" ".join(w["text"] for w in ws[split_idx:]))
        else:
            left_lines.append(" ".join(w["text"] for w in ws))
    return "\n".join(left_lines + right_lines)


def parse_ektel_pdf(text: str, source_url: str = "") -> list[dict]:
    """Parse le texte extrait d'un PDF e-ktel en liste de routes normalisées.

    Format (validé sur CHANIA_FROM_24-05-2026.pdf) : chaque label est doublé
    GREEK/ENGLISH. On ignore le grec et on capture les segments anglais après
    chaque `/`. Sur une même ligne on peut avoir :
      route name (avec tiret) → opens new current route
      frequency (EVERY DAY, MONDAY TO SATURDAY…) → opens new sub-grid in current
      times (HH:MM ...) → append on current SUB-GRID

    Chaque sous-grille (Mon-Fri / Sat / Sun, etc) devient une entree distincte
    dans `departures_by_day` (fix 02/06/2026 : avant, toutes les grilles d'une
    meme route etaient fusionnees dans `departures` -> doublons).

    Footnotes type "DEPARTURE AFTER THE ARRIVAL..." sont filtrées par la
    whitelist _FREQ_HEAD.
    """
    routes: list[dict] = []
    current: dict | None = None
    current_grid: dict | None = None  # sous-grille active dans current["departures_by_day"]

    def _flatten(by_day: list[dict]) -> list[str]:
        return sorted({t for g in by_day for t in g["times"]})

    def flush():
        nonlocal current, current_grid
        if current and current.get("departures_by_day"):
            current["departures"] = _flatten(current["departures_by_day"])
            if current["frequency"] is None:
                current["frequency"] = current["departures_by_day"][0]["days"]
            # Crete-only : les liaisons continent (ferry) ne sont pas pour nous
            if is_crete_route(current["from_place"], current["to_place"]):
                routes.append(current)
        current = None
        current_grid = None

    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            continue

        segments = [s.strip() for s in _PDF_SEG_RE.findall(line)]
        # Fallback PDF AEROPORT : le nom anglais est sur sa propre ligne SANS le
        # prefixe grec '/', ex. 'CHANIA-CHANIA AIRPORT' (le grec est au-dessus).
        # _PDF_SEG_RE n'y voit rien -> on accepte une ligne 100% ASCII en forme
        # de nom de route comme segment. Garde-fou isascii() = jamais une ligne grecque.
        if not segments and "/" not in line and line.isascii() and _is_route_name(line):
            segments = [line]
        times = _HHMM_RE.findall(line)

        for seg in segments:
            if _is_route_name(seg):
                # Nouvelle route : flush + ouvre
                flush()
                stops = _route_stops(_clean_route_name(seg))
                if stops:
                    current = {
                        "from_place": stops[0],
                        "to_place": stops[-1],
                        "via_stops": stops[1:-1] or None,
                        "duration": None,
                        "price_eur": None,
                        "frequency": None,
                        "departures": [],
                        "departures_by_day": [],
                        "source_url": source_url,
                        "season": "all",
                    }
                    current_grid = None
            elif _is_freq(seg):
                # Nouvelle sous-grille (jour-type) sur la route active
                if current is not None:
                    days_label = seg.strip().title()
                    current_grid = {"days": days_label, "times": []}
                    current["departures_by_day"].append(current_grid)
                    if current["frequency"] is None:
                        current["frequency"] = days_label

        # Apply times to current sub-grid (cree une grille "Daily" implicite
        # si on a des times sans frequency precedente -> robustesse PDF mal formate)
        if current is not None and times:
            if current_grid is None:
                current_grid = {"days": "Daily", "times": []}
                current["departures_by_day"].append(current_grid)
            current_grid["times"].extend(times)

    flush()
    return routes


def fetch_ektel_pdfs(html_index: str) -> list[tuple[str, str]]:
    """Depuis le HTML de l'index e-ktel, retourne [(label, pdf_url), …]."""
    soup = BeautifulSoup(html_index, "html.parser")
    pdfs: list[tuple[str, str]] = []
    for a in soup.select("a[href]"):
        href = unescape(a["href"])
        if ".pdf" not in href.lower():
            continue
        # e-ktel publie les horaires sous DEUX chemins : /images/pdfs/ (Rethymno,
        # Sougia, Choria, Airport, Gavdos) et /images/announcements/ (les PDF
        # "departures from Chania" récents). Filtrer sur pdfs/ seul faisait
        # perdre TOUT le PDF Chania -> Almyrida/Kalyves absents du graphe
        # (30 recherches/mois à 0 résultat, constat flux_intent 11/07/2026).
        if "/images/pdfs/" not in href and "/images/announcements/" not in href:
            continue
        full = urljoin(EKTEL_BASE, href)
        label = a.get_text(" ", strip=True)
        pdfs.append((label or full.split("/")[-1], full))
    # Dédup par URL
    seen, dedup = set(), []
    for lbl, u in pdfs:
        if u in seen:
            continue
        seen.add(u)
        dedup.append((lbl, u))
    return dedup


def apply_curated_overlay(route: dict) -> dict:
    """Si la route matche une entrée curée, complète duration/price_eur quand
    le HTML KTEL ne les expose pas. N'écrase JAMAIS une valeur déjà extraite."""
    key = (route["from_place"].lower(), route["to_place"].lower())
    curated = CURATED_HERLAS_DURATIONS_PRICES.get(key)
    if not curated:
        return route
    dur, price = curated
    if route.get("duration") is None:
        route["duration"] = dur
    if route.get("price_eur") is None:
        route["price_eur"] = price
    return route
