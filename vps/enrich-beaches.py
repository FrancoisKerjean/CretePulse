#!/opt/cretepulse/venv/bin/python3
"""Enrich beach descriptions via Claude CLI. Idempotent."""
import subprocess, json, sys, time, os
import psycopg2
from dotenv import load_dotenv
load_dotenv("/opt/cretepulse-db/.env")

DB = dict(host="localhost", port=5433, dbname="cretepulse", user="postgres", password=os.environ["POSTGRES_PASSWORD"])

TOP_30_SLUGS = [
    "elafonisi-beach", "balos-lagoon", "palm-beach-vai", "preveli-beach",
    "matala-beach", "falassarna", "seitan-limania-beach", "stavros-beach",
    "georgioupoli-beach", "agia-pelagia-beach", "elounda-beach", "plakias-beach",
    "paleochora-beach", "sougia-beach", "loutro-beach", "malia-beach",
    "stalis-beach", "agiofarago-beach", "kedrodasos", "sweet-water-beach",
    "damnoni-beach", "triopetra-beach", "frangokastello-beach", "makrigialos-beach",
    "xerokampos-beach", "sitia-beach", "istro-beach", "almyrida-beach",
    "marathi-beach", "kalathas-beach",
]


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


def enrich(cur, beach, is_top30):
    slug = beach["slug"]
    model = "sonnet" if is_top30 else "haiku"
    word_target = "500-800" if is_top30 else "120-150"

    prompt = f"""Write a {word_target} word English description of {beach['name_en']} beach in Crete, Greece.

Location: {beach['region']} Crete, coordinates {beach['latitude']}, {beach['longitude']}
Beach type: {beach['type'] or 'unknown'}
Parking: {'yes' if beach['parking'] else 'no'}
Family-friendly: {'yes' if beach['kids_friendly'] else 'no'}
Sunbeds: {'yes' if beach['sunbeds'] else 'no'}
Taverna nearby: {'yes' if beach['taverna'] else 'no'}
Snorkeling: {'yes' if beach['snorkeling'] else 'no'}

{"Structure: Opening paragraph (what makes this beach special and unique), Getting there (detailed access by car/foot/boat), Activities and water conditions, Practical tips (best time of day, wind patterns, crowds by season), Best months to visit, Who its ideal for (families/couples/adventurers)." if is_top30 else "Write a single paragraph: beach type, how to get there, atmosphere, who its for."}
Write for tourists. Be factual, specific, useful. No marketing fluff. No em dashes."""

    print(f"  [{model}] {slug}...", end="", flush=True)
    desc_en = claude(prompt, model)
    if not desc_en or len(desc_en) < 50:
        print(" SKIP (empty)")
        return False
    time.sleep(2)

    tr_prompt = f"""Translate this beach description to French, German, and Greek.

RULES:
- French: all accents mandatory
- German: correct umlauts and grammar
- Greek: modern Greek, tourist-friendly
- No em dashes in any language
- Keep the same structure and length

Text:
{desc_en[:3000]}

Return ONLY valid JSON:
{{"fr": "...", "de": "...", "el": "..."}}"""

    tr_raw = claude(tr_prompt, "haiku")
    time.sleep(2)
    translations = extract_json(tr_raw) or {}

    cur.execute("""
        UPDATE beaches SET
            description_en = %s, description_fr = %s,
            description_de = %s, description_el = %s
        WHERE slug = %s
    """, (
        desc_en,
        translations.get("fr", ""),
        translations.get("de", ""),
        translations.get("el", ""),
        slug,
    ))
    print(f" OK ({len(desc_en)} chars)")
    return True


def main():
    force_slug = None
    top_only = "--top-only" in sys.argv
    for arg in sys.argv[1:]:
        if arg.startswith("--force-slug="):
            force_slug = arg.split("=", 1)[1]

    conn = psycopg2.connect(**DB)
    conn.autocommit = True
    cur = conn.cursor()

    if force_slug:
        cur.execute("SELECT slug, name_en, latitude, longitude, region, type, parking, kids_friendly, sunbeds, taverna, snorkeling FROM beaches WHERE slug = %s", (force_slug,))
    elif top_only:
        placeholders = ",".join(["%s"] * len(TOP_30_SLUGS))
        cur.execute(f"SELECT slug, name_en, latitude, longitude, region, type, parking, kids_friendly, sunbeds, taverna, snorkeling FROM beaches WHERE slug IN ({placeholders}) AND (description_en IS NULL OR description_en = '')", TOP_30_SLUGS)
    else:
        cur.execute("SELECT slug, name_en, latitude, longitude, region, type, parking, kids_friendly, sunbeds, taverna, snorkeling FROM beaches WHERE (description_en IS NULL OR description_en = '') ORDER BY slug")

    cols = [d[0] for d in cur.description]
    rows = [dict(zip(cols, row)) for row in cur.fetchall()]
    print(f"[enrich-beaches] {len(rows)} beaches to process")

    ok, fail = 0, 0
    for beach in rows:
        is_top30 = beach["slug"] in TOP_30_SLUGS
        try:
            if enrich(cur, beach, is_top30):
                ok += 1
            else:
                fail += 1
        except Exception as e:
            print(f"  ERROR {beach['slug']}: {e}")
            fail += 1

    cur.close()
    conn.close()
    print(f"[enrich-beaches] Done: {ok} OK, {fail} failed")


if __name__ == "__main__":
    main()
