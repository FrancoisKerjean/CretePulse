#!/usr/bin/env python3
"""
CretePulse - News RSS scraper
Fetches RSS feeds from Cretan news sources.
Deduplicates by source_url before inserting into Supabase.
Cron: */30 * * * *  (every 30 minutes)
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

# lang: "el" = Greek source (needs translation), "en" = English source (pre-filled)
RSS_FEEDS = [
    # Greek press (verified working 2026-03-25)
    {"source": "haniotika",    "source_name": "Haniotika Nea",  "lang": "el", "url": "https://www.haniotika-nea.gr/feed/"},
    {"source": "flashnews",    "source_name": "Flashnews",      "lang": "el", "url": "https://flashnews.gr/feed"},
    {"source": "cretanmagazine", "source_name": "Cretan Magazine", "lang": "el", "url": "https://www.cretanmagazine.gr/feed/"},

    # English press (verified working)
    {"source": "ekathimerini", "source_name": "eKathimerini",   "lang": "en", "url": "https://www.ekathimerini.com/rss/news"},
    {"source": "greekreporter", "source_name": "Greek Reporter", "lang": "en", "url": "https://greekreporter.com/feed/"},
    {"source": "tornosnews",   "source_name": "Tornos News",    "lang": "en", "url": "https://www.tornosnews.gr/feed"},
    {"source": "keeptalkinggreece", "source_name": "Keep Talking Greece", "lang": "en", "url": "https://www.keeptalkinggreece.com/feed/"},
    {"source": "gtp", "source_name": "GTP Headlines", "lang": "en", "url": "https://news.gtp.gr/feed/"},

    # Google News - Crete in 4 languages (verified working)
    {"source": "google_crete_el", "source_name": "Google News", "lang": "el",
     "url": "https://news.google.com/rss/search?q=%CE%9A%CF%81%CE%AE%CF%84%CE%B7+when:1d&hl=el&gl=GR&ceid=GR:el"},
    {"source": "google_crete_en", "source_name": "Google News", "lang": "en",
     "url": "https://news.google.com/rss/search?q=Crete+Greece+when:1d&hl=en&gl=GR&ceid=GR:en"},
    {"source": "google_crete_tourism", "source_name": "Google News", "lang": "en",
     "url": "https://news.google.com/rss/search?q=Crete+tourism+travel+when:2d&hl=en&gl=GR&ceid=GR:en"},
    {"source": "google_crete_fr", "source_name": "Google News", "lang": "fr",
     "url": "https://news.google.com/rss/search?q=Cr%C3%A8te+Gr%C3%A8ce+when:2d&hl=fr&gl=FR&ceid=FR:fr"},
    {"source": "google_crete_de", "source_name": "Google News", "lang": "de",
     "url": "https://news.google.com/rss/search?q=Kreta+Griechenland+when:2d&hl=de&gl=DE&ceid=DE:de"},

    # Greek financial press (verified working, needs Crete keyword filter)
    {"source": "naftemporiki", "source_name": "Naftemporiki", "lang": "el",
     "url": "https://www.naftemporiki.gr/rss"},

    # Reddit (verified working)
    {"source": "reddit_crete", "source_name": "Reddit r/crete", "lang": "en",
     "url": "https://www.reddit.com/r/crete/.rss"},
    {"source": "reddit_greece", "source_name": "Reddit r/greece", "lang": "en",
     "url": "https://www.reddit.com/r/greece/search/.rss?q=crete+OR+kreta+OR+kriti&sort=new&restrict_sr=on&t=week"},
]

# Keywords to filter Crete-relevant articles from general Greek/English feeds
CRETE_KEYWORDS = [
    "crete", "creta", "kriti", "kreta", "cretan",
    "herakl", "chania", "rethymn", "lasithi", "agios nikolaos", "ierapetra", "sitia",
    "samaria", "elafonisi", "balos", "spinalonga", "knossos", "matala",
    "κρητ", "ηρακλ", "χανι", "ρεθυμν", "λασιθ", "αγιο νικολ", "ιεραπετρ", "σητει",
]

# Sources that are Crete-specific (no keyword filtering needed)
CRETE_ONLY_SOURCES = {"patris", "neakriti", "cretapost", "haniotika", "flashnews",
                       "cretatv", "cretanmagazine", "google_crete_el", "google_crete_en",
                       "google_crete_tourism", "google_crete_fr", "google_crete_de",
                       "reddit_crete"}


def is_crete_relevant(title: str, summary: str, source: str) -> bool:
    """Check if article is about Crete (for general feeds)."""
    if source in CRETE_ONLY_SOURCES:
        return True
    text = (title + " " + summary).lower()
    return any(kw in text for kw in CRETE_KEYWORDS)


def slugify(text: str) -> str:
    text = text.lower().strip()
    greek_map = str.maketrans(
        "αβγδεζηθικλμνξοπρστυφχψωάέήίόύώΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩΆΈΉΊΌΎΏ",
        "abgdezithiklmnxoprstyfxpoadaaaa aabgdezithiklmnxoprstyfxpoaadaaaa"
    )
    text = text.translate(greek_map)
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    text = re.sub(r"^-+|-+$", "", text)
    return text[:100]


def parse_pub_date(entry) -> str:
    for attr in ("published", "updated", "created"):
        raw = getattr(entry, attr, None)
        if raw:
            try:
                return parsedate_to_datetime(raw).isoformat()
            except Exception:
                pass
    return datetime.now(timezone.utc).isoformat()


def strip_html(text: str) -> str:
    return re.sub(r"<[^>]+>", "", text or "").strip()


def get_existing_urls(supabase, source: str) -> set:
    try:
        result = supabase.table("news").select("source_url").eq("source", source).execute()
        return {row["source_url"] for row in (result.data or [])}
    except Exception as e:
        print(f"[news] WARNING: could not fetch existing URLs for {source}: {e}")
        return set()


def process_feed(supabase, feed_config: dict) -> tuple[int, int]:
    source = feed_config["source"]
    source_name = feed_config.get("source_name", source)
    lang = feed_config.get("lang", "el")
    url = feed_config["url"]
    inserted = 0
    skipped = 0

    print(f"[news] fetching {source} ({lang}) from {url[:80]}")
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

    for entry in feed.entries:
        link = getattr(entry, "link", None) or getattr(entry, "id", None)
        if not link or link in existing_urls:
            skipped += 1
            continue

        title_raw = strip_html(getattr(entry, "title", "") or "")
        if not title_raw:
            skipped += 1
            continue

        description_raw = strip_html(getattr(entry, "summary", "") or "")

        # Filter non-Crete articles from general feeds
        if not is_crete_relevant(title_raw, description_raw, source):
            skipped += 1
            continue

        summary = description_raw[:200] if description_raw else None
        slug = slugify(title_raw) or f"{source}-{abs(hash(link)) % 1000000}"
        pub_date = parse_pub_date(entry)

        # Pre-fill fields based on source language
        ts = datetime.now(timezone.utc).isoformat()
        base = {
            "source": source,
            "source_name": source_name,
            "source_url": link,
            "slug": slug,
            "title_en": "",
            "title_fr": "",
            "title_de": "",
            "title_el": "",
            "summary_en": "",
            "summary_fr": "",
            "summary_de": "",
            "summary_el": "",
            "published_at": pub_date,
            "created_at": ts,
        }
        if lang == "en":
            base["title_en"] = title_raw
            base["summary_en"] = summary or ""
        elif lang == "fr":
            base["title_fr"] = title_raw
            base["summary_fr"] = summary or ""
        elif lang == "de":
            base["title_de"] = title_raw
            base["summary_de"] = summary or ""
        else:  # el
            base["title_el"] = title_raw
            base["summary_el"] = summary or ""
        row = base

        try:
            supabase.table("news").insert(row).execute()
            inserted += 1
            print(f"[news] + {title_raw[:60]}...")
        except Exception as e:
            err_str = str(e)
            if "unique" in err_str.lower() or "duplicate" in err_str.lower():
                skipped += 1
            else:
                print(f"[news] ERROR inserting from {source}: {e}")
                skipped += 1

    print(f"[news] {source}: +{inserted}, skip {skipped}")
    return inserted, skipped


def main():
    started_at = datetime.now(timezone.utc)
    print(f"[news] {started_at.isoformat()} - scraping {len(RSS_FEEDS)} feeds")

    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    total_inserted = 0
    total_skipped = 0
    feed_errors = 0

    for feed_config in RSS_FEEDS:
        try:
            ins, skip = process_feed(supabase, feed_config)
            total_inserted += ins
            total_skipped += skip
        except Exception as e:
            feed_errors += 1
            print(f"[news] FATAL {feed_config['source']}: {e}")

    elapsed = (datetime.now(timezone.utc) - started_at).total_seconds()
    print(f"[news] done - +{total_inserted}, skip {total_skipped}, err {feed_errors}, {elapsed:.1f}s")

    if feed_errors == len(RSS_FEEDS):
        print("[news] FATAL: all feeds failed")
        sys.exit(1)


if __name__ == "__main__":
    main()
