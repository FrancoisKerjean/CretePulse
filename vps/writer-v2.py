#!/opt/cretepulse/venv/bin/python3
"""CretePulse Palantir - Greek news intelligence pipeline.
Filters Cretan news by tourist relevance, rewrites in EN, translates to FR/DE/EL + 18 title langs.
Uses claude -p (VPS OAuth, zero tokens).
Cron: 0 * * * * (hourly)
"""
import subprocess, json, sys, time, os, re
import psycopg2
from datetime import datetime, timezone
from dotenv import load_dotenv
load_dotenv("/opt/cretepulse-db/.env")

DB = dict(host="localhost", port=5433, dbname="cretepulse", user="postgres", password=os.environ["POSTGRES_PASSWORD"])

BATCH_SIZE = int(os.environ.get("BATCH_SIZE", "10"))
RELEVANCE_THRESHOLD = 5

OTHER_LANGS = ["it", "nl", "pl", "es", "pt", "ru", "ja", "ko", "zh", "tr", "sv", "da", "no", "fi", "cs", "hu", "ro", "ar"]


def claude(prompt, model="haiku"):
    try:
        r = subprocess.run(
            ["claude", "-p", prompt, "--model", model],
            capture_output=True, text=True, timeout=180
        )
        return r.stdout.strip()
    except Exception as e:
        print(f"    claude error: {e}")
        return ""


def extract_json(raw):
    if not raw:
        return None
    text = raw.strip()
    if "```" in text:
        for part in text.split("```")[1:]:
            cleaned = part.strip()
            if cleaned.startswith("json"):
                cleaned = cleaned[4:].strip()
            try:
                return json.loads(cleaned)
            except json.JSONDecodeError:
                continue
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return None


def score_relevance(title, summary=""):
    text = f"{title} {summary}".strip()
    prompt = f"""Rate 0-10 how relevant this news article is for a tourist visiting Crete, Greece.

Relevant (7-10): travel, beaches, weather alerts, cultural events, festivals, food, transport disruptions, flights, safety, real estate, hotel openings, archaeological discoveries.
Somewhat relevant (4-6): Crete economy, local politics affecting tourism, infrastructure (roads, airports), environment.
Not relevant (0-3): local crime, national Greek politics, sports, celebrity, obituaries.

Article: {text[:500]}

Return ONLY a single number 0-10."""

    raw = claude(prompt, "haiku")
    try:
        return min(max(int(re.search(r'\d+', raw or "0").group()), 0), 10)
    except (AttributeError, ValueError):
        return 0


def rewrite_en(title, summary, source_lang):
    prompt = f"""Rewrite this Cretan news article as a 100-150 word English summary for tourists visiting Crete.

Original ({source_lang}):
Title: {title}
Content: {summary[:1500]}

RULES:
- Clear, factual English
- Focus: what happened, where in Crete, when, why it matters for visitors
- Practical implications for tourists when relevant
- No opinions, no sensationalism, no em dashes
- Transport news: mention impact on travel
- Weather/safety: include practical advice
- Culture/events: include dates, locations, how to attend

Return ONLY the summary, no title, no prefix."""

    return claude(prompt, "sonnet")


def translate_4lang(title_en, summary_en):
    prompt = f"""Translate this news title and summary to French, German, and Greek.

Title: {title_en}
Summary: {summary_en[:2000]}

RULES: French accents mandatory. German umlauts correct. Modern Greek. No em dashes.

Return ONLY valid JSON:
{{"title_fr":"...","title_de":"...","title_el":"...","summary_fr":"...","summary_de":"...","summary_el":"..."}}"""

    return extract_json(claude(prompt, "haiku")) or {}


def translate_18_titles(title_en):
    langs_str = ", ".join(OTHER_LANGS)
    prompt = f"""Translate this news headline to: {langs_str}

Title: {title_en}

Return ONLY valid JSON with language codes as keys:
{{"it":"...","nl":"...","pl":"...","es":"...","pt":"...","ru":"...","ja":"...","ko":"...","zh":"...","tr":"...","sv":"...","da":"...","no":"...","fi":"...","cs":"...","hu":"...","ro":"...","ar":"..."}}"""

    return extract_json(claude(prompt, "haiku")) or {}


def process_article(cur, article):
    aid = article["id"]
    slug = article["slug"]

    # Source title/summary
    title = article.get("title_el") or article.get("title_en") or article.get("title_fr") or article.get("title_de") or ""
    summary = article.get("summary_el") or article.get("summary_en") or article.get("summary_fr") or article.get("summary_de") or ""
    source_lang = article.get("source_lang") or "el"

    if not title:
        cur.execute("UPDATE news SET rewritten = true, category = 'filtered' WHERE id = %s", (aid,))
        return "skip_empty"

    # 1. Relevance filter
    score = score_relevance(title, summary)
    print(f"  [{slug[:40]}] score={score}", end="", flush=True)
    time.sleep(1)

    if score < RELEVANCE_THRESHOLD:
        cur.execute("UPDATE news SET rewritten = true, category = 'filtered' WHERE id = %s", (aid,))
        print(" -> filtered")
        return "filtered"

    # 2. Rewrite EN
    summary_en = rewrite_en(title, summary, source_lang)
    if not summary_en or len(summary_en) < 30:
        cur.execute("UPDATE news SET rewritten = true, category = 'filtered' WHERE id = %s", (aid,))
        print(" -> rewrite failed")
        return "rewrite_fail"
    time.sleep(2)

    # Generate EN title
    title_en = claude(
        f"Write a concise news headline (max 80 chars) in English for this summary. Return ONLY the headline, no quotes:\n\n{summary_en[:500]}",
        "haiku"
    )
    if not title_en:
        title_en = title[:80]
    time.sleep(1)

    # 3. Translate FR/DE/EL
    tr = translate_4lang(title_en, summary_en)
    time.sleep(1)

    # 4. Translate 18 titles
    titles_18 = translate_18_titles(title_en)
    time.sleep(1)

    # 5. Update DB
    category = "tourism" if score >= 7 else "general"
    cur.execute("""
        UPDATE news SET
            title_en = %s, summary_en = %s,
            title_fr = %s, summary_fr = %s,
            title_de = %s, summary_de = %s,
            title_el = COALESCE(NULLIF(title_el, ''), %s),
            summary_el = COALESCE(NULLIF(summary_el, ''), %s),
            rewritten = true, category = %s
        WHERE id = %s
    """, (
        title_en, summary_en,
        tr.get("title_fr", ""), tr.get("summary_fr", ""),
        tr.get("title_de", ""), tr.get("summary_de", ""),
        tr.get("title_el", ""), tr.get("summary_el", ""),
        category, aid,
    ))

    print(f" -> OK ({len(summary_en)} chars, {category})")
    return "ok"


def main():
    started = datetime.now(timezone.utc)
    print(f"[palantir] {started.isoformat()} - batch={BATCH_SIZE}")

    conn = psycopg2.connect(**DB)
    conn.autocommit = True
    cur = conn.cursor()

    cur.execute("""
        SELECT id, slug, title_en, title_fr, title_de, title_el,
               summary_en, summary_fr, summary_de, summary_el, source_lang
        FROM news
        WHERE rewritten IS NOT true
        ORDER BY published_at DESC
        LIMIT %s
    """, (BATCH_SIZE,))

    cols = [d[0] for d in cur.description]
    articles = [dict(zip(cols, row)) for row in cur.fetchall()]

    if not articles:
        print("[palantir] No unprocessed articles")
        cur.close()
        conn.close()
        return

    stats = {"ok": 0, "filtered": 0, "skip_empty": 0, "rewrite_fail": 0}
    for article in articles:
        try:
            result = process_article(cur, article)
            stats[result] = stats.get(result, 0) + 1
        except Exception as e:
            print(f"  ERROR {article['slug'][:40]}: {e}")

    elapsed = (datetime.now(timezone.utc) - started).total_seconds()
    print(f"[palantir] Done {elapsed:.0f}s: {stats}")
    cur.close()
    conn.close()


if __name__ == "__main__":
    main()
