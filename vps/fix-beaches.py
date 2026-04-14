#!/opt/cretepulse/venv/bin/python3
"""Fix beach data: insert missing top beaches, correct booleans."""
import os, sys
sys.path.insert(0, "/opt/cretepulse")
from dotenv import load_dotenv
load_dotenv("/opt/cretepulse-db/.env")
import psycopg2

DB = dict(host="localhost", port=5433, dbname="cretepulse", user="postgres", password=os.environ["POSTGRES_PASSWORD"])

MISSING = [
    {"slug": "balos-lagoon", "name_en": "Balos Lagoon", "name_fr": "Lagon de Balos", "name_de": "Balos Lagune", "name_el": "\u039c\u03c0\u03ac\u03bb\u03bf\u03c2", "latitude": 35.578, "longitude": 23.588, "region": "west", "type": "sand", "parking": True, "kids_friendly": True, "sunbeds": False, "taverna": False, "snorkeling": True},
    {"slug": "preveli-beach", "name_en": "Preveli Beach", "name_fr": "Plage de Preveli", "name_de": "Preveli Strand", "name_el": "\u03a0\u03c1\u03ad\u03b2\u03b5\u03bb\u03b7", "latitude": 35.155, "longitude": 24.475, "region": "west", "type": "sand", "parking": True, "kids_friendly": False, "sunbeds": False, "taverna": True, "snorkeling": True},
    {"slug": "matala-beach", "name_en": "Matala Beach", "name_fr": "Plage de Matala", "name_de": "Matala Strand", "name_el": "\u039c\u03ac\u03c4\u03b1\u03bb\u03b1", "latitude": 34.995, "longitude": 24.750, "region": "central", "type": "sand", "parking": True, "kids_friendly": True, "sunbeds": True, "taverna": True, "snorkeling": True},
    {"slug": "stavros-beach", "name_en": "Stavros Beach", "name_fr": "Plage de Stavros", "name_de": "Stavros Strand", "name_el": "\u03a3\u03c4\u03b1\u03c5\u03c1\u03cc\u03c2", "latitude": 35.591, "longitude": 24.066, "region": "west", "type": "sand", "parking": True, "kids_friendly": True, "sunbeds": True, "taverna": True, "snorkeling": False},
    {"slug": "georgioupoli-beach", "name_en": "Georgioupoli Beach", "name_fr": "Plage de Georgioupoli", "name_de": "Georgioupoli Strand", "name_el": "\u0393\u03b5\u03c9\u03c1\u03b3\u03b9\u03bf\u03cd\u03c0\u03bf\u03bb\u03b7", "latitude": 35.366, "longitude": 24.256, "region": "west", "type": "sand", "parking": True, "kids_friendly": True, "sunbeds": True, "taverna": True, "snorkeling": False},
    {"slug": "agia-pelagia-beach", "name_en": "Agia Pelagia Beach", "name_fr": "Plage d'Agia Pelagia", "name_de": "Agia Pelagia Strand", "name_el": "\u0391\u03b3\u03af\u03b1 \u03a0\u03b5\u03bb\u03b1\u03b3\u03af\u03b1", "latitude": 35.403, "longitude": 25.016, "region": "central", "type": "sand", "parking": True, "kids_friendly": True, "sunbeds": True, "taverna": True, "snorkeling": True},
    {"slug": "elounda-beach", "name_en": "Elounda Beach", "name_fr": "Plage d'Elounda", "name_de": "Elounda Strand", "name_el": "\u0395\u03bb\u03bf\u03cd\u03bd\u03c4\u03b1", "latitude": 35.261, "longitude": 25.726, "region": "east", "type": "sand", "parking": True, "kids_friendly": True, "sunbeds": True, "taverna": True, "snorkeling": True},
    {"slug": "plakias-beach", "name_en": "Plakias Beach", "name_fr": "Plage de Plakias", "name_de": "Plakias Strand", "name_el": "\u03a0\u03bb\u03b1\u03ba\u03b9\u03ac\u03c2", "latitude": 35.178, "longitude": 24.393, "region": "west", "type": "sand", "parking": True, "kids_friendly": True, "sunbeds": True, "taverna": True, "snorkeling": False},
    {"slug": "paleochora-beach", "name_en": "Paleochora Beach", "name_fr": "Plage de Paleochora", "name_de": "Paleochora Strand", "name_el": "\u03a0\u03b1\u03bb\u03b1\u03b9\u03cc\u03c7\u03c9\u03c1\u03b1", "latitude": 35.232, "longitude": 23.681, "region": "west", "type": "sand", "parking": True, "kids_friendly": True, "sunbeds": True, "taverna": True, "snorkeling": False},
    {"slug": "loutro-beach", "name_en": "Loutro Beach", "name_fr": "Plage de Loutro", "name_de": "Loutro Strand", "name_el": "\u039b\u03bf\u03c5\u03c4\u03c1\u03cc", "latitude": 35.197, "longitude": 24.076, "region": "west", "type": "pebble", "parking": False, "kids_friendly": True, "sunbeds": True, "taverna": True, "snorkeling": True},
    {"slug": "malia-beach", "name_en": "Malia Beach", "name_fr": "Plage de Malia", "name_de": "Malia Strand", "name_el": "\u039c\u03ac\u03bb\u03b9\u03b1", "latitude": 35.293, "longitude": 25.462, "region": "central", "type": "sand", "parking": True, "kids_friendly": True, "sunbeds": True, "taverna": True, "snorkeling": False},
    {"slug": "stalis-beach", "name_en": "Stalis Beach", "name_fr": "Plage de Stalis", "name_de": "Stalis Strand", "name_el": "\u03a3\u03c4\u03b1\u03bb\u03af\u03b4\u03b1", "latitude": 35.301, "longitude": 25.437, "region": "central", "type": "sand", "parking": True, "kids_friendly": True, "sunbeds": True, "taverna": True, "snorkeling": False},
    {"slug": "agiofarago-beach", "name_en": "Agiofarago Beach", "name_fr": "Plage d'Agiofarago", "name_de": "Agiofarago Strand", "name_el": "\u0391\u03b3\u03b9\u03bf\u03c6\u03ac\u03c1\u03b1\u03b3\u03b3\u03bf", "latitude": 34.937, "longitude": 24.757, "region": "central", "type": "pebble", "parking": True, "kids_friendly": False, "sunbeds": False, "taverna": False, "snorkeling": True},
    {"slug": "frangokastello-beach", "name_en": "Frangokastello Beach", "name_fr": "Plage de Frangokastello", "name_de": "Frangokastello Strand", "name_el": "\u03a6\u03c1\u03b1\u03b3\u03ba\u03bf\u03ba\u03ac\u03c3\u03c4\u03b5\u03bb\u03bb\u03bf", "latitude": 35.179, "longitude": 24.233, "region": "west", "type": "sand", "parking": True, "kids_friendly": True, "sunbeds": True, "taverna": True, "snorkeling": False},
    {"slug": "makrigialos-beach", "name_en": "Makrigialos Beach", "name_fr": "Plage de Makrigialos", "name_de": "Makrigialos Strand", "name_el": "\u039c\u03b1\u03ba\u03c1\u03cd \u0393\u03b9\u03b1\u03bb\u03cc\u03c2", "latitude": 35.038, "longitude": 25.988, "region": "east", "type": "sand", "parking": True, "kids_friendly": True, "sunbeds": True, "taverna": True, "snorkeling": False},
    {"slug": "xerokampos-beach", "name_en": "Xerokampos Beach", "name_fr": "Plage de Xerokampos", "name_de": "Xerokampos Strand", "name_el": "\u039e\u03b5\u03c1\u03cc\u03ba\u03b1\u03bc\u03c0\u03bf\u03c2", "latitude": 35.044, "longitude": 26.236, "region": "east", "type": "sand", "parking": True, "kids_friendly": True, "sunbeds": False, "taverna": True, "snorkeling": True},
    {"slug": "sitia-beach", "name_en": "Sitia Beach", "name_fr": "Plage de Sitia", "name_de": "Sitia Strand", "name_el": "\u03a3\u03b7\u03c4\u03b5\u03af\u03b1", "latitude": 35.205, "longitude": 26.103, "region": "east", "type": "sand", "parking": True, "kids_friendly": True, "sunbeds": True, "taverna": True, "snorkeling": False},
    {"slug": "istro-beach", "name_en": "Istro Beach", "name_fr": "Plage d'Istro", "name_de": "Istro Strand", "name_el": "\u038a\u03c3\u03c4\u03c1\u03bf", "latitude": 35.138, "longitude": 25.744, "region": "east", "type": "sand", "parking": True, "kids_friendly": True, "sunbeds": True, "taverna": True, "snorkeling": True},
    {"slug": "almyrida-beach", "name_en": "Almyrida Beach", "name_fr": "Plage d'Almyrida", "name_de": "Almyrida Strand", "name_el": "\u0391\u03bb\u03bc\u03c5\u03c1\u03af\u03b4\u03b1", "latitude": 35.459, "longitude": 24.162, "region": "west", "type": "sand", "parking": True, "kids_friendly": True, "sunbeds": True, "taverna": True, "snorkeling": True},
]

CORRECTIONS = {
    "elafonisi-beach": {"parking": True, "kids_friendly": True, "sunbeds": True, "taverna": True, "snorkeling": True, "type": "sand"},
    "palm-beach-vai": {"parking": True, "kids_friendly": True, "sunbeds": True, "taverna": True, "snorkeling": True, "type": "sand"},
    "falassarna": {"parking": True, "kids_friendly": True, "sunbeds": True, "taverna": True, "snorkeling": False, "type": "sand"},
    "seitan-limania-beach": {"parking": True, "kids_friendly": False, "sunbeds": False, "taverna": False, "snorkeling": True, "type": "sand"},
    "kedrodasos": {"parking": True, "kids_friendly": False, "sunbeds": False, "taverna": False, "snorkeling": True, "type": "sand"},
    "sweet-water-beach": {"parking": False, "kids_friendly": False, "sunbeds": True, "taverna": True, "snorkeling": True, "type": "pebble"},
    "damnoni-beach": {"parking": True, "kids_friendly": True, "sunbeds": True, "taverna": True, "snorkeling": False, "type": "sand"},
    "triopetra-beach": {"parking": True, "kids_friendly": True, "sunbeds": True, "taverna": True, "snorkeling": False, "type": "sand"},
    "sougia-beach": {"parking": True, "kids_friendly": True, "sunbeds": False, "taverna": True, "snorkeling": False, "type": "pebble"},
    "kalathas-beach": {"parking": True, "kids_friendly": True, "sunbeds": True, "taverna": True, "snorkeling": True, "type": "sand"},
    "marathi-beach": {"parking": True, "kids_friendly": True, "sunbeds": True, "taverna": True, "snorkeling": True, "type": "sand"},
}

conn = psycopg2.connect(**DB)
conn.autocommit = True
cur = conn.cursor()

inserted = 0
for b in MISSING:
    cur.execute("SELECT 1 FROM beaches WHERE slug = %s", (b["slug"],))
    if cur.fetchone():
        continue
    cols = ", ".join(b.keys())
    placeholders = ", ".join(["%s"] * len(b))
    cur.execute(f"INSERT INTO beaches ({cols}) VALUES ({placeholders})", list(b.values()))
    inserted += 1
    print(f"  + {b['slug']}")

corrected = 0
for slug, fixes in CORRECTIONS.items():
    sets = ", ".join(f"{k} = %s" for k in fixes)
    cur.execute(f"UPDATE beaches SET {sets} WHERE slug = %s", list(fixes.values()) + [slug])
    if cur.rowcount:
        corrected += 1
        print(f"  ~ {slug}")

print(f"\nInserted {inserted}, corrected {corrected}")
cur.close()
conn.close()
