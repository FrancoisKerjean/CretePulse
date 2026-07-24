#!/usr/bin/env python3
"""Patch /opt/cretepulse/telegram.py:
1. fetch_weather: read weather_cache.data (JSON blob) instead of non-existent
   flat columns temp_c/weather_code/city_name (cause of 'Weather data unavailable').
2. fetch_latest_news: only show TRANSLATED + categorised news (English), not raw
   Greek RSS titles.
Backs up the original first. Idempotent-ish (asserts old text present).
"""
import shutil, sys, time

PATH = "/opt/cretepulse/telegram.py"
shutil.copy(PATH, PATH + ".bak-20260609")
src = open(PATH, encoding="utf-8").read()

OLD_WEATHER = '''def fetch_weather(supabase) -> dict:
    """Fetch weather rows for headline cities, keyed by slug."""
    try:
        result = (
            supabase.table("weather_cache")
            .select("city_slug,city_name,temp_c,weather_code")
            .in_("city_slug", HEADLINE_CITIES)
            .execute()
        )
        return {row["city_slug"]: row for row in (result.data or [])}
    except Exception as e:
        print(f"[telegram] WARNING: could not fetch weather: {e}")
        return {}'''

NEW_WEATHER = '''def fetch_weather(supabase) -> dict:
    """Fetch weather for headline cities from weather_cache.data (JSON blob).

    weather.py upserts a single `data` JSON column (name/temp/weather_code/...),
    not flat columns, so we read and unwrap it here.
    """
    import json as _json
    try:
        result = (
            supabase.table("weather_cache")
            .select("city_slug,data")
            .in_("city_slug", HEADLINE_CITIES)
            .execute()
        )
        out = {}
        for row in (result.data or []):
            data = row.get("data") or {}
            if isinstance(data, str):
                data = _json.loads(data)
            temp = data.get("temp")
            out[row["city_slug"]] = {
                "city_name": data.get("name") or row["city_slug"].title(),
                "temp_c": round(temp) if temp is not None else None,
                "weather_code": data.get("weather_code", 0),
            }
        return out
    except Exception as e:
        print(f"[telegram] WARNING: could not fetch weather: {e}")
        return {}'''

OLD_NEWS = '''def fetch_latest_news(supabase, limit: int = 3) -> list:
    """Fetch the most recent news articles."""
    try:
        result = (
            supabase.table("news")
            .select("title_el,title_en,source_url")
            .order("published_at", desc=True)
            .limit(limit)
            .execute()
        )
        return result.data or []
    except Exception as e:
        print(f"[telegram] WARNING: could not fetch news: {e}")
        return []'''

NEW_NEWS = '''def fetch_latest_news(supabase, limit: int = 3) -> list:
    """Fetch the most recent TRANSLATED, categorised news (English).

    Raw scraped rows have empty title_en and NULL/`filtered` category; excluding
    them stops untranslated Greek titles from leaking into the recap.
    """
    try:
        result = (
            supabase.table("news")
            .select("title_en,source_url")
            .neq("title_en", "")
            .neq("category", "filtered")
            .order("published_at", desc=True)
            .limit(limit)
            .execute()
        )
        return result.data or []
    except Exception as e:
        print(f"[telegram] WARNING: could not fetch news: {e}")
        return []'''

for old, new, name in [(OLD_WEATHER, NEW_WEATHER, "fetch_weather"),
                       (OLD_NEWS, NEW_NEWS, "fetch_latest_news")]:
    if old not in src:
        print(f"!! ABORT: old {name} block not found verbatim — no change written")
        sys.exit(1)
    src = src.replace(old, new)

open(PATH, "w", encoding="utf-8").write(src)
print("patched telegram.py OK (backup .bak-20260609)")
