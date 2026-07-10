-- Estimation du stock de touristes presents (methodologie, cf cockpit /admin/flux) :
--   Methode A (primaire affichage) : fenetre sejour-moyen. Un arrivant reste 7,5 a 8,2 nuits
--     (INSETE 2024) -> stock_low = somme des arrivees estimees sur 7 jours glissants (arrondi bas),
--     stock_high = somme sur 8 jours glissants (arrondi de 8,2).
--   Jours sans comptage (montee en charge, trous cron) : combles par la moyenne quotidienne
--     OFFICIELLE HCAA du meme mois-de-l'annee (min/max sur les annees disponibles, jamais invente).
--     measured_days_window dit combien de jours de la fenetre sont reellement comptes.
--   Methode B (bilan) : cumul arrivees_est - departs_est sur les JOURS MESURES uniquement
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
  -- 7 jours avant d0 pour amorcer la fenetre avec le fallback HCAA
  select generate_series(b.d0 - interval '7 days', current_date, interval '1 day')::date as day,
         b.d0
  from bounds b
  where b.d0 is not null
),
daily as (
  select service_date as day, direction, count(*)::int as flights
  from public.flux_flight_arrivals
  where airport = 'HER' and service_date <= current_date
  group by 1, 2
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
fallback as (
  -- pax/jour officiels HCAA du meme mois-de-l'annee, min/max sur les annees disponibles
  select extract(month from month)::int as mo, direction,
         min(pax_official / extract(day from (month + interval '1 month' - interval '1 day')))
           as pax_day_low,
         max(pax_official / extract(day from (month + interval '1 month' - interval '1 day')))
           as pax_day_high
  from public.flux_calibration
  where airport = 'HER' and pax_official is not null
  group by 1, 2
),
est as (
  select d.day, d.d0,
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
  left join daily a on a.day = d.day and a.direction = 'arrival'
  left join daily p on p.day = d.day and p.direction = 'departure'
  left join coefs ci on ci.direction = 'arrival' and ci.mo = extract(month from d.day)::int
  left join coefs co on co.direction = 'departure' and co.mo = extract(month from d.day)::int
  left join fallback fi on fi.direction = 'arrival' and fi.mo = extract(month from d.day)::int
  left join fallback fo on fo.direction = 'departure' and fo.mo = extract(month from d.day)::int
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
