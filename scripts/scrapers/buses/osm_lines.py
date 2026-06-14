"""Fusion des relations OSM en lignes : regroupe par (opérateur, couple de
terminus), fusionne aller/retour et variantes en gardant la séquence la plus
complète (orientation canonique = terminus alphabétique premier)."""


def merge_osm_lines(relations):
    groups = {}
    for r in relations:
        slugs = r["stop_slugs"]
        if len(slugs) < 2:
            continue
        termini = frozenset({slugs[0], slugs[-1]})
        if len(termini) < 2:
            continue
        groups.setdefault((r["operator"], termini), []).append(r)
    lines = []
    for (operator, termini), members in groups.items():
        a, b = sorted(termini)
        oriented = []
        for r in members:
            s = r["stop_slugs"]
            oriented.append(s if s[0] == a else list(reversed(s)))
        stops = max(oriented, key=lambda s: (len(s), s))   # tie-break déterministe
        refs = sorted(r["ref"] for r in members if r["ref"])
        ref = refs[0] if refs else None
        lines.append({
            "operator_id": operator, "origin": a, "dest": b,
            "stops": stops, "ref": ref,
            "osm_ids": sorted(r["osm_id"] for r in members),
            "key": f"{a}|{b}|{operator}",
        })
    lines.sort(key=lambda l: l["key"])
    return lines
