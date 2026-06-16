"""Étape C du plan GTFS : assemble le flux complet (agency/routes/trips/stop_times/
calendar/feed_info + stops projeté) depuis bus_routes + gtfs_stops, et empaquette
crete.zip. Pur hormis : lecture DB (sb), fetch OSRM injecté, écriture fichiers/zip.
Décisions : docs/superpowers/specs/2026-06-16-gtfs-feed-assembly-design.md"""
import json
import os
import re
import zipfile

from collections import OrderedDict

import coastline
import osm_feed
from gtfs_stops_build import OUT_DIR, curate_routes
from gtfs_writer import write_csv
from net_lines import merge_into_lines
from net_nomenclature import assign_codes, color_for
from net_osrm import build_geometry
from net_timeprofile import cumulative_profile
from gtfs_calendar import days_to_weekdays, service_id_for, DAY_ORDER as _WEEK

AGENCY_ID = "crete-direct"
AGENCY_NAME = "crete.direct"
AGENCY_URL = "https://crete.direct"
AGENCY_TZ = "Europe/Athens"
FEED_LANG = "en"

NOTICE_TEXT = """crete.direct GTFS feed - Crete, Greece

Honesty notice on stop times
============================
KTEL publishes only the DEPARTURE time at each route's origin terminus.
Times at intermediate stops in this feed are ESTIMATES, computed from a
road-distance time profile, and are marked timepoint=0 in stop_times.txt.
The origin departure is the real published time (timepoint=1). The arrival
at the destination terminus is timepoint=1 only when the total trip duration
is published, otherwise it is also an estimate (timepoint=0).

Produced by crete.direct from KTEL Heraklion-Lassithi and KTEL
Chania-Rethymno timetables.
"""

GTFS_FILES = ("agency.txt", "routes.txt", "trips.txt", "stop_times.txt",
              "calendar.txt", "feed_info.txt", "stops.txt", "NOTICE.txt")
_TABLE_FILE = {"agency": "agency.txt", "routes": "routes.txt", "trips": "trips.txt",
               "stop_times": "stop_times.txt", "calendar": "calendar.txt",
               "feed_info": "feed_info.txt", "stops": "stops.txt"}


def parse_duration_min(duration):
    """'2h 30min' -> 150 ; '50min' -> 50 ; '1h' -> 60 ; None/illisible -> None."""
    if not duration:
        return None
    h = re.search(r"(\d+)\s*h", duration, re.I)
    m = re.search(r"(\d+)\s*min", duration, re.I)
    if not h and not m:
        return None
    return (int(h.group(1)) * 60 if h else 0) + (int(m.group(1)) if m else 0)


def add_minutes(t0, minutes):
    """'08:00' + offset minutes -> 'HH:MM:SS'. Heures >=24 tolérées (après-minuit)."""
    parts = t0.split(":")
    total = int(parts[0]) * 60 + int(parts[1]) + int(minutes)
    return f"{total // 60:02d}:{total % 60:02d}:00"


def _route_departures(route):
    """[(days_label, time), ...] depuis departures_by_day ; fallback flat = 'Every Day'."""
    out = []
    groups = route.get("departures_by_day")
    if groups:
        for g in groups:
            for t in (g.get("times") or []):
                out.append((g.get("days") or "Every Day", t))
    else:
        for t in (route.get("departures") or []):
            out.append(("Every Day", t))
    return out


def _geocoded_sequence(route, stops_by_id):
    """Séquence (slugs canoniques) de la route brute curée, dédupliquée en
    consécutif puis filtrée aux arrêts géocodés. Retourne
    (kept, dropped_intermediates, terminus_ok)."""
    raw = [route["from_place"], *(route.get("via_stops") or []), route["to_place"]]
    seq = []
    for s in raw:
        if s and (not seq or seq[-1] != s):
            seq.append(s)
    kept, dropped_inter = [], []
    for i, s in enumerate(seq):
        if s in stops_by_id:
            kept.append(s)
        elif 0 < i < len(seq) - 1:
            dropped_inter.append(s)
    terminus_ok = bool(seq) and seq[0] in stops_by_id and seq[-1] in stops_by_id
    return kept, dropped_inter, terminus_ok


def _coords_stops(slugs, stops_by_id):
    """Liste {slug,lat,lng} pour net_osrm.build_geometry."""
    return [{"slug": s, "lat": stops_by_id[s]["stop_lat"], "lng": stops_by_id[s]["stop_lon"]}
            for s in slugs]


def assemble_feed(routes, stops_by_id, window, feed_version, osrm=None, seasons=None, on_land=None, osm=None):
    """Pur (sauf osrm injecté). Retourne {agency,routes,trips,stop_times,calendar,
    feed_info,stops,stats}. window=(start_yyyymmdd,end_yyyymmdd) ; seasons=iterable|None.
    osrm=None => fallback haversine déterministe (hors-ligne).
    on_land=callable(lat,lng)->bool : filtre les arrêts en mer avant assemblage (None=pas de filtre)."""
    if on_land is not None:
        stops_by_id = {sid: s for sid, s in stops_by_id.items()
                       if on_land(s["stop_lat"], s["stop_lon"])}
    start_date, end_date = window
    seasons = set(seasons) if seasons else None
    fetch = osrm if osrm is not None else (lambda url: None)

    active_routes = routes
    if seasons is not None:
        active_routes = [r for r in routes if not r.get("season") or r.get("season") in seasons]
    curated, _dropped = curate_routes(active_routes)

    corridors = merge_into_lines(curated)
    by_key, lines_for_codes = {}, []
    for c in corridors:
        by_key[c["key"]] = c
        seq_geo = [s for s in c["stops"] if s in stops_by_id]
        origin_co = stops_by_id.get(c["origin"])
        length_km = 0.0
        if len(seq_geo) >= 2:
            length_km = build_geometry(_coords_stops(seq_geo, stops_by_id), fetch=fetch)["length_km"]
        lines_for_codes.append({
            "key": c["key"],
            "origin_lat": origin_co["stop_lat"] if origin_co else None,
            "origin_lng": origin_co["stop_lon"] if origin_co else None,
            "length_km": length_km,
        })
    codes = assign_codes(lines_for_codes)

    trips_rows, st_rows = [], []
    shapes_pts = {}
    cal = OrderedDict()
    routes_meta = OrderedDict()
    referenced, seen_trip = set(), {}
    dropped_trips, skipped_inter = [], []

    for r in curated:
        a, b, op = r["from_place"], r["to_place"], r.get("operator_id")
        key = f"{a}|{b}|{op}" if a < b else f"{b}|{a}|{op}"
        corridor = by_key.get(key)
        if not corridor:
            continue
        route_id = codes[key]
        direction_id = 0 if a == corridor["origin"] else 1

        shape_id = ""
        if osm:
            lid = r.get("line_id")
            if lid is not None and lid in osm:
                shape_id = osm_feed.shape_id_for(lid)
                if shape_id not in shapes_pts:
                    shapes_pts[shape_id] = osm_feed.line_shape(osm[lid])

        seq, dropped_in, terminus_ok = _geocoded_sequence(r, stops_by_id)
        if not terminus_ok or len(seq) < 2:
            dropped_trips.append({"route_id": route_id, "from": a, "to": b})
            continue
        routes_meta.setdefault(route_id, (corridor["origin"], corridor["dest"]))
        skipped_inter.extend(dropped_in)

        leg_km = build_geometry(_coords_stops(seq, stops_by_id), fetch=fetch)["leg_km"]
        total_min = parse_duration_min(r.get("duration"))
        duration_real = total_min is not None
        offsets = cumulative_profile(leg_km, total_min)
        headsign = stops_by_id[seq[-1]]["stop_name"]
        last = len(seq) - 1

        for days_label, t0 in _route_departures(r):
            weekdays = days_to_weekdays(days_label)
            if not weekdays:
                continue
            service_id = service_id_for(weekdays)
            cal.setdefault(service_id, weekdays)
            base = f"{route_id}-{direction_id}-{service_id}-{t0.replace(':', '')}"
            n = seen_trip.get(base, 0)
            seen_trip[base] = n + 1
            trip_id = base if n == 0 else f"{base}-{n}"
            trips_rows.append([route_id, service_id, trip_id, headsign, direction_id, shape_id])
            for i, s in enumerate(seq):
                t = add_minutes(t0, offsets[i])
                timepoint = 1 if (i == 0 or (i == last and duration_real)) else 0
                st_rows.append([trip_id, t, t, s, i + 1, timepoint])
                referenced.add(s)

    agency = (["agency_id", "agency_name", "agency_url", "agency_timezone", "agency_lang"],
              [[AGENCY_ID, AGENCY_NAME, AGENCY_URL, AGENCY_TZ, FEED_LANG]])

    routes_rows = []
    for route_id, (origin, dest) in routes_meta.items():
        long_name = f"{stops_by_id[origin]['stop_name']} - {stops_by_id[dest]['stop_name']}"
        routes_rows.append([route_id, AGENCY_ID, route_id, long_name, 3, color_for(route_id).lstrip("#")])
    routes_tbl = (["route_id", "agency_id", "route_short_name", "route_long_name",
                   "route_type", "route_color"], routes_rows)

    trips_tbl = (["route_id", "service_id", "trip_id", "trip_headsign", "direction_id", "shape_id"], trips_rows)
    st_tbl = (["trip_id", "arrival_time", "departure_time", "stop_id", "stop_sequence", "timepoint"], st_rows)

    cal_header = ["service_id", "monday", "tuesday", "wednesday", "thursday",
                  "friday", "saturday", "sunday", "start_date", "end_date"]
    cal_rows = [[sid, *[1 if d in wd else 0 for d in _WEEK], start_date, end_date]
                for sid, wd in cal.items()]
    cal_tbl = (cal_header, cal_rows)

    feed_tbl = (["feed_publisher_name", "feed_publisher_url", "feed_lang",
                 "feed_version", "feed_start_date", "feed_end_date"],
                [[AGENCY_NAME, AGENCY_URL, FEED_LANG, feed_version, start_date, end_date]])

    stops_rows = []
    for sid in sorted(referenced):
        s = stops_by_id[sid]
        stops_rows.append([sid, s["stop_name"], f"{s['stop_lat']:.6f}", f"{s['stop_lon']:.6f}"])
    stops_tbl = (["stop_id", "stop_name", "stop_lat", "stop_lon"], stops_rows)

    shapes_rows = []
    for shape_id in sorted(shapes_pts):
        for seq, (lat, lng) in enumerate(shapes_pts[shape_id]):
            shapes_rows.append([shape_id, f"{lat:.6f}", f"{lng:.6f}", seq])
    shapes_tbl = (["shape_id", "shape_pt_lat", "shape_pt_lon", "shape_pt_sequence"], shapes_rows)

    stats = {
        "corridors": len(routes_meta), "trips": len(trips_rows), "stop_times": len(st_rows),
        "services": len(cal_rows), "stops_referenced": len(referenced),
        "dropped_trips": dropped_trips, "skipped_intermediates": sorted(set(skipped_inter)),
    }
    return {"agency": agency, "routes": routes_tbl, "trips": trips_tbl, "stop_times": st_tbl,
            "calendar": cal_tbl, "feed_info": feed_tbl, "stops": stops_tbl,
            "shapes": shapes_tbl, "stats": stats}


def write_feed(feed, out_dir=OUT_DIR):
    """Écrit les 7 fichiers GTFS + build-feed-stats.json dans out_dir."""
    os.makedirs(out_dir, exist_ok=True)
    for key, fname in _TABLE_FILE.items():
        header, rows = feed[key]
        write_csv(os.path.join(out_dir, fname), header, rows)
    with open(os.path.join(out_dir, "NOTICE.txt"), "w", encoding="utf-8", newline="\n") as f:
        f.write(NOTICE_TEXT)
    with open(os.path.join(out_dir, "build-feed-stats.json"), "w", encoding="utf-8") as f:
        json.dump(feed["stats"], f, ensure_ascii=False, indent=2)


def package_zip(out_dir=OUT_DIR, zip_path=None):
    """Empaquette les fichiers GTFS de out_dir dans un .zip (à la racine du zip)."""
    zip_path = zip_path or os.path.join(out_dir, "crete.zip")
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
        for fname in GTFS_FILES:
            p = os.path.join(out_dir, fname)
            if os.path.exists(p):
                z.write(p, fname)
    return zip_path


def load_stops(sb):
    """gtfs_stops géocodés -> {stop_id: row}."""
    rows = sb.table("gtfs_stops").select("stop_id,stop_name,stop_lat,stop_lon").execute().data
    return {r["stop_id"]: r for r in rows
            if r.get("stop_lat") is not None and r.get("stop_lon") is not None}


def load_routes(sb):
    return sb.table("bus_routes").select(
        "id,operator_id,from_place,to_place,via_stops,"
        "departures_by_day,departures,duration,season").execute().data


def make_osrm_fetch(cache_path=None, throttle_s=1.0):
    """Fetch OSRM caché + throttlé pour net_osrm : f(url)->json|None. Cache JSON
    persistant (clé = url) pour ne pas re-interroger l'endpoint public gratuit."""
    import time
    import requests
    path = cache_path or os.path.join(OUT_DIR, "osrm-cache.json")
    cache = {}
    if os.path.exists(path):
        try:
            with open(path, encoding="utf-8") as f:
                cache = json.load(f)
        except Exception:
            cache = {}
    state = {"last": 0.0}

    def fetch(url):
        if url in cache:
            return cache[url]
        wait = throttle_s - (time.time() - state["last"])
        if wait > 0:
            time.sleep(wait)
        state["last"] = time.time()
        data = None
        try:
            r = requests.get(url, timeout=30, headers={"User-Agent": "crete.direct-bot/1.0 (+https://crete.direct)"})
            if r.status_code == 200:
                data = r.json()
        except Exception:
            data = None
        cache[url] = data
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(cache, f, ensure_ascii=False)
        return data

    return fetch


def build_gtfs_feed(sb, window, feed_version, osrm=None, seasons=None, out_dir=OUT_DIR, on_land=coastline.on_land):
    """Point d'entrée : lit gtfs_stops + bus_routes, assemble, écrit les fichiers,
    empaquette crete.zip. Retourne stats + chemin du zip. osrm=None au run réel
    => passer make_osrm_fetch() pour des km routiers (sinon fallback haversine).
    on_land=coastline.on_land par défaut (filtre les arrêts en mer)."""
    stops_by_id = load_stops(sb)
    routes = load_routes(sb)
    feed = assemble_feed(routes, stops_by_id, window, feed_version, osrm=osrm, seasons=seasons, on_land=on_land)
    write_feed(feed, out_dir)
    zip_path = package_zip(out_dir)
    return {**feed["stats"], "zip": zip_path}
