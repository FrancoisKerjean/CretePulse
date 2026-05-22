#!/usr/bin/env python3
"""CretePulse - Daily Crete news recap (evening).

Selects the day's already-rewritten EN news from the `news` table, asks Claude to pick the
5-7 major items and write an editorial synthesis with internal links to each /news/[slug],
and publishes it into `guides` as an /articles/[slug] page. Skips when too few news.
Cron suggested: 0 20 * * * (20:00 Europe/Athens), after news.py + writer-v2.py have run.
"""
import argparse
import sys
from datetime import timezone
from dotenv import load_dotenv

import daily_common as dc

load_dotenv()

MIN_NEWS = 3  # below this, do not publish (avoid a thin recap)


def news_window_start(now_athens):
    """UTC datetime of today's midnight in Athens (start of the recap window)."""
    midnight = now_athens.replace(hour=0, minute=0, second=0, microsecond=0)
    return midnight.astimezone(timezone.utc)


def select_news(rows):
    """Keep only rows already rewritten in EN (non-empty title and summary)."""
    return [r for r in rows
            if (r.get("title_en") or "").strip() and (r.get("summary_en") or "").strip()]


def build_prompt(items, date_label):
    listed = "\n".join(
        f'- slug="{r["slug"]}" | {r["title_en"][:120]} | {r["summary_en"][:200]}'
        for r in items
    )
    return f"""You are the news editor of crete.direct. From the Crete news collected today
({date_label}), select the 5 to 7 MOST relevant items for a tourist or resident (tourism,
transport, extreme weather, culture/events, local economy). Ignore minor crime, national
politics, sport, celebrity. Write an editorial recap in English.

Each item you mention MUST link to its article with an internal link in this exact form:
<a href="/news/SLUG">anchor text</a>  (use the slug given below).

Today's news items:
{listed}

Return ONLY one valid JSON object:
{{
  "title": "max 65 chars, includes 'Crete' and the date",
  "meta_desc": "150-160 chars SEO description",
  "content": "HTML body: 400-600 words, <h2 id=\\"slug\\"> sub-headings, <p>, with the internal <a href=\\"/news/SLUG\\"> links. No <h1>.",
  "faq": [{{"q": "...", "a": "..."}}, {{"q": "...", "a": "..."}}, {{"q": "...", "a": "..."}}],
  "read_time": integer minutes
}}"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="print, do not write to DB")
    args = ap.parse_args()

    now = dc.athens_now()
    today = now.date()
    slug = dc.daily_slug("crete-news-recap", today)
    date_label = today.strftime("%d %B %Y")
    start_iso = news_window_start(now).isoformat()

    sb = dc.get_supabase()
    # Window on created_at (ingestion time), NOT published_at: news.py stamps published_at
    # with the RSS feed date (which can be up to MAX_ARTICLE_AGE_DAYS=7 old) and writer-v2.py
    # does not refresh it on rewrite, so an item ingested + rewritten today but dated earlier
    # would be missed and the recap would thin out. created_at = "today's news as the site
    # saw it". Exclude relevance-filtered items (writer-v2 marks EN-source rejects
    # category='filtered' while leaving title_en/summary_en populated).
    resp = (sb.table("news")
            .select("slug, title_en, summary_en, source_name, category, created_at")
            .gte("created_at", start_iso)
            .neq("category", "filtered")
            .order("created_at", desc=True)
            .execute())
    items = select_news(resp.data or [])

    if len(items) < MIN_NEWS:
        # A quiet news day is a normal condition, not a failure: log it and stop.
        # Bot.PLUME (dc.alert) is reserved for genuine generation/publish failures
        # so routine slow days do not create alert fatigue.
        print(f"[news] daily_news: only {len(items)} usable news today (< {MIN_NEWS}), no recap published.")
        return

    try:
        data = dc.claude_json(build_prompt(items, date_label), model="sonnet", label="news-recap")
        row = dc.build_guide_row(
            slug=slug, category="daily-news",
            title_en=data["title"], meta_en=data["meta_desc"],
            content_html_en=data["content"], faq_en=data.get("faq", []),
            read_time=int(data.get("read_time", 4)),
        )
        dc.publish(None if args.dry_run else sb, row, dry_run=args.dry_run)
    except Exception as e:
        dc.alert(f"daily_news: generation/publish failed: {e}")
        print(f"[news] FATAL generate/publish: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
