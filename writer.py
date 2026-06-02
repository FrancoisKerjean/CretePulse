#!/usr/bin/env python3
"""
CretePulse -- Writer parametrable
Pops 1 topic from guides_queue matching --format, generates EN+FR with the
right Claude model and prompt template, runs AEO check, anti-hallu check,
hero image, inserts as draft, triggers translator-batch.
Usage:
  python3 writer.py --format=<pillar|mid|short> [--slug override] [--dry-run]
"""

import argparse
import json
import os
import re
import subprocess
import sys
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path

import psycopg2
import requests
from dotenv import load_dotenv

load_dotenv("/opt/cretepulse-db/.env")
load_dotenv("/opt/cretepulse/.env")
load_dotenv("/opt/kairos-blog/.env")
sys.path.insert(0, "/opt/cretepulse")
sys.path.insert(0, "/opt/cretepulse-content")

from lib.aeo_check import check_aeo_compliance

STOP_FILE = "/opt/cretepulse-content/.STOP"
LOG_DIR = "/var/log/cretepulse-content"
PROMPTS_DIR = "/opt/cretepulse-content/prompts"
FAIL_DIR = "/var/log/cretepulse-content/writer-failures"
os.makedirs(LOG_DIR, exist_ok=True)
os.makedirs(FAIL_DIR, exist_ok=True)

CLAUDE_WRAPPER = "/opt/cretepulse-content/bin/claude-capped.sh"
TRANSLATOR_SCRIPT = "/opt/cretepulse-content/translator-batch.py"
INDEXNOW_SCRIPT = "/opt/cretepulse-content/indexnow.py"

DB_PARAMS = {
    "host": "localhost",
    "port": 5433,
    "dbname": "cretepulse",
    "user": "postgres",
    "password": os.environ.get("POSTGRES_PASSWORD", ""),
}

FORMAT_CONFIG = {
    "pillar": {
        "model": "opus",
        "min_words": 2000,
        "max_words": 3000,
        "prompt_path": f"{PROMPTS_DIR}/writer-pillar.md",
        "include_related_articles": True,
        "include_data_hints": True,
    },
    "mid": {
        "model": "sonnet",
        "min_words": 1000,
        "max_words": 1500,
        "prompt_path": f"{PROMPTS_DIR}/writer-mid.md",
        "include_related_articles": True,
        "include_data_hints": False,
    },
    "short": {
        "model": "haiku",
        "min_words": 500,
        "max_words": 800,
        "prompt_path": f"{PROMPTS_DIR}/writer-short.md",
        "include_related_articles": False,
        "include_data_hints": False,
    },
}

# ---------------------------------------------------------------------------
# Generic place/entity whitelist for anti-hallucination
# (ported from writer-l1.py)
# ---------------------------------------------------------------------------

GENERIC_WHITELIST = {
    "crete", "crete", "kreta", "krete", "kriti", "greece", "grece", "griechenland",
    "aegean", "mediterranean", "mediterranee", "mittelmeer",
    "heraklion", "heraklion", "iraklio", "irakleio", "iraklion",
    "chania", "hania", "la canee",
    "rethymno", "rethymnon", "rethymno",
    "sitia", "agios nikolaos", "ierapetra", "lasithi",
    "sfakia", "hora sfakion", "loutro",
    "athens", "athenes", "athina",
    "paris", "london", "berlin", "rome", "madrid",
    "minoan", "minoenne", "minoique",
    "europe", "france", "germany", "uk", "netherlands", "italy", "spain",
    "samaria", "gorge", "gorges",
    "white mountains", "lefka ori",
    "mount ida", "psiloritis", "mont ida",
}


def get_format_config(format_name: str) -> dict:
    if format_name not in FORMAT_CONFIG:
        raise ValueError(f"unknown format: {format_name}")
    return FORMAT_CONFIG[format_name]


def log(msg):
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    line = f"{ts} [writer] {msg}"
    print(line, flush=True)
    with open(f"{LOG_DIR}/writer.log", "a") as f:
        f.write(line + "\n")


def check_stop():
    if os.path.exists(STOP_FILE):
        log("STOP file present -- exiting cleanly.")
        sys.exit(98)


def send_telegram(text):
    try:
        from kairos_telegram import send, Bot
        send(Bot.PLUME, "Writer", text)
    except Exception as e:
        log(f"Telegram error: {e}")


# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------

def pop_queue_item(conn, format_name: str, slug_override: str = None):
    """Pop the highest-priority pending item matching format (or specific slug).
    Note: schema column is `notes` (not `title`) -- we map it to `title` in returned dict."""
    with conn.cursor() as cur:
        if slug_override:
            cur.execute(
                "SELECT id, slug, notes, source_meta, category, keywords FROM guides_queue "
                "WHERE slug = %s AND status = 'pending' LIMIT 1 FOR UPDATE SKIP LOCKED",
                (slug_override,),
            )
        else:
            cur.execute(
                "SELECT id, slug, notes, source_meta, category, keywords FROM guides_queue "
                "WHERE status = 'pending' AND format = %s "
                "ORDER BY priority DESC, created_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED",
                (format_name,),
            )
        row = cur.fetchone()
        if not row:
            return None
        item = {
            "id": row[0],
            "slug": row[1],
            "title": row[2],  # mapped from `notes` column
            "source_meta": row[3] or {},
            "category": row[4] or "travel",
            "keywords": row[5] or [],
        }
        cur.execute(
            "UPDATE guides_queue SET status = 'processing' WHERE id = %s",
            (item["id"],),
        )
    conn.commit()
    return item


def fetch_related_articles(conn, limit: int = 20) -> list:
    """Last 20 published guides for internal linking suggestions."""
    with conn.cursor() as cur:
        cur.execute(
            "SELECT slug, titles->>'en' AS title_en FROM guides "
            "WHERE format != 'daily' AND format != 'news' "
            "ORDER BY published_at DESC NULLS LAST LIMIT %s",
            (limit,),
        )
        return [{"slug": r[0], "title": r[1]} for r in cur.fetchall()]


def load_allowlist(conn):
    """Load slugs and names from factual DB tables for anti-hallu check."""
    allowlist = {}
    with conn.cursor() as cur:
        try:
            cur.execute("SELECT slug, name_en, name_fr, region FROM beaches")
            for row in cur.fetchall():
                slug, name_en, name_fr, region = row
                allowlist[slug] = {"type": "beach", "name_en": name_en, "name_fr": name_fr, "region": region}
        except Exception:
            pass

        try:
            cur.execute("SELECT slug, name_en, name_fr FROM villages")
            for row in cur.fetchall():
                slug, name_en, name_fr = row
                allowlist[slug] = {"type": "village", "name_en": name_en, "name_fr": name_fr}
        except Exception:
            pass

        try:
            cur.execute("SELECT slug, name_en, name_fr, distance_km, elevation_gain_m FROM hikes")
            for row in cur.fetchall():
                slug, name_en, name_fr, dist, elev = row
                allowlist[slug] = {"type": "hike", "name_en": name_en, "name_fr": name_fr,
                                   "distance_km": float(dist) if dist else None,
                                   "elevation_gain_m": elev}
        except Exception:
            pass

        try:
            cur.execute("SELECT slug, name, village, region, cuisine, price_range FROM food_places")
            for row in cur.fetchall():
                slug, name, village, region, cuisine, price = row
                allowlist[slug] = {"type": "food", "name_en": name, "village": village,
                                   "region": region, "cuisine": cuisine, "price_range": price}
        except Exception:
            pass

    return allowlist


def mark_queue_error(conn, queue_item_id: int, error_msg: str):
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE guides_queue SET status = 'error', source_meta = source_meta || %s::jsonb WHERE id = %s",
            (json.dumps({"last_error": error_msg, "errored_at": datetime.now(timezone.utc).isoformat()}), queue_item_id),
        )
    conn.commit()


def insert_guide(conn, queue_item: dict, format_name: str, payload: dict, image_url: str = None) -> int:
    """Insert into guides table as draft. Returns guide_id."""
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO guides (slug, format, category, titles, meta_descs, contents,
                                target_query, format_tier, source_meta, image_url, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'draft')
            RETURNING id
            """,
            (
                queue_item["slug"],
                "long" if format_name == "pillar" else format_name,
                (queue_item.get("source_meta") or {}).get("category", queue_item.get("category", "travel")),
                json.dumps({"en": payload["title_en"], "fr": payload["title_fr"]}),
                json.dumps({"en": payload["meta_desc_en"], "fr": payload["meta_desc_fr"]}),
                json.dumps({"en": payload["content_en"], "fr": payload["content_fr"]}),
                (queue_item.get("source_meta") or {}).get("target_query"),
                format_name,
                json.dumps({
                    **(queue_item.get("source_meta") or {}),
                    "model_used": FORMAT_CONFIG[format_name]["model"],
                    "writer_version": "v2-2026-06-02",
                    "faq_jsonld": payload.get("faq_jsonld"),
                    "confidence": payload.get("confidence"),
                }),
                image_url,
            ),
        )
        guide_id = cur.fetchone()[0]
        cur.execute(
            "UPDATE guides_queue SET status = 'processed' WHERE id = %s",
            (queue_item["id"],),
        )
    conn.commit()
    return guide_id


# ---------------------------------------------------------------------------
# Anti-hallucination (ported from writer-l1.py)
# ---------------------------------------------------------------------------

def extract_proper_nouns(html):
    """Extract potential proper nouns from HTML content."""
    text = re.sub(r'<[^>]+>', ' ', html)
    words = re.findall(r'\b[A-Z][a-zA-Z\xc0-\xff]{2,}\b', text)
    phrases = re.findall(r'\b[A-Z][a-zA-Z\xc0-\xff]{1,}(?:\s+[A-Z][a-zA-Z\xc0-\xff]{1,})*\b', text)
    return set(words) | set(phrases)


def anti_hallu_check(content_en, content_fr, allowlist):
    """
    Check that place names in content are in allowlist or generic whitelist.
    Returns (passed: bool, flagged: list[str]).
    High threshold to avoid false positives.
    """
    flagged = []
    all_names_in_allowlist = set()

    for slug, info in allowlist.items():
        all_names_in_allowlist.add(slug.lower().replace("-", " "))
        if info.get("name_en"):
            all_names_in_allowlist.add(info["name_en"].lower())
        if info.get("name_fr"):
            all_names_in_allowlist.add(info["name_fr"].lower())

    stop_words = {
        "The", "And", "For", "But", "Not", "Are", "Was", "Has", "Have",
        "This", "That", "With", "From", "They", "Will", "Been", "More",
        "Than", "Also", "Into", "Over", "Some", "Such", "When", "What",
        "Which", "Where", "There", "These", "Their", "Most", "Many", "Much",
        "Very", "Just", "Even", "Only", "Well", "Here", "Both", "Each",
        "After", "Before", "During", "While", "About", "Every", "Other",
        "Often", "Read", "Avoid", "Best", "Good", "High", "Low", "Long",
        "Short", "Big", "Small", "Old", "New", "Free", "Open", "Full",
        "June", "July", "August", "September", "October", "November",
        "December", "January", "February", "March", "April", "May",
        "Monday", "Tuesday", "Wednesday", "Thursday", "Friday",
        "Saturday", "Sunday", "Week", "Month", "Year", "Day",
        "North", "South", "East", "West", "Central",
        "Greek", "Greeks", "Cretan", "Cretans", "European", "Europeans",
        "Tourist", "Tourists", "Traveler", "Travelers", "Visitor", "Visitors",
        "Island", "Islands", "Beach", "Beaches", "Village", "Villages",
        "Hotel", "Hotels", "Restaurant", "Restaurants", "Taverna", "Tavernas",
        "Guide", "Guides", "Season", "Summer", "Winter", "Spring", "Autumn",
        "Food", "Olive", "Cheese", "Wine", "Fish", "Meat", "Sea",
        "Oil", "Water", "Road", "Ferry", "Airport", "Bus", "Car",
        "Tip", "Tips", "Section", "Part", "Chapter", "Article",
        "Discover", "Explore", "Visit", "Stay", "Eat", "Drink",
        "However", "Therefore", "Although", "Because", "Despite",
        "Instead", "Rather", "Unless", "Whether", "Indeed",
        # French common words
        "Les", "Des", "Une", "Pour", "Mais", "Avec", "Dans", "Sur",
        "Plus", "Tout", "Bien", "Cette", "Entre", "Comme", "Votre",
        "Notre", "Leur", "Aussi", "Vers", "Chez", "Donc", "Ainsi",
        "Grecs", "Grecque", "Grecques", "Cretois", "Cretoise",
        "Touristique", "Touristes", "Visiteurs",
        "Plage", "Plages", "Village", "Villages", "Restaurant",
        "Huile", "Fromage", "Vin", "Poisson", "Mer", "Eau",
        "Piege", "Pieges", "Conseil", "Conseils",
        "Graviera", "Mizithra", "Dakos", "Mezze", "Meze",
        "Raki", "Tsikoudia",
        "Juillet", "Aout", "Septembre", "Octobre", "Novembre",
        "Decembre", "Janvier", "Fevrier", "Mars", "Avril", "Juin",
        "HTML", "JSON", "FAQ", "SEO", "CTA", "URL", "GPS",
    }

    for content in [content_en, content_fr]:
        if not content:
            continue
        proper = extract_proper_nouns(content)
        for name in proper:
            if name in stop_words:
                continue
            nl = name.lower()
            if any(gw in nl for gw in GENERIC_WHITELIST):
                continue
            if nl in all_names_in_allowlist:
                continue
            matched = any(nl in db_name or db_name in nl for db_name in all_names_in_allowlist)
            if matched:
                continue
            if len(name) <= 5:
                continue
            if re.search(r'[eauo]', name.lower()):
                # Very broad -- skip words with accented chars that are likely French common words
                # Only flag truly suspicious: no accent at all + looks like a place name
                pass
            if re.search(r'[\xe9\xe8\xea\xeb\xe0\xe2\xf9\xfb\xee\xef\xe7œ\xe6]', name.lower()):
                # French accented word -- likely a common French word, not a place
                continue
            flagged.append(name)

    flagged = list(set(flagged))
    # Only hard-reject if many genuinely suspicious names (high threshold)
    return len(flagged) == 0, flagged


# ---------------------------------------------------------------------------
# Hero image (ported from writer-l1.py)
# ---------------------------------------------------------------------------

def fetch_hero_image(query):
    """Try Pexels first, then Wikimedia Commons, else return None."""
    pexels_key = os.environ.get("PEXELS_API_KEY", "")
    if pexels_key:
        try:
            resp = requests.get(
                "https://api.pexels.com/v1/search",
                headers={"Authorization": pexels_key},
                params={"query": query, "per_page": 3, "orientation": "landscape"},
                timeout=10,
            )
            if resp.status_code == 200:
                data = resp.json()
                photos = data.get("photos", [])
                if photos:
                    url = photos[0]["src"]["large2x"]
                    log(f"Hero image from Pexels: {url}")
                    return url
        except Exception as e:
            log(f"Pexels error: {e}")

    # Wikimedia Commons fallback
    try:
        resp = requests.get(
            "https://commons.wikimedia.org/w/api.php",
            params={
                "action": "query",
                "generator": "search",
                "gsrsearch": f"File:{query} crete",
                "gsrnamespace": 6,
                "gsrlimit": 5,
                "prop": "imageinfo",
                "iiprop": "url|mime",
                "iiurlwidth": 1200,
                "format": "json",
            },
            timeout=10,
        )
        if resp.status_code == 200:
            data = resp.json()
            pages = data.get("query", {}).get("pages", {})
            for page_id, page in pages.items():
                ii = page.get("imageinfo", [{}])[0]
                mime = ii.get("mime", "")
                if mime.startswith("image/") and "svg" not in mime:
                    url = ii.get("thumburl") or ii.get("url")
                    if url:
                        log(f"Hero image from Wikimedia: {url}")
                        return url
    except Exception as e:
        log(f"Wikimedia error: {e}")

    log("No hero image found -- image_url will be NULL")
    return None


# ---------------------------------------------------------------------------
# Failure snapshot helper (ported from writer-l1.py)
# ---------------------------------------------------------------------------

def _snapshot_failure(label, stdout, stderr, model, attempt, slug=None):
    """Persist failure artifact for offline diagnosis."""
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    safe_slug = (slug or "unknown").replace("/", "_")
    path = f"{FAIL_DIR}/{ts}-{label}-{model}-att{attempt}-{safe_slug}.txt"
    try:
        stdout_s = stdout if isinstance(stdout, str) else (stdout.decode("utf-8", errors="replace") if stdout else "")
        stderr_s = stderr if isinstance(stderr, str) else (stderr.decode("utf-8", errors="replace") if stderr else "")
        with open(path, "w", encoding="utf-8") as f:
            f.write(f"=== label={label} model={model} attempt={attempt} slug={safe_slug} ===\n")
            f.write(f"=== stdout ({len(stdout_s)} chars) ===\n{stdout_s}\n")
            f.write(f"=== stderr ({len(stderr_s)} chars) ===\n{stderr_s}\n")
        log(f"Failure artifact saved: {path}")
    except Exception as e:
        log(f"Failed to save artifact: {e}")


# ---------------------------------------------------------------------------
# Claude call (enhanced from writer-l1.py with rc 98/99 handling)
# ---------------------------------------------------------------------------

def call_claude(model: str, prompt: str, max_attempts: int = 2, retry_delay: int = 30, slug: str = "") -> dict:
    """Send prompt to claude-capped wrapper, return parsed JSON dict."""
    check_stop()
    with tempfile.NamedTemporaryFile("w", suffix=".md", delete=False, encoding="utf-8") as tmp:
        tmp.write(prompt)
        tmp_path = tmp.name
    try:
        cmd = f'cat "{tmp_path}" | {CLAUDE_WRAPPER} -p --model {model} --output-format json'
        last_err = None
        for attempt in range(1, max_attempts + 1):
            check_stop()
            try:
                result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=900)
            except subprocess.TimeoutExpired as e:
                log(f"Attempt {attempt}/{max_attempts} TIMEOUT 900s on claude {model}")
                _snapshot_failure("timeout", getattr(e, "stdout", ""), getattr(e, "stderr", ""), model, attempt, slug)
                last_err = e
                if attempt < max_attempts:
                    log(f"Retrying in {retry_delay}s...")
                    time.sleep(retry_delay)
                    continue
                raise

            if result.returncode == 98:
                log("STOP file detected during claude call -- exiting.")
                sys.exit(98)
            if result.returncode == 99:
                log("FAIR_USE_CAP reached -- aborting.")
                send_telegram("FAIR_USE_CAP atteint. Pipeline stoppe jusqu'a demain.")
                sys.exit(99)

            if result.returncode != 0:
                log(f"Attempt {attempt}/{max_attempts} rc={result.returncode} stderr={result.stderr[:200]}")
                _snapshot_failure(f"rc{result.returncode}", result.stdout, result.stderr, model, attempt, slug)
                last_err = RuntimeError(f"claude failed (rc={result.returncode}): {result.stderr[:500]}")
                if attempt < max_attempts:
                    log(f"Retrying in {retry_delay}s...")
                    time.sleep(retry_delay)
                    continue
                raise last_err

            log(f"claude response attempt {attempt}: {len(result.stdout)} chars stdout")

            if not result.stdout.strip():
                log(f"Attempt {attempt}/{max_attempts} empty stdout")
                _snapshot_failure("empty", result.stdout, result.stderr, model, attempt, slug)
                last_err = RuntimeError(f"Empty response from claude. stderr: {result.stderr[:300]}")
                if attempt < max_attempts:
                    log(f"Retrying in {retry_delay}s...")
                    time.sleep(retry_delay)
                    continue
                raise last_err

            # Unwrap JSON envelope then parse inner payload
            raw = result.stdout.strip()
            try:
                envelope = json.loads(raw)
                payload_text = envelope.get("result", envelope.get("content", raw))
            except json.JSONDecodeError:
                payload_text = raw

            if not payload_text or not str(payload_text).strip():
                _snapshot_failure("empty-result", result.stdout, result.stderr, model, attempt, slug)
                last_err = RuntimeError(f"Empty 'result' in claude JSON wrapper: {result.stdout[:200]}")
                if attempt < max_attempts:
                    log(f"Retrying in {retry_delay}s...")
                    time.sleep(retry_delay)
                    continue
                raise last_err

            if isinstance(payload_text, dict):
                return payload_text

            # Strip code fences if present
            text = str(payload_text).strip()
            text = re.sub(r'^```(?:json)?\s*', '', text)
            text = re.sub(r'\s*```$', '', text.strip())

            try:
                return json.loads(text)
            except json.JSONDecodeError:
                # Try to extract JSON object from mixed content
                match = re.search(r'\{[\s\S]*\}', text)
                if match:
                    try:
                        return json.loads(match.group())
                    except json.JSONDecodeError:
                        pass
                _snapshot_failure("parse-fail", result.stdout, result.stderr, model, attempt, slug)
                last_err = ValueError(f"Cannot parse Claude response as JSON: {text[:300]}")
                if attempt < max_attempts:
                    log(f"JSON parse failed, retrying in {retry_delay}s...")
                    time.sleep(retry_delay)
                    continue
                raise last_err

        raise last_err or RuntimeError("call_claude exhausted retries without exception")
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


# ---------------------------------------------------------------------------
# Prompt building
# ---------------------------------------------------------------------------

def load_prompt_template(prompt_path: str) -> str:
    return Path(prompt_path).read_text(encoding="utf-8")


def word_count(text: str) -> int:
    return len(re.findall(r'\b\w+\b', text or ""))


# ---------------------------------------------------------------------------
# Downstream triggers
# ---------------------------------------------------------------------------

def trigger_translator(guide_id: int):
    try:
        subprocess.Popen(
            ["python3", TRANSLATOR_SCRIPT, "--guide-id", str(guide_id)],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        log(f"Translator triggered for guide_id={guide_id}")
    except Exception as e:
        log(f"Translator trigger error (non-fatal): {e}")


def trigger_indexnow(slug: str):
    try:
        subprocess.Popen(
            ["python3", INDEXNOW_SCRIPT, "--single-slug", slug],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        log(f"IndexNow triggered for slug={slug}")
    except Exception as e:
        log(f"IndexNow trigger error (non-fatal): {e}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="CretePulse writer -- parametrable format")
    parser.add_argument("--format", required=True, choices=["pillar", "mid", "short"])
    parser.add_argument("--slug", help="Override slug to process specific queue item")
    parser.add_argument("--dry-run", action="store_true", help="Build prompt without calling Claude or inserting")
    args = parser.parse_args()

    check_stop()

    cfg = get_format_config(args.format)
    log(f"=== writer.py START format={args.format} model={cfg['model']} ===")

    conn = psycopg2.connect(**DB_PARAMS)
    item = None
    try:
        item = pop_queue_item(conn, args.format, slug_override=args.slug)
        if not item:
            log(f"No pending items in guides_queue for format={args.format} -- nothing to do.")
            return

        log(f"Processing slug={item['slug']} title={(item['title'] or '')[:60]}")

        related = []
        if cfg["include_related_articles"]:
            related = fetch_related_articles(conn, limit=20)

        template = load_prompt_template(cfg["prompt_path"])

        # Build substitution map
        data_hints = {}
        if cfg["include_data_hints"]:
            data_hints = (item.get("source_meta") or {}).get("data_hints", {})

        keywords = item.get("keywords") or []
        if isinstance(keywords, str):
            try:
                keywords = json.loads(keywords)
            except Exception:
                keywords = []

        substitutions = {
            "{target_query}": (item.get("source_meta") or {}).get("target_query", item["title"]) or "",
            "{title}": item["title"] or "",
            "{slug}": item["slug"] or "",
            "{keywords}": ", ".join(keywords) if keywords else "",
            "{category}": item.get("category", "travel"),
            "{existing_articles}": json.dumps(related) if related else "[]",
            "{data_hints}": json.dumps(data_hints) if data_hints else "{}",
            "{min_words}": str(cfg["min_words"]),
            "{max_words}": str(cfg["max_words"]),
        }

        prompt = template
        for placeholder, value in substitutions.items():
            prompt = prompt.replace(placeholder, value)

        if args.dry_run:
            log(f"DRY-RUN prompt length={len(prompt)} chars")
            log(f"DRY-RUN first 500 chars: {prompt[:500]}")
            log(f"DRY-RUN: would call claude {cfg['model']} -- rolling back queue status to pending")
            with conn.cursor() as cur:
                cur.execute("UPDATE guides_queue SET status='pending' WHERE id=%s", (item["id"],))
            conn.commit()
            return

        # --- Claude generation ---
        payload = call_claude(cfg["model"], prompt, slug=item["slug"])

        # --- Word count gate (80% of min_words threshold) ---
        wc_en = word_count(payload.get("content_en", ""))
        if wc_en < int(0.80 * cfg["min_words"]):
            err = f"content_en word count {wc_en} < 80% of {cfg['min_words']}"
            log(f"REJECT length: {err}")
            mark_queue_error(conn, item["id"], err)
            sys.exit(1)

        # --- AEO compliance check ---
        aeo = check_aeo_compliance(payload.get("content_en", ""), payload.get("faq_jsonld", {}))
        if not aeo.passed:
            err = f"AEO check failed: {aeo.failures}"
            log(f"REJECT AEO: {err}")
            mark_queue_error(conn, item["id"], err)
            sys.exit(1)

        # --- Anti-hallucination check ---
        allowlist = load_allowlist(conn)
        hallu_ok, flagged = anti_hallu_check(
            payload.get("content_en", ""),
            payload.get("content_fr", ""),
            allowlist,
        )
        if not hallu_ok:
            log(f"Anti-hallu WARNING (non-blocking): flagged names = {flagged[:10]}")
            # Non-blocking: log warning but continue (allowlist may be incomplete)

        # --- Hero image ---
        hero_query = payload.get("hero_image_query", f"Crete Greece {item.get('category', 'travel')}")
        image_url = fetch_hero_image(hero_query)

        # --- Insert as draft ---
        guide_id = insert_guide(conn, item, args.format, payload, image_url=image_url)
        log(f"INSERTED guide_id={guide_id} slug={item['slug']} format={args.format} wc_en={wc_en} image={'yes' if image_url else 'no'}")

        # --- Downstream triggers ---
        trigger_translator(guide_id)
        trigger_indexnow(item["slug"])

        log(f"=== writer.py END OK format={args.format} slug={item['slug']} ===")

    except Exception as e:
        log(f"FATAL ERROR: {e}")
        if item:
            try:
                mark_queue_error(conn, item["id"], str(e)[:500])
            except Exception as me:
                log(f"Could not mark queue error: {me}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
