-- Estimation du stock de touristes presents (methodologie, cf cockpit /admin/flux) :
--   Perimetre : arrivees aeriennes HER + CHQ (les 2 aeroports = ~97 % du trafic aerien Crete,
--   JSH marginal ~0,5 %). Ferries non comptes (source en cours de branchement).
--   Methode A (primaire affichage) : fenetre sejour-moyen. Un arrivant reste 7,5 a 8,2 nuits
--     (INSETE 2024) -> stock_low = somme des arrivees estimees sur 7 jours glissants (arrondi bas),
--     stock_high = somme sur 8 jours glissants (arrondi de 8,2).
--   Estimation par aeroport puis somme par jour. Jours/aeroports sans comptage (montee en
--     charge, trous cron) : combles par la moyenne quotidienne OFFICIELLE HCAA du meme
--     mois-de-l'annee (min/max sur les annees disponibles, jamais invente).
--     measured_days_window dit combien de jours de la fenetre sont integralement comptes
--     (tous les aeroports mesures ce jour-la).
--   Methode B (bilan) : cumul arrivees_est - departs_est sur les JOURS integralement MESURES
--     (variation nette, pas un stock absolu ; croise la methode A).
-- Coefs pax/vol : flux_calibration, fourchette DATA-DRIVEN = min/max des coefs disponibles
-- pour le mois-de-l'annee vise et ses 2 mois voisins (toutes annees) ; jamais de % invente.
-- Limites assumees : ferries non comptes ; croisiéristes a part (flux_cruise_calls).

drop view if exists public.v_flux_stock_daily;

create view public.v_flux_stock_daily as
with airports as (
  select * from (values ('HER'), ('CHQ')) as a(airport)
),
bounds as (
  select min(service_date) as d0
  from public.flux_flight_arrivals
  where airport in (select airport from airports)
),
days as (
  -- 7 jours avant d0 pour amorcer la fenetre avec le fallback HCAA
  select generate_series(b.d0 - interval '7 days', current_date, interval '1 day')::date as day,
         b.d0
  from bounds b
  where b.d0 is not null
),
daily as (
  select service_date as day, airport, direction, count(*)::int as flights
  from public.flux_flight_arrivals
  where airport in (select airport from airports) and service_date <= current_date
  group by 1, 2, 3
),
coefs as (
  select c.airport, c.direction, m.mo,
         min(c.coef) as coef_low,
         max(c.coef) as coef_high,
         count(*)::int as samples,
         bool_or(c.method = 'measured') as has_measured
  from (select distinct extract(month from day)::int as mo from days) m
  join public.flux_calibration c
    on c.airport in (select airport from airports)
   and c.coef is not null
   and extract(month from c.month)::int
       in (((m.mo + 10) % 12) + 1, m.mo, (m.mo % 12) + 1)
  group by 1, 2, 3
),
fallback as (
  -- pax/jour officiels HCAA du meme mois-de-l'annee, min/max sur les annees disponibles
  select airport, extract(month from month)::int as mo, direction,
         min(pax_official / extract(day from (month + interval '1 month' - interval '1 day')))
           as pax_day_low,
         max(pax_official / extract(day from (month + interval '1 month' - interval '1 day')))
           as pax_day_high
  from public.flux_calibration
  where airport in (select airport from airports) and pax_official is not null
  group by 1, 2, 3
),
est_airport as (
  select d.day, d.d0, ap.airport,
         coalesce(a.flights, 0) as flights_in,
         coalesce(p.flights, 0) as flights_out,
         (a.flights is not null) as in_measured,
         (p.flights is not null) as out_measured,
         case when a.flights is not null then round(a.flights * ci.coef_low)::int
              else round(fi.pax_day_low)::int end as pax_in_low,
         case when a.flights is not null then round(a.flights * ci.coef_high)::int
              else round(fi.pax_day_high)::int end as pax_in_high,
         case when p.flights is not null then round(p.flights * co.coef_low)::int
              else round(fo.pax_day_low)::int end as pax_out_low,
         case when p.flights is not null then round(p.flights * co.coef_high)::int
              else round(fo.pax_day_high)::int end as pax_out_high,
         ci.samples as coef_samples,
         (coalesce(ci.has_measured, false) and coalesce(co.has_measured, false)) as coef_measured
  from days d
  cross join airports ap
  left join daily a on a.day = d.day and a.airport = ap.airport and a.direction = 'arrival'
  left join daily p on p.day = d.day and p.airport = ap.airport and p.direction = 'departure'
  left join coefs ci on ci.airport = ap.airport and ci.direction = 'arrival'
                    and ci.mo = extract(month from d.day)::int
  left join coefs co on co.airport = ap.airport and co.direction = 'departure'
                    and co.mo = extract(month from d.day)::int
  left join fallback fi on fi.airport = ap.airport and fi.direction = 'arrival'
                       and fi.mo = extract(month from d.day)::int
  left join fallback fo on fo.airport = ap.airport and fo.direction = 'departure'
                       and fo.mo = extract(month from d.day)::int
),
est as (
  -- somme par jour sur les aeroports ; "mesure" = TOUS les aeroports comptes ce jour-la
  select day, d0,
         sum(flights_in)::int as flights_in,
         sum(flights_out)::int as flights_out,
         bool_and(in_measured) as in_measured,
         bool_and(out_measured) as out_measured,
         sum(pax_in_low)::int as pax_in_low,
         sum(pax_in_high)::int as pax_in_high,
         sum(pax_out_low)::int as pax_out_low,
         sum(pax_out_high)::int as pax_out_high,
         min(coef_samples)::int as coef_samples,
         bool_and(coef_measured) as coef_measured
  from est_airport
  group by 1, 2
)
select day, flights_in, flights_out, in_measured, out_measured,
       pax_in_low, pax_in_high, pax_out_low, pax_out_high,
       coef_samples, coef_measured,
       stock_low, stock_high, measured_days_window,
       net_cum_low, net_cum_high
from (
  select e.*,
         sum(pax_in_low)  over (order by day rows between 6 preceding and current row)::int as stock_low,
         sum(pax_in_high) over (order by day rows between 7 preceding and current row)::int as stock_high,
         sum(case when in_measured then 1 else 0 end)
           over (order by day rows between 7 preceding and current row)::int as measured_days_window,
         sum(case when in_measured and out_measured then pax_in_low - pax_out_high end)
           over (order by day)::int as net_cum_low,
         sum(case when in_measured and out_measured then pax_in_high - pax_out_low end)
           over (order by day)::int as net_cum_high
  from est e
) x
where day >= d0;

revoke all on public.v_flux_stock_daily from anon, authenticated;
grant select on public.v_flux_stock_daily to service_role;

notify pgrst, 'reload schema';
