-- Réseau bus dérivé de bus_routes : référentiel d'arrêts + lignes nommées + séquences.
-- Construit par build_network.py au scrape hebdo. Additif : bus_routes inchangée.

create table if not exists bus_stops (
  id                serial primary key,
  slug              text unique not null,    -- _norm normalisé, clé de dédup
  name              text not null,           -- libellé d'affichage
  name_el           text,                    -- grec si connu
  lat               double precision,
  lng               double precision,
  prefecture        text,                    -- 'HER' | 'LAS' | 'CHA' | 'RET'
  coords_source     text not null default 'none', -- referentiel|cb_places|geocoded|none
  coords_confidence text not null default 'low'    -- high|low
);

create table if not exists bus_lines (
  id            serial primary key,
  code          text unique not null,        -- nomenclature 'HER-01'
  name          text not null,               -- 'Heraklion <-> Sitia'
  prefecture    text not null,
  operator_id   text references bus_operators(id),
  geometry      jsonb,                        -- [[lng,lat],...] tracé OSRM
  color         text not null default '#0B5E78',
  length_km     double precision,
  total_minutes integer,
  partial_geo   boolean not null default false -- true si fallback segment droit utilisé
);

create table if not exists bus_line_stops (
  line_id            integer not null references bus_lines(id) on delete cascade,
  stop_id            integer not null references bus_stops(id),
  seq                integer not null,        -- 0..N sens aller
  cumulative_km      double precision not null default 0,
  cumulative_minutes integer not null default 0,
  primary key (line_id, seq)
);
create index if not exists idx_bus_line_stops_stop on bus_line_stops (stop_id);

alter table bus_stops      enable row level security;
alter table bus_lines      enable row level security;
alter table bus_line_stops enable row level security;

drop policy if exists "public read bus_stops"      on bus_stops;
drop policy if exists "public read bus_lines"      on bus_lines;
drop policy if exists "public read bus_line_stops" on bus_line_stops;
create policy "public read bus_stops"      on bus_stops      for select using (true);
create policy "public read bus_lines"      on bus_lines      for select using (true);
create policy "public read bus_line_stops" on bus_line_stops for select using (true);

grant select on bus_stops, bus_lines, bus_line_stops to anon, authenticated;
grant all    on bus_stops, bus_lines, bus_line_stops to service_role;
grant usage, select on sequence bus_stops_id_seq to service_role;
grant usage, select on sequence bus_lines_id_seq to service_role;

notify pgrst, 'reload schema';
