"""Profil de temps d'une ligne : offset cumulé (minutes) de passage à chaque arrêt
depuis le terminus origine, proportionnel à la distance routière cumulée et calé
sur la durée totale réelle. Aucun I/O."""
from durations import BASE_MIN, MIN_PER_KM


def cumulative_profile(leg_km, total_minutes):
    """leg_km : distances des N segments (N+1 arrêts). Retourne N+1 offsets minutes,
    profil[0]=0, profil[-1]=total_minutes."""
    n_stops = len(leg_km) + 1
    cum_km = [0.0]
    for d in leg_km:
        cum_km.append(cum_km[-1] + max(0.0, d))
    total_km = cum_km[-1]

    if total_minutes is None:
        total_minutes = round(BASE_MIN + total_km * MIN_PER_KM)

    if total_km <= 0:
        # arrêts non géocodés / colocalisés : répartition uniforme
        return [round(total_minutes * i / (n_stops - 1)) for i in range(n_stops)] if n_stops > 1 else [0]

    return [round(total_minutes * (k / total_km)) for k in cum_km]
