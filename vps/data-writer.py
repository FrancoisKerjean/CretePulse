#!/opt/cretepulse/venv/bin/python3
"""Crete Direct Editorial Writer - creates ORIGINAL investigative/analytical articles.
Alternates between data-driven reports and editorial analysis.
Runs as part of the 5-min cron cycle (1 in 5 invocations).
"""
import json, os, subprocess, sys, random
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
if not SUPABASE_URL or not SUPABASE_KEY:
    print("[editorial] ERROR: missing env vars"); sys.exit(1)

from supabase import create_client
sb = create_client(SUPABASE_URL, SUPABASE_KEY)

now = datetime.now(timezone.utc)
today = now.strftime("%Y-%m-%d")

# Run every 6 hours (0, 6, 12, 18) to produce ~4 articles/day
# Only fire at :00 of those hours
if now.hour not in (6, 10, 14, 18) or now.minute >= 5:
    sys.exit(0)

print(f"[editorial] {now.isoformat()} - generating editorial article")

# Gather live data
weather = sb.table("weather_cache").select("*").execute().data or []
wx = {}
for w in weather:
    d = json.loads(w["data"]) if isinstance(w["data"], str) else w["data"]
    wx[w["city_slug"]] = d

events = sb.table("events").select("*").gte("date_start", today).order("date_start").limit(5).execute().data or []

# EDITORIAL TOPICS - rotate through the day
TOPICS = [
    {
        "slug_prefix": "weather-report",
        "category": "weather",
        "prompt_type": "daily_weather",
        "data_fn": lambda: f"Temperatures: {', '.join(f'{v.get(\"name\")}: {v.get(\"temp\")}C wind:{v.get(\"wind_speed\")}km/h sea:{v.get(\"sea_temp\")}C' for v in wx.values())}. Date: {today}.",
        "instruction": "Write a practical daily weather report for Crete. Include which coast is best today based on wind, sea swimming conditions, and any weather warnings. Make it useful for someone deciding what to do today.",
    },
    {
        "slug_prefix": "beach-conditions",
        "category": "weather",
        "prompt_type": "beach_report",
        "data_fn": lambda: f"Wind data: {', '.join(f'{v.get(\"name\")}: wind {v.get(\"wind_speed\")}km/h sea {v.get(\"sea_temp\")}C' for v in wx.values())}",
        "instruction": "Write a beach conditions report. Recommend specific beaches for today based on wind direction and speed. South coast vs north coast. Which beaches are sheltered, which are dangerous. Practical advice for swimmers and families.",
    },
    {
        "slug_prefix": "tourism-trends",
        "category": "economy",
        "prompt_type": "analysis",
        "data_fn": lambda: "Crete received 6.6M visitors in 2025 (+18% UK searches for 2026). Kastelli airport 67% complete, opening 2028, capacity 10M passengers. East Crete median Airbnb ADR: Makrigialos 110EUR, Ierapetra 82EUR, Elounda 135EUR for 2-bedroom. Season: May-October. Chania avg 3000EUR/m2, east Crete 20-30% cheaper.",
        "instruction": "Write an analytical piece about tourism trends in Crete for 2026. Use the data provided. Discuss: Kastelli airport impact, east vs west pricing gap, UK market growth. Be analytical, not promotional. Include numbers. This is a data journalism piece, not a blog post.",
    },
    {
        "slug_prefix": "real-estate-pulse",
        "category": "economy",
        "prompt_type": "analysis",
        "data_fn": lambda: "Crete property market data: Average Crete 2,456EUR/m2 (Indomio 2025). Chania ~3,000EUR/m2. East Crete below average. 12,340 active Airbnb listings across island. Median ADR 2-bedroom: Elounda 135EUR, Makrigialos 110EUR, Agios Nikolaos 106EUR, Sitia 103EUR, Ierapetra 82EUR. Kastelli airport opening 2028 expected to increase east Crete property values. Golden Visa threshold: 800,000EUR for Crete (Zone A).",
        "instruction": "Write a real estate market pulse article for Crete. Analyze price trends, rental yields by zone, impact of Kastelli airport on property values. Compare east vs west. Who is buying (UK, German, French investors). Be factual, cite numbers, no guarantees. This is financial journalism.",
    },
    {
        "slug_prefix": "events-roundup",
        "category": "culture",
        "prompt_type": "roundup",
        "data_fn": lambda: f"Upcoming events: {'; '.join(f'{e.get(\"title_en\",\"?\")} on {e.get(\"date_start\",\"?\")} at {e.get(\"location_name\",\"?\")} ({e.get(\"category\",\"?\")})' for e in events[:5]) if events else 'No upcoming events'}",
        "instruction": "Write a 'what to do this week in Crete' roundup. Cover the events listed, add context about each (why it matters, what to expect, how to get there). Write it like a local friend recommending things, not a tourism board.",
    },
    {
        "slug_prefix": "geopolitics-crete",
        "category": "politics",
        "prompt_type": "analysis",
        "data_fn": lambda: "USS Gerald R. Ford aircraft carrier docked in Souda Bay, Crete for repairs in March 2026 after Middle East deployment. Crete hosts NATO naval base at Souda Bay. Greece is key NATO Mediterranean partner. 6.6M tourists visit Crete annually. Middle East tensions affect Eastern Mediterranean shipping and tourism perception.",
        "instruction": "Write an analytical piece about how geopolitical tensions in the Eastern Mediterranean affect Crete. Cover: NATO base at Souda Bay, military presence, impact on tourism perception, shipping routes. Be balanced and factual. This is geopolitical analysis, not scaremongering. Reassure where data supports it (tourism numbers are UP despite tensions).",
    },
    {
        "slug_prefix": "crete-predictions",
        "category": "economy",
        "prompt_type": "predictive",
        "data_fn": lambda: "Historical: Crete tourism grew every year 2020-2025. 2025: 6.6M visitors. Kastelli airport opens 2028 (10M capacity vs current HER 10M). East Crete currently underserved. UK searches +18% for 2026. Property prices rising 10-15%/year in popular areas. 12,340 Airbnb listings currently. Short-term rental regulation tightening (Law 5170/2025).",
        "instruction": "Write a predictive analysis: 'What Crete will look like in 2030'. Cover: Kastelli impact, property price trajectory, tourism volume predictions, east Crete development, regulatory changes. Use the data to make informed projections (not guarantees). Label predictions clearly as projections. This is forward-looking journalism.",
    },
]

# Pick topic based on day + hour
topic_idx = (int(today.replace("-", "")) + now.hour) % len(TOPICS)
topic = TOPICS[topic_idx]

slug = f"{topic['slug_prefix']}-{today}-{now.hour:02d}"

# Check if already generated this slot
existing = sb.table("news").select("id").eq("slug", slug).execute()
if existing.data:
    print(f"[editorial] already generated {slug}")
    sys.exit(0)

data_context = topic["data_fn"]()

prompt = f"""You are a senior journalist for Crete Direct (crete.direct), an independent local news site.

Write an ORIGINAL editorial article. This is NOT a rewrite of someone else's article. This is YOUR analysis based on real data.

Topic: {topic['instruction']}

Real data to use: {data_context}

CRITICAL RULES:
- Use ONLY the data provided. Do not invent statistics or quotes.
- Write 3-4 paragraphs per language (250-350 words). This is a substantial article, not a brief.
- Structure with HTML: <h2> for subheadings, <p> for paragraphs, <strong> for key numbers.
- English: authoritative newspaper style (Financial Times, not BuzzFeed).
- French: MANDATORY accents. Style Le Monde, phrases precises, chiffres concrets.
- German: Nachrichtenstil, sachlich.
- Make it click-worthy but NOT clickbait. The headline should make you want to read.
- Include a surprising or counter-intuitive angle if the data supports it.

Category: {topic['category']}

Return ONLY JSON:
{{"title_en":"...","title_fr":"...","title_de":"...","summary_en":"<h2>...</h2><p>...</p><p>...</p>","summary_fr":"<h2>...</h2><p>...</p><p>...</p>","summary_de":"<h2>...</h2><p>...</p><p>...</p>","category":"{topic['category']}"}}"""

try:
    result = subprocess.run(
        ["claude", "-p", prompt, "--model", "haiku"],
        capture_output=True, text=True, timeout=120
    )
    output = result.stdout.strip()
except Exception as e:
    print(f"[editorial] ERROR: {e}")
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
    print(f"[editorial] ERROR: no JSON: {output[:100]}")
    sys.exit(1)

try:
    parsed = json.loads(output[start:end])
except json.JSONDecodeError:
    print(f"[editorial] ERROR: bad JSON")
    sys.exit(1)

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
    "category": parsed.get("category", topic["category"]),
    "rewritten": True,
}

sb.table("news").insert(row).execute()
print(f"[editorial] CREATED: {slug}")
print(f"[editorial] {parsed.get('title_en', '?')}")
