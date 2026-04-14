#!/opt/cretepulse/venv/bin/python3
"""Enrich hike descriptions via Claude CLI. Idempotent."""
import subprocess, json, sys, time, os
import psycopg2
from dotenv import load_dotenv
load_dotenv("/opt/cretepulse-db/.env")

DB = dict(host="localhost", port=5433, dbname="cretepulse", user="postgres", password=os.environ["POSTGRES_PASSWORD"])


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


def enrich(cur, hike):
    slug = hike["slug"]
    dist = hike["distance_km"] or "unknown"
    elev = hike["elevation_gain_m"] or "unknown"
    dur = hike["duration_hours"] or "unknown"
    diff = hike["difficulty"] or "moderate"
    water = "yes" if hike["water_available"] else "no"

    prompt = f"""Write a 120-150 word English description of the {hike['name_en']} hiking trail in Crete, Greece.

Distance: {dist}km, elevation gain: {elev}m, duration: {dur}h, difficulty: {diff}
Water available on trail: {water}
Trail type: {hike['type'] or 'hiking trail'}

Describe: what you will see along the way (landscape, landmarks, views), required fitness level, best season to hike, starting point and access, practical tips (bring water, proper shoes, start early in summer).
Write for hikers visiting Crete. Factual, useful. No em dashes."""

    print(f"  {slug[:50]}...", end="", flush=True)
    desc_en = claude(prompt, "haiku")
    if not desc_en or len(desc_en) < 30:
        print(" SKIP")
        return False
    time.sleep(1)

    tr_prompt = f"""Translate this hiking trail description to French, German, and Greek.
French: all accents mandatory. German: correct umlauts. Greek: modern Greek. No em dashes.

Text: {desc_en}

Return ONLY valid JSON:
{{"fr": "...", "de": "...", "el": "..."}}"""

    tr_raw = claude(tr_prompt, "haiku")
    time.sleep(1)
    tr = extract_json(tr_raw) or {}

    cur.execute("""
        UPDATE hikes SET
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
        SELECT slug, name_en, distance_km, elevation_gain_m, duration_hours,
               difficulty, type, water_available
        FROM hikes
        WHERE (description_en IS NULL OR description_en = '')
        ORDER BY slug
    """)
    cols = [d[0] for d in cur.description]
    rows = [dict(zip(cols, row)) for row in cur.fetchall()]
    print(f"[enrich-hikes] {len(rows)} hikes to process")

    ok, fail = 0, 0
    for hike in rows:
        try:
            if enrich(cur, hike):
                ok += 1
            else:
                fail += 1
        except Exception as e:
            print(f"  ERROR {hike['slug'][:40]}: {e}")
            fail += 1

    cur.close()
    conn.close()
    print(f"[enrich-hikes] Done: {ok} OK, {fail} failed")


if __name__ == "__main__":
    main()
