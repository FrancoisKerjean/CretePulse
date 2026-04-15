#!/opt/cretepulse/venv/bin/python3
"""Enrich featured restaurant descriptions via Claude CLI. Idempotent."""
import subprocess, json, sys, time, os
import psycopg2
from dotenv import load_dotenv
load_dotenv("/opt/cretepulse-db/.env")

DB = dict(host="localhost", port=5433, dbname="cretepulse", user="postgres", password=os.environ["POSTGRES_PASSWORD"])

REFUSAL_MARKERS = [
    "i don't have", "i cannot", "reliable information", "training data",
    "need to search", "verify", "grant permission", "informations fiables",
    "i'm not able", "i can't", "would need", "unfortunately",
]


def claude(prompt, model="haiku"):
    try:
        r = subprocess.run(
            ["claude", "-p", prompt, "--model", model],
            capture_output=True, text=True, timeout=120
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


def is_refusal(text):
    lower = text.lower()
    return any(m in lower for m in REFUSAL_MARKERS)


def enrich(cur, place):
    slug = place["slug"]
    cuisine_str = place["cuisine"] or "Greek"
    location = place["village"] or place["region"]

    prompt = f"""You are a travel copywriter for a Crete tourism guide. Using ONLY the details below, write a 100-150 word description in English. Do NOT search for or request additional information. Write based on what is provided.

Name: {place['name']}
Type: {place['type']}
Location: {location}, Crete, Greece
Cuisine: {cuisine_str}

Rules:
- Tavernas: mention Cretan staples (dakos, grilled lamb, fresh fish, local olive oil, raki)
- Cafes: describe the Mediterranean setting
- Restaurants: highlight the cuisine style and dining experience
- Price range: taverna = budget to mid-range, restaurant = mid-range, fine dining = upscale
- Be specific about the location and its appeal to visitors
- Write warmly but factually. No em dashes. No disclaimers.
- Output ONLY the description, no preamble."""

    print(f"  {slug[:50]}...", end="", flush=True)
    desc_en = claude(prompt, "haiku")
    if not desc_en or len(desc_en) < 50:
        print(" SKIP (too short)")
        return False
    if is_refusal(desc_en):
        print(" SKIP (refusal)")
        return False
    time.sleep(1)

    tr_prompt = f"""Translate this restaurant description to French, German, and Greek.
French: all accents mandatory. German: correct umlauts. Greek: modern Greek. No em dashes.

Text: {desc_en}

Return ONLY valid JSON:
{{"fr": "...", "de": "...", "el": "..."}}"""

    tr_raw = claude(tr_prompt, "haiku")
    time.sleep(1)
    tr = extract_json(tr_raw) or {}

    cur.execute("""
        UPDATE food_places SET
            description_en = %s, description_fr = %s,
            description_de = %s, description_el = %s
        WHERE slug = %s
    """, (desc_en, tr.get("fr", ""), tr.get("de", ""), tr.get("el", ""), slug))
    print(f" OK ({len(desc_en)} chars)")
    return True


def main():
    conn = psycopg2.connect(**DB)
    conn.autocommit = True
    cur = conn.cursor()

    cur.execute("""
        SELECT slug, name, type, village, region, cuisine
        FROM food_places
        WHERE featured = true AND (description_en IS NULL OR description_en = '')
        ORDER BY slug
    """)
    cols = [d[0] for d in cur.description]
    rows = [dict(zip(cols, row)) for row in cur.fetchall()]
    print(f"[enrich-restaurants] {len(rows)} restaurants to process")

    ok, fail = 0, 0
    for place in rows:
        try:
            if enrich(cur, place):
                ok += 1
            else:
                fail += 1
        except Exception as e:
            print(f"  ERROR {place['slug'][:40]}: {e}")
            fail += 1

    cur.close()
    conn.close()
    print(f"[enrich-restaurants] Done: {ok} OK, {fail} failed")


if __name__ == "__main__":
    main()
