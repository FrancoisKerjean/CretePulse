#!/usr/bin/env python3
"""
Enrich beaches and villages with real photos from Wikimedia Commons.
Wikimedia is the only reliable free source (cretanbeaches.com/allincrete.com URLs changed).
Run: python scripts/scrape-beach-photos.py

Cron: 0 3 * * *  (once per day at 3am, rate-limited to be nice to Wikimedia)
"""

import os
import re
import sys
import json
import time
import urllib.request
import urllib.parse
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
if not SUPABASE_URL or not SUPABASE_KEY:
    print("[photos] ERROR: missing env vars"); sys.exit(1)

from supabase import create_client
sb = create_client(SUPABASE_URL, SUPABASE_KEY)

WIKI_UA = "CreteDirect/1.0 (contact@kairosguest.com)"


def search_wikimedia(query: str, limit: int = 5) -> list[dict]:
    """Search Wikimedia Commons for images. Returns list of {url, credit, width}."""
    params = {
        "action": "query",
        "generator": "search",
        "gsrsearch": query,
        "gsrnamespace": "6",
        "gsrlimit": str(limit),
        "prop": "imageinfo",
        "iiprop": "url|extmetadata|size",
        "iiurlwidth": "1200",
        "format": "json",
    }
    url = f"https://commons.wikimedia.org/w/api.php?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"User-Agent": WIKI_UA})
    try:
        resp = urllib.request.urlopen(req, timeout=15)
        data = json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        print(f"[photos] API error: {e}")
        return []

    results = []
    pages = data.get("query", {}).get("pages", {})
    for page in pages.values():
        info = (page.get("imageinfo") or [{}])[0]
        thumb = info.get("thumburl", "")
        width = info.get("width", 0)
        title = page.get("title", "").lower()

        # Skip non-photo files
        if width < 600:
            continue
        if any(s in title for s in [".svg", "map", "logo", "flag", "coat", "icon", "diagram", "plan", "chart"]):
            continue

        extmeta = info.get("extmetadata", {})
        artist = re.sub(r"<[^>]+>", "", extmeta.get("Artist", {}).get("value", "")).strip()
        if len(artist) > 50:
            artist = artist[:50]
        lic = extmeta.get("LicenseShortName", {}).get("value", "")

        credit = f"\u00a9 {artist}" if artist else "Wikimedia Commons"
        if lic:
            credit += f" / {lic}"
        credit += " / Wikimedia Commons"

        results.append({"url": thumb, "credit": credit, "width": width})

    results.sort(key=lambda x: x["width"], reverse=True)
    return results


def needs_photo(item: dict) -> bool:
    """Check if an item needs a new photo."""
    url = item.get("image_url") or ""
    credit = item.get("image_credit") or ""
    if not url:
        return True
    if "pexels.com/photos/11401809" in url:  # Our generic hero placeholder
        return True
    if "serinus" in credit.lower():  # Generic Pexels credit
        return True
    if "placeholder" in url.lower():
        return True
    return False


def enrich_table(table: str, search_suffix: str):
    """Find items without photos and enrich from Wikimedia."""
    data = sb.table(table).select("id,slug,name_en,image_url,image_credit").execute()
    items = data.data or []

    to_enrich = [i for i in items if needs_photo(i)]
    print(f"[photos] {table}: {len(to_enrich)}/{len(items)} need photos")

    updated = 0
    for item in to_enrich:
        name = item.get("name_en", "")
        if not name:
            continue

        # Try multiple search queries
        queries = [
            f"{name} {search_suffix} Crete Greece",
            f"{name} Crete",
            name,
        ]

        found = None
        for q in queries:
            results = search_wikimedia(q, limit=3)
            if results:
                found = results[0]
                break
            time.sleep(0.5)

        if found:
            try:
                sb.table(table).update({
                    "image_url": found["url"],
                    "image_credit": found["credit"],
                }).eq("id", item["id"]).execute()
                updated += 1
                print(f"[photos] {item['slug']}: OK ({found['width']}px)")
            except Exception as e:
                print(f"[photos] ERROR {item['slug']}: {e}")
        else:
            print(f"[photos] {item['slug']}: no photo found for '{name}'")

        # Rate limit: 1.5s between Wikimedia requests
        time.sleep(1.5)

    print(f"[photos] {table}: updated {updated}/{len(to_enrich)}")
    return updated


def main():
    print("[photos] Starting Wikimedia photo enrichment")
    total = 0
    total += enrich_table("beaches", "beach")
    total += enrich_table("villages", "village")
    print(f"[photos] Done - {total} photos updated")


if __name__ == "__main__":
    main()
