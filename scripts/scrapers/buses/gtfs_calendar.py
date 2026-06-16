"""Port Python de daysMatch (src/lib/bus-journey.ts) : résout un libellé de jours
KTEL en l'ensemble ordonné des jours de semaine couverts, pour calendar.txt.
Aucun I/O."""
import re

DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
_TOKEN = r"(mon|tue|wed|thu|fri|sat|sun)"
# séparateur de plage : tiret ASCII ou demi-cadratin U+2013. Certains libellés KTEL
# utilisent le demi-cadratin ; le char class le couvre, comme daysMatch d'origine.
_SEP = "[-–]"


def _day_matches(norm, d):
    """norm = libellé minusculé ; d = token jour ('mon'..'sun'). Reproduit daysMatch."""
    if "every" in norm or "daily" in norm:
        return True
    if "weekend" in norm:
        return d in ("sat", "sun")
    if "weekday" in norm:
        return d not in ("sat", "sun")
    # noms complets -> tokens 3 lettres ("monday to friday" -> "mon to fri")
    norm = re.sub(r"\b" + _TOKEN + r"[a-z]*", r"\1", norm)
    tokens = re.findall(_TOKEN, norm)
    rng = None
    if len(tokens) == 2:
        rng = re.search(_TOKEN + r"\s*(?:" + _SEP + r"|to)\s*" + _TOKEN, norm)
    if rng:
        i, j = DAY_ORDER.index(rng.group(1)), DAY_ORDER.index(rng.group(2))
        k = DAY_ORDER.index(d)
        return (i <= k <= j) if i <= j else (k >= i or k <= j)
    return d in tokens


def days_to_weekdays(label):
    """Liste ordonnée (lun->dim) des jours couverts par le libellé. [] si vide."""
    if not label:
        return []
    norm = label.lower()
    return [d for d in DAY_ORDER if _day_matches(norm, d)]


def service_id_for(weekdays):
    """Identifiant de service déterministe : masque 7 bits 'svc-1111100' (lun..dim)."""
    bits = "".join("1" if d in weekdays else "0" for d in DAY_ORDER)
    return f"svc-{bits}"
