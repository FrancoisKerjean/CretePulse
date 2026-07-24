#!/usr/bin/env python3
"""Push the HCAA 2025 data article into crete.direct Supabase as draft."""
import json
import os
import sys
import re
import urllib.request

import markdown

MD_PATH = "C:/Users/fkerj/cretepulse-build/docs/articles/crete-airports-2025-passenger-data.md"
ENV_PATH = "C:/Users/fkerj/cretepulse-build/.env.local"

# Load env
env = {}
with open(ENV_PATH, "r", encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")

SUPA_URL = env["NEXT_PUBLIC_SUPABASE_URL"]
SUPA_KEY = os.environ.get("CRETEPULSE_SERVICE_KEY") or env.get("SUPABASE_SERVICE_ROLE_KEY") or env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]

# Read markdown
with open(MD_PATH, "r", encoding="utf-8") as f:
    raw = f.read()

# Split frontmatter and body
m = re.match(r"^---\n(.*?)\n---\n(.*)$", raw, re.DOTALL)
if not m:
    print("ERR: no frontmatter found", file=sys.stderr)
    sys.exit(1)

frontmatter_text = m.group(1)
body_md = m.group(2).strip()

# Parse very simple frontmatter (YAML subset)
fm = {}
current_list = None
current_key = None
for line in frontmatter_text.split("\n"):
    if not line.strip():
        continue
    if line.startswith("  - "):
        if current_list is not None:
            current_list.append(line[4:].strip().strip('"'))
        continue
    if ":" in line and not line.startswith(" "):
        k, _, v = line.partition(":")
        k = k.strip()
        v = v.strip().strip('"')
        if v == "":
            fm[k] = []
            current_list = fm[k]
            current_key = k
        else:
            fm[k] = v
            current_list = None
            current_key = None

slug = fm.get("slug", "crete-airports-2025-passenger-data")
meta_title = fm.get("meta_title", "")
meta_desc = fm.get("meta_desc", "")
keywords = fm.get("keywords", []) if isinstance(fm.get("keywords"), list) else []

# Add id="..." anchors to H2 headers so the ToC works
def slugify(text: str) -> str:
    s = text.lower()
    s = re.sub(r"[^a-z0-9\s-]", "", s)
    s = re.sub(r"\s+", "-", s).strip("-")
    return s

# Convert markdown to HTML with tables extension
html = markdown.markdown(body_md, extensions=["tables", "fenced_code", "attr_list"])

# Add id attributes to h2 if missing
def add_h2_ids(match):
    full = match.group(0)
    inner = match.group(1)
    if "id=" in full[:30]:
        return full
    plain = re.sub(r"<[^>]+>", "", inner)
    return f'<h2 id="{slugify(plain)}">{inner}</h2>'

html = re.sub(r"<h2>(.*?)</h2>", add_h2_ids, html, flags=re.DOTALL)

# Estimate read time (200 wpm)
words = len(re.findall(r"\w+", body_md))
read_time = max(1, round(words / 200))

# Build payload
payload = {
    "slug": slug,
    "format": "long",
    "category": "data",
    "keywords": keywords,
    "titles": {"en": meta_title.replace('"', "")},
    "meta_descs": {"en": meta_desc.replace('"', "")},
    "contents": {"en": html},
    "faqs": None,
    "image_url": "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1200&q=80",
    "read_time": read_time,
    "status": "draft",
    "published_at": "2026-06-02T20:30:00+00:00",
}

# POST to Supabase
url = f"{SUPA_URL}/rest/v1/guides"
data = json.dumps(payload).encode("utf-8")
req = urllib.request.Request(
    url,
    data=data,
    method="POST",
    headers={
        "apikey": SUPA_KEY,
        "Authorization": f"Bearer {SUPA_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    },
)

try:
    with urllib.request.urlopen(req, timeout=30) as resp:
        body = resp.read().decode("utf-8")
        print(f"HTTP {resp.status}")
        result = json.loads(body)
        if isinstance(result, list) and result:
            row = result[0]
            print(f"INSERTED slug={row.get('slug')} id={row.get('id')} status={row.get('status')} category={row.get('category')} format={row.get('format')}")
            print(f"read_time={row.get('read_time')} words={words}")
            print(f"titles.en len={len(row.get('titles',{}).get('en',''))}")
            print(f"meta_descs.en len={len(row.get('meta_descs',{}).get('en',''))}")
            print(f"contents.en len={len(row.get('contents',{}).get('en',''))} (chars HTML)")
        else:
            print(body[:500])
except urllib.error.HTTPError as e:
    print(f"HTTP ERROR {e.code}: {e.read().decode('utf-8')[:500]}", file=sys.stderr)
    sys.exit(2)
except Exception as e:
    print(f"ERR: {e}", file=sys.stderr)
    sys.exit(3)
