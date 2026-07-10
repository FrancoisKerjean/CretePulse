#!/usr/bin/env python3
"""Historise l'interet quotidien pour les POI cretois via pageviews Wikipedia (API officielle).

Cron : 30 5 * * * (quotidien). Lag donnees Wikimedia ~24-48h -> on requete J-3.
Backfill : wiki_interest.py --backfill 30
"""
import json
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, timedelta

from db import insert_rows

UA = "CreteDirectFlux/1.0 (https://crete.direct; contact@kairosguest.com)"
API = ("https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/"
       "en.wikipedia.org/all-access/user/{title}/daily/{d1}/{d2}")

ENTITIES = [
    "Knossos", "Elafonisi", "Balos", "Samariá_Gorge", "Heraklion", "Chania",
    "Rethymno", "Agios_Nikolaos,_Crete", "Ierapetra", "Sitia", "Spinalonga",
    "Matala,_Crete", "Phaistos", "Preveli", "Arkadi_Monastery", "Falasarna",
    "Loutro", "Elounda", "Malia,_Crete", "Hersonissos", "Vai_(Crete)", "Crete",
]

INSERT_SQL = ("insert into flux_interest_daily (source, entity, lang, day, value)"
              " values ('wikipedia', %s, 'en', %s, %s)"
              " on conflict (source, entity, lang, day) do nothing")


def run(days_back):
    end = date.today() - timedelta(days=3)
    start = end - timedelta(days=days_back - 1)
    d1, d2 = start.strftime("%Y%m%d"), end.strftime("%Y%m%d")
    rows, misses = [], []
    for title in ENTITIES:
        url = API.format(title=urllib.parse.quote(title, safe=""), d1=d1, d2=d2)
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                items = json.loads(resp.read()).get("items", [])
            for it in items:
                day = date(int(it["timestamp"][:4]), int(it["timestamp"][4:6]),
                           int(it["timestamp"][6:8]))
                rows.append((title, day, float(it["views"])))
        except urllib.error.HTTPError as exc:
            misses.append(f"{title}:{exc.code}")
        except Exception as exc:
            misses.append(f"{title}:{exc}")
    print(f"wikipedia {start}->{end}: {insert_rows(INSERT_SQL, rows)} lignes" +
          (f" | manquants: {', '.join(misses)}" if misses else ""))


if __name__ == "__main__":
    try:
        n = int(sys.argv[sys.argv.index("--backfill") + 1]) if "--backfill" in sys.argv else 1
        run(n)
    except Exception as exc:
        print(f"wiki_interest ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
