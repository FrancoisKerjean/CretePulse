-- Durées plan B (chantier 2 feedback crétois, 13/06/2026) : duration peut
-- être opérateur/curée (sourcée) ou estimation enveloppe au km.
-- duration_estimated=true => l'UI affiche « indicatif ». L'enveloppe est
-- calibrée haute (jamais sous la durée réelle des paires de référence) :
-- sûre pour le filtre de correspondance du JourneyPlanner.

alter table bus_routes
  add column if not exists duration_estimated boolean not null default false;

-- PostgREST self-hosted : recharger le cache de schema
notify pgrst, 'reload schema';
