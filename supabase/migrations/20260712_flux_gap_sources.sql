-- Sources manquantes du cockpit flux : ports, economie regionale et route.
-- Lecture interne uniquement ; aucune donnee personnelle.

create table if not exists public.flux_port_quarterly (
  quarter date not null,
  port text not null,
  direction text not null check (direction in ('embarked', 'disembarked')),
  passengers bigint not null check (passengers >= 0),
  source_url text not null,
  updated_at timestamptz not null default now(),
  primary key (quarter, port, direction)
);

create table if not exists public.flux_economy_annual (
  year int not null check (year between 2000 and 2100),
  region text not null,
  metric text not null,
  value double precision not null,
  unit text not null,
  source_url text not null,
  updated_at timestamptz not null default now(),
  primary key (year, region, metric)
);

create table if not exists public.flux_road_probes (
  id text primary key,
  corridor text not null,
  point_lat double precision not null,
  point_lng double precision not null,
  active boolean not null default true,
  note text
);

create table if not exists public.flux_road_observations (
  id bigint generated always as identity primary key,
  probe_id text not null references public.flux_road_probes(id),
  provider text not null,
  observed_at timestamptz not null default now(),
  current_speed_kmh double precision,
  free_flow_speed_kmh double precision,
  current_travel_time_s int,
  free_flow_travel_time_s int,
  confidence double precision,
  road_closed boolean,
  unique (probe_id, provider, observed_at)
);
create index if not exists idx_flux_road_observed
  on public.flux_road_observations (probe_id, observed_at desc);

insert into public.flux_road_probes (id, corridor, point_lat, point_lng, note) values
  ('her-hersonissos', 'Heraklion - Hersonissos', 35.3260, 25.2780, 'E75 eastbound corridor'),
  ('her-rethymno', 'Heraklion - Rethymno', 35.3440, 24.8000, 'E75 central corridor'),
  ('rethymno-chania', 'Rethymno - Chania', 35.4080, 24.2800, 'E75 west corridor'),
  ('chania-kissamos', 'Chania - Kissamos', 35.4890, 23.8000, 'E65 west corridor'),
  ('chania-elafonissi', 'Chania - Elafonissi', 35.3900, 23.7500, 'Inland tourist corridor'),
  ('agnik-elounda', 'Agios Nikolaos - Elounda', 35.2350, 25.7160, 'North Lasithi coast'),
  ('agnik-ierapetra', 'Agios Nikolaos - Ierapetra', 35.0850, 25.7200, 'North-south Lasithi'),
  ('ierapetra-sitia', 'Ierapetra - Sitia', 35.0800, 26.0000, 'Eastern Crete corridor'),
  ('her-airport', 'Heraklion centre - airport', 35.3370, 25.1740, 'Airport access'),
  ('her-knossos', 'Heraklion - Knossos', 35.3030, 25.1660, 'Knossos access')
on conflict (id) do update set
  corridor = excluded.corridor,
  point_lat = excluded.point_lat,
  point_lng = excluded.point_lng,
  note = excluded.note;

revoke all on public.flux_port_quarterly, public.flux_economy_annual,
  public.flux_road_probes, public.flux_road_observations from anon, authenticated;
grant select on public.flux_port_quarterly, public.flux_economy_annual,
  public.flux_road_probes, public.flux_road_observations to service_role;

notify pgrst, 'reload schema';

