-- SP2 : lien entre une route KTEL (bus_routes) et sa ligne du réseau (bus_lines).
-- ON DELETE SET NULL : SP1 rebuild bus_lines (delete+insert) -> les FK deviennent
-- NULL au lieu de violer la contrainte ; le run SP2 chaîné derrière repeuple.
alter table bus_routes
  add column if not exists line_id integer references bus_lines(id) on delete set null;
create index if not exists idx_bus_routes_line_id on bus_routes (line_id);
notify pgrst, 'reload schema';
