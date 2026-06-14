"""Construction de lignes minimales pour les paires KTEL absentes d'OSM.
Une paire = 2 terminus + horaires ; on crée 2 bus_stops si manquants, 1 bus_line
source='ktel' avec géométrie OSRM(a->b), 2 bus_line_stops (seq 0/1). Pur sauf OSRM."""
from prices import haversine_km, _norm
from ktel_resolve import resolve
from net_osrm import build_geometry
from net_nomenclature import assign_codes, color_for, prefecture_for
from build_network import _parse_duration_min, _title


def _avg_duration_min(routes):
    """Moyenne arithmétique des durées parsées (None si aucune)."""
    mins = [m for m in (_parse_duration_min(r.get("duration")) for r in routes) if m is not None]
    return round(sum(mins) / len(mins)) if mins else None


def _resolve_or_create(slug_hint, name, stops_by_slug, place_coords, pending_stops):
    """Retourne le dict stop (déjà connu ou créé à la volée). None si impossible."""
    if slug_hint in stops_by_slug:
        return stops_by_slug[slug_hint]
    if slug_hint in pending_stops:
        return pending_stops[slug_hint]
    # PLACE_COORDS indexé par nom normalisé : essayer le nom original puis le slug
    pc = {_norm(k): v for k, v in place_coords.items()}
    coords = pc.get(_norm(name or "")) or pc.get(slug_hint)
    if not coords:
        return None
    lat, lng = coords
    rec = {"slug": slug_hint, "name": _title(slug_hint), "name_el": None,
           "lat": lat, "lng": lng, "prefecture": prefecture_for(lat, lng),
           "coords_source": "ktel", "coords_confidence": "medium",
           "osm_id": None, "needs_review": False}
    pending_stops[slug_hint] = rec
    return rec


def build_fallback_lines(gaps, stops_by_slug, aliases, place_coords, existing_codes, fetch=None):
    """Retourne (new_stops, new_lines, new_line_stops, fallback_matched).
    fallback_matched = {route_id: line_code} (le code fait office d'identifiant
    inter-tâches ; la résolution code->id se fait à l'INSERT, comme dans SP1)."""
    pending_stops = {}
    pairs = []
    for (operator, termini), routes in gaps.items():
        if len(termini) < 2:
            continue
        a_slug, b_slug = sorted(termini)
        # essayer de résoudre via les routes (au cas où le slug différait du nom_brut KTEL)
        a_name = next((r.get("from_place") if resolve(r.get("from_place"), stops_by_slug, aliases, place_coords) == a_slug
                       else r.get("to_place") if resolve(r.get("to_place"), stops_by_slug, aliases, place_coords) == a_slug
                       else None for r in routes), None)
        b_name = next((r.get("from_place") if resolve(r.get("from_place"), stops_by_slug, aliases, place_coords) == b_slug
                       else r.get("to_place") if resolve(r.get("to_place"), stops_by_slug, aliases, place_coords) == b_slug
                       else None for r in routes), None)
        a_stop = _resolve_or_create(a_slug, a_name, stops_by_slug, place_coords, pending_stops)
        b_stop = _resolve_or_create(b_slug, b_name, stops_by_slug, place_coords, pending_stops)
        if not a_stop or not b_stop:
            continue
        pairs.append((operator, a_slug, b_slug, a_stop, b_stop, routes))

    # nomenclature : longueur haversine pour ordonner les codes (pattern SP1)
    lines_raw = []
    for operator, a, b, a_stop, b_stop, routes in pairs:
        length_km = round(haversine_km((a_stop["lat"], a_stop["lng"]),
                                       (b_stop["lat"], b_stop["lng"])), 2)
        lines_raw.append({
            "operator_id": operator, "origin": a, "dest": b,
            "origin_lat": a_stop["lat"], "origin_lng": a_stop["lng"],
            "length_km": length_km,
            "key": f"{a}|{b}|{operator}",
            "_routes": routes, "_a_stop": a_stop, "_b_stop": b_stop,
        })
    codes = assign_codes(lines_raw, existing=existing_codes)

    new_lines, new_line_stops, fallback_matched = [], [], {}
    for ln in lines_raw:
        code = codes[ln["key"]]
        a_stop, b_stop = ln["_a_stop"], ln["_b_stop"]
        geo = build_geometry([a_stop, b_stop], fetch=fetch)
        total_minutes = _avg_duration_min(ln["_routes"])
        # cumul km déterministe par OSRM/haversine (1 segment)
        leg_km = geo["leg_km"][0] if geo["leg_km"] else 0.0
        new_lines.append({
            "code": code, "code_official": None,
            "name": f"{_title(ln['origin'])} <-> {_title(ln['dest'])}",
            "prefecture": code.split("-")[0], "operator_id": ln["operator_id"],
            "geometry": geo["geometry"], "color": color_for(code),
            "length_km": geo["length_km"], "total_minutes": total_minutes,
            "partial_geo": True, "osm_id": None, "source": "ktel",
        })
        new_line_stops.append({"line_code": code, "stop_slug": ln["origin"],
                                "seq": 0, "cumulative_km": 0.0, "cumulative_minutes": 0})
        new_line_stops.append({"line_code": code, "stop_slug": ln["dest"],
                                "seq": 1,
                                "cumulative_km": round(leg_km, 2),
                                "cumulative_minutes": total_minutes if total_minutes is not None else 0})
        for r in ln["_routes"]:
            fallback_matched[r["id"]] = code

    return list(pending_stops.values()), new_lines, new_line_stops, fallback_matched
