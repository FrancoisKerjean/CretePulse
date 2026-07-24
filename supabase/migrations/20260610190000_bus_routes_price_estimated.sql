-- Prix indicatifs (plan B validé Kami 10/06/2026, spec bus-journey-planner) :
-- price_eur peut être officiel (scrape/curation) ou estimé au km.
-- price_estimated=true => l'UI affiche la mention « indicatif ».

alter table bus_routes
  add column if not exists price_estimated boolean not null default false;

-- PostgREST self-hosted : recharger le cache de schema
notify pgrst, 'reload schema';
