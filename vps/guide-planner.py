#!/usr/bin/env python3
"""CretePulse - Monthly SEO topic planner. Generates ~50 new guide topics via Sonnet."""

import json
import os
import subprocess
import re
import sys
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("[guide-planner] ERROR: missing SUPABASE env vars")
    sys.exit(1)

from supabase import create_client
sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

TOPICS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "guide-topics.json")

CATEGORIES = [
    "beaches", "hikes", "food", "travel", "expat", "family",
    "history", "real-estate", "culture", "nature", "nightlife", "day-trips"
]


def call_claude(prompt, model="sonnet"):
    result = subprocess.run(
        ["claude", "-p", prompt, "--model", model],
        capture_output=True, text=True, timeout=300
    )
    if result.returncode != 0:
        raise RuntimeError(f"claude -p failed: {result.stderr[:500]}")
    return result.stdout.strip()


def send_telegram(text):
    try:
        from kairos_telegram import send, Bot
        send(Bot.PLUME, "Guide Planner", text)
    except Exception as e:
        print(f"[guide-planner] Telegram error: {e}")


def main():
    print(f"[{datetime.now(timezone.utc).isoformat()}] Guide planner starting...")

    resp = sb.table("guides").select("slug, category").execute()
    published = resp.data or []
    published_slugs = {r["slug"] for r in published}
    published_categories = {}
    for r in published:
        cat = r["category"]
        published_categories[cat] = published_categories.get(cat, 0) + 1

    try:
        with open(TOPICS_FILE, "r") as f:
            bank = json.load(f)
    except FileNotFoundError:
        bank = {"evergreen": [], "seasonal": []}

    existing_slugs = published_slugs | {
        t["slug"] for t in bank.get("evergreen", [])
    } | {
        t["slug"] for t in bank.get("seasonal", [])
    }

    under = [c for c in CATEGORIES if published_categories.get(c, 0) < 5]
    now = datetime.now(timezone.utc)
    next_months = [(now.month + i - 1) % 12 + 1 for i in range(3)]

    prompt = f"""You are an SEO strategist for a Crete travel guide website (crete.direct).
Generate 50 new guide topics optimized for search traffic.

Already published/planned slugs (DO NOT duplicate): {json.dumps(list(existing_slugs)[:50])}

Underrepresented categories (prioritize these): {under}
Upcoming months: {next_months} (generate seasonal topics for these)

Categories: {CATEGORIES}

Rules:
- Slugs must be URL-friendly (lowercase, hyphens, English)
- Keywords should target real search queries tourists type
- Mix: ~30 evergreen + ~20 seasonal
- Format: "long" for comprehensive guides, "mid" for focused topics
- Seasonal topics include "months" array

Return ONLY valid JSON (no markdown):
{{"evergreen": [{{"slug": "...", "category": "...", "format": "long|mid", "keywords": ["...", "..."]}}], "seasonal": [{{"slug": "...", "category": "...", "format": "long|mid", "keywords": ["..."], "months": [5,6,7,8]}}]}}"""

    raw = call_claude(prompt, "sonnet")
    raw = re.sub(r'^```json\s*', '', raw)
    raw = re.sub(r'\s*```$', '', raw)
    new_topics = json.loads(raw)

    remaining_evergreen = [t for t in bank.get("evergreen", []) if t["slug"] not in published_slugs]
    remaining_seasonal = [t for t in bank.get("seasonal", []) if t["slug"] not in published_slugs]

    merged = {
        "evergreen": remaining_evergreen + new_topics.get("evergreen", []),
        "seasonal": remaining_seasonal + new_topics.get("seasonal", []),
    }

    seen = set()
    for key in ["evergreen", "seasonal"]:
        deduped = []
        for t in merged[key]:
            if t["slug"] not in seen:
                seen.add(t["slug"])
                deduped.append(t)
        merged[key] = deduped

    with open(TOPICS_FILE, "w") as f:
        json.dump(merged, f, indent=2, ensure_ascii=False)

    total = len(merged["evergreen"]) + len(merged["seasonal"])
    print(f"[guide-planner] Topic bank updated: {total} topics available")

    msg = f"📋 Banque de sujets mise à jour : {total} sujets disponibles"
    if total < 10:
        msg = f"⚠️ Banque de sujets faible : seulement {total} sujets !"
    send_telegram(msg)


if __name__ == "__main__":
    main()
