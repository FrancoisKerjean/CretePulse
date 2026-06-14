"""Nomenclature crete.direct des lignes : préfecture par proximité, code PREF-NN
stable entre builds, couleur dérivée. Aucun I/O."""
from prices import haversine_km

PREFECTURE_CENTERS = {
    "HER": (35.3387, 25.1442),   # Heraklion
    "LAS": (35.1909, 25.7136),   # Agios Nikolaos
    "CHA": (35.5138, 24.0180),   # Chania
    "RET": (35.3644, 24.4821),   # Rethymno
}

# Palette par préfecture (charte aegean/lagon), variée par hash du code.
_PREF_BASE = {"HER": "#0B5E78", "LAS": "#00838F", "CHA": "#ED7A5C", "RET": "#C8A35F"}


def prefecture_for(lat, lng):
    if lat is None or lng is None:
        return None
    return min(PREFECTURE_CENTERS, key=lambda p: haversine_km(PREFECTURE_CENTERS[p], (lat, lng)))


def assign_codes(lines, existing=None):
    """Attribue PREF-NN. `existing` = {key: code} déjà émis (stabilité). Les lignes
    déjà mappées gardent leur code ; les nouvelles prennent les rangs libres.
    Tri des nouvelles : longueur décroissante puis key (déterministe)."""
    existing = dict(existing or {})
    out = {}
    used = {}  # prefecture -> set(rangs pris)
    # 1) honorer l'existant
    for ln in lines:
        code = existing.get(ln["key"])
        if code:
            pref, num = code.split("-")
            out[ln["key"]] = code
            used.setdefault(pref, set()).add(int(num))
    # 2) numéroter les nouvelles
    by_pref = {}
    for ln in lines:
        if ln["key"] in out:
            continue
        pref = prefecture_for(ln.get("origin_lat"), ln.get("origin_lng")) or "HER"
        by_pref.setdefault(pref, []).append(ln)
    for pref, items in by_pref.items():
        items.sort(key=lambda l: (-(l.get("length_km") or 0), l["key"]))
        taken = used.setdefault(pref, set())
        n = 1
        for ln in items:
            while n in taken:
                n += 1
            taken.add(n)
            out[ln["key"]] = f"{pref}-{n:02d}"
            n += 1
    return out


def color_for(code):
    pref = code.split("-")[0]
    base = _PREF_BASE.get(pref, "#0B5E78")
    # variation déterministe de teinte par le numéro (rotation légère du dernier octet)
    try:
        num = int(code.split("-")[1])
    except (IndexError, ValueError):
        return base
    r, g, b = int(base[1:3], 16), int(base[3:5], 16), int(base[5:7], 16)
    shift = (num * 23) % 60 - 30
    b = max(0, min(255, b + shift))
    return f"#{r:02X}{g:02X}{b:02X}"
