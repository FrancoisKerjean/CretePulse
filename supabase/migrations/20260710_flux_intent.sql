-- Agrégats quotidiens des signaux d'intention (extraction ClickHouse Plausible).
-- Plan 2026-07-10 couche 1. Écriture : vps/flux/intent_extract.py (psycopg2, user postgres).

create table if not exists public.flux_intent_daily (
  id bigint generated always as identity primary key,
  day date not null,
  event_name text not null,       -- 'bus_search' | 'bus_search_zero' | 'search_query' | ...
  prop_key text not null,         -- 'od' | 'query' | 'zone' | 'section' | 'total'
  prop_value text not null,       -- ex 'heraklion→matala'
  events_count int not null,
  unique (day, event_name, prop_key, prop_value)
);
create index if not exists idx_flux_intent_day on public.flux_intent_daily (day, event_name);

revoke all on public.flux_intent_daily from anon, authenticated;
grant select on public.flux_intent_daily to service_role;

notify pgrst, 'reload schema';
