#!/usr/bin/env python3
"""
Enrichit cb_places.bento_tiles via un LLM LOCAL (Ollama qwen2.5:3b) sur le VPS.
Zero clé externe, zero pip : lit/ecrit la base via `docker exec ... psql` (superuser,
bypass RLS), appelle Ollama en local (127.0.0.1:11434), JSON forcé (format=json).
Idempotent : ne traite que les lignes bento_tiles IS NULL.
Usage: python3 enrich_bento.py --family heritage [--type monastery] [--limit 10]
"""
import json, subprocess, urllib.request, argparse

PG = ["docker", "exec", "-i", "cretepulse-postgres", "psql", "-U", "postgres", "-d", "cretepulse"]
OLLAMA = "http://localhost:11434/api/generate"
MODEL = "qwen2.5:3b"

FAMILY_TYPES = {
    "heritage": ["monastery", "church", "historical-site", "archaeological-site", "fort", "museum", "mythology", "tradition"],
    "nature": ["gorge", "cave", "lake", "waterfall", "forest", "mountain", "river", "plateau", "island", "geological", "natural-park", "nature"],
    "village": ["town"],
    "beach": ["beach"],
}
SCHEMA = {
    "heritage": 'keys: century (integer, construction century e.g. 14), frescoes_date (a 4-digit year as a string like "1360", or null if no specific year), walking_minutes (integer), unique_feature (short English phrase about a rare/notable detail), access_note (short English)',
    "nature": 'keys: length_km (number), elevation_m (integer), difficulty (one of "easy","moderate","hard"), duration_minutes (integer), season (short English e.g. "May to October"), access_note (short English)',
    "village": 'keys: population (integer), altitude_m (integer), specialty (short English), access_note (short English)',
    "beach": 'keys: access_note (short English), unique_feature (short English notable detail)',
}

def sql_lit(s):
    return "'" + str(s).replace("'", "''") + "'"

def psql_read(sql):
    r = subprocess.run(PG + ["-tAc", sql], capture_output=True, text=True, timeout=120)
    if r.returncode != 0:
        raise RuntimeError("psql read: " + r.stderr.strip())
    return r.stdout.strip()

def psql_exec(sql):
    r = subprocess.run(PG, input=sql, capture_output=True, text=True, timeout=180)
    if r.returncode != 0:
        raise RuntimeError("psql exec: " + r.stderr.strip())

def ollama(prompt):
    body = json.dumps({
        "model": MODEL, "prompt": prompt, "stream": False, "format": "json",
        "options": {"temperature": 0, "num_predict": 300, "num_thread": 3},
    }).encode()
    req = urllib.request.Request(OLLAMA, data=body, headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=180) as r:
        return json.loads(r.read().decode())["response"]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--family", default="heritage")
    ap.add_argument("--type", default=None)
    ap.add_argument("--limit", type=int, default=0)  # 0 = tous
    a = ap.parse_args()
    types = FAMILY_TYPES[a.family]
    where = "place_type = " + sql_lit(a.type) if a.type else "place_type IN (" + ",".join(sql_lit(t) for t in types) + ")"
    lim = "LIMIT %d" % a.limit if a.limit else ""
    sql = ("SELECT coalesce(json_agg(t)::text,'[]') FROM (SELECT slug, name, place_type, "
           "left(description,1200) AS description FROM cb_places "
           "WHERE bento_tiles IS NULL AND %s ORDER BY slug %s) t;" % (where, lim))
    places = json.loads(psql_read(sql) or "[]")
    if not places:
        print("Rien à enrichir.", flush=True)
        return
    print("%d lieux | family=%s type=%s model=%s" % (len(places), a.family, a.type or "*", MODEL), flush=True)

    updated = errors = 0
    buf = []
    sample = []
    for p in places:
        prompt = (
            "Extract structured tile data from this Crete place description. "
            "Use ONLY facts present in the text. Use null for any value not stated. "
            "Keep text values in ENGLISH and very short (max 8 words). "
            "Return ONLY a JSON object with these " + SCHEMA[a.family] + ".\n\n"
            "Description: " + (p["description"] or "")
        )
        try:
            tiles = json.loads(ollama(prompt))
            if not isinstance(tiles, dict):
                raise ValueError("not an object")
        except Exception as e:
            errors += 1
            print("  ERR %s: %s" % (p["slug"], str(e)[:120]), flush=True)
            continue
        BADSTR = {"null", "none", "n/a", "na", "unknown", "", "not stated", "not specified"}
        tiles = {k: v for k, v in tiles.items()
                 if v is not None and (not isinstance(v, str) or v.strip().lower() not in BADSTR)}
        buf.append("UPDATE cb_places SET bento_tiles = %s::jsonb WHERE slug = %s;" % (sql_lit(json.dumps(tiles)), sql_lit(p["slug"])))
        if len(sample) < 8:
            sample.append((p["slug"], tiles))
        updated += 1
        if len(buf) >= 25:
            psql_exec("BEGIN;\n" + "\n".join(buf) + "\nCOMMIT;")
            buf = []
            print("  ...%d/%d" % (updated, len(places)), flush=True)
    if buf:
        psql_exec("BEGIN;\n" + "\n".join(buf) + "\nCOMMIT;")
    print("DONE updated=%d errors=%d" % (updated, errors), flush=True)
    print("SAMPLE:", flush=True)
    for slug, tiles in sample:
        print("  ", slug, "=>", json.dumps(tiles, ensure_ascii=False), flush=True)

main()
