#!/usr/bin/env python3
"""
Enrich beaches and villages with real photos from Wikimedia Commons.
Run manually or via cron: 0 3 * * *  (once per day at 3am)

Uses Wikimedia Commons API (free, no key needed).
Photos are CC-licensed with proper attribution.
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

WIKI_API = "https://commons.wikimedia.org/w/api.php"
HEADERS = {"User-Agent": "CreteDirect/1.0 (contact@kairosguest.com)"}


def search_wikimedia(query: str, limit: int = 5) -> list[dict]:
    """Search Wikimedia Commons for images matching query."""
    params = {
        "action": "query",
        "generator": "search",
        "gsrsearch": f"{query} Crete Greece",
        "gsrnamespace": "6",  # File namespace
        "gsrlimit": str(limit),
        "prop": "imageinfo",
        "iiprop": "url|extmetadata|size",
        "iiurlwidth": "1200",
        "format": "json",
    }
    url = f"{WIKI_API}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        resp = urllib.request.urlopen(req, timeout=15)
        data = json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        print(f"[photos] API error for '{query}': {e}")
        return []

    results = []
    pages = data.get("query", {}).get("pages", {})
    for page in pages.values():
        info = (page.get("imageinfo") or [{}])[0]
        thumb = info.get("thumburl", "")
        extmeta = info.get("extmetadata", {})
        artist = extmeta.get("Artist", {}).get("value", "")
        license_short = extmeta.get("LicenseShortName", {}).get("value", "")
        width = info.get("width", 0)

        # Skip tiny images, SVGs, maps
        if width < 600:
            continue
        title = page.get("title", "").lower()
        if any(skip in title for skip in [".svg", "map", "logo", "flag", "coat", "icon", "diagram"]):
            continue

        # Clean artist name (strip HTML)
        artist_clean = re.sub(r"<[^>]+>", "", artist).strip()
        if len(artist_clean) > 60:
            artist_clean = artist_clean[:60]

        credit = f"\u00a9 {artist_clean}" if artist_clean else "Wikimedia Commons"
        if license_short:
            credit += f" / {license_short}"
        credit += " / Wikimedia Commons"

        results.append({
            "url": thumb,
            "credit": credit,
            "width": width,
        })

    # Sort by width (prefer larger images)
    results.sort(key=lambda x: x["width"], reverse=True)
    return results


def enrich_table(table: str, name_field: str = "name_en"):
    """Find items without photos and try to enrich them."""
    # Fetch items missing photos or with generic Pexels placeholder
    data = sb.table(table).select(f"id,slug,{name_field},image_url,image_credit").execute()
    items = data.data or []

    needs_photo = []
    for item in items:
        url = item.get("image_url") or ""
        # Skip items that already have a specific (non-placeholder) photo
        if url and "pexels" not in url.lower() and "placeholder" not in url.lower():
            # Check if it's a Wikimedia Commons URL (already enriched)
            if "wikimedia" in url or "wikipedia" in url:
                continue
            # Check if it's a real specific photo
            if url.startswith("http"):
                continue
        needs_photo.append(item)

    print(f"[photos] {table}: {len(needs_photo)}/{len(items)} need photos")

    updated = 0
    for item in needs_photo:
        name = item.get(name_field, "")
        if not name:
            continue

        # Search with the English name
        query = name
        if table == "beaches":
            query = f"{name} beach"
        elif table == "villages":
            query = f"{name} village"

        results = search_wikimedia(query)
        if not results:
            # Try without "beach"/"village" suffix
            results = search_wikimedia(name)

        if results:
            best = results[0]
            try:
                sb.table(table).update({
                    "image_url": best["url"],
                    "image_credit": best["credit"],
                }).eq("id", item["id"]).execute()
                updated += 1
                print(f"[photos] {table}/{item['slug']}: {best['url'][:60]}...")
            except Exception as e:
                print(f"[photos] ERROR updating {item['slug']}: {e}")
        else:
            print(f"[photos] {table}/{item['slug']}: no photo found for '{name}'")

        # Rate limit: be nice to Wikimedia API
        time.sleep(1)

    print(f"[photos] {table}: updated {updated}/{len(needs_photo)}")
    return updated


def main():
    print(f"[photos] Starting photo enrichment")

    total = 0
    total += enrich_table("beaches", "name_en")
    total += enrich_table("villages", "name_en")

    print(f"[photos] Done - {total} photos updated total")


if __name__ == "__main__":
    main()
