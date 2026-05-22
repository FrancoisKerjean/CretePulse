#!/usr/bin/env python3
"""Shared helpers for CretePulse daily editorial generators (weather bulletin + news recap).

Both generators publish into the existing `guides` table (rendered at /articles/[slug],
ISR on-demand) with format="daily", which keeps them out of the editorial articles index
(getEditorialGuides filters format IN ('long','mid')) while still appearing in the sitemap
and a dedicated /daily hub. Generation uses `claude -p` (VPS OAuth, zero tokens). All pure
transforms live here and are unit-tested; I/O wrappers are thin.
"""
import json
import os
import re
import subprocess
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

ATHENS = ZoneInfo("Europe/Athens")


# ---------- pure helpers (unit-tested) ----------

def athens_now():
    return datetime.now(ATHENS)


def daily_slug(prefix: str, d) -> str:
    """Dated URL-safe slug, e.g. crete-weather-2026-05-22. `d` is a date or datetime."""
    return f"{prefix}-{d.strftime('%Y-%m-%d')}"


def build_guide_row(slug, category, title_en, meta_en, content_html_en, faq_en,
                    read_time, image_url=None, published_at=None):
    """Build a guides-table row for an EN-only daily post.

    format="daily" excludes it from the editorial /articles index while keeping a normal
    /articles/[slug] page. Only the `en` key is filled; getLocalizedGuideField falls back
    to en for every other locale.
    """
    return {
        "slug": slug,
        "format": "daily",
        "category": category,
        "keywords": [],
        "titles": {"en": title_en},
        "meta_descs": {"en": meta_en},
        "contents": {"en": content_html_en},
        "faqs": {"en": faq_en},
        "image_url": image_url,
        "read_time": read_time,
        "status": "published",
        "published_at": published_at or datetime.now(timezone.utc).isoformat(),
    }


# ---------- claude -p (mirrors guide-writer.py hardening) ----------

def _call_claude(prompt, model="sonnet", timeout=600):
    # Prompt is passed via stdin (not argv) to avoid arg-length limits, and without a
    # shell so it works on both the Linux VPS and a local Windows dry-run (the old
    # `cat file | claude` pattern needs a Unix shell). `claude -p` reads stdin when no
    # prompt argument is given.
    r = subprocess.run(
        ["claude", "-p", "--model", model, "--output-format", "json"],
        input=prompt, capture_output=True, text=True, encoding="utf-8", timeout=timeout,
    )
    if r.returncode != 0:
        raise RuntimeError(f"claude -p failed: {r.stderr[:500]}")
    try:
        return json.loads(r.stdout).get("result", r.stdout).strip()
    except (json.JSONDecodeError, AttributeError):
        return r.stdout.strip()


def _parse_json(raw):
    raw = re.sub(r"^```(?:json)?\s*", "", raw.strip())
    raw = re.sub(r"\s*```$", "", raw.strip())
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        m = re.search(r"\{[\s\S]*\}", raw)
        if m:
            return json.loads(m.group())
        raise


def claude_json(prompt, model="sonnet", max_retries=2, label="response"):
    """Call Claude and parse its JSON, retrying on malformed output."""
    last = None
    for attempt in range(max_retries + 1):
        p = prompt
        if attempt > 0:
            p = (prompt
                 + f"\n\nREMINDER: your previous answer was NOT valid JSON ({last})."
                 + " Return exactly ONE strictly valid JSON object. Escape every double"
                 + ' quote inside string values as \\". No markdown fences, no extra text.')
        try:
            return _parse_json(_call_claude(p, model))
        except (json.JSONDecodeError, ValueError) as e:
            last = e
            print(f"[daily] {label}: JSON parse failed (attempt {attempt + 1}/{max_retries + 1}): {e}")
    raise RuntimeError(f"{label}: JSON still invalid after {max_retries + 1} attempts: {last}")


# ---------- I/O wrappers ----------

def get_supabase():
    from supabase import create_client
    return create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])


def already_published(sb, slug) -> bool:
    resp = sb.table("guides").select("slug").eq("slug", slug).execute()
    return bool(resp.data)


def publish(sb, row, dry_run=False) -> bool:
    """Insert the row (idempotent on slug) and ping IndexNow for the EN URL only."""
    slug = row["slug"]
    if dry_run:
        print(f"[daily] DRY-RUN would publish {slug}:")
        print(json.dumps(row, ensure_ascii=False)[:1200])
        return False
    if already_published(sb, slug):
        print(f"[daily] {slug} already published, skip")
        return False
    sb.table("guides").insert(row).execute()
    print(f"[daily] published {slug}")
    try:
        import indexnow
        indexnow.submit(indexnow.guide_urls(slug, locales=["en"]))
    except Exception as e:  # noqa: BLE001 - submission must never break publishing
        print(f"[daily] indexnow skipped: {e}")
    return True


def alert(text):
    try:
        from kairos_telegram import send, Bot
        send(Bot.PLUME, "Daily Content", text)
    except Exception as e:  # noqa: BLE001
        print(f"[daily] telegram error: {e}")
