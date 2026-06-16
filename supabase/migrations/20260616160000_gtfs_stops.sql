-- Référentiel d'arrêts GTFS (étape B) : dérivé de bus_routes par gtfs_stops_build.py.
-- Additif. N'altère pas bus_routes. Colonnes nommées GTFS (export stops.txt trivial).
create table if not exists gtfs_stops (
  stop_id            text primary key,                -- = slug canonique (stable, GTFS stop_id)
  stop_name          text not null,                   -- libellé d'affichage (latin)
  stop_name_el       text,                            -- grec si connu
  stop_lat           double precision,                -- null tant que non géocodé
  stop_lon           double precision,
  coords_source      text not null default 'none',    -- 'referentiel'|'cb_places'|'geocoded'|'none'
  coords_confidence  text not null default 'low',     -- 'high'|'low'
  needs_review       boolean not null default false,  -- true = à curer manuellement
  prefecture         text,                            -- 'HER'|'LAS'|'CHA'|'RET' (par proximité, si coords)
  route_count        integer not null default 0,      -- nb de routes (bus_routes) touchant l'arrêt
  updated_at         timestamptz not null default now()
);

alter table gtfs_stops enable row level security;
drop policy if exists "public read gtfs_stops" on gtfs_stops;
create policy "public read gtfs_stops" on gtfs_stops for select using (true);
grant select on gtfs_stops to anon, authenticated;
grant all    on gtfs_stops to service_role;
notify pgrst, 'reload schema';
