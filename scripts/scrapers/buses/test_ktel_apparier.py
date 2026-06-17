from ktel_apparier import assemble_apparier, MIN_BUS_LINES, should_run

# stubs pour le pipeline : on teste assemble (pur), pas store (Supabase requis).


def _fake_osrm(coords):
    return {"code": "Ok", "routes": [{
        "geometry": {"coordinates": [[c[1], c[0]] for c in coords]},
        "legs": [{"distance": 30_000.0} for _ in range(len(coords) - 1)]}]}


def test_assemble_apparier_matches_osm_and_emits_fallback():
    # 4 routes : 2 vers une ligne OSM existante (Heraklion<->Matala) ; 2 vers une paire orpheline (Heraklion<->Mires)
    routes = [
        {"id": 1, "operator_id": "herlas", "from_place": "Heraklion", "to_place": "Matala", "duration": "2h"},
        {"id": 2, "operator_id": "herlas", "from_place": "Matala", "to_place": "Heraklion", "duration": "2h"},
        {"id": 3, "operator_id": "herlas", "from_place": "Heraklion", "to_place": "Mires", "duration": "1h"},
        {"id": 4, "operator_id": "herlas", "from_place": "Mires", "to_place": "Heraklion", "duration": "1h"},
    ]
    osm_lines = [
        {"id": 50, "operator_id": "herlas", "origin": "erakleio", "dest": "matala", "code": "HER-10"},
    ]
    stops_by_slug = {
        "erakleio": {"slug": "erakleio", "name": "Erakleio", "lat": 35.3387, "lng": 25.1442, "prefecture": "HER", "osm_id": 1, "coords_source": "osm"},
        "matala":   {"slug": "matala",   "name": "Matala",   "lat": 34.9970, "lng": 24.7470, "prefecture": "HER", "osm_id": 2, "coords_source": "osm"},
    }
    aliases = {"heraklion": "erakleio"}
    place_coords = {"mires": (35.0700, 24.8525)}
    existing_codes = {}
    result = assemble_apparier(
        routes, osm_lines, stops_by_slug, aliases, place_coords, existing_codes, fetch=_fake_osrm)
    # 2 routes matchées à HER-10
    assert result["matched_to_osm"] == {1: 50, 2: 50}
    # 1 nouveau stop ('mires' créé), 1 nouvelle ligne fallback, 2 line_stops, 2 routes matchées au fallback
    assert len(result["new_stops"]) == 1
    assert result["new_stops"][0]["slug"] == "mires"
    assert len(result["new_lines"]) == 1
    assert result["new_lines"][0]["source"] == "ktel"
    assert len(result["new_line_stops"]) == 2
    assert set(result["matched_to_fallback"].keys()) == {3, 4}


def test_should_run_guards_against_empty_bus_lines():
    assert should_run([{}] * MIN_BUS_LINES) is True
    assert should_run([{}] * (MIN_BUS_LINES - 1)) is False
    assert should_run([]) is False


def test_assemble_apparier_ignores_routes_with_unresolved_terminus():
    routes = [{"id": 1, "operator_id": "herlas", "from_place": "Heraklion", "to_place": "GhostlyVillage", "duration": "1h"}]
    osm_lines = []
    stops_by_slug = {"erakleio": {"slug": "erakleio", "name": "Erakleio", "lat": 35.34, "lng": 25.14, "prefecture": "HER", "osm_id": 1, "coords_source": "osm"}}
    aliases = {"heraklion": "erakleio"}
    place_coords = {}
    result = assemble_apparier(routes, osm_lines, stops_by_slug, aliases, place_coords, existing_codes={}, fetch=lambda url: None)
    assert result["matched_to_osm"] == {}
    assert result["matched_to_fallback"] == {}
    assert result["new_lines"] == []


def test_assemble_apparier_passe2_gps_rattrape_gap():
    """Passe 2 GPS : une route non résolue par le match strict est rattrapée via coordonnées.

    Scénario : la route (id=10, herlas, Agios Nikolaos -> Sitia) atterrit dans les gaps
    parce que la résolution stricte mappe les noms KTEL vers des slugs de bus-stops
    qui ne correspondent PAS aux extrémités de la ligne OSM 99 (ag-nikolaos-osm /
    sitia-osm) — il y a un arrêt « ag-nikolaos-bus » plus proche dans stops_by_slug.
    Mais les place_coords de ces terminus sont à < 3 km des stops OSM de la ligne 99,
    donc la passe 2 GPS doit rattacher la route 10 → line_id 99.
    """
    routes = [
        {"id": 10, "operator_id": "herlas", "from_place": "Agios Nikolaos", "to_place": "Sitia",
         "duration": "1h"},
    ]
    # Ligne OSM 99 utilise des slugs spécifiques ag-nikolaos-osm / sitia-osm
    osm_lines = [
        {"id": 99, "operator_id": "herlas", "origin": "ag-nikolaos-osm", "dest": "sitia-osm",
         "code": "LAS-99"},
    ]
    # stops_by_slug contient :
    #   - ag-nikolaos-bus : PLUS PROCHE de place_coords["agios nikolaos"] que ag-nikolaos-osm
    #     → la résolution stricte (ktel_resolve step 3) le choisit → clé ne matche pas OSM 99
    #   - ag-nikolaos-osm : extrémité réelle de la ligne OSM 99 (un peu plus loin)
    #   - sitia-bus : PLUS PROCHE de place_coords["sitia"] que sitia-osm
    #   - sitia-osm : extrémité réelle de la ligne OSM 99
    stops_by_slug = {
        "ag-nikolaos-bus": {"slug": "ag-nikolaos-bus", "name": "Agios Nikolaos Bus",
                             "lat": 35.1920, "lng": 25.7220,
                             "prefecture": "LAS", "osm_id": 20, "coords_source": "osm"},
        "ag-nikolaos-osm": {"slug": "ag-nikolaos-osm", "name": "Agios Nikolaos",
                             "lat": 35.1950, "lng": 25.7250,
                             "prefecture": "LAS", "osm_id": 21, "coords_source": "osm"},
        "sitia-bus":       {"slug": "sitia-bus",        "name": "Sitia Bus",
                             "lat": 35.2055, "lng": 26.1005,
                             "prefecture": "LAS", "osm_id": 22, "coords_source": "osm"},
        "sitia-osm":       {"slug": "sitia-osm",        "name": "Sitia",
                             "lat": 35.2065, "lng": 26.1015,
                             "prefecture": "LAS", "osm_id": 23, "coords_source": "osm"},
    }
    # aliases vide → pas de raccourci direct
    aliases = {}
    # place_coords pour les noms KTEL :
    #   "agios nikolaos" : (35.1900, 25.7200) → dist à ag-nikolaos-bus ~0.28 km (la plus proche)
    #                                          → dist à ag-nikolaos-osm ~0.62 km
    #   "sitia"          : (35.2040, 26.0990) → dist à sitia-bus ~0.22 km (la plus proche)
    #                                          → dist à sitia-osm ~0.38 km
    # Résolution stricte → ag-nikolaos-bus et sitia-bus → clé != OSM 99 → gaps
    # GPS pass 2 → haversine(place_coords, stop_osm) < 3.0 km pour les deux → match OSM 99
    place_coords = {
        "agios nikolaos": (35.1900, 25.7200),
        "sitia":          (35.2040, 26.0990),
    }
    existing_codes = {}
    result = assemble_apparier(
        routes, osm_lines, stops_by_slug, aliases, place_coords, existing_codes,
        fetch=_fake_osrm)
    # La passe 2 GPS doit avoir rattrapé la route 10 → ligne OSM 99
    assert result["matched_to_osm"] == {10: 99}, (
        f"Passe 2 GPS a échoué : matched_to_osm={result['matched_to_osm']}"
    )
    # ...et la route NE DOIT PAS aussi générer une ligne fallback (sinon le fallback
    # écraserait le match OSM au persist). GPS passe AVANT le fallback, gaps réduits.
    assert 10 not in result["matched_to_fallback"], (
        f"Route GPS ne doit pas être en fallback : {result['matched_to_fallback']}"
    )
    assert result["new_lines"] == [], (
        f"Aucune ligne fallback ne doit être créée pour un trajet rattrapé par GPS : {result['new_lines']}"
    )
