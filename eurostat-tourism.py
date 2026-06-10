#!/usr/bin/env python3
"""
CretePulse — Eurostat tourism (Crete EL43) article generator.

Fetches Eurostat dataset `tour_occ_nin2` (nights spent at tourist
accommodation) at NUTS-2 level for EL43 (Crete), splits by domestic vs
foreign visitors, builds last 10-year context including pre-COVID
benchmark (2019), generates a bilingual EN+FR article and inserts as
draft into `guides`.

Eurostat refreshes this dataset annually (typically April-May for prior
year). Cooldown via `eurostat_tourism_ledger` table — only re-runs once
a new year has been published.

Usage:
  python3 eurostat-tourism.py
  python3 eurostat-tourism.py --dry-run
  python3 eurostat-tourism.py --force
"""

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import time
import unicodedata
from datetime import datetime, timezone

import psycopg2
import requests
from dotenv import load_dotenv

load_dotenv("/opt/cretepulse-db/.env")
load_dotenv("/opt/cretepulse/.env")

LOG_DIR = "/var/log/cretepulse-content"
LOG_FILE = f"{LOG_DIR}/eurostat-tourism.log"
STOP_FILE = "/opt/cretepulse-content/.STOP"
CLAUDE_WRAPPER = "/opt/cretepulse-content/bin/claude-capped.sh"

os.makedirs(LOG_DIR, exist_ok=True)

DB_PARAMS = {
    "host": "localhost",
    "port": 5433,
    "dbname": "cretepulse",
    "user": "postgres",
    "password": os.environ.get("POSTGRES_PASSWORD", ""),
}

EUROSTAT_BASE = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data"
USER_AGENT = "Mozilla/5.0 (compatible; KairosBot/1.0)"

DATASET_ID = "tour_occ_nin2"
GEO_CODE = "EL43"            # Crete NUTS-2
NACE = "I551-I553"           # Hotels, holiday accommodation, camping
UNIT = "NR"                  # Number


def log(msg: str) -> None:
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    line = f"{ts} [eurostat-tourism] {msg}"
    print(line, flush=True)
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except OSError:
        pass


def check_stop() -> None:
    if os.path.exists(STOP_FILE):
        log("STOP file present — exiting.")
        sys.exit(98)


def send_telegram(text: str) -> None:
    try:
        sys.path.insert(0, "/opt/cretepulse")
        from kairos_telegram import send, Bot  # type: ignore
        send(Bot.PLUME, "Eurostat Tourism Crete", text)
    except Exception as e:
        log(f"Telegram error: {e}")


# --------------------------------------------------------------------------
# Ledger
# --------------------------------------------------------------------------

LEDGER_DDL = """
CREATE TABLE IF NOT EXISTS eurostat_tourism_ledger (
    year TEXT PRIMARY KEY,
    guide_id BIGINT,
    slug TEXT,
    eurostat_updated TIMESTAMPTZ,
    generated_at TIMESTAMPTZ DEFAULT now()
);
"""


def ensure_ledger(conn) -> None:
    with conn.cursor() as cur:
        cur.execute(LEDGER_DDL)
    conn.commit()


def latest_year_published(conn):
    with conn.cursor() as cur:
        cur.execute("SELECT max(year) FROM eurostat_tourism_ledger")
        return cur.fetchone()[0]


def record_run(conn, year: str, guide_id: int, slug: str, updated_iso: str) -> None:
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO eurostat_tourism_ledger (year, guide_id, slug, eurostat_updated)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (year) DO UPDATE SET
                guide_id = EXCLUDED.guide_id,
                slug = EXCLUDED.slug,
                eurostat_updated = EXCLUDED.eurostat_updated,
                generated_at = now()
        """, (year, guide_id, slug, updated_iso))
    conn.commit()


# --------------------------------------------------------------------------
# Eurostat fetch
# --------------------------------------------------------------------------

def fetch_nights_series(last_n_years: int = 12) -> dict:
    """
    Fetch Crete tourist accommodation nights for last N years, by c_resid
    (DOM/FOR/TOTAL). Returns:
      {
        'updated': iso,
        'years': [...sorted...],
        'series': {'DOM': {year: value}, 'FOR': {...}, 'TOTAL': {...}}
      }
    """
    params = [
        ("format", "JSON"),
        ("geo", GEO_CODE),
        ("unit", UNIT),
        ("nace_r2", NACE),
    ]
    r = requests.get(
        f"{EUROSTAT_BASE}/{DATASET_ID}",
        params=params,
        headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
        timeout=30,
    )
    r.raise_for_status()
    data = r.json()

    if data.get("error"):
        raise RuntimeError(f"Eurostat error: {data['error']}")

    c_resid_index = data["dimension"]["c_resid"]["category"]["index"]
    time_index = data["dimension"]["time"]["category"]["index"]
    values = data["value"]
    updated = data.get("updated", "")

    # Filter shape: freq=1, c_resid=3, unit=1, nace_r2=1, geo=1, time=N.
    # Position = c_resid_idx * n_time + time_idx
    n_time = len(time_index)
    sorted_years = sorted(time_index.keys(), key=lambda y: time_index[y])
    last_years = sorted_years[-last_n_years:]

    series = {}
    for code in ["DOM", "FOR", "TOTAL"]:
        if code not in c_resid_index:
            continue
        ci = c_resid_index[code]
        per_year = {}
        for y in last_years:
            ti = time_index[y]
            pos = ci * n_time + ti
            v = values.get(str(pos))
            if v is not None:
                per_year[y] = v
        series[code] = per_year

    return {
        "updated": updated,
        "years": last_years,
        "series": series,
    }


def compute_deltas(per_year: dict, years: list) -> dict:
    """Compute YoY delta and vs-2019 (pre-COVID) delta for the latest year."""
    if not per_year or not years:
        return {}
    sorted_years_in_data = [y for y in years if y in per_year]
    if not sorted_years_in_data:
        return {}
    latest_year = sorted_years_in_data[-1]
    latest = per_year[latest_year]
    prev_year = sorted_years_in_data[-2] if len(sorted_years_in_data) >= 2 else None
    prev = per_year.get(prev_year) if prev_year else None
    pre_covid = per_year.get("2019")

    out = {
        "latest_year": latest_year,
        "latest": latest,
        "prev_year": prev_year,
        "prev": prev,
        "yoy_pct": round(((latest - prev) / prev * 100), 2) if prev else None,
        "pre_covid_2019": pre_covid,
        "vs_2019_pct": round(((latest - pre_covid) / pre_covid * 100), 2) if pre_covid else None,
    }
    return out


# --------------------------------------------------------------------------
# Article generation
# --------------------------------------------------------------------------

GENERATION_SYSTEM = """You are a senior bilingual travel + economy journalist
for crete.direct, a guide to Crete, Greece. You will receive official
Eurostat data on the number of nights spent in tourist accommodation in
Crete (NUTS-2 region EL43), split by domestic (Greek) vs foreign visitors,
annually for the last decade.

Your job: write a short, accurate, SEO-friendly article in BOTH English AND
French explaining what these numbers say about Crete's tourism — scale,
recovery from COVID, share of foreign vs domestic, recent trend.

CRITICAL rules:
- Base every numeric claim on the provided dataset. NEVER invent figures.
- Cite Eurostat as the source AND the latest year published.
- 450-650 words for body content (each language).
- No em dashes (—) and no en dashes (–). Use comma, period, " - ".
- French content: vouvoiement (vous), full accents (é è à ç ê î ô û ù).
- Tone: clear, journalistic, traveler-friendly. Light implications for
  property/investment angles only if grounded in the data.
- HTML body: <p>, <h2>, <ul><li>. No tables (kept simple for translation).
- Important: figures cover all paid tourist accommodation (hotels,
  short-stay rentals, camping). Do NOT extrapolate to Airbnb-only or
  hotel-only segments.

Output STRICT JSON ONLY (no markdown fences, no preamble):

{
  "title_en": "string, 60-95 chars, SEO headline English",
  "title_fr": "string, 60-100 chars, French headline with accents",
  "meta_desc_en": "string, 140-165 chars, English meta description",
  "meta_desc_fr": "string, 140-170 chars, French meta description",
  "slug_hint": "string, 3-6 words, lowercase hyphenated, English",
  "html_body_en": "string, valid HTML <p><h2><ul><li>. 450-650 words English",
  "html_body_fr": "string, valid HTML <p><h2><ul><li>. 450-650 words French",
  "faqs_en": [{"q":"...","a":"..."}, {"q":"...","a":"..."}, {"q":"...","a":"..."}],
  "faqs_fr": [{"q":"...","a":"..."}, {"q":"...","a":"..."}, {"q":"...","a":"..."}],
  "category": "tourism",
  "confidence": "high | medium | low"
}
"""


def build_prompt(dataset: dict) -> str:
    raw = dataset["raw"]
    payload = {
        "source": "Eurostat (tour_occ_nin2) — Nights spent at tourist accommodation, NUTS-2 region",
        "geo_code": GEO_CODE,
        "geo_label": "Crete (Κρήτη), NUTS-2 region EL43",
        "accommodation_scope": "Hotels, holiday and other short-stay accommodation, camping grounds (NACE I551-I553)",
        "eurostat_updated": raw["updated"],
        "years_covered": raw["years"],
        "series": {
            "domestic_visitors": raw["series"].get("DOM", {}),
            "foreign_visitors": raw["series"].get("FOR", {}),
            "total": raw["series"].get("TOTAL", {}),
        },
        "deltas": dataset["deltas"],
        "share_foreign_pct_latest": dataset["share_foreign_pct_latest"],
    }
    return (
        f"{GENERATION_SYSTEM}\n\n"
        f"---\nDATA:\n```json\n"
        f"{json.dumps(payload, ensure_ascii=False, indent=2)}\n```\n\n"
        f"Return strict JSON now."
    )


def call_claude(prompt: str, model: str = "haiku", timeout: int = 200) -> str:
    cmd = [
        CLAUDE_WRAPPER, "-p", prompt,
        "--model", model,
        "--output-format", "json",
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    if result.returncode == 98:
        raise RuntimeError("STOP file present.")
    if result.returncode == 99:
        raise RuntimeError("Claude daily cap reached.")
    if result.returncode != 0:
        raise RuntimeError(
            f"claude wrapper rc={result.returncode}: {result.stderr[:300]}"
        )
    raw = result.stdout
    try:
        wrapper = json.loads(raw)
        return (wrapper.get("result") or raw).strip()
    except json.JSONDecodeError:
        return raw.strip()


def parse_json_response(raw: str) -> dict:
    raw = re.sub(r"^```(?:json)?\s*", "", raw.strip())
    raw = re.sub(r"\s*```$", "", raw.strip())
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        m = re.search(r"\{[\s\S]*\}", raw)
        if not m:
            raise
        return json.loads(m.group())


# --------------------------------------------------------------------------
# DB insert
# --------------------------------------------------------------------------

def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = re.sub(r"-+", "-", text).strip("-")
    return text[:90] or "crete-tourism-stats"


def derive_slug(article: dict, year: str) -> str:
    hint = article.get("slug_hint") or article.get("title_en") or "crete-tourism-stats"
    base = slugify(hint)
    h = hashlib.sha1(year.encode()).hexdigest()[:6]
    return f"{base}-{year}-{h}"


def insert_draft(conn, article: dict, dataset: dict) -> int:
    year = dataset["deltas"]["latest_year"]
    slug = derive_slug(article, year)
    title_en = (article.get("title_en") or "").strip()
    title_fr = (article.get("title_fr") or "").strip()
    meta_en = (article.get("meta_desc_en") or "").strip()
    meta_fr = (article.get("meta_desc_fr") or "").strip()
    body_en = article.get("html_body_en") or ""
    body_fr = article.get("html_body_fr") or ""
    faqs_en = article.get("faqs_en") or []
    faqs_fr = article.get("faqs_fr") or []
    category = article.get("category") or "tourism"

    if not title_fr or not body_fr:
        raise RuntimeError("Missing FR fields — translator-batch needs EN+FR.")

    keywords = ["crete-tourism", "eurostat", "tourism-stats", year]
    keywords = [k for k in keywords if k][:8]

    titles = {"en": title_en, "fr": title_fr}
    meta_descs = {"en": meta_en, "fr": meta_fr}
    contents = {"en": body_en, "fr": body_fr}
    faqs_obj = {"en": faqs_en, "fr": faqs_fr}

    eurostat_url = "https://ec.europa.eu/eurostat/databrowser/view/tour_occ_nin2"
    attr_en = (
        f'<p class="source-attribution"><em>Source: '
        f'<a href="{eurostat_url}" rel="noopener" target="_blank">Eurostat</a> '
        f'tour_occ_nin2, nights spent at tourist accommodation, '
        f'NUTS-2 region EL43 (Crete), latest year {year}.</em></p>'
    )
    attr_fr = (
        f'<p class="source-attribution"><em>Source : '
        f'<a href="{eurostat_url}" rel="noopener" target="_blank">Eurostat</a>, '
        f'tour_occ_nin2, nuitées en hébergement touristique, '
        f'région NUTS-2 EL43 (Crète), dernière année {year}.</em></p>'
    )
    if attr_en not in contents["en"]:
        contents["en"] = contents["en"].rstrip() + "\n" + attr_en
    if attr_fr not in contents["fr"]:
        contents["fr"] = contents["fr"].rstrip() + "\n" + attr_fr

    word_count = len(re.sub(r"<[^>]+>", " ", contents["en"]).split())
    read_time = max(2, round(word_count / 220))

    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO guides (slug, format, category, keywords, titles, meta_descs,
                               contents, faqs, image_url, read_time, status,
                               published_at, created_at, updated_at)
            VALUES (%s, 'long', %s, %s::text[], %s::jsonb, %s::jsonb,
                    %s::jsonb, %s::jsonb, %s, %s, 'draft', now(), now(), now())
            ON CONFLICT (slug) DO UPDATE SET
                titles = EXCLUDED.titles,
                meta_descs = EXCLUDED.meta_descs,
                contents = EXCLUDED.contents,
                faqs = EXCLUDED.faqs,
                status = 'draft',
                updated_at = now()
            RETURNING id
        """, (
            slug, category, keywords,
            json.dumps(titles, ensure_ascii=False),
            json.dumps(meta_descs, ensure_ascii=False),
            json.dumps(contents, ensure_ascii=False),
            json.dumps(faqs_obj, ensure_ascii=False),
            None, read_time,
        ))
        guide_id = cur.fetchone()[0]
    conn.commit()
    return guide_id


# --------------------------------------------------------------------------
# Build dataset
# --------------------------------------------------------------------------

def build_dataset() -> dict:
    raw = fetch_nights_series(last_n_years=12)
    total_series = raw["series"].get("TOTAL", {})
    foreign_series = raw["series"].get("FOR", {})
    deltas = compute_deltas(total_series, raw["years"])

    latest_year = deltas.get("latest_year")
    share = None
    if latest_year and total_series.get(latest_year) and foreign_series.get(latest_year):
        share = round(foreign_series[latest_year] / total_series[latest_year] * 100, 1)

    return {
        "raw": raw,
        "deltas": deltas,
        "share_foreign_pct_latest": share,
    }


# --------------------------------------------------------------------------
# Main
# --------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    check_stop()
    log(f"Run start dry_run={args.dry_run} force={args.force}")

    log("Fetching Eurostat tour_occ_nin2 for EL43 (Crete)...")
    dataset = build_dataset()
    year = dataset["deltas"].get("latest_year")
    log(f"  latest year: {year}, updated: {dataset['raw']['updated']}")
    log(f"  TOTAL latest: {dataset['deltas'].get('latest')}, "
        f"YoY: {dataset['deltas'].get('yoy_pct')}%, "
        f"vs 2019: {dataset['deltas'].get('vs_2019_pct')}%, "
        f"foreign share: {dataset['share_foreign_pct_latest']}%")

    if args.dry_run:
        log("Series preview:")
        for code, vals in dataset["raw"]["series"].items():
            tail = list(vals.items())[-5:]
            log(f"  {code}: {tail}")
        return 0

    conn = psycopg2.connect(**DB_PARAMS)
    try:
        ensure_ledger(conn)
        last_y = latest_year_published(conn)
        if last_y == year and not args.force:
            log(f"Year {year} already published (last={last_y}). Skip.")
            return 0

        prompt = build_prompt(dataset)
        log(f"  calling Claude (haiku) — prompt {len(prompt)} chars")
        t0 = time.time()
        raw = call_claude(prompt, model="haiku")
        article = parse_json_response(raw)
        log(f"  Claude returned in {time.time()-t0:.1f}s, confidence={article.get('confidence')}")

        if (article.get("confidence") or "").lower() == "low":
            log("  confidence=low — abort.")
            return 0

        guide_id = insert_draft(conn, article, dataset)
        slug = derive_slug(article, year)
        record_run(conn, year, guide_id, slug, dataset["raw"]["updated"])
        log(f"  inserted draft guide_id={guide_id} title='{article.get('title_en','')[:90]}'")

        send_telegram(
            f"📊 Eurostat Crete article #{guide_id}\n"
            f"year: {year} | total: {dataset['deltas'].get('latest'):,} nights | "
            f"foreign share: {dataset['share_foreign_pct_latest']}%\n"
            f"{article.get('title_en','')[:120]}\n"
            f"https://crete.direct/en/news"
        )
        return 0
    finally:
        conn.close()


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        log("Interrupted.")
        sys.exit(130)
