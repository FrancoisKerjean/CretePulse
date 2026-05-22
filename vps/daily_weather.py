#!/usr/bin/env python3
"""CretePulse - Daily Crete-wide weather bulletin (morning).

Fetches the day's forecast from Open-Meteo for the reference cities + marine data,
asks Claude for an editorial EN bulletin, and publishes it into `guides` as an
/articles/[slug] page. Cron suggested: 30 6 * * * (06:30 Europe/Athens).
"""
import argparse
import json
import sys
import urllib.request
from dotenv import load_dotenv

import daily_common as dc

load_dotenv()

CITIES = [
    {"name": "Heraklion", "lat": 35.34, "lng": 25.13},
    {"name": "Chania", "lat": 35.51, "lng": 24.02},
    {"name": "Rethymno", "lat": 35.37, "lng": 24.47},
    {"name": "Ag. Nikolaos", "lat": 35.19, "lng": 25.72},
    {"name": "Ierapetra", "lat": 35.01, "lng": 25.74},
    {"name": "Sitia", "lat": 35.21, "lng": 26.10},
    {"name": "Makrigialos", "lat": 35.03, "lng": 25.97},
    {"name": "Elounda", "lat": 35.26, "lng": 25.73},
    {"name": "Hersonissos", "lat": 35.31, "lng": 25.38},
    {"name": "Malia", "lat": 35.29, "lng": 25.46},
]

# WMO weather codes -> short human label (Open-Meteo weather_code).
WMO = {
    0: "clear sky", 1: "mainly clear", 2: "partly cloudy", 3: "overcast",
    45: "fog", 48: "rime fog", 51: "light drizzle", 53: "drizzle", 55: "dense drizzle",
    56: "light freezing drizzle", 57: "dense freezing drizzle",
    61: "light rain", 63: "rain", 65: "heavy rain",
    66: "light freezing rain", 67: "heavy freezing rain",
    71: "light snow", 73: "snow", 75: "heavy snow", 77: "snow grains",
    80: "light rain showers", 81: "moderate rain showers", 82: "violent rain showers",
    85: "light snow showers", 86: "heavy snow showers",
    95: "thunderstorm", 96: "thunderstorm with hail", 99: "thunderstorm with hail",
}


def build_weather_block(forecast, marine, cities):
    """Pure transform: Open-Meteo daily forecast + marine -> compact per-city dicts."""
    out = []
    for i, c in enumerate(cities):
        d = (forecast[i] if isinstance(forecast, list) else forecast)["daily"]
        m = None
        if marine:
            m = marine[i] if isinstance(marine, list) else marine
        out.append({
            "city": c["name"],
            "tmax": d["temperature_2m_max"][0],
            "tmin": d["temperature_2m_min"][0],
            "precip": d["precipitation_sum"][0],
            "wind_max": d["wind_speed_10m_max"][0],
            "uv_max": d["uv_index_max"][0],
            "sky": WMO.get(d["weather_code"][0], "mixed conditions"),
            "sea_temp": (m["current"].get("sea_surface_temperature")
                         if m and m.get("current") else None),
            "wave_max": (m["daily"]["wave_height_max"][0]
                         if m and m.get("daily") else None),
        })
    return out


def fetch_forecast():
    lats = ",".join(str(c["lat"]) for c in CITIES)
    lngs = ",".join(str(c["lng"]) for c in CITIES)
    furl = (f"https://api.open-meteo.com/v1/forecast?latitude={lats}&longitude={lngs}"
            "&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,"
            "wind_speed_10m_max,uv_index_max,weather_code"
            "&timezone=Europe/Athens&forecast_days=1")
    forecast = json.loads(urllib.request.urlopen(furl, timeout=30).read())
    murl = (f"https://marine-api.open-meteo.com/v1/marine?latitude={lats}&longitude={lngs}"
            "&current=sea_surface_temperature&daily=wave_height_max"
            "&timezone=Europe/Athens&forecast_days=1")
    try:
        marine = json.loads(urllib.request.urlopen(murl, timeout=30).read())
    except Exception as e:
        print(f"[weather] marine fetch failed (non-fatal): {e}")
        marine = None
    return forecast, marine


def build_prompt(block, date_label):
    return f"""You are the weather editor of crete.direct, a Crete travel site. Write today's
Crete-wide weather bulletin for {date_label}, for tourists and residents, in English.

Per-city forecast data (Celsius, mm, km/h, UV index, sea temp C, max wave m):
{json.dumps(block, ensure_ascii=False, indent=2)}

Write an editorial bulletin (not a data table). Cover: island overview, north vs south
contrast, mountains, sea state / wind / UV, a clear swim verdict, one practical tip for the
day. Be factual, no sensationalism, no em dashes.

Return ONLY one valid JSON object:
{{
  "title": "max 65 chars, includes 'Crete' and the date",
  "meta_desc": "150-160 chars SEO description",
  "content": "HTML body: 350-500 words, use <h2 id=\\"slug\\"> sub-headings and <p>. No <h1>.",
  "faq": [{{"q": "...", "a": "..."}}, {{"q": "...", "a": "..."}}, {{"q": "...", "a": "..."}}],
  "read_time": integer minutes
}}"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="print, do not write to DB")
    args = ap.parse_args()

    today = dc.athens_now().date()
    slug = dc.daily_slug("crete-weather", today)
    date_label = today.strftime("%d %B %Y")

    try:
        forecast, marine = fetch_forecast()
    except Exception as e:
        dc.alert(f"daily_weather: Open-Meteo fetch failed, no bulletin today: {e}")
        print(f"[weather] FATAL fetch: {e}")
        sys.exit(1)

    try:
        block = build_weather_block(forecast, marine, CITIES)
        data = dc.claude_json(build_prompt(block, date_label), model="sonnet", label="weather")
        row = dc.build_guide_row(
            slug=slug, category="daily-weather",
            title_en=data["title"], meta_en=data["meta_desc"],
            content_html_en=data["content"], faq_en=data.get("faq", []),
            read_time=int(data.get("read_time", 3)),
        )
        sb = None if args.dry_run else dc.get_supabase()
        dc.publish(sb, row, dry_run=args.dry_run)
    except Exception as e:
        dc.alert(f"daily_weather: generation/publish failed: {e}")
        print(f"[weather] FATAL generate/publish: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
