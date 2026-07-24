#!/usr/bin/env python3
"""Backfill image_url for published guides (formats news/long/mid) missing images.

Sources (licit only): Wikimedia Commons API (no key), Pexels API (key from
/opt/kairos-blog/.env, same as writer-l1.py). No hotlinking from random sites.

Per-URL validations: HTTP 200, Content-Type image/*, no ".pdf" / "page1-" in URL
(historical Wikipedia-PDF-rendered-as-image bug), width >= 800px when the API
exposes dimensions.

Default mode is --dry-run (prints slug -> URL mapping). --apply does the UPDATE,
restricted to status='published', format IN ('news','long','mid'),
image_url NULL/'' (idempotent: rows filled since the dry-run are skipped).

Usage:
    /opt/cretepulse/venv/bin/python /opt/cretepulse/backfill_images.py            # dry-run
    /opt/cretepulse/venv/bin/python /opt/cretepulse/backfill_images.py --apply
"""
import os
import re
import sys
import time

import psycopg2
import requests
from dotenv import load_dotenv

load_dotenv("/opt/cretepulse-db/.env")
load_dotenv("/opt/cretepulse/.env")
load_dotenv("/opt/kairos-blog/.env")  # PEXELS_API_KEY lives here (cf. writer-l1.py)

DB = dict(host="localhost", port=5433, dbname="cretepulse", user="postgres",
          password=os.environ.get("POSTGRES_PASSWORD", ""))
PEXELS_KEY = os.environ.get("PEXELS_API_KEY", "")
UA = "CreteDirect-backfill/1.0 (contact@kairosguest.com)"
TIMEOUT = 15

# ---------------------------------------------------------------------------
# Query building: extract places + topics from the EN title.
# ---------------------------------------------------------------------------

# (needle in lowercased title, Commons-friendly search name)
GAZETTEER = [
    ("agios nikolaos", "Agios Nikolaos Crete"),
    ("pacheia ammos", "Pacheia Ammos"),
    ("georgioupoli", "Georgioupolis Crete"),
    ("georgiopoli", "Georgioupolis Crete"),
    ("chersonissos", "Hersonissos Crete"),
    ("hersonissos", "Hersonissos Crete"),
    ("elafonisi", "Elafonisi"),
    ("ierapetra", "Ierapetra"),
    ("heraklion", "Heraklion"),
    ("rethymno", "Rethymno"),
    ("neapoli", "Neapoli Lasithi"),
    ("siteia", "Sitia Crete"),
    ("sitia", "Sitia Crete"),
    ("chania", "Chania"),
    ("lasithi", "Lasithi"),
    ("elounda", "Elounda"),
    ("malia", "Malia Crete"),
    ("kastelli", "Kastelli Pediada"),  # after the Chania-excavation special case
    ("kasteli", "Kastelli Pediada"),
]

BAD_TITLE_WORDS = ["logo", "map", "diagram", "flag", "coat_of_arms", "coat of arms",
                   "location_map", ".svg", ".pdf", ".djvu", "plan ", "chart", "graph",
                   "stamp", "banknote", "seal of", "montage", "collage", "museum",
                   "statue", "fresco", "sarcophagus", "pottery", "manuscript", "banner",
                   # close-up subjects / war relics that make bad hero images
                   "goose", "duck", "goat", "sheep", "donkey", "bird", "butterfly",
                   "insect", "lizard", "flower", "bofors", "gun", "cannon", "tank",
                   "memorial", "cemetery", "grave", "painting", "relief", "carving",
                   "inscription", "doorway", "plaque"]
OLD_PHOTO_RE = re.compile(r"\b1[89]\d{2}\b")  # 1800-1999 in file title = archival shot
# jpg/jpeg only: Commons PNGs are nearly always maps, montages or diagrams.
IMG_EXTS = (".jpg", ".jpeg")

STOP = {"crete", "greece", "greek", "the", "and", "for", "with", "new", "from",
        "gets", "into", "near", "over"}


def title_places(tl):
    """Return Commons-friendly place names found in the lowercased title, in order."""
    found = []
    for needle, name in GAZETTEER:
        if needle in tl and name not in found:
            found.append(name)
    return found


def build_queries(title, category, fmt, keywords):
    """Return ordered list of (query, place_token_or_None) candidates.

    place_token: when set, the Wikimedia file title must contain it (precision
    gate); None = generic fallback, search ranking is trusted.
    """
    tl = title.lower()
    places = title_places(tl)
    qs = []

    def add(q, tok=None):
        if (q, tok) not in qs:
            qs.append((q, tok))

    # --- topic-aware specific queries -------------------------------------
    if "airport" in tl or "air traffic" in tl or "passengers" in tl:
        if "chania" in tl:
            add("Chania International Airport", "chania")
            add("Chania airport terminal", "chania")
        elif "heraklion" in tl or "kastelli" in tl or "kasteli" in tl:
            # Kastelli airport = under construction; current Heraklion airport
            # is the factual visual for Crete-airport stories.
            add("Heraklion International Airport", "heraklion")
            add("Nikos Kazantzakis Airport", "kazantzakis")
        else:
            add("Heraklion International Airport", "heraklion")
    if "lake" in tl and "agios nikolaos" in tl:
        add("Lake Voulismeni", "voulismeni")
    if "excavation" in tl and "chania" in tl:
        add("Kastelli hill Chania", "kastelli")
        add("Chania old town", "chania")
    if re.search(r"\b(port|harbour|waterfront|coastal)\b", tl) and places:
        add(f"{places[0]} harbour", places[0].split()[0].lower())
        add(f"{places[0]} port", places[0].split()[0].lower())
    if "beach" in tl and places:
        add(f"{places[0]} beach", places[0].split()[0].lower())

    # --- plain place queries (a real photo of the actual town/region) ------
    for p in places:
        add(p, p.split()[0].lower())

    # --- road / motorway generic (VOAK stories without a usable place) -----
    # gate: file title must reference Crete or a known Crete road locality,
    # otherwise Commons search can return roads anywhere in the world.
    ROAD_TOKS = ("crete", "kokkini", "a90", "eo90", "voak", "heraklion",
                 "chania", "rethymno", "iraklio")
    if any(w in tl for w in ("road", "motorway", "highway", "traffic", "asphalt",
                             "bridge", "utility relocation")):
        add("Crete national road", ROAD_TOKS)
        add("Crete highway landscape", ROAD_TOKS)

    # --- keyword-derived place words (capitalised, non-Greek-script) -------
    for kw in (keywords or []):
        if kw and kw[0:1].isupper() and kw.isascii() and kw.lower() not in STOP:
            add(f"{kw} Crete", kw.split()[0].lower())

    # --- category fallbacks (generic but on-brand Crete visuals) -----------
    fallback = {
        "beaches": "Crete Greece beach",
        "tourism": "Crete Greece coast landscape",
        "property": "Crete Greece village houses",
        "data": "Crete Greece village",
        "airport": "Heraklion International Airport",
        "infrastructure": "Crete Greece landscape road",
        "permits": "Crete Greece town",
    }
    add(fallback.get(category, "Crete Greece landscape"), None)
    return qs


# ---------------------------------------------------------------------------
# Sources
# ---------------------------------------------------------------------------

def wikimedia_candidates(query, limit=8):
    """Search Wikimedia Commons; yield (url, width, file_title_lower)."""
    try:
        resp = requests.get(
            "https://commons.wikimedia.org/w/api.php",
            params={
                "action": "query", "generator": "search",
                "gsrsearch": query, "gsrnamespace": "6", "gsrlimit": "20",
                "prop": "imageinfo", "iiprop": "url|size|mime",
                "iiurlwidth": "1600", "format": "json",
            },
            headers={"User-Agent": UA}, timeout=TIMEOUT)
        data = resp.json()
    except Exception as e:
        print(f"    [wikimedia] error for {query!r}: {e}")
        return []
    out = []
    pages = data.get("query", {}).get("pages", {})
    for page in sorted(pages.values(), key=lambda p: p.get("index", 99)):
        info = (page.get("imageinfo") or [{}])[0]
        thumb = info.get("thumburl", "")
        width = info.get("width", 0)
        mime = info.get("mime", "")
        ftitle = page.get("title", "").lower()
        if not thumb or not mime.startswith("image/"):
            continue
        if not thumb.split("?")[0].lower().endswith(IMG_EXTS):
            continue
        if width < 800:
            continue
        if ".pdf" in thumb.lower() or "page1-" in thumb.lower():
            continue
        if any(bad in ftitle for bad in BAD_TITLE_WORDS):
            continue
        if OLD_PHOTO_RE.search(ftitle):
            continue
        out.append((thumb, width, ftitle))
    return out


def pexels_candidates(query):
    """Search Pexels; yield (url, width, alt_lower). Requires relevance in alt."""
    if not PEXELS_KEY:
        return []
    try:
        resp = requests.get(
            "https://api.pexels.com/v1/search",
            headers={"Authorization": PEXELS_KEY},
            params={"query": query, "per_page": 10, "orientation": "landscape"},
            timeout=TIMEOUT)
        if resp.status_code != 200:
            return []
        photos = resp.json().get("photos", [])
    except Exception as e:
        print(f"    [pexels] error for {query!r}: {e}")
        return []
    out = []
    for p in photos:
        url = (p.get("src") or {}).get("large2x") or (p.get("src") or {}).get("large")
        width = p.get("width", 0)
        alt = ((p.get("alt") or "") + " " + (p.get("url") or "")).lower()
        if not url or width < 800:
            continue
        out.append((url, width, alt))
    return out


def validate_url(url):
    """HTTP 200 + Content-Type image/* + no .pdf / page1-."""
    if ".pdf" in url.lower() or "page1-" in url.lower():
        return False
    try:
        r = requests.head(url, headers={"User-Agent": UA}, timeout=TIMEOUT,
                          allow_redirects=True)
        if r.status_code in (405, 403, 501):
            r = requests.get(url, headers={"User-Agent": UA}, timeout=TIMEOUT,
                             stream=True, allow_redirects=True)
            r.close()
        ctype = r.headers.get("Content-Type", "")
        return r.status_code == 200 and ctype.lower().startswith("image/")
    except Exception:
        return False


def _tok_match(place_tok, text):
    """place_tok may be None, a string, or a tuple of acceptable tokens."""
    if not place_tok:
        return True
    toks = place_tok if isinstance(place_tok, tuple) else (place_tok,)
    return any(t in text for t in toks)


def find_image(title, category, fmt, keywords, used_urls):
    """Return (url, query, source, match_text) or (None,)*4."""
    queries = build_queries(title, category, fmt, keywords)
    for query, place_tok in queries:
        # 1) Wikimedia first for place-specific queries (authentic local photos)
        for url, width, ftitle in wikimedia_candidates(query):
            if url in used_urls:
                continue
            if not _tok_match(place_tok, ftitle):
                # precision gate: the file must actually be about the place
                continue
            if validate_url(url):
                return url, query, "wikimedia", ftitle
        # 2) Pexels (key available) — strict relevance gate: the photo's alt
        #    text must mention Crete/Greece or the place itself. Generic tokens
        #    like "road" are NOT enough (could be a road anywhere).
        for url, width, alt in pexels_candidates(query):
            if url in used_urls:
                continue
            if not _tok_match(place_tok, alt):
                continue
            if "crete" not in alt and "greece" not in alt:
                continue
            if validate_url(url):
                return url, query, "pexels", alt[:120]
        time.sleep(0.3)
    return None, None, None, None


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

SELECT_SQL = """
    SELECT id, slug, format, category, titles->>'en' AS title_en, keywords
    FROM guides
    WHERE status = 'published'
      AND format IN ('news', 'long', 'mid')
      AND (image_url IS NULL OR image_url = '')
    ORDER BY format, id
"""

UPDATE_SQL = """
    UPDATE guides SET image_url = %s, updated_at = now()
    WHERE id = %s AND status = 'published'
      AND format IN ('news', 'long', 'mid')
      AND (image_url IS NULL OR image_url = '')
"""


def main():
    apply_mode = "--apply" in sys.argv
    conn = psycopg2.connect(**DB)
    with conn, conn.cursor() as cur:
        cur.execute(SELECT_SQL)
        rows = cur.fetchall()
    print(f"Mode: {'APPLY' if apply_mode else 'DRY-RUN'} — {len(rows)} guides to process\n")

    used_urls = set()
    found, skipped, updated = [], [], 0
    for gid, slug, fmt, category, title_en, keywords in rows:
        title_en = title_en or slug.replace("-", " ")
        url, query, source, match = find_image(title_en, category, fmt, keywords, used_urls)
        if not url:
            skipped.append((fmt, slug, "no relevant validated image"))
            print(f"SKIP  [{fmt:4}] {slug}\n      title: {title_en}\n      -> no relevant image found, leaving empty")
            continue
        used_urls.add(url)
        found.append((fmt, slug, url))
        print(f"OK    [{fmt:4}] {slug}\n      title: {title_en}\n      query: {query!r} ({source}) match: {match!r}\n      -> {url}")
        if apply_mode:
            with conn, conn.cursor() as cur:
                cur.execute(UPDATE_SQL, (url, gid))
                updated += cur.rowcount
                if cur.rowcount == 0:
                    print("      (skipped at UPDATE: row no longer matches target predicate)")
    conn.close()

    print("\n===== SUMMARY =====")
    by_fmt = {}
    for fmt, slug, _ in found:
        by_fmt[fmt] = by_fmt.get(fmt, 0) + 1
    print(f"Found:   {len(found)}  {by_fmt}")
    by_fmt = {}
    for fmt, slug, _ in skipped:
        by_fmt[fmt] = by_fmt.get(fmt, 0) + 1
    print(f"Skipped: {len(skipped)}  {by_fmt}")
    if apply_mode:
        print(f"Rows updated: {updated}")


if __name__ == "__main__":
    main()
