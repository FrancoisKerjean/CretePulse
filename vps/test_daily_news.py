from datetime import datetime
from zoneinfo import ZoneInfo
import daily_news as dn

ATHENS = ZoneInfo("Europe/Athens")


def test_news_window_start_is_athens_midnight_in_utc():
    now = datetime(2026, 5, 22, 20, 0, tzinfo=ATHENS)
    start = dn.news_window_start(now)
    # Athens is UTC+3 in May -> local midnight = 21:00 UTC the previous day
    assert start.tzinfo is not None
    assert start.isoformat().startswith("2026-05-21T21:00")


def test_select_news_drops_untranslated_rows():
    rows = [
        {"slug": "a", "title_en": "Real news", "summary_en": "Body."},
        {"slug": "b", "title_en": "", "summary_en": "Body."},        # not rewritten yet
        {"slug": "c", "title_en": "Has title", "summary_en": ""},     # empty summary
        {"slug": "d", "title_en": "Another", "summary_en": "Body2."},
    ]
    kept = dn.select_news(rows)
    assert [r["slug"] for r in kept] == ["a", "d"]
