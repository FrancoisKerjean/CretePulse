#!/usr/bin/env python3
"""Scraper bus Crete -> cretepulse-db (self-hosted Postgres + PostgREST).

Cron hebdo VPS. Strategie (decision Kami 21/05, Option 1) :
  - herlas (EST) : crawl 2 etapes. index -> liens detail `ds=` -> pages detail
    -> routes (from/to, jours, horaires). Vraies donnees fraiches.
  - ektel (OUEST) : routes curees (CURATED_EKTEL) datees via l'index 'valid from'.

Garde-fou : on ne remplace les routes d'un operateur que si >= MIN_ROUTES.
Sinon on conserve la derniere donnee valide + alerte Telegram. Jamais de page vide.

Run: SUPABASE_URL=... SUPABASE_SERVICE_KEY=... python buses.py
"""
import os
import sys
import time

import requests
from supabase import create_client

from parsers import (
    HERLAS_BASE,
    EKTEL_BASE,
    parse_herlas_index,
    parse_herlas_detail,
    parse_ektel_index,
    CURATED_EKTEL,
)
from store import replace_operator_routes, should_commit

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

SB_URL = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
SB_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
UA = "crete.direct-bot/1.0 (+https://crete.direct)"
HERLAS_INDEX = HERLAS_BASE + "/en/timetables"
EKTEL_INDEX = EKTEL_BASE + "/en/services/dromologia"
MAX_HERLAS_DETAILS = 40  # plafond de pages detail fetchees par run

# Resolution to_slug : nom de destination -> slug bus_destinations.
DEST_SLUGS = {
    "heraklion", "chania", "rethymno", "agios-nikolaos", "ierapetra", "sitia",
    "malia", "hersonissos", "knossos", "matala", "elafonissi", "balos", "samaria",
}


def log(msg):
    print(f"[buses] {msg}", flush=True)


def send_telegram(text: str) -> None:
    """Alerte via kairos_telegram (package installe dans le venv /opt/cretepulse,
    meme pattern que guide-planner.py / health.py)."""
    try:
        from kairos_telegram import send, Bot  # type: ignore
        send(Bot.PLUME, "Bus Scraper", text)
    except Exception as e:
        log(f"Telegram error: {e}")


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


def _slugify(name: str) -> str:
    return name.lower().strip().replace("&", "and").replace(" ", "-")


def _attach_to_slug(routes: list) -> list:
    for r in routes:
        slug = _slugify(r["to_place"])
        r["to_slug"] = slug if slug in DEST_SLUGS else None
    return routes


def scrape_herlas() -> list:
    """Crawl est : index -> pages detail -> routes dedupliquees par (from,to)."""
    idx = fetch(HERLAS_INDEX)
    if not idx:
        return []
    urls = parse_herlas_index(idx)[:MAX_HERLAS_DETAILS]
    log(f"herlas: {len(urls)} detail pages to fetch")
    seen, routes = set(), []
    for u in urls:
        html = fetch(u)
        if not html:
            continue
        for r in parse_herlas_detail(html):
            key = (r["from_place"].lower(), r["to_place"].lower())
            if key in seen:
                continue
            seen.add(key)
            routes.append(r)
        time.sleep(0.8)  # courtoisie
    return _attach_to_slug(routes)


def scrape_ektel() -> list:
    """Ouest : routes curees + valid_from issu de l'index (freshness)."""
    idx = fetch(EKTEL_INDEX)
    valid_from = None
    if idx:
        groups = parse_ektel_index(idx)
        dates = [g["valid_from"] for g in groups if g["valid_from"]]
        valid_from = max(dates) if dates else None
        log(f"ektel: {len(groups)} groups, latest valid_from={valid_from}")
    routes = []
    for r in CURATED_EKTEL:
        row = dict(r)
        row["season"] = "all"
        routes.append(row)
    return _attach_to_slug(routes)


def main():
    if not SB_URL or not SB_KEY:
        log("ERROR missing supabase env (SUPABASE_URL / SUPABASE_SERVICE_KEY)")
        sys.exit(1)
    sb = create_client(SB_URL, SB_KEY)
    failures = []
    plan = [
        ("herlas", HERLAS_INDEX, scrape_herlas),
        ("ektel", EKTEL_INDEX, scrape_ektel),
    ]
    for op_id, src, scraper in plan:
        rows = scraper()
        if not should_commit(rows):
            failures.append(f"{op_id}: {len(rows)} routes (kept previous data)")
            log(f"SKIP {op_id}: only {len(rows)} routes, previous data preserved")
            continue
        n = replace_operator_routes(sb, op_id, src, rows)
        log(f"OK {op_id}: {n} routes written")
    if failures:
        send_telegram("Bus scraper warning:\n" + "\n".join(failures))


if __name__ == "__main__":
    main()
