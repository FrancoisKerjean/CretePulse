"""Match strict des routes KTEL aux lignes du réseau : (operator, frozenset(termini)).
Une route dont les 2 terminus résolvent à (a, b) matche la ligne OSM/KTEL ayant
exactement (operator, frozenset({a, b})). Les non-matches sont groupés par paire
pour alimenter le fallback. Aucun I/O."""
from collections import defaultdict
from ktel_resolve import resolve


def match_routes_to_lines(routes, lines, stops_by_slug, aliases, place_coords):
    """Retourne (matched, gaps) :
      matched = {route_id: line_id}
      gaps    = {(operator, frozenset({a, b})): [route, ...]}  # routes non matchées
                 avec les DEUX terminus résolus (sinon route ignorée)."""
    index = {}
    for ln in lines:
        index[(ln["operator_id"], frozenset({ln["origin"], ln["dest"]}))] = ln["id"]
    matched = {}
    gaps = defaultdict(list)
    for r in routes:
        a = resolve(r.get("from_place"), stops_by_slug, aliases, place_coords)
        b = resolve(r.get("to_place"),   stops_by_slug, aliases, place_coords)
        if not a or not b or a == b:
            continue
        key = (r.get("operator_id"), frozenset({a, b}))
        line_id = index.get(key)
        if line_id is not None:
            matched[r["id"]] = line_id
        else:
            gaps[key].append(r)
    return matched, dict(gaps)
