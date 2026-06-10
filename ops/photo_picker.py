"""Pick a photo from the photo_library bank that matches an article.

Used by guide-writer.py and writer-l1.py to prefer Kami's own Crete photos over
stock (Pexels/Wikimedia). Matches by theme (mapped from the article category) +
keyword/place overlap, picks the least-recently-used among the best matches, and
stamps last_used_at so the bank rotates. Returns a public URL or None (None =>
caller falls back to its normal stock fetch). Never raises.

Deployed to /opt/cretepulse/photo_picker.py (importable by guide-writer same-dir
and by writer-l1 via its sys.path.insert("/opt/cretepulse")).
"""
import os
import re
from datetime import datetime, timezone

import psycopg2
from dotenv import load_dotenv

load_dotenv("/opt/cretepulse-db/.env")
load_dotenv("/opt/cretepulse/.env")

_DB = dict(host="localhost", port=5433, dbname="cretepulse", user="postgres",
           password=os.environ.get("POSTGRES_PASSWORD", ""))

# article category -> photo_library theme
CATEGORY_THEME = {
    "beaches": "beach", "hikes": "hike", "food": "food", "villages": "village",
    "travel": "landscape", "expat": "other", "family": "other", "news": "other",
}

_EPOCH = datetime(1970, 1, 1, tzinfo=timezone.utc)


def _terms(*parts) -> set[str]:
    text = " ".join(p for p in parts if p).lower()
    return {w for w in re.split(r"[^a-z0-9à-ÿ]+", text) if len(w) >= 3}


def _score(tags, place_name, terms: set[str]) -> int:
    photo_terms: set[str] = set()
    for t in (tags or []):
        photo_terms |= _terms(t)
    photo_terms |= _terms(place_name or "")
    return len(photo_terms & terms)


def pick_library_photo(category, keywords=None, title="", region=None):
    """Return a bank photo URL matching the article's theme + keywords (LRU), or None."""
    theme = CATEGORY_THEME.get((category or "").lower())
    if not theme:
        return None
    terms = _terms(title, region or "", *(keywords or []))
    try:
        conn = psycopg2.connect(**_DB)
    except Exception:
        return None
    try:
        with conn, conn.cursor() as cur:
            cur.execute(
                "SELECT id, url, place_name, subject_tags, last_used_at "
                "FROM photo_library WHERE theme = %s", (theme,))
            rows = cur.fetchall()
            if not rows:
                return None
            # best keyword overlap first; tie-break least-recently-used (never-used first)
            rows.sort(key=lambda r: (-_score(r[3], r[2], terms), r[4] or _EPOCH, r[0]))
            chosen_id, chosen_url = rows[0][0], rows[0][1]
            cur.execute("UPDATE photo_library SET last_used_at = now() WHERE id = %s", (chosen_id,))
            return chosen_url
    except Exception:
        return None
    finally:
        conn.close()
