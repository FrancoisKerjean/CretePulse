-- Ajoute departures_by_day (jsonb) pour stocker les horaires KTEL par sous-grille
-- (Mon-Fri / Sat / Sun, ou EVERY DAY, etc.). Resout le bug de fusion des grilles
-- dans `departures` qui produisait des doublons (91 routes /230 affectees au 02/06).
--
-- Format : [{"days": "Mon-Fri", "times": ["07:20", "10:00", "17:00"]}, ...]
--
-- `departures` est CONSERVE en flat sorted unique pour rétrocompat lecture
-- (carte aperçu, recherche, range affiche en haut de carte route).

alter table bus_routes
  add column if not exists departures_by_day jsonb;

-- PostgREST self-hosted : recharger le cache de schema
notify pgrst, 'reload schema';
