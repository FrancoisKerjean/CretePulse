#!/usr/bin/env python3
"""
CretePulse — Inside Airbnb data-driven article generator.

Picks one editorial angle from a curated rotation, runs its SQL query
against airbnb_listings/airbnb_reviews, formats the dataset, asks Claude
(EN+FR) to write an SEO-ready bilingual article, inserts as draft into
`guides` table (translator-batch handles the 20 other locales).

Usage:
  python3 airbnb-articles.py                # weekly run (1 article)
  python3 airbnb-articles.py --angle ID     # force specific angle
  python3 airbnb-articles.py --dry-run      # show data + prompt, no Claude/DB
  python3 airbnb-articles.py --list         # list angles
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
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv("/opt/cretepulse-db/.env")
load_dotenv("/opt/cretepulse/.env")

LOG_DIR = "/var/log/cretepulse-content"
LOG_FILE = f"{LOG_DIR}/airbnb-articles.log"
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

# --------------------------------------------------------------------------
# Greek -> Latin neighbourhood label map (Inside Airbnb stores Greek names)
# --------------------------------------------------------------------------

NEIGHBOURHOOD_LABELS = {
    "Χανίων": "Chania (region)",
    "Ρεθύμνης": "Rethymno (region)",
    "Ηρακλείου": "Heraklion (region)",
    "Χερσονήσου": "Hersonissos",
    "Αγίου Νικολάου": "Agios Nikolaos",
    "Αποκορώνου": "Apokoronas",
    "Κισσάμου": "Kissamos",
    "Πλατανιά": "Platanias",
    "Μαλεβιζίου": "Malevizi",
    "Αγίου Βασιλείου": "Agios Vasileios",
    "Σητείας": "Sitia",
    "Ιεράπετρας": "Ierapetra",
    "Μυλοποτάμου": "Mylopotamos",
    "Αμαρίου": "Amari",
    "Καντάνου-Σελίνου": "Kantanos-Selino",
    "Σφακίων": "Sfakia",
    "Γαύδου": "Gavdos",
    "Γόρτυνας": "Gortyna",
    "Φαιστού": "Phaistos",
    "Αρχανών-Αστερουσίων": "Archanes-Asterousia",
    "Μινώα Πεδιάδας": "Minoa Pediada",
    "Ανωγείων": "Anogeia",
    "Βιάννου": "Viannos",
    "Οροπεδίου Λασιθίου": "Lasithi Plateau",
}


def label_neighbourhood(greek: str) -> str:
    if not greek:
        return ""
    if greek in NEIGHBOURHOOD_LABELS:
        return f"{NEIGHBOURHOOD_LABELS[greek]} ({greek})"
    return greek


# --------------------------------------------------------------------------
# Editorial angles
# --------------------------------------------------------------------------

ANGLES = [
    {
        "id": "neighbourhoods-pricing",
        "category": "property",
        "min_days_between": 75,
        "headline_seed": "Crete Airbnb pricing by neighbourhood",
        "sql": """
            SELECT neighbourhood,
                   count(*) AS listings,
                   round(avg(price)::numeric, 0) AS avg_price,
                   round(percentile_cont(0.5) WITHIN GROUP (ORDER BY price)::numeric, 0) AS median_price,
                   round(avg(estimated_occupancy_l365d)::numeric, 0) AS avg_occupancy_days,
                   round(avg(estimated_revenue_l365d)::numeric, 0) AS avg_annual_revenue,
                   round(avg(review_scores_rating)::numeric, 2) AS avg_rating
            FROM airbnb_listings
            WHERE region='crete'
              AND neighbourhood IS NOT NULL
              AND price > 30 AND price < 2000
            GROUP BY neighbourhood
            HAVING count(*) >= 50
            ORDER BY listings DESC
            LIMIT 15
        """,
        "angle_brief": (
            "Compare Crete neighbourhoods on Airbnb price, occupancy days per year, "
            "annual revenue and rating. Which areas command higher rates? Where is "
            "occupancy strongest? Which neighbourhoods give the best yield? "
            "Frame for travelers (cost expectations) and property buyers (yield clues)."
        ),
    },
    {
        "id": "professional-vs-amateur",
        "category": "property",
        "min_days_between": 75,
        "headline_seed": "Crete Airbnb hosts: professionals vs amateurs",
        "sql": """
            SELECT
                CASE
                  WHEN host_listings_count IS NULL OR host_listings_count <= 1 THEN '1_solo'
                  WHEN host_listings_count = 2 THEN '2_pair'
                  WHEN host_listings_count <= 5 THEN '3_small_pro'
                  WHEN host_listings_count <= 20 THEN '4_pro'
                  ELSE '5_company'
                END AS host_class,
                count(*) AS listings,
                round(avg(price)::numeric, 0) AS avg_price,
                round(avg(estimated_occupancy_l365d)::numeric, 0) AS avg_occupancy_days,
                round(avg(estimated_revenue_l365d)::numeric, 0) AS avg_annual_revenue,
                round(avg(review_scores_rating)::numeric, 2) AS avg_rating,
                round(100.0 * count(*) FILTER (WHERE host_is_superhost) / count(*), 1) AS superhost_pct
            FROM airbnb_listings
            WHERE region='crete' AND price > 30 AND price < 2000
            GROUP BY host_class
            ORDER BY host_class
        """,
        "angle_brief": (
            "Break down Crete Airbnb hosts by portfolio size: solo (1), pair (2), "
            "small pro (3-5), pro (6-20), company (20+). Compare price, occupancy, "
            "revenue, ratings, superhost share. Tell readers who actually drives "
            "Crete's short-term rental market and what that means for travelers."
        ),
    },
    {
        "id": "crete-vs-south-aegean",
        "category": "tourism",
        "min_days_between": 90,
        "headline_seed": "Crete vs South Aegean: which rents better",
        "sql": """
            SELECT region,
                   count(*) AS listings,
                   round(avg(price)::numeric, 0) AS avg_price,
                   round(percentile_cont(0.5) WITHIN GROUP (ORDER BY price)::numeric, 0) AS median_price,
                   round(avg(estimated_occupancy_l365d)::numeric, 0) AS avg_occupancy_days,
                   round(avg(estimated_revenue_l365d)::numeric, 0) AS avg_annual_revenue,
                   round(avg(review_scores_rating)::numeric, 2) AS avg_rating,
                   round(100.0 * count(*) FILTER (WHERE host_is_superhost) / count(*), 1) AS superhost_pct,
                   round(100.0 * count(*) FILTER (WHERE host_listings_count >= 10) / count(*), 1) AS pro_share_pct
            FROM airbnb_listings
            WHERE price > 30 AND price < 2000
            GROUP BY region
            ORDER BY region
        """,
        "angle_brief": (
            "Compare Crete with South Aegean (Cyclades, Dodecanese) on every Airbnb "
            "metric. South Aegean has the postcards (Santorini, Mykonos), Crete has "
            "scale and variety. Numbers tell the real story for travelers and buyers."
        ),
    },
    {
        "id": "best-yield-neighbourhoods",
        "category": "property",
        "min_days_between": 75,
        "headline_seed": "5 underrated Crete neighbourhoods with strong Airbnb yields",
        "sql": """
            SELECT neighbourhood,
                   count(*) AS listings,
                   round(avg(price)::numeric, 0) AS avg_price,
                   round(avg(estimated_occupancy_l365d)::numeric, 0) AS avg_occupancy_days,
                   round(avg(estimated_revenue_l365d)::numeric, 0) AS avg_annual_revenue,
                   round(avg(review_scores_rating)::numeric, 2) AS avg_rating,
                   round((avg(estimated_occupancy_l365d) / 365.0 * 100)::numeric, 1) AS occupancy_pct
            FROM airbnb_listings
            WHERE region='crete'
              AND neighbourhood IS NOT NULL
              AND price > 30 AND price < 2000
            GROUP BY neighbourhood
            HAVING count(*) >= 100
               AND avg(estimated_occupancy_l365d) > 25
            ORDER BY avg(estimated_revenue_l365d) DESC
            LIMIT 10
        """,
        "angle_brief": (
            "Highlight the Crete neighbourhoods where Airbnb hosts are quietly making "
            "the most money relative to their listing prices. Beyond obvious tourist "
            "hotspots, where do the numbers reveal stronger demand than supply? "
            "Frame for prospective property buyers and curious travelers."
        ),
    },
    {
        "id": "property-types-breakdown",
        "category": "tourism",
        "min_days_between": 90,
        "headline_seed": "What you actually rent on Airbnb in Crete",
        "sql": """
            SELECT property_type,
                   count(*) AS listings,
                   round(avg(price)::numeric, 0) AS avg_price,
                   round(avg(accommodates)::numeric, 1) AS avg_capacity,
                   round(avg(estimated_occupancy_l365d)::numeric, 0) AS avg_occupancy_days,
                   round(avg(review_scores_rating)::numeric, 2) AS avg_rating
            FROM airbnb_listings
            WHERE region='crete'
              AND property_type IS NOT NULL
              AND price > 30 AND price < 2000
            GROUP BY property_type
            HAVING count(*) >= 50
            ORDER BY listings DESC
            LIMIT 12
        """,
        "angle_brief": (
            "Decode Crete's Airbnb inventory by property type (entire villa, apartment, "
            "private room, etc.). What dominates? Which property types charge the most? "
            "Which are best rated? Which have highest occupancy? Help travelers know "
            "what they will actually find when browsing."
        ),
    },
    {
        "id": "host-portfolio-concentration",
        "category": "market-structure",
        "min_days_between": 60,
        "headline_seed": "Crete Airbnb: solo hosts vs portfolio professionals",
        "sql": """
            WITH host_counts AS (
              SELECT host_id, count(*) AS portfolio_size
              FROM airbnb_listings
              WHERE region='crete'
              GROUP BY host_id
            )
            SELECT
              CASE
                WHEN portfolio_size = 1 THEN '1_solo'
                WHEN portfolio_size = 2 THEN '2_pair'
                WHEN portfolio_size BETWEEN 3 AND 5 THEN '3_small_pro'
                WHEN portfolio_size BETWEEN 6 AND 20 THEN '4_pro'
                ELSE '5_mega'
              END AS host_tier,
              count(*) AS host_count,
              sum(portfolio_size) AS listings_total,
              round(avg(portfolio_size)::numeric, 1) AS avg_listings_per_host
            FROM host_counts
            GROUP BY host_tier
            ORDER BY listings_total DESC
        """,
        "angle_brief": (
            "Decompose Crete's Airbnb host market by portfolio tier: solo (1), pair (2), "
            "small pro (3-5), pro (6-20), mega (20+). Where is market concentration? "
            "Is the island still amateur-driven or captured by a small number of pros? "
            "Implications for travelers (consistency?) and prospective buyers (entry barriers)."
        ),
    },
    {
        "id": "rating-vs-revenue",
        "category": "data-deep-dive",
        "min_days_between": 60,
        "headline_seed": "Does higher Airbnb rating on Crete really mean more revenue?",
        "sql": """
            SELECT
              round(review_scores_rating::numeric, 1) AS rating_bin,
              count(*) AS listings,
              round(avg(price)::numeric, 0) AS avg_price,
              round(avg(estimated_revenue_l365d)::numeric, 0) AS avg_annual_revenue,
              round(avg(estimated_occupancy_l365d)::numeric, 0) AS avg_occupancy_days,
              round(avg(review_scores_rating)::numeric, 2) AS avg_rating_exact
            FROM airbnb_listings
            WHERE region='crete'
              AND review_scores_rating IS NOT NULL
              AND estimated_revenue_l365d IS NOT NULL
              AND price > 30 AND price < 2000
              AND review_scores_rating >= 4.0
            GROUP BY rating_bin
            ORDER BY rating_bin DESC
        """,
        "angle_brief": (
            "Bucket Crete Airbnb listings by rating (4.0 → 5.0) and compute average revenue, "
            "price, occupancy per bucket. Does a 4.8 rating really mean 10x better business "
            "than a 4.0? Identify outliers: high-revenue low-rating (price-driven) and "
            "high-rating low-revenue (under-monetized gems). Hard numbers for skeptical investors."
        ),
    },
    {
        "id": "license-distribution",
        "category": "regulation",
        "min_days_between": 60,
        "headline_seed": "Crete Airbnb: which neighbourhoods have proper short-rental licenses?",
        "sql": """
            SELECT neighbourhood,
                   count(*) AS listings,
                   round(100.0 * count(*) FILTER (WHERE license IS NOT NULL) / count(*), 1) AS license_declared_pct,
                   round(avg(price)::numeric, 0) AS avg_price,
                   round(avg(estimated_revenue_l365d)::numeric, 0) AS avg_annual_revenue,
                   round(avg(review_scores_rating)::numeric, 2) AS avg_rating
            FROM airbnb_listings
            WHERE region='crete'
              AND neighbourhood IS NOT NULL
              AND price > 30 AND price < 2000
            GROUP BY neighbourhood
            HAVING count(*) >= 50
            ORDER BY license_declared_pct DESC
            LIMIT 15
        """,
        "angle_brief": (
            "Spotlight neighbourhoods by license declaration rate. Greek short-rental law "
            "(AMA) requires proper registration. Where do hosts comply? Where is the grey zone? "
            "Compare compliance neighbourhoods on price, revenue, and rating. "
            "Frame for travelers (cleaner legal footing?) and buyers (compliance risk assessment)."
        ),
    },
]


def get_angle(angle_id: str):
    for a in ANGLES:
        if a["id"] == angle_id:
            return a
    return None


# --------------------------------------------------------------------------
# Logging + DB ledger of past articles
# --------------------------------------------------------------------------

def log(msg: str) -> None:
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    line = f"{ts} [airbnb-articles] {msg}"
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
        send(Bot.PLUME, "Airbnb Articles", text)
    except Exception as e:
        log(f"Telegram error: {e}")


LEDGER_DDL = """
CREATE TABLE IF NOT EXISTS airbnb_articles_ledger (
    angle_id TEXT NOT NULL,
    guide_id BIGINT,
    slug TEXT,
    generated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (angle_id, generated_at)
);
"""


def ensure_ledger(conn) -> None:
    with conn.cursor() as cur:
        cur.execute(LEDGER_DDL)
    conn.commit()


def last_run_age_days(conn, angle_id: str):
    with conn.cursor() as cur:
        cur.execute(
            "SELECT max(generated_at) FROM airbnb_articles_ledger WHERE angle_id=%s",
            (angle_id,),
        )
        row = cur.fetchone()
    if not row or not row[0]:
        return None
    return (datetime.now(timezone.utc) - row[0]).days


def record_run(conn, angle_id: str, guide_id: int, slug: str) -> None:
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO airbnb_articles_ledger (angle_id, guide_id, slug) VALUES (%s, %s, %s)",
            (angle_id, guide_id, slug),
        )
    conn.commit()


# --------------------------------------------------------------------------
# Angle selection
# --------------------------------------------------------------------------

def pick_angle(conn, forced_id=None):
    if forced_id:
        a = get_angle(forced_id)
        if not a:
            log(f"Forced angle '{forced_id}' not found.")
            return None
        return a

    eligible = []
    for a in ANGLES:
        age = last_run_age_days(conn, a["id"])
        if age is None or age >= a["min_days_between"]:
            eligible.append((a, age if age is not None else 9999))

    if not eligible:
        log("No eligible angle right now (all within cooldown).")
        return None

    # Pick the one with greatest age (oldest first / never-run first).
    eligible.sort(key=lambda t: t[1], reverse=True)
    chosen = eligible[0][0]
    log(f"Picked angle '{chosen['id']}' (last run age={eligible[0][1]}d)")
    return chosen


# --------------------------------------------------------------------------
# Snapshot context
# --------------------------------------------------------------------------

def snapshot_context(conn) -> dict:
    with conn.cursor() as cur:
        cur.execute("""
            SELECT region, snapshot_date, listings_count, reviews_count
            FROM airbnb_snapshots
            ORDER BY region
        """)
        rows = cur.fetchall()
    out = {}
    for region, sd, lc, rc in rows:
        out[region] = {
            "snapshot_date": sd.isoformat(),
            "listings_count": lc,
            "reviews_count": rc,
        }
    return out


# --------------------------------------------------------------------------
# Data fetch + format
# --------------------------------------------------------------------------

HOST_CLASS_LABELS = {
    "1_solo": "Solo host (1 listing)",
    "2_pair": "Pair (2 listings)",
    "3_small_pro": "Small pro (3-5 listings)",
    "4_pro": "Pro operator (6-20 listings)",
    "5_company": "Company (20+ listings)",
}


def fetch_dataset(conn, angle: dict) -> list:
    with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
        cur.execute(angle["sql"])
        rows = [dict(r) for r in cur.fetchall()]

    # Convert Decimals/dates for JSON friendliness + relabel known fields.
    for row in rows:
        for k, v in list(row.items()):
            if hasattr(v, "isoformat"):
                row[k] = v.isoformat()
            elif hasattr(v, "__class__") and v.__class__.__name__ == "Decimal":
                row[k] = float(v)
        if "neighbourhood" in row:
            row["neighbourhood_label"] = label_neighbourhood(row["neighbourhood"])
        if "host_class" in row:
            row["host_class_label"] = HOST_CLASS_LABELS.get(row["host_class"], row["host_class"])
    return rows


# --------------------------------------------------------------------------
# Claude generation
# --------------------------------------------------------------------------

GENERATION_SYSTEM = """You are a senior bilingual travel + property journalist for
crete.direct — a guide to Crete, Greece. You will receive a dataset extracted
from Inside Airbnb (https://insideairbnb.com), the public dataset of Airbnb
listings, plus a story angle. Write a short, accurate, SEO-friendly article
in BOTH English AND French.

CRITICAL rules:
- Base every claim on the provided dataset. NEVER invent numbers, names,
  trends, or comparisons not present in the data.
- If a number is in the data, you may quote it. Round nicely if helpful.
- 450-650 words for body content (each language).
- Tone: confident, journalistic, traveler-friendly with light implications
  for property buyers. Not stiff, not influencer.
- No em dashes (—) and no en dashes (–). Use comma, period, or " - ".
- French content: vouvoiement (vous), full accents (é è à ç ê î ô û ù).
- Always credit Inside Airbnb as the source in body and acknowledge the
  snapshot date you were given.
- Freshness: the current year is given as `current_year` in the brief. If a
  year helps the headline or body, use `current_year`, NEVER a past year like
  2024 or 2025. The ONLY exception is the dataset snapshot date: cite it exactly
  as given (e.g. "data from September 2025"), do not bump it to current_year.
- Use HTML body: <p>, <h2>, <ul><li>. No tables (kept simple for translation).
- Address travellers AND prospective property buyers when relevant.

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
    {"q": "English Q", "a": "English A 30-60 words"},
    {"q": "...", "a": "..."},
    {"q": "...", "a": "..."}
  ],
  "faqs_fr": [
    {"q": "Question en français", "a": "Réponse 30-60 mots avec accents"},
    {"q": "...", "a": "..."},
    {"q": "...", "a": "..."}
  ],
  "category": "tourism | property | hosts | data",
  "confidence": "high | medium | low (how well the dataset supports the article)"
}
"""


def build_prompt(angle: dict, rows: list, snapshot_meta: dict) -> str:
    payload = {
        "angle_id": angle["id"],
        "current_year": datetime.now(timezone.utc).year,
        "headline_seed": angle["headline_seed"],
        "angle_brief": angle["angle_brief"],
        "snapshot_meta": snapshot_meta,
        "dataset_rows": rows,
        "row_count": len(rows),
    }
    return (
        f"{GENERATION_SYSTEM}\n\n"
        f"---\nDATA + STORY BRIEF:\n```json\n"
        f"{json.dumps(payload, ensure_ascii=False, indent=2)}\n```\n\n"
        f"Return strict JSON now."
    )


def call_claude(prompt: str, model: str = "haiku", timeout: int = 180) -> str:
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
    return text[:90] or "airbnb-article"


def derive_slug(article: dict, angle_id: str) -> str:
    hint = (article.get("slug_hint") or article.get("title_en") or angle_id)
    base = slugify(hint)
    today = datetime.now(timezone.utc).strftime("%Y%m")
    h = hashlib.sha1(f"{angle_id}-{today}".encode()).hexdigest()[:6]
    return f"{base}-{today}-{h}"


def insert_draft(conn, article: dict, angle: dict, snapshot_meta: dict) -> int:
    slug = derive_slug(article, angle["id"])
    title_en = (article.get("title_en") or "").strip()
    title_fr = (article.get("title_fr") or "").strip()
    meta_en = (article.get("meta_desc_en") or "").strip()
    meta_fr = (article.get("meta_desc_fr") or "").strip()
    body_en = article.get("html_body_en") or ""
    body_fr = article.get("html_body_fr") or ""
    faqs_en = article.get("faqs_en") or []
    faqs_fr = article.get("faqs_fr") or []
    category = article.get("category") or angle.get("category", "tourism")

    if not title_fr or not body_fr:
        raise RuntimeError("Missing FR fields — translator-batch needs EN+FR.")

    keywords = ["crete-airbnb", angle["id"], category]
    keywords = [k for k in keywords if k][:8]

    titles = {"en": title_en, "fr": title_fr}
    meta_descs = {"en": meta_en, "fr": meta_fr}
    contents = {"en": body_en, "fr": body_fr}
    faqs_obj = {"en": faqs_en, "fr": faqs_fr}

    snap_dates = ", ".join(
        f"{r}: {info.get('snapshot_date','')}"
        for r, info in (snapshot_meta or {}).items()
    )
    attr_en = (
        f'<p class="source-attribution"><em>Source: '
        f'<a href="https://insideairbnb.com/get-the-data" rel="noopener" target="_blank">'
        f'Inside Airbnb</a> snapshots ({snap_dates}). '
        f'Numbers reflect that snapshot, not real-time.</em></p>'
    )
    attr_fr = (
        f'<p class="source-attribution"><em>Source : '
        f'<a href="https://insideairbnb.com/get-the-data" rel="noopener" target="_blank">'
        f'Inside Airbnb</a>, instantanés ({snap_dates}). '
        f'Les chiffres reflètent cet instantané, pas le temps réel.</em></p>'
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
    parser.add_argument("--angle", help="Force a specific angle id")
    parser.add_argument("--dry-run", action="store_true",
                        help="Show data + prompt, no Claude or DB write")
    parser.add_argument("--list", action="store_true",
                        help="List angles and exit")
    args = parser.parse_args()

    if args.list:
        for a in ANGLES:
            print(f"  {a['id']:30s} cooldown={a['min_days_between']}d  {a['headline_seed']}")
        return 0

    check_stop()
    log(f"Run start dry_run={args.dry_run} forced_angle={args.angle}")

    conn = psycopg2.connect(**DB_PARAMS)
    try:
        ensure_ledger(conn)
        angle = pick_angle(conn, forced_id=args.angle)
        if not angle:
            log("No angle eligible. Exiting cleanly.")
            return 0

        rows = fetch_dataset(conn, angle)
        if not rows:
            log(f"  angle '{angle['id']}' returned 0 rows — skipping.")
            return 0

        snap = snapshot_context(conn)
        log(f"  rows: {len(rows)} | snapshots: {snap}")

        if args.dry_run:
            log("DATASET:")
            for r in rows[:30]:
                log(f"  {r}")
            log("Dry run done.")
            return 0

        prompt = build_prompt(angle, rows, snap)
        log(f"  calling Claude (haiku) — prompt {len(prompt)} chars")
        t0 = time.time()
        raw = call_claude(prompt, model="haiku")
        article = parse_json_response(raw)
        log(f"  Claude returned in {time.time()-t0:.1f}s, confidence={article.get('confidence')}")

        if (article.get("confidence") or "").lower() == "low":
            log(f"  confidence=low — abort article, will retry next run.")
            return 0

        guide_id = insert_draft(conn, article, angle, snap)
        record_run(conn, angle["id"], guide_id, derive_slug(article, angle["id"]))
        log(f"  inserted draft guide_id={guide_id} title='{article.get('title_en','')[:90]}'")

        send_telegram(
            f"📊 Airbnb article #{guide_id}\n"
            f"angle: {angle['id']}\n"
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
