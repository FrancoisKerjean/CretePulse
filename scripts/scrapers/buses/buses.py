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
    parse_ektel_pdf,
    columnize_words,
    fetch_ektel_pdfs,
    CURATED_EKTEL,
    apply_curated_overlay,
)
from durations import enrich_durations
from prices import enrich_prices
from store import replace_operator_routes, should_commit
from ktel_apparier import run_apparier

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
        apply_curated_overlay(r)
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
    return enrich_durations(enrich_prices(_attach_to_slug(routes)))


def _fetch_pdf_bytes(url: str) -> bytes | None:
    for attempt in (1, 2):
        try:
            r = requests.get(url, headers={"User-Agent": UA}, timeout=60)
            if r.status_code == 200:
                return r.content
            log(f"HTTP {r.status_code} for PDF {url}")
        except requests.RequestException as e:
            log(f"PDF fetch error {url} (try {attempt}): {e}")
        time.sleep(1.5)
    return None


def _parse_pdf(content: bytes, source_url: str) -> list[dict]:
    """Extrait le texte du PDF via pdfplumber puis appelle parse_ektel_pdf."""
    try:
        import io
        import pdfplumber  # type: ignore
    except ImportError:
        log("pdfplumber not installed (pip install pdfplumber) - skip PDF parse")
        return []
    try:
        with pdfplumber.open(io.BytesIO(content)) as doc:
            # Dé-entrelacement 2 colonnes par coordonnées des mots (aller à gauche,
            # retour à droite) au lieu d'extract_text() qui mélange les horaires
            # des paires côte à côte (Elafonisi/Chora Sfakion/Airport).
            text = "\n".join(
                columnize_words(
                    [{"text": w["text"], "x0": w["x0"], "x1": w["x1"], "top": w["top"]}
                     for w in page.extract_words(use_text_flow=False, keep_blank_chars=False)],
                    page.width,
                )
                for page in doc.pages
            )
    except Exception as e:
        log(f"pdfplumber error on {source_url}: {e}")
        return []
    return parse_ektel_pdf(text, source_url=source_url)


def scrape_ektel() -> list:
    """Ouest : download + parsing des PDFs e-ktel pour avoir tous les horaires.
    Fallback CURATED_EKTEL si zéro PDF parsable (no-routes-no-replace dans store)."""
    idx = fetch(EKTEL_INDEX)
    if not idx:
        log("ektel: index unreachable, fallback CURATED only")
        routes = [dict(r, season="all") for r in CURATED_EKTEL]
        return enrich_durations(enrich_prices(_attach_to_slug(routes)))

    # Métadonnée freshness pour log
    groups = parse_ektel_index(idx)
    dates = [g["valid_from"] for g in groups if g["valid_from"]]
    valid_from = max(dates) if dates else None
    log(f"ektel: {len(groups)} groups, latest valid_from={valid_from}")

    pdfs = fetch_ektel_pdfs(idx)
    log(f"ektel: {len(pdfs)} PDFs to parse")

    all_routes: list[dict] = []
    seen_keys: set[tuple[str, str]] = set()
    for label, url in pdfs:
        content = _fetch_pdf_bytes(url)
        if not content:
            continue
        parsed = _parse_pdf(content, source_url=url)
        log(f"  {label[:40]:40} → {len(parsed)} routes")
        for r in parsed:
            key = (r["from_place"].lower(), r["to_place"].lower())
            if key in seen_keys:
                continue
            seen_keys.add(key)
            all_routes.append(r)
        time.sleep(0.5)

    # Merge avec CURATED (les CURATED couvrent duration+price que les PDFs n'ont pas)
    for c in CURATED_EKTEL:
        key = (c["from_place"].lower(), c["to_place"].lower())
        if key in seen_keys:
            # Déjà parsé : on overlay duration/price si les CURATED en ont
            for r in all_routes:
                if (r["from_place"].lower(), r["to_place"].lower()) == key:
                    if r.get("duration") is None and c.get("duration"):
                        r["duration"] = c["duration"]
                    if r.get("price_eur") is None and c.get("price_eur"):
                        r["price_eur"] = c["price_eur"]
                    break
        else:
            # Ajoute la route curée que les PDFs n'ont pas (rare)
            all_routes.append(dict(c, season="all", source_url=EKTEL_INDEX))
            seen_keys.add(key)

    return enrich_durations(enrich_prices(_attach_to_slug(all_routes)))


def reapparier(sb, failures: list) -> bool:
    """Ré-apparie les routes juste après un scrape réussi.

    replace_operator_routes fait delete+insert : il remet `line_id` à NULL pour
    l'opérateur re-scrapé. Sans ce ré-appariement immédiat, ses bus disparaissent
    de la carte /live jusqu'au prochain cron run_apparier (4:45) — un côté de
    l'île reste "noir" jusqu'à ~1 jour. On relie dans la foulée. L'appariement est
    idempotent et porte sur toute la table (pas par opérateur). Une erreur
    d'appariement n'invalide PAS le scrape : on alerte seulement (la donnée
    horaire est déjà écrite, le prochain cron 4:45 rattrapera le lien)."""
    try:
        c = run_apparier(sb)
        log(f"apparier OK: matched_osm={c['matched_to_osm']} "
            f"fallback_lines={c['fallback_lines']} "
            f"route_updates={c['route_line_id_updates']}")
        return True
    except Exception as e:
        log(f"apparier FAIL: {e}")
        failures.append(f"apparier: {e}")
        return False


def main():
    if not SB_URL or not SB_KEY:
        log("ERROR missing supabase env (SUPABASE_URL / SUPABASE_SERVICE_KEY)")
        sys.exit(1)
    sb = create_client(SB_URL, SB_KEY)
    failures = []
    committed = 0
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
        committed += 1
        log(f"OK {op_id}: {n} routes written")
    # Réseau (arrêts/lignes/séquences) : désormais construit depuis OSM par
    # osm_network.py (cron dédié), plus depuis les titres KTEL. bus_routes reste
    # la source des horaires (apparié aux lignes OSM en SP2).
    # Ré-appariement immédiat : le delete+insert ci-dessus a effacé les line_id
    # des opérateurs re-scrapés -> on les relie tout de suite pour ne pas laisser
    # /live "noir" d'un côté jusqu'au cron run_apparier de 4:45.
    if committed:
        reapparier(sb, failures)
    if failures:
        send_telegram("Bus scraper warning:\n" + "\n".join(failures))


if __name__ == "__main__":
    main()
