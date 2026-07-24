#!/usr/bin/env python3
"""Fix faqs format for guide 47: array of {q:{en,fr}, a:{en,fr}} -> {en:[{q,a}], fr:[{q,a}]}."""

import json
import os
import psycopg2

DB_PARAMS = {
    "host": "localhost",
    "port": 5433,
    "dbname": "cretepulse",
    "user": "postgres",
    "password": open("/opt/cretepulse-db/.env").read().split("POSTGRES_PASSWORD=")[1].split("\n")[0].strip(),
}

conn = psycopg2.connect(**DB_PARAMS)
cur = conn.cursor()

cur.execute("SELECT faqs FROM guides WHERE id = 47")
faqs_array = cur.fetchone()[0]

reformatted = {"en": [], "fr": []}
for item in faqs_array:
    reformatted["en"].append({"q": item["q"]["en"], "a": item["a"]["en"]})
    reformatted["fr"].append({"q": item["q"]["fr"], "a": item["a"]["fr"]})

cur.execute(
    "UPDATE guides SET faqs = %s::jsonb WHERE id = 47",
    (json.dumps(reformatted, ensure_ascii=False),)
)
conn.commit()

cur.execute("SELECT jsonb_typeof(faqs), jsonb_array_length(faqs->'en'), jsonb_array_length(faqs->'fr') FROM guides WHERE id = 47")
result = cur.fetchone()
print(f"faqs_type={result[0]} en_count={result[1]} fr_count={result[2]}")
cur.close()
conn.close()
