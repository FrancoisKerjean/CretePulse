#!/opt/cretepulse/venv/bin/python3
"""Crete Direct Data-Driven Writer - creates ORIGINAL articles from our data.
Runs every 30 min, alternates with the news writer.
Generates unique articles nobody else has: weather trends, beach conditions, event roundups.
"""
import json, os, subprocess, sys, random, hashlib
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
if not SUPABASE_URL or not SUPABASE_KEY:
    print("[data-writer] ERROR: missing env vars"); sys.exit(1)

from supabase import create_client
sb = create_client(SUPABASE_URL, SUPABASE_KEY)

now = datetime.now(timezone.utc)
today = now.strftime("%Y-%m-%d")
hour = now.hour

# Only run every 5th invocation (so ~once per 25 min if cron is every 5 min)
# Use hour + minute to decide
if (now.minute // 5) % 5 != 0:
    print(f"[data-writer] skip (not our turn)")
    sys.exit(0)

print(f"[data-writer] {now.isoformat()} - generating data-driven article")

# Gather data from Supabase
weather = sb.table("weather_cache").select("*").execute().data or []
events = sb.table("events").select("*").gte("date_start", today).order("date_start").limit(5).execute().data or []

# Parse weather data
wx = {}
for w in weather:
    d = json.loads(w["data"]) if isinstance(w["data"], str) else w["data"]
    wx[w["city_slug"]] = d

# Pick a topic based on time of day
topics = [
    "weather_roundup",
    "beach_conditions",
    "weekly_events",
    "temperature_comparison",
]
topic = topics[hour % len(topics)]

# Build the data context
if topic == "weather_roundup":
    temps = ", ".join(f"{v.get('name','?')}: {v.get('temp','?')}°C" for v in wx.values())
    data_context = f"Current temperatures across Crete: {temps}. Date: {today}."
    article_type = "Weather roundup for Crete today"

elif topic == "beach_conditions":
    windy = [f"{v['name']} ({v.get('wind_speed',0)} km/h)" for v in wx.values() if v.get("wind_speed", 0) > 15]
    calm = [f"{v['name']} ({v.get('wind_speed',0)} km/h)" for v in wx.values() if v.get("wind_speed", 0) < 10]
    sea_temps = [f"{v['name']}: {v.get('sea_temp','?')}°C" for v in wx.values() if v.get("sea_temp")]
    data_context = f"Windy areas: {', '.join(windy) or 'none'}. Calm areas: {', '.join(calm) or 'none'}. Sea temperatures: {', '.join(sea_temps)}. Date: {today}."
    article_type = "Beach conditions report for Crete today"

elif topic == "weekly_events":
    if events:
        evt_list = "; ".join(f"{e.get('title_en','?')} on {e.get('date_start','?')} at {e.get('location_name','?')}" for e in events[:5])
        data_context = f"Upcoming events in Crete: {evt_list}."
    else:
        data_context = "No upcoming events found in the database."
    article_type = "This week's events in Crete"

elif topic == "temperature_comparison":
    if wx:
        hottest = max(wx.values(), key=lambda v: v.get("temp", 0))
        coldest = min(wx.values(), key=lambda v: v.get("temp", 0))
        data_context = f"Hottest: {hottest.get('name','?')} at {hottest.get('temp','?')}°C. Coldest: {coldest.get('name','?')} at {coldest.get('temp','?')}°C. Average sea temp: {sum(v.get('sea_temp',0) or 0 for v in wx.values()) / max(len(wx),1):.1f}°C. Date: {today}."
    else:
        data_context = "No weather data available."
    article_type = "Temperature comparison across Crete"

# Generate unique slug
slug = f"{topic.replace('_','-')}-{today}"

# Check if already generated today
existing = sb.table("news").select("id").eq("slug", slug).execute()
if existing.data:
    print(f"[data-writer] already generated {slug} today")
    sys.exit(0)

# Call Claude
prompt = f"""You are a data journalist for Crete Direct (crete.direct).

Write an ORIGINAL short article based on REAL DATA from our sensors and database.

Article type: {article_type}
Real data: {data_context}

RULES:
- Use ONLY the data provided above. Do not invent additional data.
- Write 2-3 paragraphs per language (EN, FR, DE). 150-200 words max per language.
- Make it interesting and useful for locals and tourists.
- French: ALL accents mandatory (é, è, à, ê, ç, etc.)
- No em dashes.
- Add practical advice based on the data (e.g. "south coast beaches are your best bet today")

Category: weather (for weather/beach) or culture (for events)

Return ONLY JSON:
{{"title_en":"...","title_fr":"...","title_de":"...","summary_en":"<p>...</p><p>...</p>","summary_fr":"<p>...</p><p>...</p>","summary_de":"<p>...</p><p>...</p>","category":"weather"}}"""

try:
    result = subprocess.run(
        ["claude", "-p", prompt, "--model", "haiku"],
        capture_output=True, text=True, timeout=90
    )
    output = result.stdout.strip()
except Exception as e:
    print(f"[data-writer] ERROR: {e}")
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
    print(f"[data-writer] ERROR: no JSON: {output[:80]}")
    sys.exit(1)

try:
    parsed = json.loads(output[start:end])
except json.JSONDecodeError:
    print(f"[data-writer] ERROR: bad JSON")
    sys.exit(1)

# Insert as new article (not a rewrite, original content)
row = {
    "slug": slug,
    "title_en": parsed.get("title_en", ""),
    "title_fr": parsed.get("title_fr", ""),
    "title_de": parsed.get("title_de", ""),
    "title_el": parsed.get("title_en", ""),
    "summary_en": parsed.get("summary_en", ""),
    "summary_fr": parsed.get("summary_fr", ""),
    "summary_de": parsed.get("summary_de", ""),
    "summary_el": "",
    "source_url": f"https://crete.direct/en/news/{slug}",
    "source_name": "Crete Direct",
    "published_at": now.isoformat(),
    "category": parsed.get("category", "weather"),
    "rewritten": True,
}

sb.table("news").insert(row).execute()
print(f"[data-writer] CREATED original article: {slug}")
print(f"[data-writer] title: {parsed.get('title_en', '?')}")
