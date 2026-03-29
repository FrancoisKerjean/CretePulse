#!/usr/bin/env python3
"""One-shot migration of 11 static articles from articles.ts to Supabase guides table."""

import json
import os
import subprocess
import re
import sys
import requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("[migrate] ERROR: missing SUPABASE env vars")
    sys.exit(1)

from supabase import create_client
sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

BATCH_LOCALES = [
    ["it", "nl", "pl", "es", "pt", "ru"],
    ["ja", "ko", "zh", "tr", "sv", "da"],
    ["no", "fi", "cs", "hu", "ro", "ar"],
]


def call_claude(prompt, model="sonnet"):
    result = subprocess.run(
        ["claude", "-p", prompt, "--model", model],
        capture_output=True, text=True, timeout=300
    )
    if result.returncode != 0:
        raise RuntimeError(f"claude -p failed: {result.stderr[:500]}")
    return result.stdout.strip()


def migrate_article(article):
    slug = article["slug"]
    print(f"\n[migrate] Processing: {slug}")

    existing = sb.table("guides").select("slug").eq("slug", slug).execute()
    if existing.data:
        print(f"[migrate]   Already exists, skipping")
        return

    titles = {
        "en": article.get("title_en", ""),
        "fr": article.get("title_fr", ""),
        "de": article.get("title_de", ""),
        "el": article.get("title_el", ""),
    }
    contents = {
        "en": article.get("content_en", ""),
        "fr": article.get("content_fr", ""),
        "de": article.get("content_de", ""),
        "el": article.get("content_el", ""),
    }

    # Generate meta_descs + FAQs via Sonnet
    print("[migrate]   Generating meta + FAQs...")
    enrich_prompt = f"""Given this travel guide about Crete:
Title: {titles['en']}
Content (first 2000 chars): {contents['en'][:2000]}

Generate:
1. meta_desc: SEO meta description, 155 chars max, with main keyword
2. faq: 4 FAQ questions/answers tourists would ask

Return ONLY valid JSON:
{{"meta_desc_en": "...", "meta_desc_fr": "...", "meta_desc_de": "...", "meta_desc_el": "...", "faq_en": [{{"q": "...", "a": "..."}}, ...], "faq_fr": [{{"q": "...", "a": "..."}}, ...], "faq_de": [{{"q": "...", "a": "..."}}, ...], "faq_el": [{{"q": "...", "a": "..."}}, ...]}}"""

    raw = call_claude(enrich_prompt, "sonnet")
    raw = re.sub(r'^```json\s*', '', raw)
    raw = re.sub(r'\s*```$', '', raw)
    enriched = json.loads(raw)

    meta_descs = {
        "en": enriched.get("meta_desc_en", ""),
        "fr": enriched.get("meta_desc_fr", ""),
        "de": enriched.get("meta_desc_de", ""),
        "el": enriched.get("meta_desc_el", ""),
    }
    faqs = {
        "en": enriched.get("faq_en", []),
        "fr": enriched.get("faq_fr", []),
        "de": enriched.get("faq_de", []),
        "el": enriched.get("faq_el", []),
    }

    # Translate to 18 remaining languages via Haiku
    for batch in BATCH_LOCALES:
        print(f"[migrate]   Translating: {batch}...")
        locale_str = ", ".join(batch)
        prompt = f"""Translate this travel guide from English to: {locale_str}
Keep HTML structure. Anchor IDs stay English.

Title: {titles['en']}
Meta desc: {meta_descs['en']}
Content (first 2000 chars): {contents['en'][:2000]}
FAQ: {json.dumps(faqs['en'][:3], ensure_ascii=False)}

Return ONLY valid JSON:
{{"{batch[0]}": {{"title": "...", "meta_desc": "...", "content": "...", "faq": [...]}}, ...}}"""

        raw = call_claude(prompt, "haiku")
        raw = re.sub(r'^```json\s*', '', raw)
        raw = re.sub(r'\s*```$', '', raw)
        batch_data = json.loads(raw)

        for loc, data in batch_data.items():
            titles[loc] = data.get("title", "")
            meta_descs[loc] = data.get("meta_desc", "")
            contents[loc] = data.get("content", "")
            faqs[loc] = data.get("faq", [])

    word_count = len(re.findall(r'\w+', re.sub(r'<[^>]+>', '', contents["en"])))
    read_time = max(1, round(word_count / 200))

    row = {
        "slug": slug,
        "format": "long",
        "category": article.get("category", "travel"),
        "keywords": [],
        "titles": titles,
        "meta_descs": meta_descs,
        "contents": contents,
        "faqs": faqs,
        "image_url": article.get("image", None),
        "read_time": read_time,
        "published_at": article.get("publishedAt", "2026-03-24"),
        "status": "published",
    }

    sb.table("guides").insert(row).execute()
    print(f"[migrate]   ✅ Migrated: {slug}")


def main():
    export_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "articles-export.json")

    if not os.path.exists(export_path):
        print(f"[migrate] ERROR: {export_path} not found")
        print("[migrate] Export articles first with:")
        print('  npx tsx -e "import { articles } from \'./src/data/articles\'; import { writeFileSync } from \'fs\'; writeFileSync(\'vps/articles-export.json\', JSON.stringify(articles, null, 2));"')
        sys.exit(1)

    with open(export_path, "r") as f:
        articles = json.load(f)

    print(f"[migrate] Found {len(articles)} articles to migrate")

    for article in articles:
        try:
            migrate_article(article)
        except Exception as e:
            print(f"[migrate]   ❌ Error migrating {article.get('slug', '?')}: {e}")

    resp = sb.table("guides").select("slug").execute()
    print(f"\n[migrate] Total guides in DB: {len(resp.data)}")


if __name__ == "__main__":
    main()
