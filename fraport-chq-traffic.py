#!/usr/bin/env python3
"""
CretePulse — Fraport Chania (CHQ) monthly traffic article generator.

Discovers latest published month on fraport-greece.com traffic-figures
page, downloads the PDFs, extracts the CHANIA row via pdftotext + regex,
stores monthly numbers in PG, builds 3-month + YTD context, then asks
Claude to write a bilingual EN+FR article and inserts as draft.

Why only Chania (CHQ): Fraport Greece operates 14 regional airports
including Chania CHQ but NOT Heraklion (HER) or Sitia (JSH) which are
under different concessions. HER will be added later via HCAA bulletins.

Usage:
  python3 fraport-chq-traffic.py
  python3 fraport-chq-traffic.py --dry-run
  python3 fraport-chq-traffic.py --force        # ignore ledger
  python3 fraport-chq-traffic.py --month 03     # force a specific month
"""

import argparse
import calendar
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
LOG_FILE = f"{LOG_DIR}/fraport-chq-traffic.log"
STOP_FILE = "/opt/cretepulse-content/.STOP"
CLAUDE_WRAPPER = "/opt/cretepulse-content/bin/claude-capped.sh"
CACHE_DIR = "/opt/cretepulse-data/fraport"

os.makedirs(LOG_DIR, exist_ok=True)
os.makedirs(CACHE_DIR, exist_ok=True)

DB_PARAMS = {
    "host": "localhost",
    "port": 5433,
    "dbname": "cretepulse",
    "user": "postgres",
    "password": os.environ.get("POSTGRES_PASSWORD", ""),
}

FRAPORT_INDEX = "https://www.fraport-greece.com/en/our-expertise/aviation/traffic-figures.html"
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/121.0 Safari/537.36"
)

MONTH_NAMES = {
    1: "january", 2: "february", 3: "march", 4: "april",
    5: "may", 6: "june", 7: "july", 8: "august",
    9: "september", 10: "october", 11: "november", 12: "december",
}

MONTH_NAMES_FR = {
    1: "janvier", 2: "février", 3: "mars", 4: "avril",
    5: "mai", 6: "juin", 7: "juillet", 8: "août",
    9: "septembre", 10: "octobre", 11: "novembre", 12: "décembre",
}


# --------------------------------------------------------------------------
# Logging
# --------------------------------------------------------------------------

def log(msg: str) -> None:
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    line = f"{ts} [fraport-chq] {msg}"
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
        send(Bot.PLUME, "Fraport CHQ", text)
    except Exception as e:
        log(f"Telegram error: {e}")


# --------------------------------------------------------------------------
# DB schema
# --------------------------------------------------------------------------

DDL = """
CREATE TABLE IF NOT EXISTS fraport_chq_monthly (
    year INT NOT NULL,
    month INT NOT NULL,
    pax_domestic INT,
    pax_international INT,
    pax_total INT,
    pax_dom_prev INT,
    pax_intl_prev INT,
    pax_total_prev INT,
    pax_dom_yoy_pct NUMERIC(6,2),
    pax_intl_yoy_pct NUMERIC(6,2),
    pax_total_yoy_pct NUMERIC(6,2),
    flights_domestic INT,
    flights_international INT,
    flights_total INT,
    source_pdf_url TEXT,
    ingested_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (year, month)
);

CREATE TABLE IF NOT EXISTS fraport_articles_ledger (
    year INT NOT NULL,
    month INT NOT NULL,
    guide_id BIGINT,
    slug TEXT,
    generated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (year, month)
);
"""


def ensure_schema(conn) -> None:
    with conn.cursor() as cur:
        cur.execute(DDL)
    conn.commit()


# --------------------------------------------------------------------------
# Discovery
# --------------------------------------------------------------------------

PDF_LINK_RE = re.compile(
    r'href="(/content/dam/fraport-company-greece/documents/en/'
    r'our-expertise/traffic-figures/(\d{4})/([a-z]+)/'
    r'Fraport_Greece_(\d{2})_Traffic_(\d{4})vs(\d{4})\.pdf/[^"]+)"'
)


def discover_latest_pdf() -> dict:
    """Scrape the index page and return the most recent monthly PDF link."""
    r = requests.get(
        FRAPORT_INDEX,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "text/html",
            "Accept-Language": "en-US,en;q=0.9",
        },
        timeout=30,
    )
    r.raise_for_status()
    html = r.text

    matches = list(PDF_LINK_RE.finditer(html))
    if not matches:
        raise RuntimeError("No traffic PDFs found on Fraport index page")

    candidates = []
    for m in matches:
        href = m.group(1)
        year = int(m.group(2))
        month_word = m.group(3).lower()
        month_num = int(m.group(4))
        candidates.append({
            "year": year,
            "month": month_num,
            "month_word": month_word,
            "url": "https://www.fraport-greece.com" + href.replace("&amp;", "&"),
        })

    candidates.sort(key=lambda c: (c["year"], c["month"]), reverse=True)
    return candidates[0]


# --------------------------------------------------------------------------
# Download + parse
# --------------------------------------------------------------------------

def download_pdf(url: str, dest_path: str) -> None:
    if os.path.exists(dest_path) and os.path.getsize(dest_path) > 1024:
        log(f"  cached {dest_path}")
        return
    r = requests.get(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Referer": FRAPORT_INDEX,
            "Accept": "application/pdf",
        },
        timeout=60,
    )
    r.raise_for_status()
    tmp = dest_path + ".tmp"
    with open(tmp, "wb") as f:
        f.write(r.content)
    os.replace(tmp, dest_path)
    log(f"  saved {dest_path} ({len(r.content)} bytes)")


def pdftotext_layout(pdf_path: str) -> str:
    result = subprocess.run(
        ["pdftotext", "-layout", pdf_path, "-"],
        capture_output=True, text=True, timeout=60,
    )
    if result.returncode != 0:
        raise RuntimeError(f"pdftotext rc={result.returncode}: {result.stderr[:200]}")
    return result.stdout


def parse_eu_number(s: str):
    """Fraport uses '83.681' for thousands and '9,7%' for percent."""
    if s is None:
        return None
    s = s.strip()
    if not s or s == "-":
        return None
    s = s.replace(".", "").replace(",", ".").replace("%", "").strip()
    try:
        return float(s)
    except ValueError:
        return None


def extract_chania_rows(text: str) -> dict:
    """
    Extract CHANIA passengers and flights rows from the Fraport monthly PDF.
    The PDF has two sections (Passengers, Flights), each with columns:
    Domestic 2026 / 2025 / %, International 2026 / 2025 / %, Total 2026 / 2025 / %.
    """
    out = {}
    # Iterate all CHANIA lines; first occurrence is passengers, second is flights.
    chania_lines = [l for l in text.splitlines() if re.search(r"\bCHANIA\b", l, re.I)]
    if len(chania_lines) < 1:
        raise RuntimeError("CHANIA row not found in Fraport PDF")

    def parse_row(line: str):
        # Tokenize numbers (thousand-dot OK), %s OK, ignore the airport label.
        tokens = re.findall(r"[\d.,]+%?", line)
        nums = [parse_eu_number(t) for t in tokens]
        # Expected: dom_curr, dom_prev, dom_pct, intl_curr, intl_prev, intl_pct, total_curr, total_prev, total_pct
        if len(nums) < 9:
            raise RuntimeError(f"Unexpected number count for CHANIA row: {len(nums)} -> {nums}")
        return {
            "dom_curr": int(nums[0]) if nums[0] is not None else None,
            "dom_prev": int(nums[1]) if nums[1] is not None else None,
            "dom_pct": nums[2],
            "intl_curr": int(nums[3]) if nums[3] is not None else None,
            "intl_prev": int(nums[4]) if nums[4] is not None else None,
            "intl_pct": nums[5],
            "total_curr": int(nums[6]) if nums[6] is not None else None,
            "total_prev": int(nums[7]) if nums[7] is not None else None,
            "total_pct": nums[8],
        }

    out["passengers"] = parse_row(chania_lines[0])
    if len(chania_lines) >= 2:
        out["flights"] = parse_row(chania_lines[1])
    return out


# --------------------------------------------------------------------------
# DB upsert
# --------------------------------------------------------------------------

def upsert_chq_row(conn, year: int, month: int, pax: dict, flights: dict, pdf_url: str) -> None:
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO fraport_chq_monthly (
                year, month,
                pax_domestic, pax_international, pax_total,
                pax_dom_prev, pax_intl_prev, pax_total_prev,
                pax_dom_yoy_pct, pax_intl_yoy_pct, pax_total_yoy_pct,
                flights_domestic, flights_international, flights_total,
                source_pdf_url
            )
            VALUES (%s,%s, %s,%s,%s, %s,%s,%s, %s,%s,%s, %s,%s,%s, %s)
            ON CONFLICT (year, month) DO UPDATE SET
                pax_domestic = EXCLUDED.pax_domestic,
                pax_international = EXCLUDED.pax_international,
                pax_total = EXCLUDED.pax_total,
                pax_dom_prev = EXCLUDED.pax_dom_prev,
                pax_intl_prev = EXCLUDED.pax_intl_prev,
                pax_total_prev = EXCLUDED.pax_total_prev,
                pax_dom_yoy_pct = EXCLUDED.pax_dom_yoy_pct,
                pax_intl_yoy_pct = EXCLUDED.pax_intl_yoy_pct,
                pax_total_yoy_pct = EXCLUDED.pax_total_yoy_pct,
                flights_domestic = EXCLUDED.flights_domestic,
                flights_international = EXCLUDED.flights_international,
                flights_total = EXCLUDED.flights_total,
                source_pdf_url = EXCLUDED.source_pdf_url,
                ingested_at = now()
        """, (
            year, month,
            pax.get("dom_curr"), pax.get("intl_curr"), pax.get("total_curr"),
            pax.get("dom_prev"), pax.get("intl_prev"), pax.get("total_prev"),
            pax.get("dom_pct"), pax.get("intl_pct"), pax.get("total_pct"),
            (flights or {}).get("dom_curr"),
            (flights or {}).get("intl_curr"),
            (flights or {}).get("total_curr"),
            pdf_url,
        ))
    conn.commit()


def fetch_recent_months(conn, year: int, month: int, n: int = 6) -> list:
    with conn.cursor() as cur:
        cur.execute("""
            SELECT year, month, pax_domestic, pax_international, pax_total,
                   pax_total_prev, pax_total_yoy_pct,
                   flights_total
            FROM fraport_chq_monthly
            ORDER BY year DESC, month DESC
            LIMIT %s
        """, (n,))
        rows = cur.fetchall()
    out = []
    for r in rows:
        out.append({
            "year": r[0], "month": r[1],
            "pax_domestic": r[2], "pax_international": r[3], "pax_total": r[4],
            "pax_total_prev_year": r[5], "pax_total_yoy_pct": float(r[6]) if r[6] is not None else None,
            "flights_total": r[7],
        })
    return list(reversed(out))


def already_in_ledger(conn, year: int, month: int) -> bool:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT 1 FROM fraport_articles_ledger WHERE year=%s AND month=%s",
            (year, month),
        )
        return cur.fetchone() is not None


def record_ledger(conn, year: int, month: int, guide_id: int, slug: str) -> None:
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO fraport_articles_ledger (year, month, guide_id, slug)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (year, month) DO UPDATE SET
                guide_id = EXCLUDED.guide_id,
                slug = EXCLUDED.slug,
                generated_at = now()
        """, (year, month, guide_id, slug))
    conn.commit()


# --------------------------------------------------------------------------
# Article generation
# --------------------------------------------------------------------------

GENERATION_SYSTEM = """You are a senior bilingual travel + aviation journalist
for crete.direct, a guide to Crete, Greece. You will receive official monthly
traffic figures for Chania International Airport (CHQ) operated by Fraport
Greece, plus a 6-month historical context.

Your job: write a short, accurate, SEO-friendly article in BOTH English AND
French explaining the latest month's CHQ traffic — domestic vs international,
year-over-year, recent trend.

CRITICAL rules:
- Base every numeric claim on the provided dataset. NEVER invent figures.
- Cite Fraport Greece as the source AND the latest month covered.
- 450-650 words for body content (each language).
- No em dashes (—) and no en dashes (–). Use comma, period, " - ".
- French content: vouvoiement (vous), full accents (é è à ç ê î ô û ù).
- Tone: clear, journalistic, traveler-friendly. Light implications about
  Crete tourism momentum only if grounded in the data.
- Important caveat to mention once: Heraklion (HER) is operated by a
  different concession and is NOT in this dataset, so this is a partial
  view of Crete's air traffic.
- HTML body: <p>, <h2>, <ul><li>. No tables.

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


def build_prompt(year: int, month: int, latest: dict, history: list, pdf_url: str) -> str:
    payload = {
        "source": "Fraport Greece (operator of Chania CHQ + 13 other Greek regional airports)",
        "source_pdf_url": pdf_url,
        "airport_code": "CHQ",
        "airport_name_en": "Chania International Airport",
        "airport_name_fr": "Aéroport international de La Canée (Chania)",
        "month": MONTH_NAMES[month].capitalize(),
        "month_fr": MONTH_NAMES_FR[month],
        "year": year,
        "latest_month_data": latest,
        "history_last_6_months": history,
        "caveat": "Heraklion (HER) and Sitia (JSH) are operated by other concessions and are NOT included.",
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
# DB insert article draft
# --------------------------------------------------------------------------

def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = re.sub(r"-+", "-", text).strip("-")
    return text[:90] or "chania-airport-traffic"


def derive_slug(article: dict, year: int, month: int) -> str:
    hint = article.get("slug_hint") or article.get("title_en") or "chania-airport-traffic"
    base = slugify(hint)
    h = hashlib.sha1(f"{year}-{month}".encode()).hexdigest()[:6]
    return f"{base}-{year}-{month:02d}-{h}"


def insert_draft(conn, article: dict, year: int, month: int, pdf_url: str) -> int:
    slug = derive_slug(article, year, month)
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

    keywords = ["chania-airport", "fraport", "crete-tourism",
                f"{year}-{month:02d}"][:8]

    titles = {"en": title_en, "fr": title_fr}
    meta_descs = {"en": meta_en, "fr": meta_fr}
    contents = {"en": body_en, "fr": body_fr}
    faqs_obj = {"en": faqs_en, "fr": faqs_fr}

    attr_en = (
        f'<p class="source-attribution"><em>Source: '
        f'<a href="{pdf_url}" rel="noopener" target="_blank">Fraport Greece</a> '
        f'monthly traffic figures, {MONTH_NAMES[month].capitalize()} {year}. '
        f'Heraklion (HER) is operated by another concession and is not in this dataset.</em></p>'
    )
    attr_fr = (
        f'<p class="source-attribution"><em>Source : '
        f'<a href="{pdf_url}" rel="noopener" target="_blank">Fraport Greece</a>, '
        f"chiffres de trafic mensuels, {MONTH_NAMES_FR[month]} {year}. "
        "Héraklion (HER) est exploité par une autre concession et n'est pas dans ces données.</em></p>"
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

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--force", action="store_true",
                        help="Generate even if month already in ledger")
    parser.add_argument("--month", type=int,
                        help="Override discovered month (1-12)")
    args = parser.parse_args()

    check_stop()
    log(f"Run start dry_run={args.dry_run} force={args.force}")

    log("Discovering latest Fraport PDF...")
    latest = discover_latest_pdf()
    log(f"  latest published: {latest['year']}-{latest['month']:02d} ({latest['month_word']})")
    log(f"  url: {latest['url']}")

    if args.month:
        latest["month"] = args.month
        latest["month_word"] = MONTH_NAMES[args.month]

    year = latest["year"]
    month = latest["month"]

    pdf_path = os.path.join(CACHE_DIR, f"chq_{year}_{month:02d}.pdf")
    download_pdf(latest["url"], pdf_path)

    log("Parsing PDF...")
    text = pdftotext_layout(pdf_path)
    extracted = extract_chania_rows(text)
    log(f"  CHANIA passengers: {extracted.get('passengers')}")
    if "flights" in extracted:
        log(f"  CHANIA flights: {extracted['flights']}")

    if args.dry_run:
        log("Dry run — extracted data only, no DB or Claude.")
        return 0

    conn = psycopg2.connect(**DB_PARAMS)
    try:
        ensure_schema(conn)
        upsert_chq_row(conn, year, month, extracted["passengers"],
                       extracted.get("flights", {}), latest["url"])

        if not args.force and already_in_ledger(conn, year, month):
            log(f"  article for {year}-{month:02d} already published — skip")
            return 0

        history = fetch_recent_months(conn, year, month, n=6)
        log(f"  history loaded: {len(history)} months")

        prompt = build_prompt(year, month, extracted["passengers"], history, latest["url"])
        log(f"  calling Claude (haiku) — prompt {len(prompt)} chars")
        t0 = time.time()
        raw = call_claude(prompt, model="haiku")
        article = parse_json_response(raw)
        log(f"  Claude returned in {time.time()-t0:.1f}s, confidence={article.get('confidence')}")

        if (article.get("confidence") or "").lower() == "low":
            log("  confidence=low — abort.")
            return 0

        guide_id = insert_draft(conn, article, year, month, latest["url"])
        slug = derive_slug(article, year, month)
        record_ledger(conn, year, month, guide_id, slug)
        log(f"  inserted draft guide_id={guide_id} title='{article.get('title_en','')[:90]}'")

        send_telegram(
            f"✈️ Chania CHQ traffic article #{guide_id}\n"
            f"{MONTH_NAMES[month].capitalize()} {year}: "
            f"{extracted['passengers'].get('total_curr'):,} pax "
            f"({extracted['passengers'].get('total_pct')}% YoY)\n"
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
