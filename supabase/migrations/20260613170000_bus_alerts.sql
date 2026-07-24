-- Alertes service KTEL Est (scraper alerts.py, cron QUOTIDIEN) : annonces datées
-- du flux ktelherlas (itinéraires modifiés ?tags=mods, renforts ?tags=extra_routes,
-- travaux/fermetures). But : ne pas laisser un voyageur se fier à un horaire alors
-- que la ligne est modifiée/suspendue ce jour-là. Est uniquement : le KTEL Ouest
-- (e-ktel) ne publie aucune annonce datée scrapable (constat 13/06/2026).

create table if not exists bus_alerts (
  id              bigserial primary key,
  operator_id     text references bus_operators(id) default 'herlas',
  slug            text not null unique,          -- slug article ktelherlas (clé de dédup/upsert)
  title           text not null,
  category        text,                          -- 'mods' | 'extra_routes'
  published_date  date,
  url             text not null,                 -- lien vers l'annonce officielle
  matched_routes  text[] default '{}',           -- hubs/lignes détectés dans le titre
  scraped_at      timestamptz not null default now()
);
create index if not exists idx_bus_alerts_date on bus_alerts (published_date desc);

-- Lecture publique (site), écriture réservée au service role (scraper)
alter table bus_alerts enable row level security;
drop policy if exists "public read alerts" on bus_alerts;
create policy "public read alerts" on bus_alerts for select using (true);

grant select on bus_alerts to anon, authenticated;
grant all    on bus_alerts to service_role;
grant usage, select on sequence bus_alerts_id_seq to service_role;

-- PostgREST self-hosted : recharger le cache de schema pour exposer la table
notify pgrst, 'reload schema';
