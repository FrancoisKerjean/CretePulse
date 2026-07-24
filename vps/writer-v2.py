#!/opt/cretepulse/venv/bin/python3
"""CretePulse Palantir - Greek news intelligence pipeline.
Filters Cretan news by tourist relevance, rewrites in EN, translates to FR/DE/EL + 18 title langs.
Uses claude -p (VPS OAuth, zero tokens).
Cron: 0 * * * * (hourly)
"""
import subprocess, json, sys, time, os, re
import psycopg2
import sys as _sys
_sys.path.insert(0, "/opt/cretepulse-content")
try:
    from indexnow import ping as indexnow_ping, urls_for_news
except Exception:
    indexnow_ping = None
    urls_for_news = None
from datetime import datetime, timezone
from dotenv import load_dotenv
load_dotenv("/opt/cretepulse-db/.env")

DB = dict(host="localhost", port=5433, dbname="cretepulse", user="postgres", password=os.environ["POSTGRES_PASSWORD"])

BATCH_SIZE = int(os.environ.get("BATCH_SIZE", "35"))
RELEVANCE_THRESHOLD = 3

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


REJECT_PATTERNS = [
    "don't have access",
    "could you please share",
    "could you please provide",
    "i need the actual",
    "i need clarification",
    "i don't see any",
    "without the actual",
    "was not captured",
    "please share the",
    "i cannot access",
    "no article content",
]

def claude_refused(text):
    if not text: return False
    low = text.lower()
    return any(p in low for p in REJECT_PATTERNS)



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
    prompt = f"""Translate this Crete news title and summary to French, German, and Greek for a tourist news site.

Title: {title_en}
Summary: {summary_en[:2000]}

STYLE RULES (CRITICAL):
- Write like native press in each language, NOT a literal translation.
- French: sentence case ONLY (capitale au premier mot et noms propres). Never Title Case. Direct, factual, short sentences. No "X : Y Z A B" stacked-noun structures. Avoid calques like "Cieux Changeants", "Necessitent", "Avant le Voyage". Prefer "ciel instable", "consultez", "avant de partir".
- German: standard press style. Compound nouns natural, not forced. Sentence case for headlines is OK; nouns always capitalized.
- Greek: modern journalistic Greek.
- All languages: no em dashes, no hype, no marketing tone. Same length as source +/- 20%.
- Keep proper nouns (place names, organisations) in original form.
- French accents mandatory (e e e a c). German umlauts correct. Modern Greek tonos.

Return ONLY valid JSON:
{{"title_fr":"...","title_de":"...","title_el":"...","summary_fr":"...","summary_de":"...","summary_el":"..."}}"""

    return extract_json(claude(prompt, "sonnet")) or {}


def translate_18_titles(title_en):
    langs_str = ", ".join(OTHER_LANGS)
    prompt = f"""Translate this Crete news headline to: {langs_str}

Title: {title_en}

STYLE RULES (CRITICAL):
- Write like native press in each language, NOT a literal translation.
- Sentence case for languages where Title Case is unnatural (it, nl, pl, es, pt, ru, sv, da, no, fi, cs, hu, ro, tr).
- Direct, short, factual. No marketing tone, no hype, no em dashes.
- Keep proper nouns (place names, organisations) in original form.
- Correct diacritics in every language (Spanish n-tilde, Polish slash-l, Czech caron, Hungarian double-acute, Turkish dotless-i, etc.).
- Same meaning, similar length. Avoid stacked-noun calques.

Return ONLY valid JSON with language codes as keys:
{{"it":"...","nl":"...","pl":"...","es":"...","pt":"...","ru":"...","ja":"...","ko":"...","zh":"...","tr":"...","sv":"...","da":"...","no":"...","fi":"...","cs":"...","hu":"...","ro":"...","ar":"..."}}"""

    return extract_json(claude(prompt, "sonnet")) or {}


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
    if claude_refused(summary_en):
        cur.execute("UPDATE news SET rewritten = true, category = 'filtered' WHERE id = %s", (aid,))
        print(" -> claude refused (no source content)")
        return "no_source"
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

    # Sanitize translations: empty out anything that wasn't actually translated.
    # translate_4lang() sometimes returns the source string verbatim when Claude
    # echoes EN content into the FR/DE/EL slots. Better to ship NULL than wrong-language.
    def _clean(field, src_value):
        v = (tr.get(field, '') or '').strip()
        if not v: return ''
        if v == (src_value or '').strip(): return ''
        return v
    tr['title_fr']   = _clean('title_fr',   title_en)
    tr['summary_fr'] = _clean('summary_fr', summary_en)
    tr['title_de']   = _clean('title_de',   title_en)
    tr['summary_de'] = _clean('summary_de', summary_en)
    tr['title_el']   = _clean('title_el',   title_en)
    tr['summary_el'] = _clean('summary_el', summary_en)

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

    if indexnow_ping and urls_for_news:
        try:
            indexnow_ping(urls_for_news(slug))
        except Exception:
            pass
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
          AND published_at >= now() - interval '3 days'
        ORDER BY (is_urgent IS TRUE) DESC, published_at DESC
        LIMIT %s
    """, (BATCH_SIZE,))
    # Priorite urgents (is_urgent en tete) => jamais de famine des urgents meme
    # quand le backlog explose. Fenetre 3j => on ignore le backlog ancien/perime
    # (news >3j = non pertinente a traduire) et on borne la charge au flux frais.

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
