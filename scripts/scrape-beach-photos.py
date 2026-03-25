#!/usr/bin/env python3
"""
Scrape beach photos from travel sites and Wikimedia.
Sources: cretanbeaches.com, allincrete.com, Wikimedia Commons, Unsplash.
Run: python scripts/scrape-beach-photos.py

Strategy:
1. For each beach, search cretanbeaches.com (most comprehensive Crete beach site)
2. Extract the main photo URL
3. Fall back to Wikimedia Commons search
4. Update Supabase with the photo URL + proper credit
"""

import os
import re
import sys
import json
import time
import ssl
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

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
CTX = ssl.create_default_context()
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE


def fetch_url(url: str, timeout: int = 15) -> str:
    """Fetch URL content as string."""
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        resp = urllib.request.urlopen(req, timeout=timeout, context=CTX)
        return resp.read().decode("utf-8", errors="ignore")
    except Exception as e:
        print(f"[photos] fetch error {url[:60]}: {e}")
        return ""


def search_cretanbeaches(beach_name: str) -> dict | None:
    """Search cretanbeaches.com for a beach photo."""
    # Normalize name for URL
    slug = beach_name.lower().strip()
    slug = re.sub(r"[^a-z0-9\s]", "", slug)
    slug = re.sub(r"\s+", "-", slug)

    # Try direct URL patterns
    urls_to_try = [
        f"https://www.cretanbeaches.com/en/beaches-of-crete/{slug}",
        f"https://www.cretanbeaches.com/en/beaches-of-crete/{slug}-beach",
    ]

    for url in urls_to_try:
        html = fetch_url(url)
        if not html or "404" in html[:500]:
            continue

        # Extract og:image or main photo
        og_match = re.search(r'<meta\s+property="og:image"\s+content="([^"]+)"', html)
        if og_match:
            img_url = og_match.group(1)
            if img_url and "logo" not in img_url.lower():
                return {"url": img_url, "credit": "Photo: cretanbeaches.com"}

        # Try to find the main beach photo in the page
        img_matches = re.findall(r'<img[^>]+src="(https?://[^"]+\.(?:jpg|jpeg|webp|png))"[^>]*>', html, re.I)
        for img in img_matches:
            if any(skip in img.lower() for skip in ["logo", "icon", "avatar", "flag", "banner", "ad"]):
                continue
            if "beach" in img.lower() or slug.split("-")[0] in img.lower():
                return {"url": img, "credit": "Photo: cretanbeaches.com"}

    return None


def search_allincrete(beach_name: str) -> dict | None:
    """Search allincrete.com for a beach photo."""
    slug = beach_name.lower().strip()
    slug = re.sub(r"[^a-z0-9\s]", "", slug)
    slug = re.sub(r"\s+", "-", slug)

    url = f"https://www.allincrete.com/{slug}-beach/"
    html = fetch_url(url)
    if not html or "404" in html[:500]:
        return None

    og_match = re.search(r'<meta\s+property="og:image"\s+content="([^"]+)"', html)
    if og_match:
        img_url = og_match.group(1)
        if img_url and "logo" not in img_url.lower():
            return {"url": img_url, "credit": "Photo: allincrete.com"}

    return None


def search_wikimedia(query: str) -> dict | None:
    """Search Wikimedia Commons for a photo."""
    params = {
        "action": "query",
        "generator": "search",
        "gsrsearch": f"{query} beach Crete Greece",
        "gsrnamespace": "6",
        "gsrlimit": "3",
        "prop": "imageinfo",
        "iiprop": "url|extmetadata|size",
        "iiurlwidth": "1200",
        "format": "json",
    }
    url = f"https://commons.wikimedia.org/w/api.php?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"User-Agent": "CreteDirect/1.0 (contact@kairosguest.com)"})
    try:
        resp = urllib.request.urlopen(req, timeout=15)
        data = json.loads(resp.read().decode("utf-8"))
    except Exception:
        return None

    pages = data.get("query", {}).get("pages", {})
    for page in pages.values():
        info = (page.get("imageinfo") or [{}])[0]
        thumb = info.get("thumburl", "")
        width = info.get("width", 0)
        title = page.get("title", "").lower()

        if width < 600 or any(s in title for s in [".svg", "map", "logo", "flag", "coat"]):
            continue

        extmeta = info.get("extmetadata", {})
        artist = re.sub(r"<[^>]+>", "", extmeta.get("Artist", {}).get("value", "")).strip()[:60]
        lic = extmeta.get("LicenseShortName", {}).get("value", "")
        credit = f"\u00a9 {artist}" if artist else "Wikimedia Commons"
        if lic:
            credit += f" / {lic}"
        credit += " / Wikimedia Commons"

        return {"url": thumb, "credit": credit}

    return None


def search_unsplash(query: str) -> dict | None:
    """Search Unsplash for a photo (no API key needed for small volume)."""
    search_url = f"https://unsplash.com/s/photos/{urllib.parse.quote(query + ' crete beach')}"
    html = fetch_url(search_url)
    if not html:
        return None

    # Extract first photo URL from the page
    img_match = re.search(r'"(https://images\.unsplash\.com/photo-[^"]+\?[^"]*w=\d+[^"]*)"', html)
    if img_match:
        img_url = img_match.group(1)
        # Resize to 1200px
        img_url = re.sub(r'w=\d+', 'w=1200', img_url)
        return {"url": img_url, "credit": "Photo: Unsplash"}

    return None


def main():
    # Fetch all beaches
    data = sb.table("beaches").select("id,slug,name_en,image_url,image_credit,region").execute()
    beaches = data.data or []

    # Filter: only beaches without a real photo (or with Pexels placeholder)
    needs_photo = []
    for b in beaches:
        url = b.get("image_url") or ""
        if not url or "pexels.com/photos/11401809" in url or "placeholder" in url.lower():
            needs_photo.append(b)
        elif "serinus" in (b.get("image_credit") or "").lower():
            # This is the generic "Pexels / Serinus" credit = placeholder
            needs_photo.append(b)

    print(f"[photos] {len(needs_photo)}/{len(beaches)} beaches need real photos")

    updated = 0
    for b in needs_photo:
        name = b["name_en"]
        print(f"[photos] searching for: {name}...")

        # Try sources in order of quality
        result = search_cretanbeaches(name)
        if not result:
            result = search_allincrete(name)
        if not result:
            result = search_wikimedia(name)
        if not result:
            result = search_unsplash(name)

        if result:
            try:
                sb.table("beaches").update({
                    "image_url": result["url"],
                    "image_credit": result["credit"],
                }).eq("id", b["id"]).execute()
                updated += 1
                print(f"[photos] {b['slug']}: {result['credit']}")
            except Exception as e:
                print(f"[photos] ERROR updating {b['slug']}: {e}")
        else:
            print(f"[photos] {b['slug']}: no photo found")

        # Be polite - 2s between requests
        time.sleep(2)

    print(f"[photos] Done - updated {updated}/{len(needs_photo)} beaches")

    # Same for villages
    data = sb.table("villages").select("id,slug,name_en,image_url,image_credit").execute()
    villages = data.data or []
    needs_photo_v = [v for v in villages if not v.get("image_url") or "pexels" in (v.get("image_url") or "").lower()]
    print(f"\n[photos] {len(needs_photo_v)}/{len(villages)} villages need photos")

    updated_v = 0
    for v in needs_photo_v:
        name = v["name_en"]
        result = search_wikimedia(f"{name} village")
        if not result:
            result = search_wikimedia(name)

        if result:
            try:
                sb.table("villages").update({
                    "image_url": result["url"],
                    "image_credit": result["credit"],
                }).eq("id", v["id"]).execute()
                updated_v += 1
                print(f"[photos] village/{v['slug']}: {result['credit']}")
            except Exception as e:
                print(f"[photos] ERROR: {e}")
        time.sleep(1.5)

    print(f"[photos] Villages: updated {updated_v}/{len(needs_photo_v)}")
    print(f"[photos] TOTAL: {updated + updated_v} photos updated")


if __name__ == "__main__":
    main()
