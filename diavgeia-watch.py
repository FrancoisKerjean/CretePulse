#!/usr/bin/env python3
"""
CretePulse — Diavgeia Watch
Polls https://diavgeia.gov.gr opendata API for Crete-relevant decisions
(infrastructure, tourism permits, hotel licensing, BOAK, Kastelli airport).
Filters noise (routine payments, payroll), scores remaining decisions,
generates EN article via Claude, inserts as draft in `guides` table.
Translator-batch.py picks it up and translates to 21 other locales.

Usage:
  python3 diavgeia-watch.py                # daily run
  python3 diavgeia-watch.py --dry-run      # search + score, no Claude/DB
  python3 diavgeia-watch.py --max 1        # cap N articles this run
  python3 diavgeia-watch.py --days 14      # extend lookback window
"""

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import time
import unicodedata
from datetime import datetime, timedelta, timezone

import psycopg2
import requests
from dotenv import load_dotenv

load_dotenv("/opt/cretepulse-db/.env")
load_dotenv("/opt/cretepulse/.env")
load_dotenv("/opt/kairos-blog/.env")

STOP_FILE = "/opt/cretepulse-content/.STOP"
STATE_FILE = "/opt/cretepulse-content/.diavgeia_seen.json"
LOG_DIR = "/var/log/cretepulse-content"
LOG_FILE = f"{LOG_DIR}/diavgeia-watch.log"
CLAUDE_WRAPPER = "/opt/cretepulse-content/bin/claude-capped.sh"

os.makedirs(LOG_DIR, exist_ok=True)

DB_PARAMS = {
    "host": "localhost",
    "port": 5433,
    "dbname": "cretepulse",
    "user": "postgres",
    "password": os.environ.get("POSTGRES_PASSWORD", ""),
}

# --------------------------------------------------------------------------
# Search config — Greek keywords scoped to Crete + infra/tourism/permits
# --------------------------------------------------------------------------

# Keywords searched in subject. Each yields its own API call.
# Tuned to favor signal over volume.
SEARCH_KEYWORDS = [
    "Καστέλλι",          # Kastelli airport
    "ΒΟΑΚ",              # BOAK motorway
    "Νότιος Οδικός",     # South Crete road axis
    "Ιεράπετρα",         # Ierapetra
    "Σητεία",            # Sitia
    "Ηράκλειο τουρισμός",  # Heraklion tourism
    "Χανιά τουρισμός",   # Chania tourism
    "Λασίθι",            # Lasithi
    "ξενοδοχείο Κρήτη",  # hotel Crete
    "μαρίνα Κρήτη",      # marina Crete
    "παραχώρηση παραλίας",  # beach concession
    "αδειοδότηση τουριστικού",  # tourism licensing
]

# Substrings that almost always indicate routine admin / not newsworthy.
# Decision is dropped if subject contains any of these (lowercased contains).
NOISE_SUBSTRINGS = [
    "ασθενοφόρ",      # ambulance
    "νοσηλεία",       # hospitalization
    "νοσοκομεί",      # hospital (mostly procurement)
    "μισθοδοσί",      # payroll
    "μισθώματ",       # rent payment receipts
    "πληρωμή",        # payment
    "λογαριασμό",     # invoice
    "δαπάν",          # expense
    "οδοιπορ",        # travel expense
    "γραφικ",         # office stationery
    "καύσιμ",         # fuel procurement (routine)
    "καθαρισμ",       # cleaning services routine
    "κυνηγετικ",      # hunting club
    "πρακτικ",        # minutes / acceptance protocols
    "παραλαβ",        # delivery acceptance
    "τήρηση",         # mere keeping/maintaining
    "τιμολόγ",        # invoice
    "αντιδραστηρ",    # lab reagents
    "αντλίες",        # pumps procurement
]

# Substrings that boost a decision's relevance score.
SIGNAL_SUBSTRINGS = {
    "νέο έργο": 5,
    "νέα κατασκευή": 5,
    "κατασκευή": 3,
    "αδειοδότηση": 4,
    "άδεια": 2,
    "χρηματοδότηση": 4,
    "σύμβαση έργου": 3,
    "παραχώρηση": 4,
    "παραχώρησης": 4,
    "ξενοδοχεί": 3,
    "τουριστικ": 2,
    "μαρίνα": 4,
    "λιμάν": 2,
    "αεροδρόμι": 5,
    "πολεοδομικ": 3,
    "natura": 3,
    "νατουρα": 3,
    "βοακ": 4,
    "καστέλλ": 4,
    "αξιολόγηση": 1,
    "μελέτη": 1,
}

# Crete geographic markers — at least one must appear in subject for a
# decision to be considered Crete-relevant (after the subject keyword filter).
CRETE_MARKERS = [
    "κρήτη", "κρήτης", "κρητικ",
    "ηράκλει", "ηρακλεί",
    "χανι", "χαν",
    "ρέθυμνο", "ρεθύμν",
    "λασίθι", "λασιθίο",
    "ιεράπετρ", "σητε", "ιεραπετρ",
    "άγιο νικόλ", "αγ. νικόλ", "αγιο νικολ",
    "καστέλλι", "βοακ", "ψηλορείτ",
    "σαμαριά", "ελαφονήσι", "μπάλος",
    "μάλια", "χερσόνησο",
    "μακρύγιαλο", "γουδούρ", "ζάκρ",
    "σφακιά",
]

DEFAULT_DAYS_BACK = 7
DEFAULT_MAX_ARTICLES = 2
PER_KEYWORD_PAGE_SIZE = 25
MIN_SCORE_TO_PUBLISH = 4

# --------------------------------------------------------------------------
# Logging / state
# --------------------------------------------------------------------------

def log(msg: str) -> None:
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    line = f"{ts} [diavgeia-watch] {msg}"
    print(line, flush=True)
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except OSError:
        pass


def check_stop() -> None:
    if os.path.exists(STOP_FILE):
        log("STOP file present — exiting.")
        sys.exit(98)


def load_state() -> dict:
    if not os.path.exists(STATE_FILE):
        return {"seen_ada": [], "last_run": None}
    try:
        with open(STATE_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        if not isinstance(data.get("seen_ada"), list):
            data["seen_ada"] = []
        return data
    except (OSError, json.JSONDecodeError) as e:
        log(f"State load error ({e}); starting fresh.")
        return {"seen_ada": [], "last_run": None}


def save_state(state: dict) -> None:
    state["last_run"] = datetime.now(timezone.utc).isoformat()
    if len(state["seen_ada"]) > 5000:
        state["seen_ada"] = state["seen_ada"][-5000:]
    tmp = STATE_FILE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)
    os.replace(tmp, STATE_FILE)


def send_telegram(text: str) -> None:
    try:
        sys.path.insert(0, "/opt/cretepulse")
        from kairos_telegram import send, Bot  # type: ignore
        send(Bot.PLUME, "Diavgeia Watch", text)
    except Exception as e:
        log(f"Telegram error: {e}")


# --------------------------------------------------------------------------
# Diavgeia API
# --------------------------------------------------------------------------

def search_diavgeia(keyword: str, from_date: str, to_date: str,
                    size: int = PER_KEYWORD_PAGE_SIZE) -> list:
    """Query Diavgeia opendata search. Returns list of decisions or []."""
    url = "https://diavgeia.gov.gr/luminapi/opendata/search"
    params = {
        "subject": keyword,
        "from_date": from_date,
        "to_date": to_date,
        "size": size,
    }
    try:
        r = requests.get(url, params=params, timeout=20,
                         headers={"Accept": "application/json"})
        if r.status_code != 200:
            log(f"Diavgeia HTTP {r.status_code} for '{keyword}'")
            return []
        data = r.json()
        return data.get("decisions", []) or []
    except (requests.RequestException, json.JSONDecodeError) as e:
        log(f"Diavgeia search error '{keyword}': {e}")
        return []


def score_decision(d: dict) -> int:
    """Score a decision. Higher = more newsworthy. Negative = drop."""
    subject = (d.get("subject") or "").lower()
    if not subject:
        return -100

    # Hard exclusion: any noise substring kills it.
    for noise in NOISE_SUBSTRINGS:
        if noise in subject:
            return -50

    # Must mention a Crete geographic marker.
    if not any(m in subject for m in CRETE_MARKERS):
        return -10

    # Sum signal weights.
    score = 0
    for kw, weight in SIGNAL_SUBSTRINGS.items():
        if kw in subject:
            score += weight

    # Bonus for shortish subjects (less likely to be procurement boilerplate).
    if 40 <= len(subject) <= 220:
        score += 1

    # Recency bonus.
    issue_ms = d.get("issueDate") or 0
    if issue_ms:
        try:
            age_days = (time.time() * 1000 - issue_ms) / 86_400_000
            if age_days < 3:
                score += 2
            elif age_days < 7:
                score += 1
        except (TypeError, ValueError):
            pass

    return score


def collect_candidates(days_back: int) -> list:
    """Run all keyword searches, dedup, score, sort desc."""
    today = datetime.now(timezone.utc).date()
    from_d = today - timedelta(days=days_back)
    from_s = from_d.strftime("%d/%m/%Y")
    to_s = today.strftime("%d/%m/%Y")

    seen_ada_in_run = set()
    candidates = []
    for kw in SEARCH_KEYWORDS:
        decisions = search_diavgeia(kw, from_s, to_s)
        log(f"Keyword '{kw}': {len(decisions)} raw decisions")
        for d in decisions:
            ada = d.get("ada")
            if not ada or ada in seen_ada_in_run:
                continue
            seen_ada_in_run.add(ada)
            score = score_decision(d)
            if score < 0:
                continue
            d["_score"] = score
            d["_matched_keyword"] = kw
            candidates.append(d)
        time.sleep(0.4)  # polite spacing

    candidates.sort(key=lambda x: x["_score"], reverse=True)
    return candidates


# --------------------------------------------------------------------------
# Article generation via Claude
# --------------------------------------------------------------------------

GENERATION_SYSTEM = """You are a senior bilingual news writer for crete.direct,
a tourism + lifestyle guide to Crete, Greece.

You will be given an OFFICIAL Greek government decision published on the
Diavgeia transparency portal. Your job: turn it into a short, accurate,
SEO-friendly news article in BOTH English AND French (no fluff, no
editorialization).

CRITICAL rules:
- ONLY state facts present in the provided decision. NEVER invent dates,
  amounts, project phases, or stakeholders not explicitly in the source.
- If something is unclear in the Greek source, omit it rather than guess.
- 350-550 words for body content (each language).
- Tone: neutral, journalistic, accessible to international readers.
- No em dashes (—) and no en dashes (–) — use comma, period, or " - " (hyphen).
- French content: vouvoiement (vous), full accents (é è à ç ê î ô û).
- Audience: travelers, expats, property buyers. Frame implications when
  relevant (travel impact, property impact, visitor experience).

Output STRICT JSON ONLY (no markdown fences, no preamble), shape:

{
  "title_en": "string, 60-90 chars, SEO-optimized headline in English",
  "title_fr": "string, 60-95 chars, French headline with full accents",
  "meta_desc_en": "string, 140-160 chars, English meta description",
  "meta_desc_fr": "string, 140-165 chars, French meta description",
  "slug_hint": "string, 3-6 words, lowercase hyphenated, English",
  "html_body_en": "string, valid HTML <p><h2><ul><li>. 350-550 words English",
  "html_body_fr": "string, valid HTML <p><h2><ul><li>. 350-550 words French",
  "faqs_en": [
    {"q": "English Q", "a": "English A 30-60 words"},
    {"q": "...", "a": "..."},
    {"q": "...", "a": "..."}
  ],
  "faqs_fr": [
    {"q": "Question en français", "a": "Réponse 30-60 mots avec accents"},
    {"q": "...", "a": "..."},
    {"q": "...", "a": "..."}
  ],
  "category": "infrastructure | tourism | permits | airport | property",
  "confidence": "high | medium | low (your confidence the source supports the article)"
}
"""


def call_claude(prompt: str, model: str = "haiku", timeout: int = 180) -> str:
    """Call claude-capped.sh wrapper. Returns raw stdout."""
    cmd = [
        CLAUDE_WRAPPER, "-p", prompt,
        "--model", model,
        "--output-format", "json",
    ]
    result = subprocess.run(
        cmd, capture_output=True, text=True, timeout=timeout,
    )
    if result.returncode == 98:
        raise RuntimeError("STOP file present, claude wrapper refused.")
    if result.returncode == 99:
        raise RuntimeError("Claude daily cap reached.")
    if result.returncode != 0:
        raise RuntimeError(
            f"claude wrapper rc={result.returncode}: {result.stderr[:300]}"
        )
    raw = result.stdout
    try:
        wrapper = json.loads(raw)
        return (wrapper.get("result") or raw).strip()
    except json.JSONDecodeError:
        return raw.strip()


def parse_json_response(raw: str) -> dict:
    """Strip code fences if any and parse JSON."""
    raw = re.sub(r"^```(?:json)?\s*", "", raw.strip())
    raw = re.sub(r"\s*```$", "", raw.strip())
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        m = re.search(r"\{[\s\S]*\}", raw)
        if not m:
            raise
        return json.loads(m.group())


def build_article_prompt(d: dict) -> str:
    subj = d.get("subject", "")
    ada = d.get("ada", "")
    org = d.get("organizationId", "")
    issue_ts = d.get("issueDate")
    issue_iso = ""
    if issue_ts:
        try:
            issue_iso = datetime.fromtimestamp(issue_ts / 1000, tz=timezone.utc).date().isoformat()
        except (TypeError, ValueError):
            issue_iso = ""
    doc_url = d.get("documentUrl") or ""
    extra = d.get("extraFieldValues") or {}
    estimated = extra.get("estimatedAmount") or {}
    amount_str = ""
    if isinstance(estimated, dict) and estimated.get("amount"):
        amount_str = f"{estimated.get('amount')} {estimated.get('currency','')}"
    decision_type = d.get("decisionTypeId", "")
    matched = d.get("_matched_keyword", "")

    payload = {
        "ada": ada,
        "subject_greek": subj,
        "issue_date": issue_iso,
        "organization_id": org,
        "decision_type": decision_type,
        "estimated_amount": amount_str,
        "document_url": doc_url,
        "matched_search_keyword": matched,
    }

    return (
        f"{GENERATION_SYSTEM}\n\n"
        f"---\n"
        f"OFFICIAL DECISION (translate the Greek subject mentally then write):\n"
        f"```json\n{json.dumps(payload, ensure_ascii=False, indent=2)}\n```\n\n"
        f"Return strict JSON now."
    )


# --------------------------------------------------------------------------
# DB insert
# --------------------------------------------------------------------------

def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = re.sub(r"-+", "-", text).strip("-")
    return text[:90] or "diavgeia-update"


def derive_slug(article: dict, ada: str) -> str:
    hint = (article.get("slug_hint") or article.get("title_en")
            or article.get("title") or "diavgeia-update")
    base = slugify(hint)
    ada_short = hashlib.sha1(ada.encode("utf-8")).hexdigest()[:6]
    return f"{base}-{ada_short}"


def insert_draft(article: dict, decision: dict) -> int:
    slug = derive_slug(article, decision.get("ada", ""))
    title_en = (article.get("title_en") or article.get("title") or "").strip()
    title_fr = (article.get("title_fr") or "").strip()
    meta_en = (article.get("meta_desc_en") or article.get("meta_desc") or "").strip()
    meta_fr = (article.get("meta_desc_fr") or "").strip()
    body_en = article.get("html_body_en") or article.get("html_body") or ""
    body_fr = article.get("html_body_fr") or ""
    faqs_en = article.get("faqs_en") or article.get("faqs") or []
    faqs_fr = article.get("faqs_fr") or []
    category = article.get("category") or "news"

    if not title_fr or not body_fr:
        raise RuntimeError("Missing FR fields in article — translator-batch needs EN+FR.")

    keywords = [decision.get("_matched_keyword", "")]
    keywords += [k for k in ["crete-news", "diavgeia", category] if k]
    keywords = [k for k in keywords if k][:8]

    titles = {"en": title_en, "fr": title_fr}
    meta_descs = {"en": meta_en, "fr": meta_fr}
    contents = {"en": body_en, "fr": body_fr}
    faqs_obj = {"en": faqs_en, "fr": faqs_fr}

    # Append source attribution so translator preserves it across languages.
    doc_url = decision.get("documentUrl") or ""
    ada = decision.get("ada") or ""
    if doc_url:
        attr_en = (
            f'<p class="source-attribution"><em>Source: '
            f'<a href="{doc_url}" rel="noopener nofollow" target="_blank">'
            f'Greek transparency portal Diavgeia, decision {ada}</a></em></p>'
        )
        attr_fr = (
            f'<p class="source-attribution"><em>Source : '
            f'<a href="{doc_url}" rel="noopener nofollow" target="_blank">'
            f'portail grec de transparence Diavgeia, décision {ada}</a></em></p>'
        )
        if attr_en not in contents["en"]:
            contents["en"] = contents["en"].rstrip() + "\n" + attr_en
        if attr_fr not in contents["fr"]:
            contents["fr"] = contents["fr"].rstrip() + "\n" + attr_fr

    word_count = len(re.sub(r"<[^>]+>", " ", contents["en"]).split())
    read_time = max(1, round(word_count / 220))

    conn = psycopg2.connect(**DB_PARAMS)
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO guides (slug, format, category, keywords, titles, meta_descs,
                                   contents, faqs, image_url, read_time, status,
                                   published_at, created_at, updated_at)
                VALUES (%s, 'news', %s, %s::text[], %s::jsonb, %s::jsonb,
                        %s::jsonb, %s::jsonb, %s, %s, 'draft', now(), now(), now())
                ON CONFLICT (slug) DO UPDATE SET
                    titles = EXCLUDED.titles,
                    meta_descs = EXCLUDED.meta_descs,
                    contents = EXCLUDED.contents,
                    faqs = EXCLUDED.faqs,
                    status = 'draft',
                    updated_at = now()
                RETURNING id
            """, (
                slug, category, keywords,
                json.dumps(titles, ensure_ascii=False),
                json.dumps(meta_descs, ensure_ascii=False),
                json.dumps(contents, ensure_ascii=False),
                json.dumps(faqs_obj, ensure_ascii=False),
                None, read_time,
            ))
            guide_id = cur.fetchone()[0]
        conn.commit()
        return guide_id
    finally:
        conn.close()


# --------------------------------------------------------------------------
# Main
# --------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true",
                        help="Search + score, no Claude or DB writes")
    parser.add_argument("--max", type=int, default=DEFAULT_MAX_ARTICLES,
                        help="Max articles to publish this run")
    parser.add_argument("--days", type=int, default=DEFAULT_DAYS_BACK,
                        help="Days lookback for Diavgeia search")
    parser.add_argument("--min-score", type=int, default=MIN_SCORE_TO_PUBLISH,
                        help="Minimum score to publish")
    args = parser.parse_args()

    check_stop()
    log(f"Run start dry_run={args.dry_run} max={args.max} days={args.days}")

    state = load_state()
    seen = set(state.get("seen_ada", []))

    candidates = collect_candidates(args.days)
    fresh = [c for c in candidates if c.get("ada") not in seen]
    log(f"Total candidates {len(candidates)} | fresh (unseen) {len(fresh)}")

    if not fresh:
        log("No fresh candidates — exit clean.")
        save_state(state)
        return 0

    log("Top 5 fresh candidates:")
    for c in fresh[:5]:
        log(f"  score={c['_score']:>3} ada={c['ada']} kw='{c['_matched_keyword']}' "
            f"subj={(c.get('subject') or '')[:140]}")

    if args.dry_run:
        log("Dry run — stopping before generation.")
        return 0

    published = 0
    for cand in fresh:
        if published >= args.max:
            break
        if cand["_score"] < args.min_score:
            log(f"Stop loop: next candidate score {cand['_score']} < min {args.min_score}.")
            break

        ada = cand["ada"]
        log(f"Generating EN+FR article for ADA={ada} score={cand['_score']}")
        try:
            prompt = build_article_prompt(cand)
            raw = call_claude(prompt, model="haiku")
            article = parse_json_response(raw)
            confidence = (article.get("confidence") or "").lower()
            if confidence == "low":
                log(f"  confidence=low — skip ADA={ada}")
                seen.add(ada)
                continue

            guide_id = insert_draft(article, cand)
            t_en = article.get("title_en") or article.get("title") or ""
            log(f"  inserted draft guide_id={guide_id} title='{t_en[:90]}'")
            published += 1
            seen.add(ada)

            send_telegram(
                f"📰 Diavgeia draft #{guide_id}\n"
                f"{t_en[:120]}\n"
                f"score={cand['_score']} ada={ada}\n"
                f"https://crete.direct/en/news"
            )
        except Exception as e:
            log(f"  ERROR ADA={ada}: {e}")
            seen.add(ada)  # mark as seen anyway to avoid retry storm
            continue

    state["seen_ada"] = list(seen)
    save_state(state)
    log(f"Run done. Published {published}/{args.max}")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        log("Interrupted.")
        sys.exit(130)
