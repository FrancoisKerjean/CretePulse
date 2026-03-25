#!/opt/cretepulse/venv/bin/python3
"""Crete Direct AI Writer - rewrites news using Claude Code CLI.
Only processes Crete-related articles. Uses title + summary for context.
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

# Find an article that hasn't been rewritten yet
data = sb.table("news").select("id,slug,title_el,title_en,summary_el,source_url,source_name").eq("rewritten", False).order("published_at", desc=True).limit(1).execute()

article = (data.data or [None])[0]

if not article:
    print("[writer] no unprocessed articles found")
    sys.exit(0)

title = article.get("title_el") or article.get("title_en") or article.get("slug")
summary_el = article.get("summary_el") or ""
source = article.get("source_name") or "unknown"
source_url = article.get("source_url") or ""
print(f"[writer] processing: {article['slug']} (source: {source})")

# Build prompt with title AND summary for better context
prompt = f"""You are a local journalist for Crete Direct (crete.direct), an independent Crete news site.

Rewrite this Greek news article for our readers. Use the title AND the excerpt below.

Original title: {title}
Original excerpt: {summary_el[:500]}
Source: {source}

CRITICAL RULES:
- ONLY write about what the title and excerpt actually say. Do NOT invent details, context, or quotes.
- If the excerpt is empty, write a very short 2-sentence summary based on the title only.
- Write 2-3 short paragraphs per language (150-200 words max).
- Structure each language version with line breaks between paragraphs.
- English: clear, factual, newspaper style.
- French: MANDATORY — use ALL correct French accents. Every accented letter MUST be written correctly:
  é (e accent aigu): été, développement, économie, région, sécurité, autorité, réaliser, créer, etc.
  è (e accent grave): crète, première, après, problème, modèle, etc.
  à (a accent grave): à, là, déjà, voilà — especially "à la", "à l'", "à les", NOT just "a la"
  ê (e accent circumflex): être, fête, forêt, arrêté, etc.
  ô (o accent circumflex): côte, dépôt, rôle, etc.
  â (a accent circumflex): bâtiment, âge, etc.
  ç (cedilla): français, façon, leçon, etc.
  NEVER write: "autorite" (→autorité), "economique" (→économique), "developpement" (→développement),
  "region" (→région), "securite" (→sécurité), "Crete" (→Crète), "cle" (→clé),
  "operations" (→opérations), "definition" (→définition), "a l'" when meaning "à l'".
  Style: journal local, phrases courtes, faits concrets.
- German: korrekt, Nachrichtenstil.
- No em dashes. No editorializing. No "experts say" unless the source says it.
- If the article is not related to Crete at all, still write it but keep it very brief (2 sentences).

Also assign ONE category from this list: politics, economy, tourism, culture, sports, weather, environment, transport, health, local

Return ONLY this JSON, nothing else:
{{"title_en":"English headline","title_fr":"Titre francais avec accents","title_de":"Deutsche Uberschrift","summary_en":"<p>Paragraph 1</p><p>Paragraph 2</p>","summary_fr":"<p>Paragraphe 1</p><p>Paragraphe 2</p>","summary_de":"<p>Absatz 1</p><p>Absatz 2</p>","category":"one_word_category"}}"""

# Call Claude Code CLI
try:
    result = subprocess.run(
        ["claude", "-p", prompt, "--model", "haiku"],
        capture_output=True, text=True, timeout=90
    )
    output = result.stdout.strip()
except subprocess.TimeoutExpired:
    print("[writer] ERROR: Claude timed out")
    sb.table("news").update({"rewritten": True}).eq("id", article["id"]).execute()
    sys.exit(1)
except Exception as e:
    print(f"[writer] ERROR: {e}")
    sys.exit(1)

# Extract JSON from output
if "```" in output:
    parts = output.split("```")
    for part in parts:
        if "{" in part:
            output = part
            break
    if output.startswith("json"):
        output = output[4:]
    output = output.strip()

start = output.find("{")
end = output.rfind("}") + 1
if start == -1 or end == 0:
    print(f"[writer] SKIP: no JSON, marking done: {output[:80]}")
    sb.table("news").update({"rewritten": True}).eq("id", article["id"]).execute()
    sys.exit(0)

try:
    parsed = json.loads(output[start:end])
except json.JSONDecodeError as e:
    print(f"[writer] SKIP: bad JSON: {e}")
    sb.table("news").update({"rewritten": True}).eq("id", article["id"]).execute()
    sys.exit(0)

# Update Supabase
update = {"rewritten": True}
for key in ["title_en", "title_fr", "title_de", "summary_en", "summary_fr", "summary_de", "category"]:
    if parsed.get(key):
        update[key] = parsed[key]

sb.table("news").update(update).eq("id", article["id"]).execute()
print(f"[writer] updated {article['slug']} ({len(update)-1} fields)")
