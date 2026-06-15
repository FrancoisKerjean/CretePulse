#!/usr/bin/env python3
"""Scraper alertes service KTEL Est (ktelherlas) -> table bus_alerts.

Distinct du scraper d'horaires (buses.py) : ici on capte les ANNONCES datees
(itineraires modifies, renforts, fermetures/travaux) que le KTEL Est publie
dans un flux tagge. But : ne pas afficher un horaire pour une ligne suspendue
ce jour-la. Cron QUOTIDIEN (les annonces ont un delai, ex. ferie poste ~10j
avant).

Est uniquement : le KTEL Ouest (e-ktel) ne publie aucune annonce datee
scrapable (page news = liens de menu statiques, constat 13/06/2026).

Run: SUPABASE_URL=... SUPABASE_SERVICE_KEY=... python alerts.py
"""
import os
import re
import sys
import time
from html import unescape

import requests

from parsers import HERLAS_BASE

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

SB_URL = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
SB_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
UA = "crete.direct-bot/1.0 (+https://crete.direct)"

# Flux taggés ktelherlas : (categorie DB, chemin).
FEEDS = [
    ("mods", "/en/news?tags=mods"),
    ("extra_routes", "/en/news?tags=extra_routes"),
]

# Hubs/villes majeurs pour relier une annonce aux lignes concernées (best-effort
# sur le titre EN du KTEL). Clé = forme UPPERCASE rencontrée dans les titres,
# valeur = orthographe canonique DB (bus_routes.from_place/to_place).
_PLACE_MATCH = {
    "HERAKLEION": "Heraklion", "HERAKLION": "Heraklion", "IRAKLIO": "Heraklion",
    "MALEVIZI": "Heraklion",
    "CHANIA": "Chania", "XANIA": "Chania",
    "RETHYMNO": "Rethymno", "RETHYMNON": "Rethymno", "RETHIMNO": "Rethymno",
    "AG. NIKOLAOS": "Agios Nikolaos", "AGIOS NIKOLAOS": "Agios Nikolaos",
    "IERAPETRA": "Ierapetra",
    "SITIA": "Siteia", "SITEIA": "Siteia",
    "MALIA": "Malia", "HERSONISSOS": "Hersonisos", "HERSONISOS": "Hersonisos",
    "ELOUNDA": "Eloynta", "MATALA": "Matala", "MOIRES": "Moires", "MIRES": "Moires",
    "ANOGEIA": "Anogeia", "ARKALOCHORI": "Arkalochori", "KASTELI": "Kastelli Pediados",
    "AG. PELAGIA": "Agia Pelagia", "AGIA PELAGIA": "Agia Pelagia",
}

# Le flux tagué mélange vraies perturbations et promo (festivals, excursions
# Santorin, slugs numériques vides). Un bandeau d'alerte ne montre que ce qui
# impacte un trajet -> gate sur un vocabulaire de perturbation/desserte.
# Radicaux (frontière de début seulement) pour absorber les pluriels/flexions :
# CHANGES, ROUTES, ITINERARIES, ROADWORKS... auraient été ratés avec un \b final.
_RELEVANT_RE = re.compile(
    r"\b(CHANGE|MODIF|ITINERAR|ROUTE|LINE|SERVICE|SCHEDULE|TIMETABLE|ROADWORK|"
    r"WORK|CANCEL|SUSPEN|EMERGENC|EXTRA|REROUT|DETOUR|DIVERT|CLOSED|CLOSURE|"
    r"AMEND|DELAY|STRIKE|STOP)",
    re.I,
)

_DATE_RE = re.compile(r"(\d{2})\.(\d{2})\.(\d{4})")
# Un bloc article du listing Next.js SSR.
_ARTICLE_RE = re.compile(r'<div class="article"[ >].*?</a>\s*</div>\s*</div>', re.S)
_TOP_DATE_RE = re.compile(r'class="articleTop"[^>]*>\s*<span>([^<]+)</span>')
_TITLE_RE = re.compile(r'class="articleTitle"[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>', re.S)


def log(msg):
    print(f"[bus-alerts] {msg}", flush=True)


def _to_iso(text):
    m = _DATE_RE.search(text or "")
    if not m:
        return None
    d, mo, y = m.groups()
    return f"{y}-{mo}-{d}"


def match_places(title: str) -> list[str]:
    """Lignes/lieux majeurs mentionnés dans le titre (best-effort, dédupliqué)."""
    up = title.upper()
    found = []
    for key, canon in _PLACE_MATCH.items():
        if key in up and canon not in found:
            found.append(canon)
    return found


def parse_alerts_index(html: str, category: str) -> list[dict]:
    """Liste des annonces d'un flux : slug, title, date ISO, url, lignes matchées."""
    out: list[dict] = []
    seen: set[str] = set()
    for block in _ARTICLE_RE.findall(html):
        tm = _TITLE_RE.search(block)
        if not tm:
            continue
        href = unescape(tm.group(1)).strip()
        title = unescape(re.sub(r"<[^>]+>", "", tm.group(2))).strip()
        if not href or not title:
            continue
        if not _RELEVANT_RE.search(title):
            continue  # promo (festival, excursion) ou annonce vide -> pas une alerte
        slug = href.rstrip("/").split("/")[-1]
        if slug in seen:
            continue
        seen.add(slug)
        dm = _TOP_DATE_RE.search(block)
        out.append({
            "slug": slug,
            "title": title,
            "category": category,
            "published_date": _to_iso(dm.group(1) if dm else None),
            "url": HERLAS_BASE + href if href.startswith("/") else href,
            "matched_routes": match_places(title),
        })
    return out


def fetch(url: str) -> str | None:
    for attempt in (1, 2):
        try:
            r = requests.get(url, headers={"User-Agent": UA}, timeout=30)
            if r.status_code == 200:
                return r.text
            log(f"HTTP {r.status_code} for {url}")
        except requests.RequestException as e:
            log(f"fetch error {url} (try {attempt}): {e}")
        time.sleep(1.5)
    return None


def scrape_alerts() -> list[dict]:
    rows: dict[str, dict] = {}
    for category, path in FEEDS:
        html = fetch(HERLAS_BASE + path)
        if not html:
            continue
        items = parse_alerts_index(html, category)
        log(f"{category}: {len(items)} annonces")
        for it in items:
            rows[it["slug"]] = it  # dédup par slug (mods prime si doublon)
    return list(rows.values())


def main():
    if not SB_URL or not SB_KEY:
        log("ERROR missing supabase env (SUPABASE_URL / SUPABASE_SERVICE_KEY)")
        sys.exit(1)
    from supabase import create_client
    sb = create_client(SB_URL, SB_KEY)
    rows = scrape_alerts()
    if not rows:
        log("0 annonce récupérée — données précédentes conservées (no-op)")
        return
    sb.table("bus_alerts").upsert(rows, on_conflict="slug").execute()
    log(f"OK {len(rows)} annonces écrites (upsert par slug)")

    # Push web des nouvelles alertes (best-effort, jamais bloquant pour le scrape).
    try:
        sys.path.insert(0, "/opt/cretepulse")  # push_sender deploye ici sur le VPS
        import push_sender
        res = sb.table("bus_alerts").select("*").eq("pushed", False).execute()
        for row in (res.data or []):
            push_sender.send_topic(sb, "bus_alerts", row, push_sender.build_alert_payload)
            try:
                sb.table("bus_alerts").update({"pushed": True}).eq("slug", row["slug"]).execute()
            except Exception as e:
                log(f"mark pushed failed for {row.get('slug')}: {e}")
    except Exception as e:
        log(f"push skipped: {e}")


if __name__ == "__main__":
    main()
