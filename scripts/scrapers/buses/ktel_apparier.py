"""Pipeline SP2 : apparie chaque route KTEL à une ligne (OSM ou KTEL-fallback).
- assemble_apparier : pur, OSRM injecté, retourne un dict de payloads.
- run_apparier : entrée prod (charge DB, appelle assemble, écrit en transaction).
Réutilise net_osrm/net_nomenclature et build_network.store_network (delete+insert
là où c'est déjà fait, pour les lignes OSM). Ici on n'écrit QUE des nouveautés
(stops/lines/line_stops source='ktel') + des UPDATEs sur bus_routes.line_id, en séquence (pas de transaction Postgres — un crash mid-write laisse des nouvelles bus_lines orphelines, ré-injectables au prochain run via les ids preservés)."""
from ktel_match import match_routes_to_lines
from ktel_fallback import build_fallback_lines
from prices import PLACE_COORDS
from ktel_alias import load_aliases

MIN_BUS_LINES = 50   # sous ce seuil = SP1 OSM est cassé ou en cours, on n'apparier pas


def should_run(bus_lines):
    return len(bus_lines) >= MIN_BUS_LINES


def assemble_apparier(routes, osm_lines, stops_by_slug, aliases, place_coords,
                      existing_codes, fetch=None):
    """Retourne un dict { matched_to_osm, matched_to_fallback,
                          new_stops, new_lines, new_line_stops }."""
    matched, gaps = match_routes_to_lines(routes, osm_lines, stops_by_slug, aliases, place_coords)
    new_stops, new_lines, new_line_stops, fb_matched = build_fallback_lines(
        gaps, stops_by_slug, aliases, place_coords, existing_codes, fetch=fetch)
    return {
        "matched_to_osm": matched,
        "matched_to_fallback": fb_matched,
        "new_stops": new_stops,
        "new_lines": new_lines,
        "new_line_stops": new_line_stops,
    }


def _load_existing_codes(sb):
    """bus_lines existantes -> {key: code} (stabilité PREF-NN à travers les rebuilds)."""
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


def _load_state(sb):
    """Charge bus_routes (KTEL), bus_lines (réseau actuel), bus_stops indexés par slug."""
    routes = sb.table("bus_routes").select(
        "id,operator_id,from_place,to_place,duration").execute().data
    lines = sb.table("bus_lines").select("id,operator_id,code,name").execute().data
    # ré-extraire origin/dest depuis name "A <-> B" pour reconstruire le couple
    osm_lines = []
    for ln in lines:
        parts = ln["name"].split("<->")
        if len(parts) == 2:
            origin = parts[0].strip().lower().replace(" ", "-")
            dest = parts[1].strip().lower().replace(" ", "-")
            osm_lines.append({**ln, "origin": min(origin, dest), "dest": max(origin, dest)})
    stops = sb.table("bus_stops").select(
        "id,slug,name,name_el,lat,lng,prefecture,osm_id,coords_source").execute().data
    stops_by_slug = {s["slug"]: s for s in stops}
    return routes, osm_lines, stops_by_slug


def _persist(sb, result):
    """Écrit séquentiellement (REST supabase-py, pas de transaction) : nouveaux stops + lignes + line_stops + UPDATE bus_routes.line_id. Idempotent grâce aux PK uniques (slug, code) ; un crash partiel est rattrapé au run suivant."""
    if result["new_stops"]:
        sb.table("bus_stops").insert(result["new_stops"]).execute()
    if result["new_lines"]:
        sb.table("bus_lines").insert(result["new_lines"]).execute()
    # résoudre code -> id pour les nouvelles lignes
    new_codes = {l["code"] for l in result["new_lines"]}
    code_to_id = {}
    if new_codes:
        rows = sb.table("bus_lines").select("id,code").in_("code", list(new_codes)).execute().data
        code_to_id = {r["code"]: r["id"] for r in rows}
    # résoudre slug -> id pour line_stops
    slugs = {ls["stop_slug"] for ls in result["new_line_stops"]}
    if slugs:
        rows = sb.table("bus_stops").select("id,slug").in_("slug", list(slugs)).execute().data
        slug_to_id = {r["slug"]: r["id"] for r in rows}
        payload = [{
            "line_id": code_to_id[ls["line_code"]],
            "stop_id": slug_to_id[ls["stop_slug"]],
            "seq": ls["seq"],
            "cumulative_km": ls["cumulative_km"],
            "cumulative_minutes": ls["cumulative_minutes"],
        } for ls in result["new_line_stops"]
            if ls["line_code"] in code_to_id and ls["stop_slug"] in slug_to_id]
        if payload:
            sb.table("bus_line_stops").insert(payload).execute()
    # UPDATEs bus_routes.line_id groupés par line_id (1 UPDATE par ligne, pas par route)
    by_line = {}
    for route_id, line_id in result["matched_to_osm"].items():
        by_line.setdefault(line_id, []).append(route_id)
    for route_id, code in result["matched_to_fallback"].items():
        line_id = code_to_id.get(code)
        if line_id is not None:
            by_line.setdefault(line_id, []).append(route_id)
    n_updates = 0
    for line_id, route_ids in by_line.items():
        sb.table("bus_routes").update({"line_id": line_id}).in_("id", route_ids).execute()
        n_updates += len(route_ids)
    return n_updates


def run_apparier(sb):
    """Entrée prod : charge DB, apparier, écrit. Retourne un dict de compteurs."""
    routes, osm_lines, stops_by_slug = _load_state(sb)
    if not should_run(osm_lines):
        raise ValueError(f"refuse run SP2 : {len(osm_lines)} bus_lines (seuil {MIN_BUS_LINES})")
    aliases = load_aliases()
    existing = _load_existing_codes(sb)
    result = assemble_apparier(routes, osm_lines, stops_by_slug, aliases, PLACE_COORDS,
                                existing_codes=existing)
    n_updates = _persist(sb, result)
    return {
        "matched_to_osm": len(result["matched_to_osm"]),
        "fallback_lines": len(result["new_lines"]),
        "fallback_stops": len(result["new_stops"]),
        "route_line_id_updates": n_updates,
    }
