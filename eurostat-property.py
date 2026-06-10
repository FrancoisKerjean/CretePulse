#!/usr/bin/env python3
"""
CretePulse — Eurostat property prices article generator.

Fetches Greece + EA20 + EU27 House Price Index (quarterly, base 2015=100)
from Eurostat dissemination API, computes latest quarter + YoY deltas,
generates a bilingual EN+FR article framing Greek property prices in
European context. Inserts as draft into `guides`.

Cooldown via `eurostat_property_ledger` table — only re-runs once a new
quarter has been published by Eurostat.

Usage:
  python3 eurostat-property.py
  python3 eurostat-property.py --dry-run
  python3 eurostat-property.py --force
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
LOG_FILE = f"{LOG_DIR}/eurostat-property.log"
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

GEO_LABELS = {
    "EL": "Greece",
    "EA20": "Eurozone (20 countries)",
    "EU27_2020": "European Union (27 countries)",
    "DE": "Germany",
    "FR": "France",
    "IT": "Italy",
    "ES": "Spain",
    "PT": "Portugal",
    "CY": "Cyprus",
}

GEO_LABELS_FR = {
    "EL": "Grèce",
    "EA20": "Zone euro (20 pays)",
    "EU27_2020": "Union européenne (27 pays)",
    "DE": "Allemagne",
    "FR": "France",
    "IT": "Italie",
    "ES": "Espagne",
    "PT": "Portugal",
    "CY": "Chypre",
}


def log(msg: str) -> None:
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    line = f"{ts} [eurostat-property] {msg}"
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
        send(Bot.PLUME, "Eurostat Property", text)
    except Exception as e:
        log(f"Telegram error: {e}")


# --------------------------------------------------------------------------
# Ledger
# --------------------------------------------------------------------------

LEDGER_DDL = """
CREATE TABLE IF NOT EXISTS eurostat_property_ledger (
    quarter TEXT PRIMARY KEY,           -- e.g. '2025-Q4'
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


def latest_quarter_published(conn):
    with conn.cursor() as cur:
        cur.execute("SELECT max(quarter) FROM eurostat_property_ledger")
        return cur.fetchone()[0]


def record_run(conn, quarter: str, guide_id: int, slug: str, updated_iso: str) -> None:
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO eurostat_property_ledger (quarter, guide_id, slug, eurostat_updated)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (quarter) DO UPDATE SET
                guide_id = EXCLUDED.guide_id,
                slug = EXCLUDED.slug,
                eurostat_updated = EXCLUDED.eurostat_updated,
                generated_at = now()
        """, (quarter, guide_id, slug, updated_iso))
    conn.commit()


# --------------------------------------------------------------------------
# Eurostat fetch
# --------------------------------------------------------------------------

def fetch_hpi(geos: list, last_n_quarters: int = 9) -> dict:
    """
    Fetch Eurostat House Price Index (prc_hpi_q) for given geos.
    Returns dict with 'updated', 'series': {geo: [{'quarter': 'YYYY-QN', 'value': float}]}.
    """
    params = [
        ("format", "JSON"),
        ("unit", "I15_Q"),
        ("purchase", "TOTAL"),
    ]
    for g in geos:
        params.append(("geo", g))

    r = requests.get(
        f"{EUROSTAT_BASE}/prc_hpi_q",
        params=params,
        headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
        timeout=30,
    )
    r.raise_for_status()
    data = r.json()

    geo_index = data["dimension"]["geo"]["category"]["index"]
    geo_labels = data["dimension"]["geo"]["category"]["label"]
    time_index = data["dimension"]["time"]["category"]["index"]
    time_labels = data["dimension"]["time"]["category"]["label"]
    size = data["size"]
    values = data["value"]
    updated = data.get("updated", "")

    # Eurostat JSON-stat: position = sum(idx_dim_i * stride_i). Order = freq, purchase, unit, geo, time.
    # All non-geo/time dims are filtered to a single value, so they don't affect index calculation
    # in this filtered query — we just iterate over geo*time.
    inv_geo = {v: k for k, v in geo_index.items()}
    inv_time = {v: k for k, v in time_index.items()}
    n_geo = len(geo_index)
    n_time = len(time_index)

    sorted_quarters = sorted(time_index.keys(), key=lambda q: time_index[q])
    last_quarters = sorted_quarters[-last_n_quarters:]

    series = {}
    for geo in geos:
        if geo not in geo_index:
            continue
        gi = geo_index[geo]
        rows = []
        for q in last_quarters:
            ti = time_index[q]
            # Position calc: outer dims (freq, purchase, unit) collapsed to size=1.
            # Effective shape = (geo, time) → pos = gi * n_time + ti
            pos = gi * n_time + ti
            v = values.get(str(pos))
            rows.append({"quarter": q, "value": v})
        series[geo] = {"label": geo_labels.get(geo, geo), "rows": rows}

    return {
        "updated": updated,
        "latest_quarter": last_quarters[-1] if last_quarters else None,
        "series": series,
    }


def compute_deltas(series_rows: list) -> dict:
    """Return latest, prev_q, prev_y, qoq_pct, yoy_pct (None if missing)."""
    vals = [r["value"] for r in series_rows]
    if not vals or vals[-1] is None:
        return {"latest": None}
    latest = vals[-1]
    prev_q = vals[-2] if len(vals) >= 2 and vals[-2] is not None else None
    prev_y = vals[-5] if len(vals) >= 5 and vals[-5] is not None else None

    qoq = ((latest - prev_q) / prev_q * 100) if prev_q else None
    yoy = ((latest - prev_y) / prev_y * 100) if prev_y else None
    return {
        "latest": round(latest, 2),
        "prev_q": round(prev_q, 2) if prev_q is not None else None,
        "prev_y": round(prev_y, 2) if prev_y is not None else None,
        "qoq_pct": round(qoq, 2) if qoq is not None else None,
        "yoy_pct": round(yoy, 2) if yoy is not None else None,
    }


# --------------------------------------------------------------------------
# Article generation
# --------------------------------------------------------------------------

GENERATION_SYSTEM = """You are a senior bilingual finance + property journalist
for crete.direct, a guide to Crete, Greece. You will receive official
Eurostat data on the House Price Index (HPI, base 2015=100) for Greece,
the Eurozone, the EU27 and a handful of comparison countries — quarterly
through the latest published quarter.

Your job: write a short, accurate, SEO-friendly article in BOTH English AND
French explaining how Greek house prices look in European context. Frame
it for travelers curious about Greece, expats, and prospective property
buyers (Crete is part of Greece — relevant for buyers eyeing the island).

CRITICAL rules:
- Base every numeric claim on the provided dataset. NEVER invent figures.
- Cite Eurostat as the source AND the exact latest quarter you were given.
- 450-650 words for body content (each language).
- No em dashes (—) and no en dashes (–). Use comma, period, " - ".
- French content: vouvoiement (vous), full accents (é è à ç ê î ô û ù).
- Do NOT make Crete-specific claims about prices — Eurostat HPI is national,
  not regional. You may say "Greece including Crete" or note this caveat.
- Tone: clear, journalistic, useful. Light implications (yields, momentum)
  ok if grounded in the data.
- HTML body: <p>, <h2>, <ul><li>. No tables (kept simple for translation).

Output STRICT JSON ONLY (no markdown fences, no preamble), shape:

{
  "title_en": "string, 60-95 chars, SEO headline English",
  "title_fr": "string, 60-100 chars, French headline with accents",
  "meta_desc_en": "string, 140-165 chars, English meta description",
  "meta_desc_fr": "string, 140-170 chars, French meta description",
  "slug_hint": "string, 3-6 words, lowercase hyphenated, English",
  "html_body_en": "string, valid HTML <p><h2><ul><li>. 450-650 words English",
  "html_body_fr": "string, valid HTML <p><h2><ul><li>. 450-650 words French",
  "faqs_en": [
    {"q": "...", "a": "..."},
    {"q": "...", "a": "..."},
    {"q": "...", "a": "..."}
  ],
  "faqs_fr": [
    {"q": "...", "a": "..."},
    {"q": "...", "a": "..."},
    {"q": "...", "a": "..."}
  ],
  "category": "property",
  "confidence": "high | medium | low"
}
"""


def build_prompt(dataset: dict) -> str:
    payload = {
        "source": "Eurostat (prc_hpi_q) — House Price Index, base 2015=100, quarterly",
        "eurostat_updated": dataset["meta"]["updated"],
        "latest_quarter": dataset["meta"]["latest_quarter"],
        "comparison_geos": dataset["geos_human"],
        "series": dataset["series"],
        "deltas": dataset["deltas"],
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
    return text[:90] or "greece-property-prices"


def derive_slug(article: dict, quarter: str) -> str:
    hint = article.get("slug_hint") or article.get("title_en") or "greece-property-prices"
    base = slugify(hint)
    quarter_clean = quarter.replace("-", "").lower()
    h = hashlib.sha1(quarter.encode()).hexdigest()[:6]
    return f"{base}-{quarter_clean}-{h}"


def insert_draft(conn, article: dict, dataset: dict) -> int:
    quarter = dataset["meta"]["latest_quarter"]
    slug = derive_slug(article, quarter)
    title_en = (article.get("title_en") or "").strip()
    title_fr = (article.get("title_fr") or "").strip()
    meta_en = (article.get("meta_desc_en") or "").strip()
    meta_fr = (article.get("meta_desc_fr") or "").strip()
    body_en = article.get("html_body_en") or ""
    body_fr = article.get("html_body_fr") or ""
    faqs_en = article.get("faqs_en") or []
    faqs_fr = article.get("faqs_fr") or []
    category = article.get("category") or "property"

    if not title_fr or not body_fr:
        raise RuntimeError("Missing FR fields — translator-batch needs EN+FR.")

    keywords = ["greece-property", "eurostat", "house-price-index", quarter]
    keywords = [k for k in keywords if k][:8]

    titles = {"en": title_en, "fr": title_fr}
    meta_descs = {"en": meta_en, "fr": meta_fr}
    contents = {"en": body_en, "fr": body_fr}
    faqs_obj = {"en": faqs_en, "fr": faqs_fr}

    eurostat_url = "https://ec.europa.eu/eurostat/databrowser/view/prc_hpi_q"
    attr_en = (
        f'<p class="source-attribution"><em>Source: '
        f'<a href="{eurostat_url}" rel="noopener" target="_blank">Eurostat</a> '
        f'House Price Index (prc_hpi_q), base 2015=100, latest quarter {quarter}. '
        f'National figures, not specific to Crete.</em></p>'
    )
    attr_fr = (
        f'<p class="source-attribution"><em>Source : '
        f'<a href="{eurostat_url}" rel="noopener" target="_blank">Eurostat</a>, '
        f'indice des prix du logement (prc_hpi_q), base 2015=100, dernier trimestre {quarter}. '
        f'Chiffres nationaux, non spécifiques à la Crète.</em></p>'
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
# Main
# --------------------------------------------------------------------------

GEOS = ["EL", "EA20", "EU27_2020", "DE", "FR", "IT", "ES", "PT", "CY"]


def build_dataset() -> dict:
    raw = fetch_hpi(GEOS, last_n_quarters=9)

    series_human = {}
    deltas = {}
    geos_human = []
    for geo, info in raw["series"].items():
        series_human[GEO_LABELS.get(geo, geo)] = info["rows"]
        deltas[GEO_LABELS.get(geo, geo)] = compute_deltas(info["rows"])
        geos_human.append({
            "code": geo,
            "name_en": GEO_LABELS.get(geo, geo),
            "name_fr": GEO_LABELS_FR.get(geo, GEO_LABELS.get(geo, geo)),
        })

    return {
        "meta": {
            "updated": raw["updated"],
            "latest_quarter": raw["latest_quarter"],
        },
        "geos_human": geos_human,
        "series": series_human,
        "deltas": deltas,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--force", action="store_true",
                        help="Generate even if quarter already in ledger")
    args = parser.parse_args()

    check_stop()
    log(f"Run start dry_run={args.dry_run} force={args.force}")

    log("Fetching Eurostat HPI...")
    dataset = build_dataset()
    quarter = dataset["meta"]["latest_quarter"]
    log(f"  latest quarter: {quarter}, updated: {dataset['meta']['updated']}")
    log(f"  Greece deltas: {dataset['deltas'].get('Greece')}")

    if args.dry_run:
        log("Dataset preview:")
        for geo_name, rows in dataset["series"].items():
            tail = rows[-3:]
            log(f"  {geo_name}: {tail}")
        return 0

    conn = psycopg2.connect(**DB_PARAMS)
    try:
        ensure_ledger(conn)
        last_q = latest_quarter_published(conn)
        if last_q == quarter and not args.force:
            log(f"Quarter {quarter} already published (last={last_q}). Skip.")
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
        slug = derive_slug(article, quarter)
        record_run(conn, quarter, guide_id, slug, dataset["meta"]["updated"])
        log(f"  inserted draft guide_id={guide_id} title='{article.get('title_en','')[:90]}'")

        send_telegram(
            f"📈 Eurostat HPI article #{guide_id}\n"
            f"quarter: {quarter}\n"
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
