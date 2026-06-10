#!/usr/bin/env python3
"""Insert the data drop pilot article into guides table as a draft.

Reads payload.json, en.html, fr.html from /opt/cretepulse-content/data-drop-2025/
and inserts a single guide row with status='draft' and titles+meta_descs+contents+faqs
populated for en+fr. translator-batch.py will then pick it up, fan out to 18 more
languages, set published_at, and trigger IndexNow + Reddit + Bluesky.
"""

import json
import os
import sys
from pathlib import Path

import psycopg2
import psycopg2.extras

BASE = Path("/opt/cretepulse-content/data-drop-2025")
DB_PARAMS = {
    "host": "localhost",
    "port": 5433,
    "dbname": "cretepulse",
    "user": "postgres",
    "password": os.environ.get("POSTGRES_PASSWORD") or open("/opt/cretepulse-db/.env").read().split("POSTGRES_PASSWORD=")[1].split("\n")[0].strip(),
}


def main():
    payload = json.loads((BASE / "data-drop-2025-payload.json").read_text(encoding="utf-8"))
    content_en = (BASE / "data-drop-2025-en.html").read_text(encoding="utf-8")
    content_fr = (BASE / "data-drop-2025-fr.html").read_text(encoding="utf-8")

    contents = {"en": content_en, "fr": content_fr}

    conn = psycopg2.connect(**DB_PARAMS)
    cur = conn.cursor()

    cur.execute(
        """
        INSERT INTO guides
            (slug, format, category, keywords, titles, meta_descs, contents, faqs,
             image_url, status, read_time)
        VALUES
            (%s, %s, %s, %s, %s::jsonb, %s::jsonb, %s::jsonb, %s::jsonb,
             %s, %s, %s)
        ON CONFLICT (slug) DO UPDATE SET
            titles = EXCLUDED.titles,
            meta_descs = EXCLUDED.meta_descs,
            contents = EXCLUDED.contents,
            faqs = EXCLUDED.faqs,
            keywords = EXCLUDED.keywords,
            updated_at = now()
        RETURNING id, slug, status;
        """,
        (
            payload["slug"],
            payload.get("format", "long"),
            payload["category"],
            payload["keywords"],
            json.dumps(payload["titles"], ensure_ascii=False),
            json.dumps(payload["meta_descs"], ensure_ascii=False),
            json.dumps(contents, ensure_ascii=False),
            json.dumps(payload["faqs"], ensure_ascii=False),
            payload.get("image_url"),
            payload.get("status", "draft"),
            8,  # estimated 8 min read for ~1900 words
        ),
    )

    row = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()

    print(f"OK id={row[0]} slug={row[1]} status={row[2]}")
    print("Next step: run translator-batch.py to translate to 18 more languages + publish.")


if __name__ == "__main__":
    main()
