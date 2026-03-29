#!/usr/bin/env python3
"""CretePulse - Daily SEO guide generator. Runs daily via cron at 05:00 UTC."""

import json
import os
import re
import subprocess
import sys
import requests
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
FAL_KEY = os.environ.get("FAL_KEY", "")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("[guide-writer] ERROR: missing SUPABASE env vars")
    sys.exit(1)

from supabase import create_client
sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

TOPICS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "guide-topics.json")

ALL_LOCALES = [
    "en", "fr", "de", "el", "it", "nl", "pl", "es", "pt", "ru",
    "ja", "ko", "zh", "tr", "sv", "da", "no", "fi", "cs", "hu", "ro", "ar"
]
PREMIUM_LOCALES = ["fr", "de", "el"]
BATCH_LOCALES = [
    ["it", "nl", "pl", "es", "pt", "ru"],
    ["ja", "ko", "zh", "tr", "sv", "da"],
    ["no", "fi", "cs", "hu", "ro", "ar"],
]


def send_telegram(text):
    """Send notification via kairos_telegram module."""
    try:
        from kairos_telegram import send, Bot
        send(Bot.PLUME, "Guide Writer", text)
    except Exception as e:
        print(f"[guide-writer] Telegram error: {e}")


def call_claude(prompt, model="sonnet"):
    """Call Claude CLI and return stdout."""
    result = subprocess.run(
        ["claude", "-p", prompt, "--model", model],
        capture_output=True, text=True, timeout=300
    )
    if result.returncode != 0:
        raise RuntimeError(f"claude -p failed: {result.stderr[:500]}")
    return result.stdout.strip()


def select_topic():
    """Select next topic from the bank, excluding already published slugs."""
    with open(TOPICS_FILE, "r") as f:
        bank = json.load(f)

    resp = sb.table("guides").select("slug").execute()
    published_slugs = {r["slug"] for r in resp.data}

    total = len(published_slugs)
    want_mid = (total % 3 == 2)

    now = datetime.now(timezone.utc)
    month = now.month
    day = now.day

    seasonal = [
        t for t in bank.get("seasonal", [])
        if t["slug"] not in published_slugs and month in t.get("months", [])
    ]
    evergreen = [
        t for t in bank.get("evergreen", [])
        if t["slug"] not in published_slugs
    ]

    if day % 2 == 1 and seasonal:
        pool = seasonal
    else:
        pool = evergreen if evergreen else seasonal

    if not pool:
        return None

    if want_mid:
        fmt_pool = [t for t in pool if t.get("format") == "mid"]
        if fmt_pool:
            pool = fmt_pool
    else:
        fmt_pool = [t for t in pool if t.get("format") == "long"]
        if fmt_pool:
            pool = fmt_pool

    return pool[0]


def get_existing_guides_for_linking():
    """Fetch 10 latest guides for internal linking context."""
    resp = sb.table("guides") \
        .select("slug, titles, category") \
        .eq("status", "published") \
        .order("published_at", desc=True) \
        .limit(10) \
        .execute()
    return resp.data or []


def generate_en(topic, existing_guides):
    """Generate English content via Sonnet."""
    links_context = "\n".join(
        f"- /articles/{g['slug']} : {g['titles'].get('en', '')} ({g['category']})"
        for g in existing_guides
    )
    fmt = topic["format"]
    word_target = "1500-2000 words" if fmt == "long" else "500-800 words"
    min_h2 = 4 if fmt == "long" else 2

    prompt = f"""You are an expert SEO travel writer specializing in Crete, Greece.
Write a {fmt}-format guide about: {topic['slug'].replace('-', ' ')}
Target keywords: {', '.join(topic['keywords'])}

Requirements:
- {word_target}, factual, concrete data (distances, prices, seasons)
- HTML format: <h2 id="anchor-id">Section Title</h2>, <p>, <ul>, <li>, <strong> on keywords
- Minimum {min_h2} H2 sections with unique id attributes
- Include 2-3 internal links to these existing guides where relevant:
{links_context}
- Internal links format: <a href="/articles/slug">anchor text</a>
- No fluff, no "discover the magic", factual and useful
- Do NOT wrap in markdown code blocks

Return ONLY valid JSON (no markdown, no code fences):
{{"title": "SEO-optimized title with main keyword", "meta_desc": "155 chars max meta description with keyword", "content": "<h2 id=\\"..\\">...</h2><p>...</p>...", "faq": [{{"q": "question", "a": "concise answer"}}, ...], "read_time": estimated_minutes_integer}}

Minimum 3 FAQ questions that tourists actually ask."""

    raw = call_claude(prompt, "sonnet")
    raw = re.sub(r'^```json\s*', '', raw)
    raw = re.sub(r'\s*```$', '', raw)
    return json.loads(raw)


def validate_content(data, fmt):
    """Validate generated content meets minimum requirements."""
    content = data.get("content", "")
    word_count = len(re.findall(r'\w+', re.sub(r'<[^>]+>', '', content)))
    h2_count = len(re.findall(r'<h2[^>]*>', content))
    faq_count = len(data.get("faq", []))

    if fmt == "long":
        if word_count < 1200:
            print(f"[guide-writer] FAIL: {word_count} words (min 1200)")
            return False
        if h2_count < 3:
            print(f"[guide-writer] FAIL: {h2_count} H2s (min 3)")
            return False
    else:
        if word_count < 400:
            print(f"[guide-writer] FAIL: {word_count} words (min 400)")
            return False
        if h2_count < 2:
            print(f"[guide-writer] FAIL: {h2_count} H2s (min 2)")
            return False

    if faq_count < 3:
        print(f"[guide-writer] FAIL: {faq_count} FAQs (min 3)")
        return False

    if not data.get("title") or not data.get("meta_desc"):
        print("[guide-writer] FAIL: missing title or meta_desc")
        return False

    return True


def translate_premium(en_data):
    """Translate EN to FR/DE/EL via Sonnet."""
    prompt = f"""Translate this travel guide content from English to French (fr), German (de), and Greek (el).
Keep the same HTML structure, translate alt text, anchor IDs stay in English.
Adapt tone naturally for each language (not literal translation).

Source:
- Title: {en_data['title']}
- Meta desc: {en_data['meta_desc']}
- Content: {en_data['content'][:3000]}
- FAQ: {json.dumps(en_data['faq'][:3], ensure_ascii=False)}

Return ONLY valid JSON (no markdown):
{{"fr": {{"title": "...", "meta_desc": "...", "content": "...", "faq": [...]}}, "de": {{"title": "...", "meta_desc": "...", "content": "...", "faq": [...]}}, "el": {{"title": "...", "meta_desc": "...", "content": "...", "faq": [...]}}}}"""

    raw = call_claude(prompt, "sonnet")
    raw = re.sub(r'^```json\s*', '', raw)
    raw = re.sub(r'\s*```$', '', raw)
    return json.loads(raw)


def translate_batch(en_data, locales):
    """Translate EN to a batch of 6 locales via Haiku."""
    locale_str = ", ".join(locales)
    prompt = f"""Translate this travel guide from English to these languages: {locale_str}
Keep HTML structure intact. Anchor IDs stay in English.

Source:
- Title: {en_data['title']}
- Meta desc: {en_data['meta_desc']}
- Content: {en_data['content'][:3000]}
- FAQ: {json.dumps(en_data['faq'][:3], ensure_ascii=False)}

Return ONLY valid JSON (no markdown), one key per locale code:
{{"{locales[0]}": {{"title": "...", "meta_desc": "...", "content": "...", "faq": [...]}}, ...}}"""

    raw = call_claude(prompt, "haiku")
    raw = re.sub(r'^```json\s*', '', raw)
    raw = re.sub(r'\s*```$', '', raw)
    return json.loads(raw)


def generate_and_upload_image(title, category, slug):
    """Generate hero image via fal.ai FLUX, upload to Supabase Storage."""
    if not FAL_KEY:
        print("[guide-writer] No FAL_KEY, skipping image generation")
        return None

    try:
        import fal_client
        prompt = f"Professional travel photography of {title}, Crete Greece, {category}, golden hour, cinematic, 16:9 aspect ratio"

        result = fal_client.subscribe(
            "fal-ai/flux/schnell",
            arguments={"prompt": prompt, "image_size": "landscape_16_9", "num_images": 1},
        )

        image_url = result["images"][0]["url"]
        img_data = requests.get(image_url, timeout=30).content
        filename = f"{slug}.webp"

        sb.storage.from_("guide-images").upload(
            filename, img_data, {"content-type": "image/webp"}
        )

        public_url = f"{SUPABASE_URL}/storage/v1/object/public/guide-images/{filename}"
        return public_url

    except Exception as e:
        print(f"[guide-writer] Image generation error: {e}")
        return None


def main():
    print(f"[{datetime.now(timezone.utc).isoformat()}] Guide writer starting...")

    topic = select_topic()
    if not topic:
        msg = "⚠️ Guide Writer: no topics available in bank!"
        print(f"[guide-writer] {msg}")
        send_telegram(msg)
        return

    slug = topic["slug"]
    fmt = topic["format"]
    print(f"[guide-writer] Selected: {slug} ({fmt})")

    try:
        existing = get_existing_guides_for_linking()

        print("[guide-writer] Generating EN content...")
        en_data = generate_en(topic, existing)

        if not validate_content(en_data, fmt):
            msg = f"❌ Guide Writer: validation failed for {slug}"
            send_telegram(msg)
            return

        print("[guide-writer] Translating FR/DE/EL...")
        premium = translate_premium(en_data)

        all_translations = {"en": en_data, **premium}
        for i, batch in enumerate(BATCH_LOCALES):
            print(f"[guide-writer] Translating batch {i+1}/3: {batch}...")
            batch_result = translate_batch(en_data, batch)
            all_translations.update(batch_result)

        print("[guide-writer] Generating image...")
        image_url = generate_and_upload_image(en_data["title"], topic["category"], slug)

        titles = {loc: t.get("title", "") for loc, t in all_translations.items()}
        meta_descs = {loc: t.get("meta_desc", "") for loc, t in all_translations.items()}
        contents = {loc: t.get("content", "") for loc, t in all_translations.items()}
        faqs = {loc: t.get("faq", []) for loc, t in all_translations.items()}

        row = {
            "slug": slug,
            "format": fmt,
            "category": topic["category"],
            "keywords": topic.get("keywords", []),
            "titles": titles,
            "meta_descs": meta_descs,
            "contents": contents,
            "faqs": faqs,
            "image_url": image_url,
            "read_time": en_data.get("read_time", 5),
            "status": "published",
        }

        sb.table("guides").insert(row).execute()
        print(f"[guide-writer] Inserted guide: {slug}")

        msg = f"✅ Guide publié : {en_data['title']} ({fmt}, {topic['category']})"
        send_telegram(msg)

    except Exception as e:
        msg = f"❌ Guide Writer error for {slug}: {e}"
        print(f"[guide-writer] {msg}")
        send_telegram(msg)


if __name__ == "__main__":
    main()
