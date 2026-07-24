#!/usr/bin/env python3
"""CretePulse - IndexNow submission helper.

Pings the IndexNow protocol (Bing, Yandex, Seznam... via the shared endpoint)
the moment new content is published, instead of waiting for search engines to
slowly recrawl the sitemap. The verification key is already hosted at
https://crete.direct/<KEY>.txt (Next.js public/). Import and call submit(urls)
from the generators right after a successful publish.

No-op safe: never raises; logs and returns on any failure so a submission
problem can never block content publication.
"""

import json
import urllib.request

INDEXNOW_KEY = "4dafcbb3dc8d5d91c255ee258095eb2e"
HOST = "crete.direct"
KEY_LOCATION = f"https://{HOST}/{INDEXNOW_KEY}.txt"
TIMEOUT = 15
MAX_URLS = 10000  # IndexNow per-request cap

# Submit to each engine independently (they validate the key separately).
# - Yandex / Naver: accept via the hosted key file (verified 2026-05-22: 202/200).
# - Bing: returns 403 until the site is verified in Bing Webmaster Tools (manual,
#   one-time). Left in the list so it starts working automatically once verified.
# NB: Google does NOT support IndexNow; Google indexing relies on the sitemap.
ENDPOINTS = [
    "https://yandex.com/indexnow",
    "https://searchadvisor.naver.com/indexnow",
    "https://www.bing.com/indexnow",
]


def submit(urls):
    """Submit full URLs to every IndexNow engine. Never raises (publishing must not break)."""
    urls = list(dict.fromkeys(u for u in urls if u))  # dedup, drop falsy, keep order
    if not urls:
        return
    payload = json.dumps({
        "host": HOST,
        "key": INDEXNOW_KEY,
        "keyLocation": KEY_LOCATION,
        "urlList": urls[:MAX_URLS],
    }).encode("utf-8")
    for endpoint in ENDPOINTS:
        req = urllib.request.Request(
            endpoint, data=payload,
            headers={"Content-Type": "application/json; charset=utf-8",
                     "User-Agent": "Mozilla/5.0 (compatible; CretePulseBot/1.0)"},
        )
        engine = endpoint.split("/")[2]
        try:
            with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
                print(f"[indexnow] {engine}: {len(urls[:MAX_URLS])} url(s) -> HTTP {resp.status}")
        except Exception as e:  # noqa: BLE001 - submission must never break publishing
            print(f"[indexnow] {engine}: failed (non-fatal): {e}")


# Locale set must match the Next.js next-intl config (guides are fully translated).
ALL_LOCALES = [
    "en", "fr", "de", "el", "it", "nl", "pl", "es", "pt", "ru",
    "ja", "ko", "zh", "tr", "sv", "da", "no", "fi", "cs", "hu", "ro", "ar",
]


def guide_urls(slug, locales=None):
    """All localized URLs for a published guide/article."""
    return [f"https://{HOST}/{loc}/articles/{slug}" for loc in (locales or ALL_LOCALES)]


def news_urls(slug, locales=("en", "fr", "de", "el")):
    """Localized URLs for a published news item (premium locales only by default)."""
    return [f"https://{HOST}/{loc}/news/{slug}" for loc in locales]
