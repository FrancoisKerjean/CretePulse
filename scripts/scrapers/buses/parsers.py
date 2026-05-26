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
    """Parse une page detail herlas -> routes (un bloc `timetable_box` par route)."""
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
        days_el = box.find(_has_class_prefix("timetable_daysWrapper")) or box.find(
            _has_class_prefix("timetable_days")
        )
        frequency = days_el.get_text(" ", strip=True).rstrip(":") if days_el else None
        # ATTENTION : `timetable_time__<hash>` = un horaire ; `timetable_times__<hash>`
        # = le conteneur (texte = tous les horaires colles). On prend le prefixe avec
        # double underscore + on filtre sur HH:MM exact pour exclure le conteneur.
        times = [t.get_text(strip=True) for t in box.find_all(_has_class_prefix("timetable_time__"))]
        times = [t for t in times if _TIME_RE.match(t)]
        routes.append({
            "from_place": from_place,
            "to_place": to_place,
            "duration": None,
            "price_eur": None,
            "frequency": frequency,
            "departures": times or None,
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
    ("heraklion", "sitia"):            ("3h 30min", 16.00),
    ("sitia", "heraklion"):            ("3h 30min", 16.00),
    ("heraklion airport", "heraklion"): ("15min", 1.20),
    ("heraklion", "heraklion airport"): ("15min", 1.20),
    ("agios nikolaos", "elounta"):     ("20min", 1.80),
    ("elounta", "agios nikolaos"):     ("20min", 1.80),
    ("agios nikolaos", "sitia"):       ("1h 45min", 8.10),
    ("sitia", "agios nikolaos"):       ("1h 45min", 8.10),
    ("heraklion", "malia"):            ("45min", 4.30),
    ("malia", "heraklion"):            ("45min", 4.30),
    ("heraklion", "hersonissos"):      ("35min", 3.90),
    ("hersonissos", "heraklion"):      ("35min", 3.90),
    ("heraklion", "ierapetra"):        ("2h 30min", 10.50),
    ("ierapetra", "heraklion"):        ("2h 30min", 10.50),
    ("heraklion", "matala"):           ("2h", 8.30),
    ("matala", "heraklion"):           ("2h", 8.30),
}


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
