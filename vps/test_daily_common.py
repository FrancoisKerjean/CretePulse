from datetime import date, datetime, timezone
import daily_common as dc


def test_daily_slug_format():
    assert dc.daily_slug("crete-weather", date(2026, 5, 22)) == "crete-weather-2026-05-22"
    assert dc.daily_slug("crete-news-recap", date(2026, 1, 9)) == "crete-news-recap-2026-01-09"


def test_build_guide_row_is_en_only_and_daily():
    row = dc.build_guide_row(
        slug="crete-weather-2026-05-22",
        category="daily-weather",
        title_en="Crete weather today",
        meta_en="Forecast for Crete",
        content_html_en="<h2 id=\"overview\">Overview</h2><p>Sunny.</p>",
        faq_en=[{"q": "Will it rain?", "a": "No."}],
        read_time=3,
    )
    assert row["format"] == "daily"
    assert row["status"] == "published"
    assert row["category"] == "daily-weather"
    assert row["titles"] == {"en": "Crete weather today"}
    assert list(row["meta_descs"].keys()) == ["en"]
    assert list(row["contents"].keys()) == ["en"]
    assert row["faqs"]["en"][0]["q"] == "Will it rain?"
    assert row["read_time"] == 3
    assert row["keywords"] == []
    assert row["image_url"] is None
    datetime.fromisoformat(row["published_at"])


def test_athens_now_is_tz_aware():
    now = dc.athens_now()
    assert now.tzinfo is not None
    assert str(now.tzinfo) == "Europe/Athens"
