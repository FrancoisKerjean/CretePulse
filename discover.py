#!/usr/bin/env python3
"""
CretePulse — Discover v2
Modes:
  --mode=gsc-rss : pull GSC striking distance + Reddit RSS + 5 RSS feeds, insert into guides_queue
  --mode=paa     : PAA expansion on articles published in last 7 days, insert short-format candidates
Cron:
  0 3 * * 0  discover.py --mode=gsc-rss
  0 4 * * 1  discover.py --mode=paa
"""

import argparse
import json
import os
import re
import subprocess
import sys
import tempfile
import time
import random
from datetime import datetime, timezone
from typing import List, Dict

import requests
import feedparser
import psycopg2
from dotenv import load_dotenv

load_dotenv("/opt/cretepulse-db/.env")
load_dotenv("/opt/cretepulse/.env")
sys.path.insert(0, "/opt/cretepulse-content")

from lib.gsc_client import fetch_striking_distance, compute_score, classify_format, filter_candidates
from lib.paa_scraper import fetch_paa_for_query, fetch_autocomplete

STOP_FILE = "/opt/cretepulse-content/.STOP"
LOG_DIR = "/var/log/cretepulse-content"
os.makedirs(LOG_DIR, exist_ok=True)

CLAUDE_WRAPPER = "/opt/cretepulse-content/bin/claude-capped.sh"

DB_PARAMS = {
    "host": "localhost",
    "port": 5433,
    "dbname": "cretepulse",
    "user": "postgres",
    "password": os.environ.get("POSTGRES_PASSWORD", ""),
}

REDDIT_RSS_FEEDS = [
    "https://www.reddit.com/r/Crete/.rss",
    "https://www.reddit.com/r/greece/search.rss?q=crete&sort=hot&restrict_sr=on",
    "https://www.reddit.com/r/travel/search.rss?q=crete&sort=hot&restrict_sr=on",
]
REDDIT_UA = "CreteDirect/1.0 (https://crete.direct; admin@crete.direct)"

RSS_FEEDS = [
    "https://www.cretetravel.com/feed/",
    "https://www.thetinybook.com/feed/",
    "https://greekreporter.com/tag/crete/feed/",
    "https://www.ekathimerini.com/feed/?post_type=post&category=news/greece",
    "https://explorecrete.com/feed/",
]


def log(msg):
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    line = f"{ts} [discover] {msg}"
    print(line)
    with open(f"{LOG_DIR}/discover.log", "a") as f:
        f.write(line + "\n")


def db_conn():
    return psycopg2.connect(**DB_PARAMS)


def get_existing_slugs(conn) -> List[str]:
    with conn.cursor() as cur:
        cur.execute("SELECT slug FROM guides UNION SELECT slug FROM guides_queue")
        return [r[0] for r in cur.fetchall()]


def insert_candidate(conn, slug: str, title: str, fmt: str, priority: int, source: str, source_meta: dict):
    """Insert into guides_queue. Column for title text is `notes` (not `title`)."""
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO guides_queue (slug, notes, status, format, priority, source, source_meta) "
            "VALUES (%s, %s, 'pending', %s, %s, %s, %s) ON CONFLICT (slug) DO NOTHING",
            (slug, title, fmt, priority, source, json.dumps(source_meta)),
        )
    conn.commit()


def slugify(text: str) -> str:
    s = (text or "").lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s[:80]


def score_candidates_with_haiku(candidates: List[Dict]) -> List[Dict]:
    """Send candidates to Haiku in batch for intent/originality/AEO score 0-10.
    Returns only candidates with score >= 6. Gracefully degrades to all-pass if Claude unavailable."""
    if not candidates:
        return []
    prompt = (
        "Score each query 0-10 on (commercial intent + originality + AEO-friendliness "
        "for a Crete tourism site). Return a strict JSON array of objects {\"query\": str, \"score\": int}. "
        "No commentary, no markdown fences.\n\n"
    )
    prompt += json.dumps([c["query"] for c in candidates], ensure_ascii=False, indent=2)
    with tempfile.NamedTemporaryFile("w", suffix=".md", delete=False, encoding="utf-8") as tmp:
        tmp.write(prompt)
        tmp_path = tmp.name
    try:
        cmd = f'cat "{tmp_path}" | {CLAUDE_WRAPPER} -p --model haiku --output-format json'
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=300)
        if result.returncode != 0:
            log(f"Haiku scoring failed rc={result.returncode}: {result.stderr[:200]} — keeping all candidates with default score 6")
            for c in candidates:
                c["haiku_score"] = 6
            return candidates
        envelope = json.loads(result.stdout)
        text = envelope.get("result", envelope.get("content", ""))
        if isinstance(text, str):
            text = text.strip()
            if text.startswith("```"):
                text = re.sub(r"^```(?:json)?\n", "", text)
                text = re.sub(r"\n```$", "", text)
            m = re.search(r"\[.*\]", text, re.DOTALL)
            if m:
                scores = json.loads(m.group(0))
            else:
                scores = []
        else:
            scores = text if isinstance(text, list) else []
        score_by_query = {s["query"]: s.get("score", 6) for s in scores if isinstance(s, dict) and "query" in s}
        for c in candidates:
            c["haiku_score"] = score_by_query.get(c["query"], 6)
    except Exception as e:
        log(f"Haiku scoring exception: {e} — keeping all candidates with default score 6")
        for c in candidates:
            c["haiku_score"] = 6
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
    return [c for c in candidates if c["haiku_score"] >= 6]


def mode_gsc_rss(conn):
    """GSC striking distance + Reddit RSS + RSS feeds. Each source isolated in try/except so one failure doesn't kill the run."""
    log("=== mode=gsc-rss START ===")
    existing = get_existing_slugs(conn)
    log(f"Existing slugs to exclude: {len(existing)}")

    inserted_total = 0

    # ---- GSC striking distance ----
    try:
        gsc_rows = fetch_striking_distance(days=28, row_limit=500)
        log(f"GSC returned {len(gsc_rows)} queries")
        gsc_candidates_raw = [
            {"query": r["query"], "impressions": r["impressions"], "position": r["position"], "ctr": r["ctr"]}
            for r in gsc_rows
        ]
        gsc_candidates = filter_candidates(gsc_candidates_raw, existing)
        log(f"GSC after dedup vs existing: {len(gsc_candidates)}")
        for c in gsc_candidates:
            c["fmt"] = classify_format(c["impressions"], c["position"])
            c["score_signal"] = compute_score(c["impressions"], c["position"], c["ctr"])
        gsc_candidates = [c for c in gsc_candidates if c["fmt"] is not None]
        gsc_candidates.sort(key=lambda c: c["score_signal"], reverse=True)
        top = gsc_candidates[:30]
        scored = score_candidates_with_haiku([{"query": c["query"]} for c in top])
        keep_queries = {s["query"] for s in scored}
        inserted_gsc = 0
        for c in top:
            if c["query"] not in keep_queries:
                continue
            slug = slugify(c["query"])
            if not slug:
                continue
            priority = 90 if c["fmt"] == "pillar" else 70
            insert_candidate(conn, slug, c["query"], c["fmt"], priority, "gsc", {
                "target_query": c["query"],
                "impressions": c["impressions"],
                "position": c["position"],
                "ctr": c["ctr"],
                "score_signal": c["score_signal"],
            })
            inserted_gsc += 1
        log(f"GSC inserted: {inserted_gsc}")
        inserted_total += inserted_gsc
    except FileNotFoundError as e:
        log(f"GSC source skipped: credentials file missing ({e})")
    except Exception as e:
        log(f"GSC source failed: {type(e).__name__}: {e}")

    # ---- Reddit RSS ----
    try:
        reddit_topics = []
        for url in REDDIT_RSS_FEEDS:
            feed = feedparser.parse(url, agent=REDDIT_UA)
            if feed.bozo:
                log(f"Reddit feed parse warning on {url}: {feed.bozo_exception}")
            for entry in feed.entries[:20]:
                title = entry.get("title", "")
                if title and "crete" in title.lower():
                    reddit_topics.append({"query": title, "url": entry.get("link", "")})
            time.sleep(2)
        log(f"Reddit RSS collected: {len(reddit_topics)}")
        existing_slug_set = set(existing)
        reddit_topics = [t for t in reddit_topics if slugify(t["query"]) and slugify(t["query"]) not in existing_slug_set]
        scored_reddit = score_candidates_with_haiku(reddit_topics[:15])
        inserted_reddit = 0
        for t in scored_reddit:
            slug = slugify(t["query"])
            if not slug:
                continue
            insert_candidate(conn, slug, t["query"], "mid", 60, "reddit", {
                "target_query": t["query"],
                "reddit_url": t.get("url", ""),
            })
            inserted_reddit += 1
        log(f"Reddit inserted: {inserted_reddit}")
        inserted_total += inserted_reddit
    except Exception as e:
        log(f"Reddit source failed: {type(e).__name__}: {e}")

    # ---- RSS feeds (editorial) ----
    try:
        rss_items = []
        for url in RSS_FEEDS:
            feed = feedparser.parse(url)
            for entry in feed.entries[:5]:
                title = entry.get("title", "")
                if title:
                    rss_items.append({"query": title, "url": entry.get("link", "")})
        log(f"RSS collected: {len(rss_items)}")
        existing_slug_set = set(existing)
        rss_items = [t for t in rss_items if slugify(t["query"]) and slugify(t["query"]) not in existing_slug_set]
        scored_rss = score_candidates_with_haiku(rss_items[:15])
        inserted_rss = 0
        for t in scored_rss:
            slug = slugify(t["query"])
            if not slug:
                continue
            insert_candidate(conn, slug, t["query"], "mid", 55, "rss", {
                "target_query": t["query"],
                "rss_url": t.get("url", ""),
            })
            inserted_rss += 1
        log(f"RSS inserted: {inserted_rss}")
        inserted_total += inserted_rss
    except Exception as e:
        log(f"RSS source failed: {type(e).__name__}: {e}")

    log(f"=== mode=gsc-rss END inserted_total={inserted_total} ===")


def mode_paa(conn):
    """PAA expansion on last 7d published articles."""
    log("=== mode=paa START ===")
    with conn.cursor() as cur:
        cur.execute(
            "SELECT slug, target_query FROM guides "
            "WHERE published_at > NOW() - INTERVAL '7 days' "
            "AND format_tier IN ('pillar', 'mid') "
            "AND target_query IS NOT NULL "
            "ORDER BY published_at DESC LIMIT 20"
        )
        articles = cur.fetchall()
    log(f"Articles to PAA-expand: {len(articles)}")

    existing = set(get_existing_slugs(conn))
    inserted = 0
    for slug, target_query in articles:
        questions = fetch_paa_for_query(target_query, delay_seconds=5.0)
        autocomplete = fetch_autocomplete(target_query)
        candidates = []
        for q in questions[:6]:
            candidates.append({"query": q, "parent_slug": slug, "type": "paa"})
        for q in autocomplete[:4]:
            if "?" not in q:
                q = q.rstrip(".") + "?"
            candidates.append({"query": q, "parent_slug": slug, "type": "autocomplete"})
        # Dedup against existing
        candidates = [c for c in candidates if slugify(c["query"]) and slugify(c["query"]) not in existing]
        scored = score_candidates_with_haiku(candidates[:10])
        for c in scored:
            cslug = slugify(c["query"])
            if not cslug:
                continue
            insert_candidate(conn, cslug, c["query"], "short", 50, "paa", {
                "target_query": c["query"],
                "parent_article_slug": c["parent_slug"],
                "expansion_type": c["type"],
            })
            inserted += 1
            existing.add(cslug)
    log(f"=== mode=paa END inserted={inserted} ===")


def main():
    if os.path.exists(STOP_FILE):
        log("STOP file present, exiting cleanly")
        sys.exit(98)

    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["gsc-rss", "paa"], required=True)
    args = parser.parse_args()

    conn = db_conn()
    try:
        if args.mode == "gsc-rss":
            mode_gsc_rss(conn)
        elif args.mode == "paa":
            mode_paa(conn)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
