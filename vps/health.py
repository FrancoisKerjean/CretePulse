#!/usr/bin/env python3
"""
CretePulse - Health check
Runs every 15 minutes. Silent on success, sends Telegram alert on failure.
Cron: */15 * * * *
"""

import os
import sys
import json
import urllib.request
import urllib.error
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
TELEGRAM_BOT_TOKEN = os.environ["TELEGRAM_BOT_TOKEN"]
TELEGRAM_CHANNEL_ID = os.environ["TELEGRAM_CHANNEL_ID"]

# Thresholds
WEATHER_MAX_AGE_HOURS = 2
NEWS_MAX_AGE_HOURS = 6
NEWS_QUIET_START = 22   # no news alert after 22h
NEWS_QUIET_END = 6      # no news alert before 6h (Athens time = UTC+3 in summer)


def send_alert(message: str) -> None:
    """Send a Telegram alert message."""
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = json.dumps({
        "chat_id": TELEGRAM_CHANNEL_ID,
        "text": f"🚨 <b>CretePulse Health Alert</b>\n\n{message}",
        "parse_mode": "HTML",
        "disable_web_page_preview": True,
    }).encode("utf-8")

    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            result = json.loads(resp.read().decode())
            if result.get("ok"):
                print("[health] alert sent via Telegram")
            else:
                print(f"[health] Telegram API error: {result}")
    except Exception as e:
        print(f"[health] could not send Telegram alert: {e}")


def check_supabase(supabase) -> tuple[bool, str]:
    """Check Supabase is accessible with a lightweight query."""
    try:
        supabase.table("weather_cache").select("city_slug").limit(1).execute()
        return True, "Supabase accessible"
    except Exception as e:
        return False, f"Supabase unreachable: {e}"


def check_weather_freshness(supabase) -> tuple[bool, str]:
    """Check that at least one weather_cache row was updated recently."""
    try:
        result = (
            supabase.table("weather_cache")
            .select("city_slug,fetched_at")
            .order("fetched_at", desc=True)
            .limit(1)
            .execute()
        )
        rows = result.data or []
        if not rows:
            return False, "weather_cache is empty"

        fetched_at_str = rows[0]["fetched_at"]
        # Handle both offset-aware and naive timestamps
        try:
            fetched_at = datetime.fromisoformat(fetched_at_str)
            if fetched_at.tzinfo is None:
                fetched_at = fetched_at.replace(tzinfo=timezone.utc)
        except Exception:
            return False, f"could not parse fetched_at: {fetched_at_str}"

        age = datetime.now(timezone.utc) - fetched_at
        if age > timedelta(hours=WEATHER_MAX_AGE_HOURS):
            return False, (
                f"weather_cache stale: last update {fetched_at_str} "
                f"({int(age.total_seconds() / 60)} min ago, threshold {WEATHER_MAX_AGE_HOURS}h)"
            )

        return True, f"weather fresh ({int(age.total_seconds() / 60)} min ago)"

    except Exception as e:
        return False, f"weather check error: {e}"


def check_news_freshness(supabase, now_utc: datetime) -> tuple[bool, str]:
    """Check that news was fetched recently (only during 6-22h Athens time)."""
    # Athens is UTC+3 in summer (EEST), UTC+2 in winter (EET)
    # For simplicity, use UTC+3 as approximation (Crete timezone)
    athens_hour = (now_utc.hour + 3) % 24

    if athens_hour < NEWS_QUIET_END or athens_hour >= NEWS_QUIET_START:
        return True, f"news check skipped (Athens hour={athens_hour}, quiet window)"

    try:
        result = (
            supabase.table("news")
            .select("created_at")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        rows = result.data or []
        if not rows:
            return False, "news table is empty"

        created_at_str = rows[0]["created_at"]
        try:
            created_at = datetime.fromisoformat(created_at_str)
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)
        except Exception:
            return False, f"could not parse news created_at: {created_at_str}"

        age = now_utc - created_at
        if age > timedelta(hours=NEWS_MAX_AGE_HOURS):
            return False, (
                f"news stale: last article {created_at_str} "
                f"({int(age.total_seconds() / 60)} min ago, threshold {NEWS_MAX_AGE_HOURS}h)"
            )

        return True, f"news fresh ({int(age.total_seconds() / 60)} min ago)"

    except Exception as e:
        return False, f"news check error: {e}"


def main():
    now = datetime.now(timezone.utc)
    print(f"[health] {now.isoformat()} - running health checks")

    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    checks = []

    ok_db, msg_db = check_supabase(supabase)
    checks.append((ok_db, msg_db, "supabase"))
    print(f"[health] supabase: {'OK' if ok_db else 'FAIL'} - {msg_db}")

    if ok_db:
        ok_weather, msg_weather = check_weather_freshness(supabase)
        checks.append((ok_weather, msg_weather, "weather"))
        print(f"[health] weather: {'OK' if ok_weather else 'FAIL'} - {msg_weather}")

        ok_news, msg_news = check_news_freshness(supabase, now)
        checks.append((ok_news, msg_news, "news"))
        print(f"[health] news: {'OK' if ok_news else 'FAIL'} - {msg_news}")

    failures = [(name, msg) for ok, msg, name in checks if not ok]

    if not failures:
        print("[health] all checks passed, silent exit")
        sys.exit(0)

    # Build alert message
    alert_lines = [f"Failed checks at {now.strftime('%Y-%m-%d %H:%M')} UTC:"]
    for name, msg in failures:
        alert_lines.append(f"- <b>{name}</b>: {msg}")

    alert_text = "\n".join(alert_lines)
    print(f"[health] sending alert: {len(failures)} check(s) failed")
    send_alert(alert_text)

    sys.exit(1)


if __name__ == "__main__":
    main()
