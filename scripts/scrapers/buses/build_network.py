"""Pipeline réseau : lit bus_routes, assemble bus_stops/bus_lines/bus_line_stops
(fonctions pures + OSRM injecté), écrit en delete+insert avec garde-fou.
Lancé par buses.py après le scrape. Aucun réseau vide en prod."""
from prices import PLACE_COORDS, _norm, haversine_km
from net_geocode import collect_stops, stop_slug, coords_index_by_slug, geocode_slug
from net_lines import merge_into_lines
from net_osrm import build_geometry
from net_timeprofile import cumulative_profile
from net_nomenclature import assign_codes, color_for, prefecture_for
from net_places import canonical_slug, display_name, load_allowlist

MIN_STOPS = 20    # sous ce seuil = assemblage suspect, on ne touche pas la DB
MIN_LINES = 5


def should_build_network(stops, lines):
    return len(stops) >= MIN_STOPS and len(lines) >= MIN_LINES


def _parse_duration_min(duration):
    if not duration:
        return None
    import re
    h = re.search(r"(\d+)\s*h", duration, re.I)
    m = re.search(r"(\d+)\s*min", duration, re.I)
    if not h and not m:
        return None
    return (int(h.group(1)) * 60 if h else 0) + (int(m.group(1)) if m else 0)


def _title(slug):
    return slug.replace("-", " ").title()


def _seq_length_km(seq_stops):
    """Longueur haversine d'une séquence d'arrêts géocodés (segments à trou = 0)."""
    total = 0.0
    for i in range(1, len(seq_stops)):
        a, b = seq_stops[i - 1], seq_stops[i]
        if a and b and a.get("lat") is not None and b.get("lat") is not None:
            total += haversine_km((a["lat"], a["lng"]), (b["lat"], b["lng"]))
    return round(total, 2)


def curate_routes(routes):
    """Canonise from/to/via en slugs (filtrage hybride). Jette une route dont un
    terminus est du bruit ; retire les via bruit ; dédoublonne via les slugs."""
    out = []
    for r in routes:
        a, b = canonical_slug(r["from_place"]), canonical_slug(r["to_place"])
        if a is None or b is None:
            continue  # terminus bruit -> route entière écartée
        via = []
        for v in (r.get("via_stops") or []):
            cs = canonical_slug(v)
            if cs is not None and cs not in (a, b) and cs not in via:
                via.append(cs)
        out.append({**r, "from_place": a, "to_place": b, "via_stops": via or None})
    return out


def assemble_network(routes, place_coords, cb_index, fetch=None, nominatim=None, existing_codes=None):
    """Retourne (stops, lines, line_stops). Pur hormis OSRM (fetch injecté)."""
    # 1) référentiel d'arrêts géocodés par slug + flag needs_review
    allowlist = load_allowlist()
    allow_slugs = set(allowlist.values())
    raw_stops = collect_stops(routes)
    names_by_slug = {s["slug"]: display_name(s["name"]) for s in raw_stops}
    coords_index = coords_index_by_slug(place_coords, cb_index, names_by_slug)
    # Pont allowlist : indexe les coords PLACE_COORDS sous le slug CANONIQUE quand
    # l'orthographe DB diffère du slug (ex "Siteia"->"sitia", "Hersonisos"->
    # "hersonissos", "Faistos"->"phaistos"). Sans ce pont, ces hubs ne seraient pas
    # géocodés par le référentiel (slug canonique != stop_slug de la clé PLACE_COORDS).
    for nom_db, slug in allowlist.items():
        if slug not in coords_index:
            k = _norm(nom_db)
            if k in place_coords:
                coords_index[slug] = place_coords[k]
    stops, stop_by_slug = [], {}
    for s in raw_stops:
        slug = s["slug"]
        disp = names_by_slug[slug]
        lat, lng, source, conf = geocode_slug(slug, disp, coords_index, nominatim=nominatim)
        rec = {"slug": slug, "name": disp, "name_el": None,
               "lat": lat, "lng": lng, "prefecture": prefecture_for(lat, lng),
               "coords_source": source, "coords_confidence": conf,
               "needs_review": slug not in allow_slugs}
        stops.append(rec)
        stop_by_slug[slug] = rec

    # 2) lignes (corridors) + durée connue par couple terminus
    lines_raw = merge_into_lines(routes)
    dur_by_termini = {}
    for r in routes:
        a, b = stop_slug(r["from_place"]), stop_slug(r["to_place"])
        d = _parse_duration_min(r.get("duration"))
        if d is not None:
            dur_by_termini[frozenset({a, b})] = d

    # 3) codes nomenclature : longueur haversine provisoire pour ordonner
    #    (axe principal = la plus longue ligne d'une préfecture en premier)
    for ln in lines_raw:
        o = stop_by_slug.get(ln["origin"], {})
        ln["origin_lat"], ln["origin_lng"] = o.get("lat"), o.get("lng")
        seq_stops = [stop_by_slug.get(s) for s in ln["stops"]]
        ln["length_km"] = _seq_length_km(seq_stops)
    codes = assign_codes(lines_raw, existing=existing_codes)

    # 4) géométrie OSRM + profil de temps par ligne
    lines, line_stops = [], []
    for ln in lines_raw:
        code = codes[ln["key"]]
        # Invariant : tout slug de ln["stops"] vient de route_sequence (stop_slug),
        # comme les clés de stop_by_slug (collect_stops/stop_slug) -> le filtre ne
        # retire jamais rien, donc seq_stops et ln["stops"] restent index-alignés
        # avec cum_km/profile ci-dessous (la garde `if s in stop_by_slug` est défensive).
        seq_stops = [stop_by_slug[s] for s in ln["stops"] if s in stop_by_slug]
        geo = build_geometry(seq_stops, fetch=fetch)
        total = dur_by_termini.get(frozenset({ln["origin"], ln["dest"]}))
        profile = cumulative_profile(geo["leg_km"], total)
        cum_km, acc = [0.0], 0.0
        for d in geo["leg_km"]:
            acc += d
            cum_km.append(round(acc, 2))
        lines.append({
            "code": code,
            "name": f"{_title(ln['origin'])} <-> {_title(ln['dest'])}",
            "prefecture": code.split("-")[0],
            "operator_id": ln["operator_id"],
            "geometry": geo["geometry"],
            "color": color_for(code),
            "length_km": geo["length_km"],
            "total_minutes": profile[-1] if profile else None,
            "partial_geo": geo["partial"],
        })
        for i, s in enumerate(ln["stops"]):
            line_stops.append({
                "line_code": code, "stop_slug": s, "seq": i,
                "cumulative_km": cum_km[i] if i < len(cum_km) else cum_km[-1],
                "cumulative_minutes": profile[i] if i < len(profile) else profile[-1],
            })
    return stops, lines, line_stops


def _load_cb_index(sb):
    """cb_places -> {nom_normalisé: (lat,lng)} (best-effort, vide si absente).
    NB : PostgREST cape à 1000 lignes ; cb_places ne sert que d'appoint au géocodage
    (le filet principal = PLACE_COORDS + Nominatim), la troncature est tolérée."""
    try:
        rows = sb.table("cb_places").select("name,latitude,longitude").execute().data
        return {_norm(r["name"]): (r["latitude"], r["longitude"]) for r in rows
                if r.get("name") and r.get("latitude") is not None and r.get("longitude") is not None}
    except Exception:
        return {}


def _load_existing_codes(sb):
    """bus_lines existantes -> {key: code} pour stabilité (key = origin|dest|operator)."""
    try:
        rows = sb.table("bus_lines").select("code,name,operator_id").execute().data
        out = {}
        for r in rows:
            parts = r["name"].split("<->")
            if len(parts) == 2:
                a = parts[0].strip().lower().replace(" ", "-")
                b = parts[1].strip().lower().replace(" ", "-")
                key = f"{min(a, b)}|{max(a, b)}|{r['operator_id']}"
                out[key] = r["code"]
        return out
    except Exception:
        return {}


def store_network(sb, stops, lines, line_stops):
    """Écrit les 3 tables (delete+insert). Résout les FK par slug/code après insert.
    Lève si le garde-fou n'est pas satisfait."""
    if not should_build_network(stops, lines):
        raise ValueError(f"refuse build: {len(stops)} stops / {len(lines)} lines")
    sb.table("bus_line_stops").delete().neq("line_id", 0).execute()
    sb.table("bus_lines").delete().neq("id", 0).execute()
    sb.table("bus_stops").delete().neq("id", 0).execute()
    sb.table("bus_stops").insert(stops).execute()
    stop_id = {r["slug"]: r["id"] for r in
               sb.table("bus_stops").select("id,slug").execute().data}
    sb.table("bus_lines").insert(lines).execute()
    line_id = {r["code"]: r["id"] for r in
               sb.table("bus_lines").select("id,code").execute().data}
    payload = [{
        "line_id": line_id[ls["line_code"]],
        "stop_id": stop_id[ls["stop_slug"]],
        "seq": ls["seq"],
        "cumulative_km": ls["cumulative_km"],
        "cumulative_minutes": ls["cumulative_minutes"],
    } for ls in line_stops if ls["line_code"] in line_id and ls["stop_slug"] in stop_id]
    sb.table("bus_line_stops").insert(payload).execute()
    return len(stops), len(lines), len(payload)


def build_network(sb, nominatim=None):
    """Point d'entrée : lit bus_routes, cure, assemble, écrit. Retourne (n_stops,n_lines,n_ls)."""
    routes = sb.table("bus_routes").select(
        "id,operator_id,from_place,to_place,via_stops,duration").execute().data
    routes = curate_routes(routes)
    cb_index = _load_cb_index(sb)
    existing = _load_existing_codes(sb)
    stops, lines, line_stops = assemble_network(
        routes, PLACE_COORDS, cb_index, nominatim=nominatim, existing_codes=existing)
    return store_network(sb, stops, lines, line_stops)
