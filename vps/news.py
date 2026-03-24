#!/usr/bin/env python3
"""
CretePulse - News RSS scraper
Fetches RSS feeds from Cretan news sources every 3 hours.
Deduplicates by source_url before inserting into Supabase.
Cron: 0 */3 * * *  (every 3 hours)
"""

import os
import re
import sys
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from dotenv import load_dotenv
import feedparser
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

RSS_FEEDS = [
    {"source": "patris",    "url": "https://www.patris.gr/feed/"},
    {"source": "neakriti",  "url": "https://www.neakriti.gr/feed/"},
    {"source": "cretapost", "url": "https://www.cretapost.gr/feed/"},
]


def slugify(text: str) -> str:
    """Basic slug generator from title."""
    text = text.lower().strip()
    # Replace Greek characters with latin equivalents (rough transliteration)
    greek_map = str.maketrans(
        "αβγδεζηθικλμνξοπρστυφχψωάέήίόύώΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩΆΈΉΊΌΎΏ",
        "abgdezithiklmnxoprstyfxpoadaaaa aabgdezithiklmnxoprstyfxpoaadaaaa"
    )
    text = text.translate(greek_map)
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    text = re.sub(r"^-+|-+$", "", text)
    return text[:100]  # cap at 100 chars


def parse_pub_date(entry) -> str:
    """Parse published date from RSS entry, fallback to now."""
    for attr in ("published", "updated", "created"):
        raw = getattr(entry, attr, None)
        if raw:
            try:
                return parsedate_to_datetime(raw).isoformat()
            except Exception:
                pass
    return datetime.now(timezone.utc).isoformat()


def strip_html(text: str) -> str:
    """Remove HTML tags from a string."""
    return re.sub(r"<[^>]+>", "", text or "").strip()


def get_existing_urls(supabase, source: str) -> set:
    """Fetch existing source_urls for this source to dedup."""
    try:
        result = supabase.table("news").select("source_url").eq("source", source).execute()
        return {row["source_url"] for row in (result.data or [])}
    except Exception as e:
        print(f"[news] WARNING: could not fetch existing URLs for {source}: {e}")
        return set()


def process_feed(supabase, feed_config: dict) -> tuple[int, int]:
    """Process a single RSS feed. Returns (inserted, skipped)."""
    source = feed_config["source"]
    url = feed_config["url"]
    inserted = 0
    skipped = 0

    print(f"[news] fetching {source} from {url}")
    try:
        feed = feedparser.parse(url)
    except Exception as e:
        print(f"[news] ERROR parsing feed {source}: {e}")
        return 0, 0

    if feed.bozo and feed.bozo_exception:
        print(f"[news] WARNING: {source} feed has issues: {feed.bozo_exception}")

    if not feed.entries:
        print(f"[news] {source}: no entries found")
        return 0, 0

    existing_urls = get_existing_urls(supabase, source)
    print(f"[news] {source}: {len(feed.entries)} entries, {len(existing_urls)} already in DB")

    for entry in feed.entries:
        link = getattr(entry, "link", None) or getattr(entry, "id", None)
        if not link:
            skipped += 1
            continue

        if link in existing_urls:
            skipped += 1
            continue

        title_raw = strip_html(getattr(entry, "title", "") or "")
        if not title_raw:
            skipped += 1
            continue

        description_raw = strip_html(getattr(entry, "summary", "") or "")
        summary = description_raw[:200] if description_raw else None

        slug = slugify(title_raw)
        if not slug:
            slug = f"{source}-{abs(hash(link)) % 1000000}"

        pub_date = parse_pub_date(entry)

        row = {
            "source": source,
            "source_url": link,
            "slug": slug,
            "title_el": title_raw,
            "title_en": title_raw,   # placeholder until Claude translation
            "title_fr": title_raw,   # placeholder until Claude translation
            "summary_el": summary,
            "published_at": pub_date,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        try:
            supabase.table("news").insert(row).execute()
            inserted += 1
            print(f"[news] inserted: {title_raw[:60]}...")
        except Exception as e:
            err_str = str(e)
            # Unique constraint on source_url = already exists, silent skip
            if "unique" in err_str.lower() or "duplicate" in err_str.lower():
                skipped += 1
            else:
                print(f"[news] ERROR inserting article from {source}: {e}")
                skipped += 1

    return inserted, skipped


def main():
    started_at = datetime.now(timezone.utc)
    print(f"[news] {started_at.isoformat()} - starting RSS scrape for {len(RSS_FEEDS)} feeds")

    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    total_inserted = 0
    total_skipped = 0
    feed_errors = 0

    for feed_config in RSS_FEEDS:
        try:
            ins, skip = process_feed(supabase, feed_config)
            total_inserted += ins
            total_skipped += skip
            print(f"[news] {feed_config['source']}: +{ins} inserted, {skip} skipped")
        except Exception as e:
            feed_errors += 1
            print(f"[news] FATAL error processing {feed_config['source']}: {e}")
            # Continue with next feed

    elapsed = (datetime.now(timezone.utc) - started_at).total_seconds()
    print(
        f"[news] done - {total_inserted} inserted, {total_skipped} skipped, "
        f"{feed_errors} feed errors, {elapsed:.1f}s elapsed"
    )

    if feed_errors == len(RSS_FEEDS):
        print("[news] FATAL: all feeds failed")
        sys.exit(1)


if __name__ == "__main__":
    main()
