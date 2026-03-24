#!/bin/bash
# CretePulse AI Writer - runs every 30 min via cron
# Uses Claude Code CLI (included in Max subscription)
# Reads latest RSS news, rewrites as a proper article, inserts into Supabase

set -euo pipefail
cd /opt/cretepulse
set -a && source .env && set +a
export SUPABASE_URL SUPABASE_SERVICE_KEY

# Get latest unprocessed RSS item from Supabase (summary is short = not yet rewritten)
ITEM=$(python3 -c "
from supabase import create_client
import os, json
sb = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_SERVICE_KEY'])
# Find a news item where summary_en is short (< 200 chars = just RSS excerpt, not a real article)
data = sb.table('news').select('id,slug,title_el,summary_el,source_url,source_name').order('published_at', desc=True).limit(20).execute()
for item in (data.data or []):
    s = item.get('summary_en') or ''
    if len(s) < 200:
        print(json.dumps(item))
        break
")

if [ -z "$ITEM" ]; then
    echo "[writer] $(date -Iseconds) - no unprocessed articles found"
    exit 0
fi

ID=$(echo "$ITEM" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
SLUG=$(echo "$ITEM" | python3 -c "import sys,json; print(json.load(sys.stdin)['slug'])")
TITLE=$(echo "$ITEM" | python3 -c "import sys,json; print(json.load(sys.stdin)['title_el'])")
SOURCE=$(echo "$ITEM" | python3 -c "import sys,json; print(json.load(sys.stdin)['source_name'])")

echo "[writer] $(date -Iseconds) - processing: $SLUG (source: $SOURCE)"

# Claude Code rewrites the article in EN and FR
RESULT=$(claude -p "You are a news writer for CretePulse, a Crete local media site.

Rewrite this Greek news headline into a proper short article (3-4 paragraphs) in English and French.

Headline: $TITLE
Source: $SOURCE

Rules:
- Factual, direct, no fluff
- Write as if you're a local Crete journalist
- Do NOT fabricate details you don't know
- French must have proper accents
- No em dashes
- Keep it under 300 words per language

Return ONLY valid JSON, no markdown, no explanation:
{\"title_en\": \"...\", \"title_fr\": \"...\", \"title_de\": \"...\", \"summary_en\": \"...\", \"summary_fr\": \"...\", \"summary_de\": \"...\"}" --model haiku 2>/dev/null)

# Parse and update Supabase
python3 -c "
import os, json, sys
from supabase import create_client

try:
    data = json.loads('''$RESULT''')
except:
    print('[writer] ERROR: Claude returned invalid JSON')
    sys.exit(1)

sb = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_SERVICE_KEY'])
sb.table('news').update({
    'title_en': data.get('title_en', ''),
    'title_fr': data.get('title_fr', ''),
    'title_de': data.get('title_de', ''),
    'summary_en': data.get('summary_en', ''),
    'summary_fr': data.get('summary_fr', ''),
    'summary_de': data.get('summary_de', ''),
}).eq('id', $ID).execute()
print(f'[writer] updated article $SLUG in EN/FR/DE')
"

echo "[writer] $(date -Iseconds) - done"
