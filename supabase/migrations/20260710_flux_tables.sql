-- Historisation flux touristiques (plan 2026-07-10, couches 2+3).
-- Écriture : scripts VPS /opt/cretepulse/flux/ via psycopg2 (user postgres).
-- Lecture future éventuelle côté site : service_role only, jamais anon (données internes).

create table if not exists public.flux_bus_positions (
  id bigint generated always as identity primary key,
  source text not null,              -- 'agncitybus' | 'citybus-her' | 'citybus-cha'
  line_code text,
  vehicle_key text not null,         -- sha256 tronqué (imei/vehicleCode), RGPD-safe
  lat double precision not null,
  lng double precision not null,
  speed_kmh double precision,
  bearing double precision,
  recorded_at timestamptz not null default now()
);
create index if not exists idx_flux_bus_pos on public.flux_bus_positions (source, recorded_at);

create table if not exists public.flux_flight_arrivals (
  id bigint generated always as identity primary key,
  airport text not null default 'HER',
  service_date date not null,
  sched_time text not null,          -- 'HH:MM' heure locale affichée
  flight_no text not null,
  airline_code text,
  origin text,
  status text,
  belt text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  landed_at timestamptz,
  unique (airport, service_date, flight_no, sched_time)
);

create table if not exists public.flux_cruise_calls (
  id bigint generated always as identity primary key,
  port text not null default 'heraklion',
  call_date date not null,
  ship_name text not null,
  eta text,
  etd text,
  pax_capacity int,
  source text not null default 'portheraklion-pdf',
  updated_at timestamptz not null default now(),
  unique (port, call_date, ship_name)
);

create table if not exists public.flux_interest_daily (
  id bigint generated always as identity primary key,
  source text not null,              -- 'wikipedia' (v1)
  entity text not null,              -- titre article
  lang text not null default 'en',
  day date not null,
  value double precision not null,
  unique (source, entity, lang, day)
);

create table if not exists public.flux_crowd_snapshots (
  id bigint generated always as identity primary key,
  place_name text not null,
  lat double precision,
  lng double precision,
  captured_at timestamptz not null default now(),
  current_popularity int,            -- live 0-100, null si Google ne l'expose pas
  usual_popularity int               -- baseline heure courante
);

create table if not exists public.flux_zone_occupancy (
  id bigint generated always as identity primary key,
  zone text not null,
  snapshot_date date not null,
  listings_count int not null,
  occupancy_rate_30 double precision,
  occupancy_rate_60 double precision,
  occupancy_rate_90 double precision,
  unique (zone, snapshot_date)
);

revoke all on public.flux_bus_positions, public.flux_flight_arrivals, public.flux_cruise_calls,
  public.flux_interest_daily, public.flux_crowd_snapshots, public.flux_zone_occupancy
  from anon, authenticated;
grant select on public.flux_bus_positions, public.flux_flight_arrivals, public.flux_cruise_calls,
  public.flux_interest_daily, public.flux_crowd_snapshots, public.flux_zone_occupancy
  to service_role;

notify pgrst, 'reload schema';
