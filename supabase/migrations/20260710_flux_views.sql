-- Vues d'agrégation pour le cockpit /admin/flux (lecture PostgREST service_role).
-- PostgREST ne fait pas de GROUP BY : on agrège côté Postgres.

create or replace view public.v_flux_flights_daily as
select service_date, count(*)::int as flights, count(landed_at)::int as landed
from public.flux_flight_arrivals
group by service_date;

create or replace view public.v_flux_bus_daily as
select source, recorded_at::date as day,
       count(*)::int as positions, count(distinct vehicle_key)::int as vehicles
from public.flux_bus_positions
group by source, recorded_at::date;

create or replace view public.v_flux_cruise_daily as
select call_date, count(*)::int as ships,
       coalesce(sum(pax_capacity), 0)::int as pax,
       string_agg(ship_name, ' · ' order by eta) as ships_label
from public.flux_cruise_calls
group by call_date;

create or replace view public.v_flux_intent_top as
select event_name, prop_key, prop_value,
       sum(events_count)::int as total, max(day) as last_day
from public.flux_intent_daily
where day > current_date - 30
group by event_name, prop_key, prop_value;

create or replace view public.v_flux_wiki_top as
select entity, round(avg(value))::int as avg_views_7d
from public.flux_interest_daily
where day > (select max(day) from public.flux_interest_daily) - 7
group by entity;

revoke all on public.v_flux_flights_daily, public.v_flux_bus_daily,
  public.v_flux_cruise_daily, public.v_flux_intent_top, public.v_flux_wiki_top
  from anon, authenticated;
grant select on public.v_flux_flights_daily, public.v_flux_bus_daily,
  public.v_flux_cruise_daily, public.v_flux_intent_top, public.v_flux_wiki_top
  to service_role;

notify pgrst, 'reload schema';
