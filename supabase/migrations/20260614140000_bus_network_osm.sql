-- Réseau bus depuis OpenStreetMap : origine OSM + code officiel + source.
alter table bus_stops add column if not exists osm_id bigint;
alter table bus_lines add column if not exists osm_id bigint;
alter table bus_lines add column if not exists code_official text;
alter table bus_lines add column if not exists source text not null default 'osm';
notify pgrst, 'reload schema';
