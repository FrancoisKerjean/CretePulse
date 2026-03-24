#!/usr/bin/env python3
"""CretePulse - Weather cache updater. Runs hourly via cron."""
import json, os, sys, urllib.request
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
if not SUPABASE_URL or not SUPABASE_KEY:
    print("[weather] ERROR: missing env vars"); sys.exit(1)

from supabase import create_client
sb = create_client(SUPABASE_URL, SUPABASE_KEY)

CITIES = [
    {"name": "Heraklion", "slug": "heraklion", "lat": 35.34, "lng": 25.13},
    {"name": "Chania", "slug": "chania", "lat": 35.51, "lng": 24.02},
    {"name": "Rethymno", "slug": "rethymno", "lat": 35.37, "lng": 24.47},
    {"name": "Ag. Nikolaos", "slug": "ag-nikolaos", "lat": 35.19, "lng": 25.72},
    {"name": "Ierapetra", "slug": "ierapetra", "lat": 35.01, "lng": 25.74},
    {"name": "Sitia", "slug": "sitia", "lat": 35.21, "lng": 26.10},
    {"name": "Makrigialos", "slug": "makrigialos", "lat": 35.03, "lng": 25.97},
    {"name": "Elounda", "slug": "elounda", "lat": 35.26, "lng": 25.73},
    {"name": "Hersonissos", "slug": "hersonissos", "lat": 35.31, "lng": 25.38},
    {"name": "Malia", "slug": "malia", "lat": 35.29, "lng": 25.46},
]

lats = ",".join(str(c["lat"]) for c in CITIES)
lngs = ",".join(str(c["lng"]) for c in CITIES)

now = datetime.now(timezone.utc).isoformat()
print(f"[weather] {now} - fetching for {len(CITIES)} cities")

url = f"https://api.open-meteo.com/v1/forecast?latitude={lats}&longitude={lngs}&current=temperature_2m,wind_speed_10m,wind_direction_10m,weather_code,uv_index,precipitation&timezone=Europe/Athens"
weather_raw = json.loads(urllib.request.urlopen(url).read())

murl = f"https://marine-api.open-meteo.com/v1/marine?latitude={lats}&longitude={lngs}&current=sea_surface_temperature,wave_height&timezone=Europe/Athens"
try:
    marine_raw = json.loads(urllib.request.urlopen(murl).read())
except Exception:
    marine_raw = None

ok = err = 0
for i, city in enumerate(CITIES):
    try:
        w = weather_raw[i]["current"] if isinstance(weather_raw, list) else weather_raw["current"]
        m = (marine_raw[i]["current"] if marine_raw and isinstance(marine_raw, list) else None)

        sb.table("weather_cache").upsert({
            "city_slug": city["slug"],
            "data": json.dumps({
                "name": city["name"],
                "lat": city["lat"],
                "lng": city["lng"],
                "temp": w.get("temperature_2m"),
                "wind_speed": w.get("wind_speed_10m"),
                "wind_dir": w.get("wind_direction_10m"),
                "weather_code": w.get("weather_code"),
                "uv_index": w.get("uv_index"),
                "precipitation": w.get("precipitation"),
                "sea_temp": m.get("sea_surface_temperature") if m else None,
                "wave_height": m.get("wave_height") if m else None,
            }),
            "fetched_at": now,
        }, on_conflict="city_slug").execute()
        ok += 1
        print(f"  {city['name']}: {w.get('temperature_2m')}C")
    except Exception as e:
        err += 1
        print(f"  ERROR {city['name']}: {e}")

print(f"[weather] done - {ok} ok, {err} errors")
