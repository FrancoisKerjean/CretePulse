#!/opt/cretepulse/venv/bin/python3
"""Crete Direct Writer - scrapes source article then rewrites with Claude."""
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

now = datetime.now(timezone.utc)
print(f"[writer] {now.isoformat()} - looking for article")

data = sb.table("news").select("id,slug,title_el,title_en,summary_el,source_url,source_name").eq("rewritten", False).order("published_at", desc=True).limit(1).execute()
article = (data.data or [None])[0]

if not article:
    print("[writer] no unprocessed articles"); sys.exit(0)

title = article.get("title_el") or article.get("title_en") or ""
summary_el = article.get("summary_el") or ""
source_url = article.get("source_url") or ""
source = article.get("source_name") or "unknown"
print(f"[writer] processing: {article['slug']} ({source})")

# SCRAPE the source article for real content
scraped_text = ""
if source_url and not source_url.startswith("https://crete.direct"):
    try:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        req = urllib.request.Request(source_url, headers={"User-Agent": "Mozilla/5.0 CreteDirect/1.0"})
        resp = urllib.request.urlopen(req, timeout=10, context=ctx)
        html = resp.read().decode("utf-8", errors="ignore")
        # Extract text from paragraphs
        paragraphs = re.findall(r"<p[^>]*>(.*?)</p>", html, re.DOTALL)
        text_parts = []
        for p in paragraphs:
            clean = re.sub(r"<[^>]+>", "", p).strip()
            if len(clean) > 40 and not clean.startswith("Cookie") and "javascript" not in clean.lower():
                text_parts.append(clean)
        scraped_text = " ".join(text_parts[:10])[:2000]  # Max 2000 chars
        if scraped_text:
            print(f"[writer] scraped {len(scraped_text)} chars from source")
    except Exception as e:
        print(f"[writer] scrape failed: {str(e)[:60]}")

# Build context from all available info
context = f"Title: {title}"
if summary_el:
    context += f"\nExcerpt: {summary_el[:500]}"
if scraped_text:
    context += f"\nFull article text: {scraped_text}"

prompt = f"""You are a senior journalist for Crete Direct (crete.direct).

Rewrite this article based on the source material below. Write a SUBSTANTIAL article, not a 2-sentence summary.

Source material:
{context}

Source: {source}

RULES:
- Write 4-6 paragraphs (300-500 words per language). This must be a REAL article, not a paraphrase.
- Add context: why this matters for Crete, who is affected, what happens next.
- If the source is about an event, include practical details (when, where, cost, how to get there).
- If it's about weather, include specific locations and advice.
- If it's about politics/economy, explain the local impact.
- Structure with HTML: <h2> for one subheading, <p> for paragraphs, <strong> for key facts.
- French: ALL accents mandatory. Sentence case for titles (not Title Case).
- German: korrekt, Nachrichtenstil.
- No em dashes. No invented quotes. No "experts say" unless the source says it.
- If you don't have enough info for a full article, say so honestly in a note at the end.

Category: pick from politics, economy, tourism, culture, sports, weather, environment, transport, health, local

Return ONLY JSON:
{{"title_en":"...","title_fr":"...","title_de":"...","summary_en":"<h2>...</h2><p>...</p><p>...</p><p>...</p>","summary_fr":"<h2>...</h2><p>...</p><p>...</p><p>...</p>","summary_de":"<h2>...</h2><p>...</p><p>...</p><p>...</p>","category":"..."}}"""

try:
    result = subprocess.run(
        ["claude", "-p", prompt, "--model", "haiku"],
        capture_output=True, text=True, timeout=120
    )
    output = result.stdout.strip()
except Exception as e:
    print(f"[writer] ERROR: {e}")
    sb.table("news").update({"rewritten": True}).eq("id", article["id"]).execute()
    sys.exit(1)

# Parse JSON
if "```" in output:
    for part in output.split("```"):
        if "{" in part:
            output = part.replace("json", "", 1).strip()
            break

start = output.find("{")
end = output.rfind("}") + 1
if start == -1 or end == 0:
    print(f"[writer] SKIP: no JSON: {output[:80]}")
    sb.table("news").update({"rewritten": True}).eq("id", article["id"]).execute()
    sys.exit(0)

try:
    parsed = json.loads(output[start:end])
except json.JSONDecodeError:
    print(f"[writer] SKIP: bad JSON")
    sb.table("news").update({"rewritten": True}).eq("id", article["id"]).execute()
    sys.exit(0)

update = {"rewritten": True}
for key in ["title_en", "title_fr", "title_de", "summary_en", "summary_fr", "summary_de", "category"]:
    if parsed.get(key):
        update[key] = parsed[key]

sb.table("news").update(update).eq("id", article["id"]).execute()
print(f"[writer] updated {article['slug']} ({len(update)-1} fields, scraped={bool(scraped_text)})")
