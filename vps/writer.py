#!/opt/cretepulse/venv/bin/python3
"""CretePulse AI Writer - rewrites news articles using Claude Code CLI.
Picks one unprocessed article, rewrites in EN/FR/DE, updates Supabase.
Cron: */30 * * * *
"""
import json, os, subprocess, sys
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
if not SUPABASE_URL or not SUPABASE_KEY:
    print("[writer] ERROR: missing env vars"); sys.exit(1)

from supabase import create_client
sb = create_client(SUPABASE_URL, SUPABASE_KEY)

now = datetime.now(timezone.utc).isoformat()
print(f"[writer] {now} - looking for unprocessed article")

# Find an article that hasn't been rewritten yet (summary_en is null or very short)
data = sb.table("news").select("id,slug,title_el,title_en,summary_el,source_url,source_name").order("published_at", desc=True).limit(30).execute()

article = None
for item in (data.data or []):
    s = item.get("summary_en") or ""
    if not item.get('rewritten', False):
        article = item
        break

if not article:
    print("[writer] no unprocessed articles found")
    sys.exit(0)

title = article.get("title_el") or article.get("title_en") or article.get("slug")
source = article.get("source_name") or "unknown"
print(f"[writer] processing: {article['slug']} (source: {source})")

# Build prompt
prompt = f"""You are a news writer for Crete Direct, a local Crete media site.

Rewrite this news headline into a short article (2-3 paragraphs, under 250 words per language) in English, French, and German.

Original headline: {title}
Source: {source}

Rules:
- Factual, direct, no fluff
- Write as a local Crete journalist
- You can expand on the headline with general context (this is news rewriting, not fabrication)
- French must have proper accents
- German must be correct
- No em dashes
- If the headline is in Greek, translate it first then write the article

Return ONLY valid JSON with these exact keys, no other text:
{{"title_en":"...","title_fr":"...","title_de":"...","summary_en":"...","summary_fr":"...","summary_de":"..."}}"""

# Call Claude Code CLI
try:
    result = subprocess.run(
        ["claude", "-p", prompt, "--model", "haiku"],
        capture_output=True, text=True, timeout=60
    )
    output = result.stdout.strip()
except subprocess.TimeoutExpired:
    print("[writer] ERROR: Claude timed out")
    sys.exit(1)
except Exception as e:
    print(f"[writer] ERROR: {e}")
    sys.exit(1)

# Extract JSON from output (Claude might add markdown fences)
if "```" in output:
    output = output.split("```")[1]
    if output.startswith("json"):
        output = output[4:]
    output = output.strip()

# Find the JSON object in the output
start = output.find("{")
end = output.rfind("}") + 1
if start == -1 or end == 0:
    print(f"[writer] ERROR: no JSON found in output: {output[:200]}")
    sys.exit(1)

try:
    parsed = json.loads(output[start:end])
except json.JSONDecodeError as e:
    print(f"[writer] ERROR: invalid JSON: {e}")
    print(f"[writer] raw output: {output[:300]}")
    sys.exit(1)

# Update Supabase
update = {}
for key in ["title_en", "title_fr", "title_de", "summary_en", "summary_fr", "summary_de"]:
    if parsed.get(key):
        update[key] = parsed[key]

if not update:
    print("[writer] ERROR: no valid fields in parsed output")
    sys.exit(1)

sb.table("news").update({**update, "rewritten": True}).eq("id", article["id"]).execute()
print(f"[writer] updated article {article['slug']} with {len(update)} fields")
print(f"[writer] done")
