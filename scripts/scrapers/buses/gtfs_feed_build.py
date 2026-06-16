"""Étape C du plan GTFS : assemble le flux complet (agency/routes/trips/stop_times/
calendar/feed_info + stops projeté) depuis bus_routes + gtfs_stops, et empaquette
crete.zip. Pur hormis : lecture DB (sb), fetch OSRM injecté, écriture fichiers/zip.
Décisions : docs/superpowers/specs/2026-06-16-gtfs-feed-assembly-design.md"""
import re


def parse_duration_min(duration):
    """'2h 30min' -> 150 ; '50min' -> 50 ; '1h' -> 60 ; None/illisible -> None."""
    if not duration:
        return None
    h = re.search(r"(\d+)\s*h", duration, re.I)
    m = re.search(r"(\d+)\s*min", duration, re.I)
    if not h and not m:
        return None
    return (int(h.group(1)) * 60 if h else 0) + (int(m.group(1)) if m else 0)


def add_minutes(t0, minutes):
    """'08:00' + offset minutes -> 'HH:MM:SS'. Heures >=24 tolérées (après-minuit)."""
    parts = t0.split(":")
    total = int(parts[0]) * 60 + int(parts[1]) + int(minutes)
    return f"{total // 60:02d}:{total % 60:02d}:00"
