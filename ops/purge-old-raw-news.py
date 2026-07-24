#!/usr/bin/env python3
"""One-off: purge old RAW (untranslated) news from the `news` table.

Scope (confirmed by Kami 2026-06-08): rows that were never processed by the
translator (rewritten IS NOT true) AND published before 2026-06-05. These are
never shown on /news (only translated+categorised rows are) and have no display
value. Translated rows (rewritten=true) and recent unprocessed rows (>=06-05,
left for the hourly writer-v2 cron) are KEPT.

Backs up the deleted rows to a JSON file before deleting (reversible).
"""
import os, json, gzip
from datetime import datetime, timezone
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv("/opt/cretepulse-db/.env")

CUTOFF = "2026-06-05"  # delete published_at < this (UTC)
BACKUP = f"/opt/cretepulse-db/news-purge-backup-{CUTOFF}.json.gz"

WHERE = "rewritten IS NOT true AND published_at < %s"

conn = psycopg2.connect(
    host="localhost", port=5433, dbname="cretepulse",
    user="postgres", password=os.environ["POSTGRES_PASSWORD"],
)
conn.autocommit = False

with conn.cursor() as cur:
    cur.execute(f"SELECT count(*) FROM news WHERE {WHERE}", (CUTOFF,))
    to_delete = cur.fetchone()[0]
    cur.execute("SELECT count(*) FROM news")
    total_before = cur.fetchone()[0]

print(f"[purge] total news rows before : {total_before}")
print(f"[purge] rows matching purge WHERE (rewritten!=true & <{CUTOFF}) : {to_delete}")

if to_delete == 0:
    print("[purge] nothing to delete, exiting.")
    raise SystemExit(0)

# Backup the rows we are about to delete
with conn.cursor(cursor_factory=RealDictCursor) as cur:
    cur.execute(f"SELECT * FROM news WHERE {WHERE}", (CUTOFF,))
    rows = cur.fetchall()
with gzip.open(BACKUP, "wt", encoding="utf-8") as f:
    json.dump(rows, f, default=str)
print(f"[purge] backed up {len(rows)} rows -> {BACKUP}")

# Delete
with conn.cursor() as cur:
    cur.execute(f"DELETE FROM news WHERE {WHERE}", (CUTOFF,))
    deleted = cur.rowcount
conn.commit()

with conn.cursor() as cur:
    cur.execute("SELECT count(*) FROM news")
    total_after = cur.fetchone()[0]
    cur.execute("SELECT count(*) FROM news WHERE rewritten IS NOT true")
    remaining_raw = cur.fetchone()[0]

print(f"[purge] DELETED {deleted} rows")
print(f"[purge] total news rows after : {total_after}")
print(f"[purge] remaining untranslated (rewritten!=true, kept >= {CUTOFF}) : {remaining_raw}")
conn.close()
