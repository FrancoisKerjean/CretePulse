#!/opt/cretepulse/venv/bin/python3
"""Crete Direct Writer - scrapes source article then rewrites with Claude.
Processes up to BATCH_SIZE articles per run to clear backlog faster.
"""
import json, os, subprocess, sys, urllib.request, re, ssl
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
if not SUPABASE_URL or not SUPABASE_KEY:
    print("[writer] ERROR: missing env vars"); sys.exit(1)

from supabase import create_client
sb = create_client(SUPABASE_URL, SUPABASE_KEY)

BATCH_SIZE = 5
SKIP_SOURCES = {"Reddit r/crete", "Reddit r/greece"}

now = datetime.now(timezone.utc)
print(f"[writer] {now.isoformat()} - looking for articles (batch={BATCH_SIZE})")

data = sb.table("news").select("id,slug,title_el,title_en,title_fr,summary_el,source_url,source_name").eq("rewritten", False).order("published_at", desc=True).limit(50).execute()
raw = data.data or []

# Filter queue
queue = []
for a in raw:
    if a.get("source_name") in SKIP_SOURCES:
        sb.table("news").update({"rewritten": True}).eq("id", a["id"]).execute()
        continue
    queue.append(a)
    if len(queue) >= BATCH_SIZE:
        break

if not queue:
    print("[writer] no unprocessed articles"); sys.exit(0)

print(f"[writer] processing {len(queue)} articles")

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

success = 0
for article in queue:
    title = article.get("title_el") or article.get("title_en") or article.get("title_fr") or ""
    summary_el = article.get("summary_el") or ""
    source_url = article.get("source_url") or ""
    source = article.get("source_name") or "unknown"
    print(f"[writer] >> {article['slug'][:50]} ({source})")

    # Scrape source
    scraped_text = ""
    if source_url and not source_url.startswith("https://crete.direct"):
        try:
            req = urllib.request.Request(source_url, headers={"User-Agent": "Mozilla/5.0 CreteDirect/1.0"})
            resp = urllib.request.urlopen(req, timeout=10, context=ctx)
            html = resp.read().decode("utf-8", errors="ignore")
            paragraphs = re.findall(r"<p[^>]*>(.*?)</p>", html, re.DOTALL)
            text_parts = []
            for p in paragraphs:
                clean = re.sub(r"<[^>]+>", "", p).strip()
                if len(clean) > 40 and not clean.startswith("Cookie") and "javascript" not in clean.lower():
                    text_parts.append(clean)
            scraped_text = " ".join(text_parts[:10])[:2000]
        except Exception:
            pass

    # Build context
    context = f"Title: {title}"
    if summary_el:
        context += f"\nExcerpt: {summary_el[:500]}"
    if scraped_text:
        context += f"\nFull article text: {scraped_text}"

    prompt = f"""You are a news writer for Crete Direct (crete.direct), a local Crete news site.

Translate and rewrite this news item. If you have little source material, write a SHORT article (2-3 paragraphs). If you have more material, write longer (4-5 paragraphs).

Source:
{context}

From: {source}

RULES:
- ALWAYS produce output, even with minimal source material. A short news brief is fine.
- Translate the title and write a short article in EN, FR, and DE.
- If the source is in Greek, translate it. If in English, adapt it.
- HTML format: <p> paragraphs, <strong> for key facts.
- French: all accents mandatory.
- German: korrekt, Nachrichtenstil.
- No em dashes.

Category: pick from politics, economy, tourism, culture, sports, weather, environment, transport, health, local

Return ONLY JSON:
{{"title_en":"...","title_fr":"...","title_de":"...","summary_en":"<p>...</p>","summary_fr":"<p>...</p>","summary_de":"<p>...</p>","category":"..."}}"""

    try:
        result = subprocess.run(
            ["claude", "-p", prompt, "--model", "haiku"],
            capture_output=True, text=True, timeout=120
        )
        output = result.stdout.strip()
    except Exception as e:
        print(f"[writer] ERROR: {e}")
        sb.table("news").update({"rewritten": True}).eq("id", article["id"]).execute()
        continue

    # Parse JSON
    if "```" in output:
        for part in output.split("```"):
            if "{" in part:
                output = part.replace("json", "", 1).strip()
                break

    start = output.find("{")
    end = output.rfind("}") + 1
    if start == -1 or end == 0:
        print(f"[writer] SKIP: no JSON")
        sb.table("news").update({"rewritten": True}).eq("id", article["id"]).execute()
        continue

    try:
        parsed = json.loads(output[start:end])
    except json.JSONDecodeError:
        print(f"[writer] SKIP: bad JSON")
        sb.table("news").update({"rewritten": True}).eq("id", article["id"]).execute()
        continue

    update = {"rewritten": True, "published_at": datetime.now(timezone.utc).isoformat()}
    for key in ["title_en", "title_fr", "title_de", "summary_en", "summary_fr", "summary_de", "category"]:
        if parsed.get(key):
            update[key] = parsed[key]

    sb.table("news").update(update).eq("id", article["id"]).execute()
    success += 1
    print(f"[writer] OK: {article['slug'][:50]} ({len(update)-1} fields)")

print(f"[writer] done - {success}/{len(queue)} articles processed")
