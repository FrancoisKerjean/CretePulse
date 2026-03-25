#!/opt/cretepulse/venv/bin/python3
"""
CretePulse - Distribution script
Shares translated news articles from Supabase to Facebook Page.

Criteria:
- rewritten = True (processed by writer)
- title_en AND title_fr both non-empty (properly translated)
- Not already shared (tracked in /opt/cretepulse/shared_articles.json)

Cron: 0 9,17 * * *  (twice a day, 9am and 5pm)
Usage:
  python3 distribute.py              # normal run
  python3 distribute.py --dry-run    # preview only, no posting
"""

import json
import os
import sys
import urllib.request
import urllib.parse
import urllib.error
from datetime import datetime, timezone

# --------------------------------------------------------------------------- #
# Config
# --------------------------------------------------------------------------- #

SHARED_ARTICLES_FILE = "/opt/cretepulse/shared_articles.json"
CRETE_DIRECT_BASE = "https://crete.direct/news"
FB_API_VERSION = "v19.0"
FB_GRAPH_URL = f"https://graph.facebook.com/{FB_API_VERSION}"

# Max articles to post per run (avoid flooding the page)
MAX_PER_RUN = 3

# --------------------------------------------------------------------------- #
# Supabase (pure urllib, no extra deps)
# --------------------------------------------------------------------------- #

def supabase_get(url: str, key: str, query: str) -> list:
    """GET request to Supabase REST API."""
    full_url = f"{url}/rest/v1/{query}"
    req = urllib.request.Request(
        full_url,
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="ignore")
        print(f"[distribute] Supabase error {e.code}: {body[:200]}")
        return []
    except Exception as e:
        print(f"[distribute] Supabase request failed: {e}")
        return []


def fetch_unshared_articles(supabase_url: str, supabase_key: str, already_shared: set) -> list:
    """
    Query Supabase for rewritten articles that have both title_en and title_fr.
    Returns a list of article dicts, most recent first.
    """
    # Select only fields we need
    query = (
        "news"
        "?select=id,slug,title_en,title_fr,summary_en,published_at"
        "&rewritten=eq.true"
        "&title_en=not.eq."  # title_en not empty
        "&title_fr=not.eq."  # title_fr not empty
        "&order=published_at.desc"
        "&limit=20"
    )
    articles = supabase_get(supabase_url, supabase_key, query)

    if not isinstance(articles, list):
        print(f"[distribute] unexpected Supabase response: {type(articles)}")
        return []

    # Filter out already shared
    unshared = [a for a in articles if str(a.get("id")) not in already_shared]
    return unshared


# --------------------------------------------------------------------------- #
# Local tracking file
# --------------------------------------------------------------------------- #

def load_shared(path: str) -> set:
    """Load set of already-shared article IDs from local JSON file."""
    if not os.path.exists(path):
        return set()
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return set(str(x) for x in data.get("shared_ids", []))
    except Exception as e:
        print(f"[distribute] WARNING: could not load shared file: {e}")
        return set()


def save_shared(path: str, shared_ids: set) -> None:
    """Persist the set of shared article IDs."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    data = {
        "shared_ids": sorted(list(shared_ids)),
        "last_updated": datetime.now(timezone.utc).isoformat(),
    }
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


# --------------------------------------------------------------------------- #
# Post formatting
# --------------------------------------------------------------------------- #

def strip_html(text: str) -> str:
    """Remove HTML tags from a string."""
    import re
    return re.sub(r"<[^>]+>", "", text or "").strip()


def build_article_url(slug: str) -> str:
    return f"{CRETE_DIRECT_BASE}/{slug}"


def build_facebook_post(article: dict) -> dict:
    """
    Build the Facebook post payload.
    Uses English title + short excerpt in English.
    Link points to crete.direct article.
    """
    title_en = article.get("title_en", "").strip()
    summary_en = strip_html(article.get("summary_en") or "")
    slug = article.get("slug", "")

    # Short excerpt: first 200 chars of summary, cut at sentence boundary
    excerpt = summary_en[:250].strip()
    if len(summary_en) > 250:
        # Try to cut at last sentence-ending punctuation
        for sep in (". ", "! ", "? "):
            idx = excerpt.rfind(sep)
            if idx > 80:
                excerpt = excerpt[: idx + 1]
                break
        else:
            excerpt = excerpt.rstrip(",;:") + "..."

    link = build_article_url(slug)

    message = f"{title_en}\n\n{excerpt}\n\n{link}"

    return {
        "message": message,
        "link": link,
    }


# --------------------------------------------------------------------------- #
# Facebook Graph API
# --------------------------------------------------------------------------- #

def post_to_facebook(page_id: str, access_token: str, payload: dict) -> dict:
    """
    POST to https://graph.facebook.com/v19.0/{page-id}/feed
    Returns the API response dict.
    """
    url = f"{FB_GRAPH_URL}/{page_id}/feed"
    data = {**payload, "access_token": access_token}
    encoded = urllib.parse.urlencode(data).encode("utf-8")

    req = urllib.request.Request(url, data=encoded, method="POST")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")

    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="ignore")
        print(f"[distribute] Facebook API error {e.code}: {body[:300]}")
        return {"error": body}
    except Exception as e:
        print(f"[distribute] Facebook request failed: {e}")
        return {"error": str(e)}


# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #

def main():
    dry_run = "--dry-run" in sys.argv

    # Load env
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        pass  # dotenv optional, env vars may already be set

    supabase_url = os.environ.get("SUPABASE_URL", "")
    supabase_key = os.environ.get("SUPABASE_SERVICE_KEY", "")
    fb_page_id = os.environ.get("FB_PAGE_ID", "")
    fb_token = os.environ.get("FB_PAGE_ACCESS_TOKEN", "")

    # Validate required env vars
    missing = []
    if not supabase_url:
        missing.append("SUPABASE_URL")
    if not supabase_key:
        missing.append("SUPABASE_SERVICE_KEY")
    if not dry_run:
        if not fb_page_id:
            missing.append("FB_PAGE_ID")
        if not fb_token:
            missing.append("FB_PAGE_ACCESS_TOKEN")

    if missing:
        print(f"[distribute] ERROR: missing env vars: {', '.join(missing)}")
        sys.exit(1)

    mode = "DRY-RUN" if dry_run else "LIVE"
    print(f"[distribute] {datetime.now(timezone.utc).isoformat()} - mode={mode}")

    # Load shared tracking
    shared_ids = load_shared(SHARED_ARTICLES_FILE)
    print(f"[distribute] {len(shared_ids)} articles already shared")

    # Fetch unshared articles from Supabase
    articles = fetch_unshared_articles(supabase_url, supabase_key, shared_ids)
    print(f"[distribute] {len(articles)} unshared candidate articles")

    if not articles:
        print("[distribute] nothing to share, done")
        return

    # Process up to MAX_PER_RUN
    to_post = articles[:MAX_PER_RUN]
    posted = 0
    new_shared = set(shared_ids)

    for article in to_post:
        article_id = str(article.get("id", ""))
        slug = article.get("slug", "")
        title_en = article.get("title_en", "")
        title_fr = article.get("title_fr", "")

        # Double-check both titles are non-empty (guard against Supabase filter edge cases)
        if not title_en.strip() or not title_fr.strip():
            print(f"[distribute] SKIP {slug}: missing title_en or title_fr")
            continue

        payload = build_facebook_post(article)

        print(f"\n[distribute] --- article {article_id} ---")
        print(f"  slug    : {slug}")
        print(f"  title   : {title_en[:80]}")
        print(f"  link    : {build_article_url(slug)}")
        print(f"  message preview:")
        for line in payload["message"].splitlines():
            print(f"    {line}")

        if dry_run:
            print("  [DRY-RUN] would post to Facebook - skipping")
            new_shared.add(article_id)
            posted += 1
            continue

        # Post to Facebook
        result = post_to_facebook(fb_page_id, fb_token, payload)

        if "id" in result:
            fb_post_id = result["id"]
            print(f"  [OK] Facebook post id: {fb_post_id}")
            new_shared.add(article_id)
            posted += 1
        else:
            print(f"  [FAIL] Facebook post failed: {result.get('error', result)}")
            # Don't add to shared_ids so it retries next run

    # Persist updated tracking
    save_shared(SHARED_ARTICLES_FILE, new_shared)

    print(f"\n[distribute] done - posted {posted}/{len(to_post)}")


if __name__ == "__main__":
    main()
