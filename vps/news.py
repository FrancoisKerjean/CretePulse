#!/usr/bin/env python3
"""
CretePulse - News RSS scraper
Fetches RSS feeds from Cretan news sources.
Deduplicates by source_url before inserting into Supabase.
Cron: */30 * * * *  (every 30 minutes)
"""

import json
import os
import re
import sys
import unicodedata
import urllib.parse
import urllib.request
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
    {"source": "cretaone", "source_name": "CretaOne", "lang": "el", "url": "https://cretaone.gr/feed/"},

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
     "url": "https://news.google.com/rss/search?q=Crete+tourism+travel+when:1d&hl=en&gl=GR&ceid=GR:en"},
    {"source": "google_crete_fr", "source_name": "Google News", "lang": "fr",
     "url": "https://news.google.com/rss/search?q=Cr%C3%A8te+Gr%C3%A8ce+when:1d&hl=fr&gl=FR&ceid=FR:fr"},
    {"source": "google_crete_de", "source_name": "Google News", "lang": "de",
     "url": "https://news.google.com/rss/search?q=Kreta+Griechenland+when:1d&hl=de&gl=DE&ceid=DE:de"},

    # Greek financial press (verified working, needs Crete keyword filter)
    {"source": "naftemporiki", "source_name": "Naftemporiki", "lang": "el",
     "url": "https://www.naftemporiki.gr/rss"},

    # Reddit removed: posts are forum questions, not articles.
    # Scrape fails (403), Haiku can't rewrite them, they block the writer queue.
]

# Keywords to filter Crete-relevant articles from general Greek/English feeds
CRETE_KEYWORDS = [
    "crete", "creta", "kriti", "kreta", "cretan",
    "herakl", "chania", "rethymn", "lasithi", "agios nikolaos", "ierapetra", "sitia",
    "samaria", "elafonisi", "balos", "spinalonga", "knossos", "matala",
    "κρητ", "ηρακλ", "χανι", "ρεθυμν", "λασιθ", "αγιο νικολ", "ιεραπετρ", "σητει",
]

# Sources that are Crete-specific (no keyword filtering needed)
CRETE_ONLY_SOURCES = {"haniotika", "flashnews", "cretanmagazine", "cretaone",
                       "google_crete_el", "google_crete_en",
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
    # Simple approach: strip Greek chars via regex after transliterating common ones
    replacements = {
        "α": "a", "β": "b", "γ": "g", "δ": "d", "ε": "e", "ζ": "z", "η": "i",
        "θ": "th", "ι": "i", "κ": "k", "λ": "l", "μ": "m", "ν": "n", "ξ": "x",
        "ο": "o", "π": "p", "ρ": "r", "σ": "s", "ς": "s", "τ": "t", "υ": "y",
        "φ": "f", "χ": "ch", "ψ": "ps", "ω": "o",
        "ά": "a", "έ": "e", "ή": "i", "ί": "i", "ό": "o", "ύ": "y", "ώ": "o",
    }
    for gr, lat in replacements.items():
        text = text.replace(gr, lat)
        text = text.replace(gr.upper(), lat)
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^ws-]", "", text)
    text = re.sub(r"[s_-]+", "-", text)
    text = re.sub(r"^-+|-+$", "", text)
    return text[:100]


# Freshness window: reject any article (whatever the topic) whose REAL
# publication date is older than this. Widen/narrow freely here.
MAX_ARTICLE_AGE_DAYS = 7

# Why "real" date matters: Google News routinely resurfaces years-old articles
# and serves them with a fresh feed date. Confirmed case: a 2020-12-01 efsyn.gr
# COVID bulletin was served as "2026-05-21" and rewritten as current news. The
# feed date is therefore untrustworthy for Google feeds; we resolve the link to
# the publisher page and read its canonical date instead. Direct publisher feeds
# emit only fresh posts, so their feed date is trusted.
HTTP_HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; CretePulseBot/1.0)"}
HTTP_TIMEOUT = 15
GNEWS_BATCH_URL = "https://news.google.com/_/DotsSplashUi/data/batchexecute"

# Canonical publication date exposed by the publisher page. These tags carry
# the ORIGINAL publication date even when an aggregator re-surfaces the article,
# unlike a `<time datetime>` element which often shows a re-feature/surface date
# (e.g. efsyn served a 2020 article with a 2026 <time> but a 2020 datePublished).
# Tried in priority order; first match wins.
CANONICAL_DATE_PATTERNS = (
    re.compile(r'"datePublished"\s*:\s*"(\d{4}-\d{2}-\d{2}[^"]*)"'),
    re.compile(r'property=["\']article:published_time["\']\s+content=["\'](\d{4}-\d{2}-\d{2}[^"\']*)'),
    re.compile(r'content=["\'](\d{4}-\d{2}-\d{2}[^"\']*)["\']\s+property=["\']article:published_time'),
    re.compile(r'itemprop=["\']datePublished["\'][^>]*content=["\'](\d{4}-\d{2}-\d{2}[^"\']*)'),
)


def _http_get(url: str) -> str:
    req = urllib.request.Request(url, headers=HTTP_HEADERS)
    with urllib.request.urlopen(req, timeout=HTTP_TIMEOUT) as resp:
        return resp.read().decode("utf-8", "replace")


def _iso_to_dt(raw: str):
    try:
        dt = datetime.fromisoformat(raw.strip())
        return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt
    except Exception:
        return None


def resolve_google_news_url(gnews_url: str):
    """Resolve a news.google.com/rss/articles/<ID> link to the real publisher URL.

    Google encodes the target behind an opaque ID; the page exposes a signature +
    timestamp that a batchexecute call exchanges for the real URL. Returns the
    publisher URL, or None on any failure (caller then rejects the item).
    """
    try:
        m_id = re.search(r"/articles/([^?]+)", gnews_url)
        if not m_id:
            return None
        page = _http_get(gnews_url)
        m_sig = re.search(r'data-n-a-sg="([^"]+)"', page)
        m_ts = re.search(r'data-n-a-ts="([^"]+)"', page)
        if not (m_sig and m_ts):
            return None
        inner = json.dumps([
            "garturlreq",
            [["X", "X", ["X", "X"], None, None, 1, 1, "US:en", None, 1,
              None, None, None, None, None, 0, 1],
             "X", "X", 1, [1, 1, 1], 1, 1, None, 0, 0, None, 0],
            m_id.group(1), int(m_ts.group(1)), m_sig.group(1),
        ])
        f_req = json.dumps([[["Fbv4je", inner, None, "generic"]]])
        data = urllib.parse.urlencode({"f.req": f_req}).encode()
        req = urllib.request.Request(
            GNEWS_BATCH_URL, data=data,
            headers={**HTTP_HEADERS,
                     "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"},
        )
        with urllib.request.urlopen(req, timeout=HTTP_TIMEOUT) as resp:
            body = resp.read().decode("utf-8", "replace")
        for u in re.findall(r'https?://[^\\"]+', body):
            if "google" not in u and "gstatic" not in u:
                return u
    except Exception as e:
        print(f"[news] gnews resolve failed: {e}")
    return None


def fetch_canonical_pubdate(url: str):
    """Fetch the publisher page and return its canonical publication datetime
    (tz-aware), or None if no canonical date tag is present."""
    try:
        page = _http_get(url)
        for pat in CANONICAL_DATE_PATTERNS:
            m = pat.search(page)
            if m:
                return _iso_to_dt(m.group(1))
    except Exception as e:
        print(f"[news] canonical pubdate fetch failed: {e}")
    return None


def parse_pub_date(entry):
    """Return the entry's publication datetime (tz-aware), or None if undeterminable.

    No silent fallback to now(): an undateable article cannot be freshness-checked,
    so the caller treats None as 'reject'. That undateability is itself the
    resurfaced-old-article risk we want to drop, not paper over with today's date.
    """
    for attr in ("published", "updated", "created"):
        raw = getattr(entry, attr, None)
        if raw:
            try:
                dt = parsedate_to_datetime(raw)
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                return dt
            except Exception:
                pass
    return None


def strip_html(text: str) -> str:
    return re.sub(r"<[^>]+>", "", text or "").strip()


def get_existing_urls(supabase, source_name: str) -> set:
    try:
        result = supabase.table("news").select("source_url").eq("source_name", source_name).execute()
        return {row["source_url"] for row in (result.data or [])}
    except Exception as e:
        print(f"[news] WARNING: could not fetch existing URLs for {source_name}: {e}")
        return set()


# Slugs inserted during this run, collected for a single IndexNow ping at the end.
_INSERTED_SLUGS: list[str] = []


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

    existing_urls = get_existing_urls(supabase, source_name)

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

        # Freshness guard (topic-agnostic): reject any article whose publication
        # date is older than the window. Google feeds fake the date on resurfaced
        # content, so we resolve to the publisher and prefer its canonical date.
        # "Souple" mode: when the publisher page exposes no canonical date (or the
        # link can't be resolved), fall back to the feed date instead of dropping
        # the item, keeping more legit news at the cost of a small resurfacing
        # risk on date-less pages. Direct feeds emit only fresh posts: trust them.
        if source.startswith("google_"):
            real_url = resolve_google_news_url(link)
            if real_url:
                link = real_url  # store the publisher URL, not the opaque Google one
                if link in existing_urls:
                    skipped += 1
                    continue
            pub_dt = fetch_canonical_pubdate(real_url) if real_url else None
            if pub_dt is None:
                pub_dt = parse_pub_date(entry)  # souple fallback to feed date
        else:
            pub_dt = parse_pub_date(entry)

        if pub_dt is None:
            print(f"[news] skip (no date at all): {title_raw[:60]}")
            skipped += 1
            continue

        age_days = (datetime.now(timezone.utc) - pub_dt).total_seconds() / 86400
        if age_days > MAX_ARTICLE_AGE_DAYS:
            print(f"[news] skip (stale {age_days:.1f}d old): {title_raw[:60]}")
            skipped += 1
            continue

        summary = description_raw[:200] if description_raw else None
        slug = slugify(title_raw) or f"{source}-{abs(hash(link)) % 1000000}"
        pub_date = pub_dt.isoformat()

        # Pre-fill fields based on source language
        ts = datetime.now(timezone.utc).isoformat()
        base = {
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
            _INSERTED_SLUGS.append(slug)
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

    # Notify search engines of the freshly published news (one batched ping).
    if _INSERTED_SLUGS:
        try:
            import indexnow
            urls = [u for slug in _INSERTED_SLUGS for u in indexnow.news_urls(slug)]
            indexnow.submit(urls)
        except Exception as e:
            print(f"[news] indexnow skipped: {e}")

    if feed_errors == len(RSS_FEEDS):
        print("[news] FATAL: all feeds failed")
        sys.exit(1)


if __name__ == "__main__":
    main()
