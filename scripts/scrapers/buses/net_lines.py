"""Fusion conservatrice des routes en lignes (corridors). Une ligne = un couple de
terminus (bidirectionnel), avec la séquence d'arrêts la plus complète observée.
Heuristique : on regroupe par {operator, frozenset(terminus)} ; au sein du groupe
on garde la séquence la plus longue observée (orientée sur le terminus alphabétique
premier). Pas de fusion entre opérateurs ni entre terminus différents (conservateur :
évite de fabriquer de faux corridors ou un ordre d'arrêts inédit)."""
from net_geocode import stop_slug


def route_sequence(route):
    seq = [route["from_place"], *(route.get("via_stops") or []), route["to_place"]]
    out = []
    for n in seq:
        s = stop_slug(n) if n else None
        if s and (not out or out[-1] != s):
            out.append(s)
    return out


def merge_into_lines(routes):
    groups = {}  # (operator, frozenset(terminus_slugs)) -> list[(seq, route)]
    for r in routes:
        seq = route_sequence(r)
        if len(seq) < 2:
            continue
        termini = frozenset({seq[0], seq[-1]})
        key = (r.get("operator_id"), termini)
        groups.setdefault(key, []).append((seq, r))

    lines = []
    for (operator, termini), members in groups.items():
        # orientation canonique : terminus alphabétiquement premier en tête
        a, b = sorted(termini) if len(termini) == 2 else (next(iter(termini)), next(iter(termini)))
        oriented = []
        for seq, r in members:
            oriented.append(seq if seq[0] == a else list(reversed(seq)))
        # superset = la plus longue séquence observée (conservateur : on ne fabrique
        # pas d'ordre inédit en combinant des séquences partielles). Tie-break sur la
        # séquence elle-même = déterministe entre builds (stabilité des codes PREF-NN).
        stops = max(oriented, key=lambda s: (len(s), s))
        route_ids = [r.get("id") for _, r in members if r.get("id") is not None]
        lines.append({
            "operator_id": operator,
            "origin": a,
            "dest": b,
            "stops": stops,
            "route_ids": route_ids,
            "key": f"{a}|{b}|{operator}",
        })
    lines.sort(key=lambda l: l["key"])
    return lines
