#!/usr/bin/env python3
"""
CretePulse - Daily Telegram briefing
Reads Supabase data and sends a formatted summary to the Telegram channel.
Cron: 30 7 * * *  (every day at 07:30 Athens time)
"""

import os
import sys
import json
from datetime import datetime, timezone, date
from dotenv import load_dotenv
from supabase import create_client
from kairos_telegram import send, Bot

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

# Cities to highlight in the weather line (must match city_slug in DB)
HEADLINE_CITIES = ["heraklion", "chania", "ierapetra"]

WEATHER_EMOJI = {
    # WMO weather codes -> emoji
    0: "☀️", 1: "🌤", 2: "⛅", 3: "☁️",
    45: "🌫", 48: "🌫",
    51: "🌦", 53: "🌦", 55: "🌧",
    61: "🌧", 63: "🌧", 65: "⛈",
    71: "🌨", 73: "❄️",
    80: "🌦", 95: "⛈",
}


def get_weather_emoji(code: int) -> str:
    return WEATHER_EMOJI.get(code, "🌡")


def send_telegram_message(text: str) -> bool:
    """Send a message via the kairos_telegram module (thin wrapper for backward compat)."""
    return send(Bot.PLUME, "Crete Daily", text)


def fetch_weather(supabase) -> dict:
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
        return {}


def fetch_latest_news(supabase, limit: int = 3) -> list:
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
        return []


def fetch_next_event(supabase) -> dict | None:
    """Fetch the next upcoming event (if events table exists)."""
    today = date.today().isoformat()
    try:
        result = (
            supabase.table("events")
            .select("title_en,start_date,location")
            .gte("start_date", today)
            .order("start_date")
            .limit(1)
            .execute()
        )
        rows = result.data or []
        return rows[0] if rows else None
    except Exception as e:
        # Events table may not exist yet, silent skip
        print(f"[telegram] INFO: no events table or query error: {e}")
        return None


def format_date_header() -> str:
    """Format today's date in a readable way, e.g. March 25, 2026."""
    now = datetime.now(timezone.utc)
    return now.strftime("%B %-d, %Y")


def build_message(weather: dict, news: list, next_event: dict | None) -> str:
    lines = []

    # Header
    date_str = format_date_header()
    lines.append(f"<b>🌊 Crete Today - {date_str}</b>")
    lines.append("")

    # Weather line
    weather_parts = []
    for slug in HEADLINE_CITIES:
        if slug in weather:
            w = weather[slug]
            emoji = get_weather_emoji(w.get("weather_code", 0))
            weather_parts.append(f"{w['city_name']} {w['temp_c']}°C {emoji}")
    if weather_parts:
        lines.append("🌡 <b>Weather:</b> " + " | ".join(weather_parts))
    else:
        lines.append("🌡 <i>Weather data unavailable</i>")

    lines.append("")

    # News
    if news:
        lines.append("📰 <b>Latest:</b>")
        for article in news:
            title = article.get("title_en") or article.get("title_el") or "No title"
            url = article.get("source_url", "")
            if url:
                lines.append(f'- <a href="{url}">{title}</a>')
            else:
                lines.append(f"- {title}")
    else:
        lines.append("📰 <i>No recent news</i>")

    # Next event (optional)
    if next_event:
        lines.append("")
        ev_title = next_event.get("title_en", "")
        ev_date = next_event.get("start_date", "")
        ev_loc = next_event.get("location", "")
        event_line = f"📅 <b>Next event:</b> {ev_title}"
        if ev_date:
            event_line += f" — {ev_date}"
        if ev_loc:
            event_line += f" ({ev_loc})"
        lines.append(event_line)

    lines.append("")
    lines.append("🔗 <a href=\"https://cretepulse.com\">cretepulse.com</a>")

    return "\n".join(lines)


def main():
    started_at = datetime.now(timezone.utc)
    print(f"[telegram] {started_at.isoformat()} - building daily briefing")

    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    weather = fetch_weather(supabase)
    news = fetch_latest_news(supabase, limit=3)
    next_event = fetch_next_event(supabase)

    print(f"[telegram] weather cities loaded: {list(weather.keys())}")
    print(f"[telegram] news articles: {len(news)}")
    print(f"[telegram] next event: {next_event}")

    message = build_message(weather, news, next_event)
    print("[telegram] message preview:")
    print("---")
    print(message)
    print("---")

    ok = send_telegram_message(message)

    elapsed = (datetime.now(timezone.utc) - started_at).total_seconds()
    print(f"[telegram] done in {elapsed:.1f}s - success={ok}")

    if not ok:
        sys.exit(1)


if __name__ == "__main__":
    main()
