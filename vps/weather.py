#!/usr/bin/env python3
"""
CretePulse - Hourly weather updater
Fetches Open-Meteo data for 10 Crete cities and upserts into Supabase.
Cron: 0 * * * *  (every hour)
"""

import os
import sys
import json
import urllib.request
import urllib.error
from datetime import datetime, timezone
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

CITIES = [
    {"name": "Heraklion",    "slug": "heraklion",    "name_el": "Ηράκλειο",      "lat": 35.34, "lng": 25.13},
    {"name": "Chania",       "slug": "chania",        "name_el": "Χανιά",          "lat": 35.51, "lng": 24.02},
    {"name": "Rethymno",     "slug": "rethymno",      "name_el": "Ρέθυμνο",        "lat": 35.37, "lng": 24.47},
    {"name": "Ag. Nikolaos", "slug": "ag-nikolaos",   "name_el": "Αγ. Νικόλαος",  "lat": 35.19, "lng": 25.72},
    {"name": "Ierapetra",    "slug": "ierapetra",     "name_el": "Ιεράπετρα",      "lat": 35.01, "lng": 25.74},
    {"name": "Sitia",        "slug": "sitia",         "name_el": "Σητεία",          "lat": 35.21, "lng": 26.10},
    {"name": "Makrigialos",  "slug": "makrigialos",   "name_el": "Μακρύγιαλος",    "lat": 35.03, "lng": 25.97},
    {"name": "Elounda",      "slug": "elounda",       "name_el": "Ελούντα",         "lat": 35.26, "lng": 25.73},
    {"name": "Hersonissos",  "slug": "hersonissos",   "name_el": "Χερσόνησος",      "lat": 35.31, "lng": 25.38},
    {"name": "Malia",        "slug": "malia",         "name_el": "Μάλια",           "lat": 35.29, "lng": 25.46},
]

WEATHER_LABELS = {
    0: "Clear", 1: "Mostly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Foggy", 48: "Rime fog", 51: "Light drizzle", 53: "Drizzle",
    55: "Heavy drizzle", 61: "Light rain", 63: "Rain", 65: "Heavy rain",
    71: "Light snow", 73: "Snow", 80: "Rain showers", 95: "Thunderstorm",
}


def fetch_json(url: str) -> dict | list | None:
    try:
        with urllib.request.urlopen(url, timeout=15) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.URLError as e:
        print(f"[weather] HTTP error fetching {url}: {e}")
        return None
    except Exception as e:
        print(f"[weather] Unexpected error fetching {url}: {e}")
        return None


def build_weather_url() -> str:
    lats = ",".join(str(c["lat"]) for c in CITIES)
    lngs = ",".join(str(c["lng"]) for c in CITIES)
    params = (
        f"latitude={lats}&longitude={lngs}"
        "&current=temperature_2m,wind_speed_10m,wind_direction_10m,"
        "weather_code,uv_index,precipitation"
        "&timezone=Europe/Athens"
    )
    return f"https://api.open-meteo.com/v1/forecast?{params}"


def build_marine_url() -> str:
    lats = ",".join(str(c["lat"]) for c in CITIES)
    lngs = ",".join(str(c["lng"]) for c in CITIES)
    params = (
        f"latitude={lats}&longitude={lngs}"
        "&current=sea_surface_temperature,wave_height"
        "&timezone=Europe/Athens"
    )
    return f"https://marine-api.open-meteo.com/v1/marine?{params}"


def main():
    started_at = datetime.now(timezone.utc)
    print(f"[weather] {started_at.isoformat()} - starting weather update for {len(CITIES)} cities")

    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    # Fetch weather data
    weather_data = fetch_json(build_weather_url())
    if weather_data is None:
        print("[weather] FATAL: could not fetch weather data, aborting")
        sys.exit(1)

    # Fetch marine data (optional)
    marine_data = fetch_json(build_marine_url())
    if marine_data is None:
        print("[weather] WARNING: marine data unavailable, continuing without it")

    # Normalize to list (single city returns dict, multiple returns list)
    if isinstance(weather_data, dict):
        weather_list = [weather_data]
    else:
        weather_list = weather_data

    if marine_data is not None:
        if isinstance(marine_data, dict):
            marine_list = [marine_data]
        else:
            marine_list = marine_data
    else:
        marine_list = [None] * len(CITIES)

    now_iso = started_at.isoformat()
    upserted = 0
    errors = 0

    for i, city in enumerate(CITIES):
        try:
            current = weather_list[i].get("current", {}) if i < len(weather_list) else {}
            marine = (
                marine_list[i].get("current", {})
                if marine_list[i] is not None and i < len(marine_list)
                else {}
            )

            weather_code = current.get("weather_code", 0)
            sea_temp_raw = marine.get("sea_surface_temperature")
            wave_raw = marine.get("wave_height")

            row = {
                "city_slug": city["slug"],
                "city_name": city["name"],
                "city_name_el": city["name_el"],
                "lat": city["lat"],
                "lng": city["lng"],
                "temp_c": round(current.get("temperature_2m", 0)),
                "wind_speed_kmh": round(current.get("wind_speed_10m", 0)),
                "wind_direction_deg": current.get("wind_direction_10m", 0),
                "weather_code": weather_code,
                "weather_label": WEATHER_LABELS.get(weather_code, "Unknown"),
                "uv_index": round(current.get("uv_index", 0)),
                "precipitation_mm": current.get("precipitation", 0),
                "sea_temp_c": round(sea_temp_raw) if sea_temp_raw is not None else None,
                "wave_height_m": wave_raw,
                "fetched_at": now_iso,
            }

            supabase.table("weather_cache").upsert(
                row,
                on_conflict="city_slug"
            ).execute()

            upserted += 1
            print(f"[weather] {city['name']}: {row['temp_c']}°C, code={weather_code}, sea={row['sea_temp_c']}°C, wave={row['wave_height_m']}m")

        except Exception as e:
            errors += 1
            print(f"[weather] ERROR upserting {city['name']}: {e}")

    elapsed = (datetime.now(timezone.utc) - started_at).total_seconds()
    print(f"[weather] done - {upserted} upserted, {errors} errors, {elapsed:.1f}s elapsed")

    if errors > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
