"""Pipeline OSM : assemble bus_stops/bus_lines/bus_line_stops depuis les éléments
Overpass (coords fournies par OSM, zéro géocodage). Pur hormis OSRM (fetch injecté).
Réutilise net_osrm / net_timeprofile / net_nomenclature / build_network helpers."""
from prices import haversine_km
from osm_fetch import fetch_overpass
from osm_parse import parse_stops, parse_relation
from osm_lines import merge_osm_lines
from net_osrm import build_geometry
from net_timeprofile import cumulative_profile
from net_nomenclature import assign_codes, color_for, prefecture_for
from build_network import _title, store_network

MIN_OSM_STOPS = 500   # sous ces seuils = réponse Overpass partielle, on ne touche pas la DB
MIN_OSM_LINES = 50


def should_build_osm(stops, lines):
    return len(stops) >= MIN_OSM_STOPS and len(lines) >= MIN_OSM_LINES


def _seq_length_km(seq):
    total = 0.0
    for i in range(1, len(seq)):
        a, b = seq[i - 1], seq[i]
        if a and b and a.get("lat") is not None and b.get("lat") is not None:
            total += haversine_km((a["lat"], a["lng"]), (b["lat"], b["lng"]))
    return round(total, 2)


def assemble_osm(elements, fetch=None, existing_codes=None):
    """Retourne (stops, lines, line_stops)."""
    stops_by_id = parse_stops(elements)
    relations = [parse_relation(e, stops_by_id) for e in elements
                 if e.get("type") == "relation" and e.get("tags", {}).get("route") == "bus"]
    lines_raw = merge_osm_lines(relations)

    # arrêts retenus = ceux utilisés par au moins une ligne (1 enregistrement par slug)
    used = set()
    for ln in lines_raw:
        used.update(ln["stops"])
    slug_to_stop = {}
    for s in stops_by_id.values():
        if s["slug"] in used and s["slug"] not in slug_to_stop:
            slug_to_stop[s["slug"]] = s
    stops = [{
        "slug": s["slug"], "name": s["name"], "name_el": s["name_el"],
        "lat": s["lat"], "lng": s["lng"], "prefecture": prefecture_for(s["lat"], s["lng"]),
        "coords_source": "osm", "coords_confidence": "high",
        "osm_id": s["osm_id"], "needs_review": False,
    } for s in slug_to_stop.values()]

    # nomenclature : longueur haversine provisoire pour ordonner les codes
    for ln in lines_raw:
        o = slug_to_stop.get(ln["origin"], {})
        ln["origin_lat"], ln["origin_lng"] = o.get("lat"), o.get("lng")
        ln["length_km"] = _seq_length_km([slug_to_stop.get(x) for x in ln["stops"]])
    codes = assign_codes(lines_raw, existing=existing_codes)

    lines, line_stops = [], []
    for ln in lines_raw:
        code = codes[ln["key"]]
        seq = [slug_to_stop[x] for x in ln["stops"] if x in slug_to_stop]
        geo = build_geometry(seq, fetch=fetch)
        profile = cumulative_profile(geo["leg_km"], None)   # durée estimée en SP1
        cum_km, acc = [0.0], 0.0
        for d in geo["leg_km"]:
            acc += d
            cum_km.append(round(acc, 2))
        lines.append({
            "code": code, "code_official": ln["ref"],
            "name": f"{_title(ln['origin'])} <-> {_title(ln['dest'])}",
            "prefecture": code.split("-")[0], "operator_id": ln["operator_id"],
            "geometry": geo["geometry"], "color": color_for(code),
            "length_km": geo["length_km"], "total_minutes": profile[-1] if profile else None,
            "partial_geo": geo["partial"], "osm_id": ln["osm_ids"][0], "source": "osm",
        })
        for i, x in enumerate(ln["stops"]):
            line_stops.append({
                "line_code": code, "stop_slug": x, "seq": i,
                "cumulative_km": cum_km[i] if i < len(cum_km) else cum_km[-1],
                "cumulative_minutes": profile[i] if i < len(profile) else profile[-1],
            })
    return stops, lines, line_stops


def build_osm_network(sb):
    """Entrée : fetch Overpass -> assemble -> store (garde-fou). Retourne (n_stops,n_lines,n_ls)."""
    elements = fetch_overpass()
    if not elements:
        raise RuntimeError("Overpass indisponible (tous miroirs)")
    existing = _load_existing_codes(sb)
    stops, lines, line_stops = assemble_osm(elements, existing_codes=existing)
    if not should_build_osm(stops, lines):
        raise ValueError(f"refuse build OSM: {len(stops)} stops / {len(lines)} lines")
    return store_network(sb, stops, lines, line_stops)


def _load_existing_codes(sb):
    """bus_lines existantes -> {key: code} (stabilité PREF-NN)."""
    try:
        rows = sb.table("bus_lines").select("code,name,operator_id").execute().data
        out = {}
        for r in rows:
            parts = r["name"].split("<->")
            if len(parts) == 2:
                a = parts[0].strip().lower().replace(" ", "-")
                b = parts[1].strip().lower().replace(" ", "-")
                out[f"{min(a, b)}|{max(a, b)}|{r['operator_id']}"] = r["code"]
        return out
    except Exception:
        return {}
