-- Estimation du stock de touristes presents (methodologie, cf cockpit /admin/flux) :
--   Methode A (primaire affichage) : fenetre sejour-moyen. Un arrivant reste 7,5 a 8,2 nuits
--     (INSETE 2024) -> stock_low = somme des arrivees estimees sur 7 jours glissants (arrondi bas),
--     stock_high = somme sur 8 jours glissants (arrondi de 8,2).
--   Methode B (bilan) : cumul arrivees_est - departs_est depuis le debut du comptage
--     (variation nette, pas un stock absolu ; croise la methode A).
-- Coefs pax/vol : flux_calibration, fourchette DATA-DRIVEN = min/max des coefs disponibles
-- pour le mois-de-l'annee vise et ses 2 mois voisins (toutes annees) ; jamais de % invente.
-- Limites assumees : Chania et ferries non comptes ; croisiéristes a part (flux_cruise_calls).

create or replace view public.v_flux_stock_daily as
with bounds as (
  select min(service_date) as d0
  from public.flux_flight_arrivals
  where airport = 'HER'
),
days as (
  select generate_series(b.d0, current_date, interval '1 day')::date as day
  from bounds b
  where b.d0 is not null
),
daily as (
  select service_date as day, direction, count(*)::int as flights
  from public.flux_flight_arrivals
  where airport = 'HER' and service_date <= current_date
  group by 1, 2
),
pivot as (
  select d.day,
         coalesce(a.flights, 0) as flights_in,
         coalesce(p.flights, 0) as flights_out
  from days d
  left join daily a on a.day = d.day and a.direction = 'arrival'
  left join daily p on p.day = d.day and p.direction = 'departure'
),
coefs as (
  select d.direction, m.mo,
         min(c.coef) as coef_low,
         max(c.coef) as coef_high,
         count(*)::int as samples,
         bool_or(c.method = 'measured') as has_measured
  from (select distinct extract(month from day)::int as mo from days) m
  cross join (values ('arrival'), ('departure')) as d(direction)
  join public.flux_calibration c
    on c.airport = 'HER' and c.direction = d.direction and c.coef is not null
   and extract(month from c.month)::int
       in (((m.mo + 10) % 12) + 1, m.mo, (m.mo % 12) + 1)
  group by 1, 2
),
est as (
  select p.day, p.flights_in, p.flights_out,
         round(p.flights_in * ci.coef_low)::int  as pax_in_low,
         round(p.flights_in * ci.coef_high)::int as pax_in_high,
         round(p.flights_out * co.coef_low)::int  as pax_out_low,
         round(p.flights_out * co.coef_high)::int as pax_out_high,
         ci.samples as coef_samples,
         (coalesce(ci.has_measured, false) and coalesce(co.has_measured, false)) as coef_measured
  from pivot p
  left join coefs ci on ci.direction = 'arrival' and ci.mo = extract(month from p.day)::int
  left join coefs co on co.direction = 'departure' and co.mo = extract(month from p.day)::int
)
select day, flights_in, flights_out,
       pax_in_low, pax_in_high, pax_out_low, pax_out_high,
       coef_samples, coef_measured,
       sum(pax_in_low)  over (order by day rows between 6 preceding and current row)::int as stock_low,
       sum(pax_in_high) over (order by day rows between 7 preceding and current row)::int as stock_high,
       sum(pax_in_low  - pax_out_high) over (order by day)::int as net_cum_low,
       sum(pax_in_high - pax_out_low)  over (order by day)::int as net_cum_high
from est;

revoke all on public.v_flux_stock_daily from anon, authenticated;
grant select on public.v_flux_stock_daily to service_role;

notify pgrst, 'reload schema';
