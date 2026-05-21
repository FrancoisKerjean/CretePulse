-- Page /buses ressource bus de reference : 3 tables.
-- bus_operators (seed), bus_destinations (cure one-shot), bus_routes (scraper hebdo).
-- Self-hosted Postgres + PostgREST sur le VPS (container cretepulse-postgres).

-- Operateurs KTEL
create table if not exists bus_operators (
  id          text primary key,            -- 'herlas' | 'ektel'
  name        text not null,
  region      text not null,               -- 'east' | 'west'
  source_url  text not null
);

-- Destinations curees (branche le sas guides + extension plages/villages/sites)
create table if not exists bus_destinations (
  slug               text primary key,      -- 'chania', 'elafonissi', 'knossos'
  name               text not null,
  type               text not null,         -- 'town' | 'beach' | 'village' | 'site'
  region             text,                  -- 'east' | 'west'
  lat                numeric,
  lng                numeric,
  things_to_do_slug  text,                  -- /things-to-do/[city]
  where_to_stay_slug text,                  -- /where-to-stay/[area]
  beaches_near       boolean default false,
  has_direct_bus     boolean default true
);

-- Lignes de bus (alimentees par le scraper)
create table if not exists bus_routes (
  id           bigserial primary key,
  operator_id  text references bus_operators(id),
  from_place   text not null,
  to_place     text not null,
  to_slug      text references bus_destinations(slug),
  season       text not null default 'all', -- 'summer' | 'winter' | 'all'
  duration     text,
  price_eur    numeric,
  frequency    text,
  departures   jsonb,
  source_url   text not null,
  scraped_at   timestamptz not null default now()
);
create index if not exists idx_bus_routes_from_to on bus_routes (from_place, to_place);
create index if not exists idx_bus_routes_to_slug on bus_routes (to_slug);

-- Lecture publique (site statique), ecriture reservee au service role
alter table bus_operators    enable row level security;
alter table bus_destinations enable row level security;
alter table bus_routes       enable row level security;

drop policy if exists "public read operators"    on bus_operators;
drop policy if exists "public read destinations" on bus_destinations;
drop policy if exists "public read routes"        on bus_routes;

create policy "public read operators"    on bus_operators    for select using (true);
create policy "public read destinations" on bus_destinations for select using (true);
create policy "public read routes"        on bus_routes       for select using (true);

-- Grants table-level (non herites automatiquement par les roles PostgREST sur tables neuves)
grant select on bus_operators, bus_destinations, bus_routes to anon, authenticated;
grant all    on bus_operators, bus_destinations, bus_routes to service_role; -- seed + scraper
grant usage, select on sequence bus_routes_id_seq to service_role;

-- Seed operateurs
insert into bus_operators (id, name, region, source_url) values
  ('herlas', 'KTEL Heraklion-Lasithi', 'east', 'https://www.ktelherlas.gr/en/timetables'),
  ('ektel',  'KTEL Chania-Rethymno',  'west', 'https://www.e-ktel.com/en/services/dromologia')
on conflict (id) do nothing;

-- PostgREST self-hosted : recharger le cache de schema pour exposer les nouvelles tables
notify pgrst, 'reload schema';
