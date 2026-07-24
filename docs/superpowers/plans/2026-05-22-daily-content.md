# Contenu éditorial quotidien crete.direct — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publier automatiquement chaque jour deux pages éditoriales datées sur crete.direct — un bulletin météo le matin et une synthèse des actus majeures le soir — pour alimenter le levier SEO/AEO.

**Architecture:** Réutilisation totale de la table `guides` (rendue par `/articles/[slug]`, ISR à la demande) avec `format="daily"` pour exclure ces posts de l'index éditorial `getEditorialGuides` tout en les gardant dans le sitemap et un hub `/daily` dédié. Deux générateurs Python sur le VPS appellent `claude -p` (OAuth, zéro token) ; toute la logique de transformation est isolée en fonctions pures testables, l'I/O (fetch, Claude, DB) est en wrappers minces.

**Tech Stack:** Python 3 (supabase-py, zoneinfo, `claude -p` CLI), Next.js 16 / next-intl, IndexNow, cron VPS.

---

## Référence — conventions vérifiées dans le codebase

- Table `guides` : colonnes `slug` (UNIQUE), `format`, `category`, `keywords[]`, `titles` (JSONB), `meta_descs` (JSONB), `contents` (JSONB HTML), `faqs` (JSONB `{q,a}[]`), `image_url`, `read_time`, `status`, `published_at`. (`src/lib/guides.ts:3-18`)
- `getEditorialGuides()` filtre déjà `format IN ('long','mid')` → un `format="daily"` est automatiquement exclu. (`src/lib/guides.ts:59-74`)
- `getLocalizedGuideField` / `getLocalizedFaqs` font un **fallback sur `en`** pour toute locale absente. (`src/lib/guides.ts:20-33`) → MVP EN : remplir seulement la clé `en`.
- `/articles/[slug]/page.tsx` : `revalidate=86400`, `generateStaticParams` sans `dynamicParams=false` → nouveaux slugs rendus en ISR sans redéploiement. (`src/app/[locale]/articles/[slug]/page.tsx:21-28`)
- Sitemap : tire **tous** les guides via `fetchSlugsWithDate("guides", …)` puis `push('/articles/${g.slug}')` → les posts `daily` entrent automatiquement. (`src/app/sitemap.xml/route.ts:192,206`)
- `vps/indexnow.py` : `guide_urls(slug, locales=["en"])` pour pinger la seule URL EN. `submit()` ne lève jamais.
- Pattern `claude -p` robuste (temp file + `--output-format json` + retry JSON) : `vps/guide-writer.py:50-118` (`call_claude`, `parse_json_response`, `call_claude_json`). On le réimplémente dans `daily_common.py` (le module `guide-writer.py` a un tiret, non importable).
- Alerte Telegram : `from kairos_telegram import send, Bot; send(Bot.PLUME, ...)` (`vps/guide-writer.py:42-48`).
- Env VPS : `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` (via `load_dotenv()`).

## File Structure

Nouveaux :
- `vps/daily_common.py` — helpers partagés (claude_json, supabase, slug daté, build_guide_row, publish idempotent + IndexNow EN, alerte). Logique pure isolée.
- `vps/daily_weather.py` — bulletin météo matin (fetch Open-Meteo daily + build_weather_block pur + génération + publish).
- `vps/daily_news.py` — récap actus soir (fenêtre du jour + select_news pur + génération + publish).
- `vps/test_daily_common.py` — tests des fonctions pures de `daily_common`.
- `vps/test_daily_weather.py` — tests de `build_weather_block`.
- `vps/test_daily_news.py` — tests de `news_window_start` + `select_news`.
- `src/app/[locale]/daily/page.tsx` — hub listant les 2 flux datés.

Modifiés :
- `src/lib/guides.ts` — ajout `getDailyPosts()`.
- `src/app/[locale]/articles/page.tsx` — `getPublishedGuides(200)` → `getEditorialGuides(200)`.
- `src/app/sitemap.xml/route.ts` — ajout `/daily` à `STATIC_PAGES`.
- `vps/requirements.txt` — ajout `pytest` (dev).

> Les fichiers Python sont nommés `daily_weather.py` / `daily_news.py` (underscore) pour rester importables et testables, contrairement aux `guide-writer.py` historiques.

---

## Task 1 : `daily_common.py` — helpers partagés + fonctions pures

**Files:**
- Create: `vps/daily_common.py`
- Create: `vps/test_daily_common.py`
- Modify: `vps/requirements.txt`

- [ ] **Step 1: Ajouter pytest aux dépendances dev**

Modifier `vps/requirements.txt` pour ajouter une ligne :

```
pytest
```

- [ ] **Step 2: Écrire les tests des fonctions pures (ils échouent : module absent)**

Create `vps/test_daily_common.py` :

```python
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
    assert row["image_url"] is None
    # published_at present and ISO-parseable
    datetime.fromisoformat(row["published_at"])


def test_athens_now_is_tz_aware():
    now = dc.athens_now()
    assert now.tzinfo is not None
```

- [ ] **Step 3: Lancer les tests, vérifier l'échec**

Run: `cd C:/Users/fkerj/cretepulse-build/vps && python -m pytest test_daily_common.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'daily_common'`

- [ ] **Step 4: Écrire `daily_common.py`**

Create `vps/daily_common.py` :

```python
#!/usr/bin/env python3
"""Shared helpers for CretePulse daily editorial generators (weather bulletin + news recap).

Both generators publish into the existing `guides` table (rendered at /articles/[slug],
ISR on-demand) with format="daily", which keeps them out of the editorial articles index
(getEditorialGuides filters format IN ('long','mid')) while still appearing in the sitemap
and a dedicated /daily hub. Generation uses `claude -p` (VPS OAuth, zero tokens). All pure
transforms live here and are unit-tested; I/O wrappers are thin.
"""
import json
import os
import re
import subprocess
import tempfile
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

ATHENS = ZoneInfo("Europe/Athens")


# ---------- pure helpers (unit-tested) ----------

def athens_now():
    return datetime.now(ATHENS)


def daily_slug(prefix: str, d) -> str:
    """Dated URL-safe slug, e.g. crete-weather-2026-05-22. `d` is a date or datetime."""
    return f"{prefix}-{d.strftime('%Y-%m-%d')}"


def build_guide_row(slug, category, title_en, meta_en, content_html_en, faq_en,
                    read_time, image_url=None, published_at=None):
    """Build a guides-table row for an EN-only daily post.

    format="daily" excludes it from the editorial /articles index while keeping a normal
    /articles/[slug] page. Only the `en` key is filled; getLocalizedGuideField falls back
    to en for every other locale.
    """
    return {
        "slug": slug,
        "format": "daily",
        "category": category,
        "keywords": [],
        "titles": {"en": title_en},
        "meta_descs": {"en": meta_en},
        "contents": {"en": content_html_en},
        "faqs": {"en": faq_en},
        "image_url": image_url,
        "read_time": read_time,
        "status": "published",
        "published_at": published_at or datetime.now(timezone.utc).isoformat(),
    }


# ---------- claude -p (mirrors guide-writer.py hardening) ----------

def _call_claude(prompt, model="sonnet", timeout=600):
    with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False, encoding="utf-8") as f:
        f.write(prompt)
        tmp = f.name
    try:
        cmd = f'cat "{tmp}" | claude -p --model {model} --output-format json'
        r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=timeout)
        if r.returncode != 0:
            raise RuntimeError(f"claude -p failed: {r.stderr[:500]}")
        try:
            return json.loads(r.stdout).get("result", r.stdout).strip()
        except (json.JSONDecodeError, AttributeError):
            return r.stdout.strip()
    finally:
        os.unlink(tmp)


def _parse_json(raw):
    raw = re.sub(r"^```(?:json)?\s*", "", raw.strip())
    raw = re.sub(r"\s*```$", "", raw.strip())
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        m = re.search(r"\{[\s\S]*\}", raw)
        if m:
            return json.loads(m.group())
        raise


def claude_json(prompt, model="sonnet", max_retries=2, label="response"):
    """Call Claude and parse its JSON, retrying on malformed output."""
    last = None
    for attempt in range(max_retries + 1):
        p = prompt
        if attempt > 0:
            p = (prompt
                 + f"\n\nREMINDER: your previous answer was NOT valid JSON ({last})."
                 + " Return exactly ONE strictly valid JSON object. Escape every double"
                 + ' quote inside string values as \\". No markdown fences, no extra text.')
        try:
            return _parse_json(_call_claude(p, model))
        except (json.JSONDecodeError, ValueError) as e:
            last = e
            print(f"[daily] {label}: JSON parse failed (attempt {attempt + 1}/{max_retries + 1}): {e}")
    raise RuntimeError(f"{label}: JSON still invalid after {max_retries + 1} attempts: {last}")


# ---------- I/O wrappers ----------

def get_supabase():
    from supabase import create_client
    return create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])


def already_published(sb, slug) -> bool:
    resp = sb.table("guides").select("slug").eq("slug", slug).execute()
    return bool(resp.data)


def publish(sb, row, dry_run=False) -> bool:
    """Insert the row (idempotent on slug) and ping IndexNow for the EN URL only."""
    slug = row["slug"]
    if dry_run:
        print(f"[daily] DRY-RUN would publish {slug}:")
        print(json.dumps(row, ensure_ascii=False)[:1200])
        return False
    if already_published(sb, slug):
        print(f"[daily] {slug} already published, skip")
        return False
    sb.table("guides").insert(row).execute()
    print(f"[daily] published {slug}")
    try:
        import indexnow
        indexnow.submit(indexnow.guide_urls(slug, locales=["en"]))
    except Exception as e:  # noqa: BLE001 - submission must never break publishing
        print(f"[daily] indexnow skipped: {e}")
    return True


def alert(text):
    try:
        from kairos_telegram import send, Bot
        send(Bot.PLUME, "Daily Content", text)
    except Exception as e:  # noqa: BLE001
        print(f"[daily] telegram error: {e}")
```

- [ ] **Step 5: Lancer les tests, vérifier le succès**

Run: `cd C:/Users/fkerj/cretepulse-build/vps && python -m pytest test_daily_common.py -v`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
cd C:/Users/fkerj/cretepulse-build
git add vps/daily_common.py vps/test_daily_common.py vps/requirements.txt
git commit -m "feat(daily): shared helpers for daily editorial generators"
```

---

## Task 2 : `daily_weather.py` — bulletin météo du matin

**Files:**
- Create: `vps/daily_weather.py`
- Create: `vps/test_daily_weather.py`

- [ ] **Step 1: Écrire le test de `build_weather_block` (échoue : module absent)**

Create `vps/test_daily_weather.py` :

```python
import daily_weather as dw


def test_build_weather_block_maps_fields():
    cities = [{"name": "Heraklion"}, {"name": "Ierapetra"}]
    forecast = [
        {"daily": {"temperature_2m_max": [27.0], "temperature_2m_min": [19.0],
                   "precipitation_sum": [0.0], "wind_speed_10m_max": [22.0],
                   "uv_index_max": [8.0], "weather_code": [1]}},
        {"daily": {"temperature_2m_max": [30.0], "temperature_2m_min": [21.0],
                   "precipitation_sum": [1.2], "wind_speed_10m_max": [35.0],
                   "uv_index_max": [9.0], "weather_code": [80]}},
    ]
    marine = [
        {"current": {"sea_surface_temperature": 22.5}, "daily": {"wave_height_max": [0.6]}},
        {"current": {"sea_surface_temperature": 23.1}, "daily": {"wave_height_max": [1.4]}},
    ]
    block = dw.build_weather_block(forecast, marine, cities)
    assert len(block) == 2
    assert block[0]["city"] == "Heraklion"
    assert block[0]["tmax"] == 27.0
    assert block[0]["sky"] == "mainly clear"
    assert block[0]["sea_temp"] == 22.5
    assert block[1]["sky"] == "rain showers"
    assert block[1]["wave_max"] == 1.4


def test_build_weather_block_tolerates_missing_marine():
    cities = [{"name": "Sitia"}]
    forecast = [
        {"daily": {"temperature_2m_max": [25.0], "temperature_2m_min": [18.0],
                   "precipitation_sum": [0.0], "wind_speed_10m_max": [15.0],
                   "uv_index_max": [7.0], "weather_code": [0]}},
    ]
    block = dw.build_weather_block(forecast, None, cities)
    assert block[0]["sea_temp"] is None
    assert block[0]["wave_max"] is None
    assert block[0]["sky"] == "clear sky"
```

- [ ] **Step 2: Lancer le test, vérifier l'échec**

Run: `cd C:/Users/fkerj/cretepulse-build/vps && python -m pytest test_daily_weather.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'daily_weather'`

- [ ] **Step 3: Écrire `daily_weather.py`**

Create `vps/daily_weather.py` :

```python
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
from datetime import datetime, timezone
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
    61: "light rain", 63: "rain", 65: "heavy rain", 71: "light snow", 73: "snow",
    75: "heavy snow", 80: "rain showers", 81: "rain showers", 82: "violent showers",
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
    date_label = today.strftime("%-d %B %Y") if sys.platform != "win32" else today.strftime("%d %B %Y")

    try:
        forecast, marine = fetch_forecast()
    except Exception as e:
        dc.alert(f"daily_weather: Open-Meteo fetch failed, no bulletin today: {e}")
        print(f"[weather] FATAL fetch: {e}")
        sys.exit(1)

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


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Lancer le test, vérifier le succès**

Run: `cd C:/Users/fkerj/cretepulse-build/vps && python -m pytest test_daily_weather.py -v`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
cd C:/Users/fkerj/cretepulse-build
git add vps/daily_weather.py vps/test_daily_weather.py
git commit -m "feat(daily): morning Crete weather bulletin generator"
```

---

## Task 3 : `daily_news.py` — récap actus du soir

**Files:**
- Create: `vps/daily_news.py`
- Create: `vps/test_daily_news.py`

- [ ] **Step 1: Écrire les tests des fonctions pures (échouent : module absent)**

Create `vps/test_daily_news.py` :

```python
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
```

- [ ] **Step 2: Lancer les tests, vérifier l'échec**

Run: `cd C:/Users/fkerj/cretepulse-build/vps && python -m pytest test_daily_news.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'daily_news'`

- [ ] **Step 3: Écrire `daily_news.py`**

Create `vps/daily_news.py` :

```python
#!/usr/bin/env python3
"""CretePulse - Daily Crete news recap (evening).

Selects the day's already-rewritten EN news from the `news` table, asks Claude to pick the
5-7 major items and write an editorial synthesis with internal links to each /news/[slug],
and publishes it into `guides` as an /articles/[slug] page. Skips when too few news.
Cron suggested: 0 20 * * * (20:00 Europe/Athens), after news.py + writer-v2.py have run.
"""
import argparse
import json
import sys
from datetime import timezone
from dotenv import load_dotenv

import daily_common as dc

load_dotenv()

MIN_NEWS = 3  # below this, do not publish (avoid a thin recap)


def news_window_start(now_athens):
    """UTC datetime of today's midnight in Athens (start of the recap window)."""
    midnight = now_athens.replace(hour=0, minute=0, second=0, microsecond=0)
    return midnight.astimezone(timezone.utc)


def select_news(rows):
    """Keep only rows already rewritten in EN (non-empty title and summary)."""
    return [r for r in rows
            if (r.get("title_en") or "").strip() and (r.get("summary_en") or "").strip()]


def build_prompt(items, date_label):
    listed = "\n".join(
        f'- slug="{r["slug"]}" | {r["title_en"]} | {r["summary_en"][:200]}'
        for r in items
    )
    return f"""You are the news editor of crete.direct. From the Crete news collected today
({date_label}), select the 5 to 7 MOST relevant items for a tourist or resident (tourism,
transport, extreme weather, culture/events, local economy). Ignore minor crime, national
politics, sport, celebrity. Write an editorial recap in English.

Each item you mention MUST link to its article with an internal link in this exact form:
<a href="/news/SLUG">anchor text</a>  (use the slug given below).

Today's news items:
{listed}

Return ONLY one valid JSON object:
{{
  "title": "max 65 chars, includes 'Crete' and the date",
  "meta_desc": "150-160 chars SEO description",
  "content": "HTML body: 400-600 words, <h2 id=\\"slug\\"> sub-headings, <p>, with the internal <a href=\\"/news/SLUG\\"> links. No <h1>.",
  "faq": [{{"q": "...", "a": "..."}}, {{"q": "...", "a": "..."}}, {{"q": "...", "a": "..."}}],
  "read_time": integer minutes
}}"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="print, do not write to DB")
    args = ap.parse_args()

    now = dc.athens_now()
    today = now.date()
    slug = dc.daily_slug("crete-news-recap", today)
    date_label = today.strftime("%d %B %Y")
    start_iso = news_window_start(now).isoformat()

    sb = dc.get_supabase()
    resp = (sb.table("news")
            .select("slug, title_en, summary_en, source_name, category, published_at")
            .gte("published_at", start_iso)
            .order("published_at", desc=True)
            .execute())
    items = select_news(resp.data or [])

    if len(items) < MIN_NEWS:
        msg = f"daily_news: only {len(items)} usable news today (< {MIN_NEWS}), no recap published."
        print(f"[news] {msg}")
        dc.alert(msg)
        return

    data = dc.claude_json(build_prompt(items, date_label), model="sonnet", label="news-recap")

    row = dc.build_guide_row(
        slug=slug, category="daily-news",
        title_en=data["title"], meta_en=data["meta_desc"],
        content_html_en=data["content"], faq_en=data.get("faq", []),
        read_time=int(data.get("read_time", 4)),
    )

    dc.publish(None if args.dry_run else sb, row, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
```

> Note : `select_news` est testée en pur ; `news_window_start` est définie dans `daily_news.py` (et testée). La requête DB et la génération restent en wrappers non testés unitairement (validés au dry-run, Task 6).

- [ ] **Step 4: Lancer les tests, vérifier le succès**

Run: `cd C:/Users/fkerj/cretepulse-build/vps && python -m pytest test_daily_news.py -v`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
cd C:/Users/fkerj/cretepulse-build
git add vps/daily_news.py vps/test_daily_news.py
git commit -m "feat(daily): evening Crete news recap generator"
```

---

## Task 4 : Front — `getDailyPosts` + exclusion de l'index `/articles`

**Files:**
- Modify: `src/lib/guides.ts`
- Modify: `src/app/[locale]/articles/page.tsx`

- [ ] **Step 1: Ajouter `getDailyPosts` dans `guides.ts`**

Dans `src/lib/guides.ts`, ajouter après `getEditorialGuides` (vers la ligne 74) :

```typescript
// Daily editorial posts (format "daily"): dated weather bulletins + news recaps.
// Shown only on the /daily hub, excluded from the evergreen /articles index.
export async function getDailyPosts(
  category?: "daily-news" | "daily-weather",
  limit: number = 30
): Promise<Guide[]> {
  try {
    let q = supabase
      .from("guides")
      .select("id, slug, format, category, keywords, titles, meta_descs, image_url, read_time, published_at, status")
      .eq("status", "published")
      .eq("format", "daily")
      .order("published_at", { ascending: false })
      .limit(limit);
    if (category) q = q.eq("category", category);
    const { data, error } = await q;
    if (error) throw error;
    return (data as Guide[]) || [];
  } catch {
    return [];
  }
}
```

- [ ] **Step 2: Exclure les posts daily de l'index `/articles`**

Dans `src/app/[locale]/articles/page.tsx` :

Ligne 2, remplacer :
```typescript
import { getPublishedGuides } from "@/lib/guides";
```
par :
```typescript
import { getEditorialGuides } from "@/lib/guides";
```

Ligne 48, remplacer :
```typescript
  const guides = await getPublishedGuides(200);
```
par :
```typescript
  const guides = await getEditorialGuides(200);
```

- [ ] **Step 3: Vérifier le build**

Run: `cd C:/Users/fkerj/cretepulse-build && npm run build`
Expected: build réussit (exit 0), pas d'erreur TypeScript.

- [ ] **Step 4: Commit**

```bash
cd C:/Users/fkerj/cretepulse-build
git add src/lib/guides.ts "src/app/[locale]/articles/page.tsx"
git commit -m "feat(daily): exclude daily posts from /articles, add getDailyPosts"
```

---

## Task 5 : Front — hub `/daily` + sitemap

**Files:**
- Create: `src/app/[locale]/daily/page.tsx`
- Modify: `src/app/sitemap.xml/route.ts`

- [ ] **Step 1: Créer le hub `/daily`**

Create `src/app/[locale]/daily/page.tsx` :

```tsx
import Link from "next/link";
import { CloudSun, Newspaper } from "lucide-react";
import { getDailyPosts, getLocalizedGuideField, type Guide } from "@/lib/guides";
import { buildAlternates } from "@/lib/seo";
import type { Locale } from "@/lib/types";

export const revalidate = 3600;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

const META = {
  title: "Crete Daily - Weather Bulletins & News Recaps",
  desc: "Daily Crete weather bulletins every morning and a recap of the day's major Crete news every evening.",
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const url = `${BASE_URL}/${locale}/daily`;
  return {
    title: META.title,
    description: META.desc,
    alternates: buildAlternates(locale, "/daily"),
    openGraph: { title: META.title, description: META.desc, url, type: "website" },
  };
}

function PostList({ posts, locale }: { posts: Guide[]; locale: Locale }) {
  if (posts.length === 0) {
    return <p className="text-sm text-text-muted">No entries yet.</p>;
  }
  return (
    <ul className="space-y-2">
      {posts.map((p) => (
        <li key={p.slug}>
          <Link
            href={`/${locale}/articles/${p.slug}`}
            className="text-aegean hover:underline"
          >
            {getLocalizedGuideField(p, "titles", locale)}
          </Link>
          <span className="ml-2 text-xs text-text-muted">
            {new Date(p.published_at).toLocaleDateString(locale)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default async function DailyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const loc = locale as Locale;

  const [weather, news] = await Promise.all([
    getDailyPosts("daily-weather", 30),
    getDailyPosts("daily-news", 30),
  ]);

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-aegean mb-2">Crete Daily</h1>
        <p className="text-sm text-text-muted mb-10">{META.desc}</p>

        <section className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <CloudSun className="w-5 h-5 text-aegean" />
            <h2 className="text-lg font-semibold text-aegean">Morning weather bulletins</h2>
          </div>
          <PostList posts={weather} locale={loc} />
        </section>

        <section>
          <div className="flex items-center gap-2 mb-3">
            <Newspaper className="w-5 h-5 text-aegean" />
            <h2 className="text-lg font-semibold text-aegean">Daily news recaps</h2>
          </div>
          <PostList posts={news} locale={loc} />
        </section>
      </div>
    </main>
  );
}
```

> MVP EN : libellés du hub en anglais en dur (le contenu lui-même est EN-only). Traduction des libellés en phase 2 avec le passage multilingue du contenu.

- [ ] **Step 2: Ajouter `/daily` au sitemap**

Dans `src/app/sitemap.xml/route.ts`, dans la constante `STATIC_PAGES` (vers la ligne 32-41, qui contient déjà `"/articles"`, `"/news"`, `"/weather"`), ajouter l'entrée :

```typescript
  "/daily",
```

- [ ] **Step 3: Vérifier le build**

Run: `cd C:/Users/fkerj/cretepulse-build && npm run build`
Expected: build réussit, route `/[locale]/daily` listée dans la sortie.

- [ ] **Step 4: Commit**

```bash
cd C:/Users/fkerj/cretepulse-build
git add "src/app/[locale]/daily/page.tsx" "src/app/sitemap.xml/route.ts"
git commit -m "feat(daily): /daily hub page + sitemap entry"
```

---

## Task 6 : Validation bout-en-bout + crons VPS

**Files:**
- Modify: crontab VPS (documenté ci-dessous, exécuté sur le serveur)

- [ ] **Step 1: Dry-run du bulletin météo (réseau réel, pas de DB)**

Run: `cd C:/Users/fkerj/cretepulse-build/vps && python daily_weather.py --dry-run`
Expected : log `[daily] DRY-RUN would publish crete-weather-YYYY-MM-DD` + un JSON avec `titles.en`, `contents.en` (HTML avec `<h2 id=...>`), `faqs.en`. Si erreur fetch → alerte Telegram et exit 1 (comportement attendu).

- [ ] **Step 2: Dry-run du récap actus (DB lecture seule, pas d'écriture)**

Run: `cd C:/Users/fkerj/cretepulse-build/vps && python daily_news.py --dry-run`
Expected : soit le JSON DRY-RUN du récap, soit `only N usable news today (< 3), no recap published` si la journée est creuse. Les deux sont des succès.

- [ ] **Step 3: Run réel une fois chaque générateur**

Run:
```bash
cd C:/Users/fkerj/cretepulse-build/vps
python daily_weather.py
python daily_news.py
```
Expected : `[daily] published crete-weather-...` / `crete-news-recap-...` (ou skip légitime si déjà publié / trop peu de news), + lignes IndexNow `yandex: 1 url -> HTTP 202`.

- [ ] **Step 4: Vérifier le rendu local des deux pages**

Run: `cd C:/Users/fkerj/cretepulse-build && npm run dev` puis ouvrir :
- `http://localhost:3000/en/articles/crete-weather-YYYY-MM-DD`
- `http://localhost:3000/en/articles/crete-news-recap-YYYY-MM-DD`
- `http://localhost:3000/en/daily`
- `http://localhost:3000/en/articles` (vérifier que les 2 posts daily **n'y apparaissent PAS**)

Expected : pages article rendues (titre, corps HTML, FAQ, liens internes `/news/...` cliquables pour le récap) ; hub `/daily` liste les 2 posts ; index `/articles` ne montre que les guides éditoriaux.

- [ ] **Step 5: Vérifier le schema.org Article**

Run: `curl -s http://localhost:3000/en/articles/crete-weather-YYYY-MM-DD | grep -o '"@type":"[^"]*"' | head`
Expected : présence de `"@type":"Article"` (schema AEO déjà câblé côté template article).

- [ ] **Step 6: Installer les crons sur le VPS**

Sur le VPS (`ssh` kairos-vps), ajouter au crontab du compte qui exécute déjà `news.py`/`guide-writer.py` (mêmes venv + env) :

```cron
# crete.direct - bulletin meteo du matin (06:30 Athens) et recap actus du soir (20:00 Athens)
30 6 * * *  cd /opt/cretepulse && /opt/cretepulse/venv/bin/python daily_weather.py >> /var/log/cretepulse-daily.log 2>&1
0 20 * * *  cd /opt/cretepulse && /opt/cretepulse/venv/bin/python daily_news.py    >> /var/log/cretepulse-daily.log 2>&1
```

> Le serveur tourne en UTC mais Open-Meteo et `athens_now()` gèrent le fuseau ; les heures cron ci-dessus supposent un crontab réglé sur Athens (comme les autres jobs cretepulse). Si le crontab VPS est en UTC, utiliser `30 3` et `0 17`. Vérifier le fuseau du serveur avant de poser (`timedatectl`).

- [ ] **Step 7: Déployer le front en prod**

```bash
cd C:/Users/fkerj/cretepulse-build
git push origin master && git push origin master:main
```
Expected : Vercel auto-build depuis `main` ; après ~3 min, `https://crete.direct/en/daily` répond 200 et les pages article daily sont servies.

---

## Self-review

- **Couverture spec** : destination web ✓ (guides + /articles), EN seul ✓ (build_guide_row en-only), sélection éditoriale Claude ✓ (daily_news prompt), bulletin Crète entier ✓ (daily_weather), exclusion /articles + hub + sitemap ✓ (Tasks 4-5), idempotence + skip jour creux + retry + alerte ✓ (daily_common.publish / MIN_NEWS / claude_json / alert), tests avant prod ✓ (Task 6 dry-run d'abord), extension météo observée = hors MVP (non implémentée, conforme au spec).
- **Placeholders** : aucun ; tout le code est complet.
- **Cohérence des types** : `build_guide_row(...)` produit exactement les clés lues par `getLocalizedGuideField`/`getLocalizedFaqs` (`titles/meta_descs/contents/faqs` avec clé `en`, faqs = `[{q,a}]`). `getDailyPosts` filtre `format="daily"` posé par `build_guide_row`. `indexnow.guide_urls(slug, locales=["en"])` correspond à la signature réelle. `news_window_start`/`select_news`/`build_weather_block` ont des noms identiques entre tests et modules.
- **Catégorie vs format** : exclusion par `format="daily"` (mécanisme existant `getEditorialGuides`), `category` (`daily-news`/`daily-weather`) sert au filtrage du hub et aux articles liés.
