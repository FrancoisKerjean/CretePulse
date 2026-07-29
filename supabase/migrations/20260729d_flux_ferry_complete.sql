-- Une journee ferries n'est fiable que si elle a ete interrogee AVANT son debut.
--
-- GTP retire de ses resultats les departs deja passes : Heraklion rendait 8
-- traversees le 29/07/2026 a 09:23 et 3 a 09:46, les cinq navires du matin
-- ayant appareille. Le denominateur de calibration refusait deja ces journees,
-- mais le cockpit, lui, affichait « Heraklion 3 arr / 3 dep » pour le jour
-- courant sans dire que le compte etait ampute. Un chiffre faux affirme sans
-- reserve est pire qu'un chiffre absent.
--
-- La veille doit l'avoir ete aussi : GTP date une traversee sur son depart,
-- donc les arrivees de nuit d'un jour sortent de la requete de la veille.

drop view if exists public.v_flux_stock_daily;
drop view if exists public.v_flux_ferry_daily;

create view public.v_flux_ferry_daily as
with polled as (
  select distinct airport as port_code, direction, service_date
  from public.flux_collector_runs
  where collector = 'ferry_crossings' and ok
    and direction is not null and service_date is not null
    and service_date > (ran_at at time zone 'Europe/Athens')::date
),
complete_days as (
  select p.port_code, p.direction, p.service_date
  from polled p
  join polled v on v.port_code = p.port_code and v.direction = p.direction
               and v.service_date = p.service_date - 1
),
daily as (
  select service_date as day, port_code, direction, count(*)::int as crossings
  from public.flux_ferry_crossings
  group by 1, 2, 3
),
coefs as (
  select c.airport as port_code, c.direction, m.mo,
         min(c.coef) as coef_low, max(c.coef) as coef_high, count(*)::int as samples
  from (select distinct extract(month from service_date)::int as mo
        from public.flux_ferry_crossings) m
  join public.flux_calibration c
    on c.scope = 'port'
   and c.coef is not null
   and c.quarter_days_covered >= c.quarter_days_total
   and extract(month from c.month)::int
       in (((m.mo + 10) % 12) + 1, m.mo, (m.mo % 12) + 1)
  group by 1, 2, 3
)
select d.day, d.port_code, d.direction, d.crossings,
       (k.service_date is not null) as complete,
       round(d.crossings * c.coef_low)::int  as pax_low,
       round(d.crossings * c.coef_high)::int as pax_high,
       c.samples as coef_samples
from daily d
left join complete_days k on k.port_code = d.port_code and k.direction = d.direction
                         and k.service_date = d.day
left join coefs c on c.port_code = d.port_code and c.direction = d.direction
                 and c.mo = extract(month from d.day)::int;

revoke all on public.v_flux_ferry_daily from anon, authenticated;
grant select on public.v_flux_ferry_daily to service_role;

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
    on c.scope = 'airport'
   and c.airport in (select airport from airports)
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
  where scope = 'airport' and airport in (select airport from airports)
    and pax_official is not null
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
),
sea as (
  -- Somme des trois ports cretois calibres. Une journee ne compte que si TOUS
  -- les ports collectes ce jour-la ont un coefficient : sinon la mer serait
  -- sous-estimee sans que rien ne le dise.
  select day,
         (sum(pax_low)  filter (where direction = 'arrival'))::int   as sea_in_low,
         (sum(pax_high) filter (where direction = 'arrival'))::int   as sea_in_high,
         (sum(pax_low)  filter (where direction = 'departure'))::int as sea_out_low,
         (sum(pax_high) filter (where direction = 'departure'))::int as sea_out_high,
         (count(*) filter (where pax_low is null))::int as ports_uncalibrated
  from public.v_flux_ferry_daily
  where complete
  group by 1
)
select x.day, x.flights_in, x.flights_out, x.in_measured, x.out_measured,
       x.pax_in_low, x.pax_in_high, x.pax_out_low, x.pax_out_high,
       x.coef_samples, x.coef_measured,
       x.stock_low, x.stock_high, x.measured_days_window,
       x.net_cum_low, x.net_cum_high,
       x.sea_in_low, x.sea_in_high, x.sea_out_low, x.sea_out_high,
       x.sea_measured, x.sea_measured_days_window,
       case when x.sea_measured_days_window = 7 then x.stock_low + x.sea_roll_low end
         as stock_with_sea_low,
       case when x.sea_measured_days_window_high = 8 then x.stock_high + x.sea_roll_high end
         as stock_with_sea_high
from (
  select e.*,
         s.sea_in_low, s.sea_in_high, s.sea_out_low, s.sea_out_high,
         (s.sea_in_low is not null and coalesce(s.ports_uncalibrated, 1) = 0) as sea_measured,
         (sum(pax_in_low)  over w7)::int as stock_low,
         (sum(pax_in_high) over w8)::int as stock_high,
         (sum(case when in_measured then 1 else 0 end) over w8)::int as measured_days_window,
         sum(case when in_measured and out_measured then pax_in_low - pax_out_high end)
           over (order by e.day)::int as net_cum_low,
         sum(case when in_measured and out_measured then pax_in_high - pax_out_low end)
           over (order by e.day)::int as net_cum_high,
         (sum(coalesce(s.sea_in_low, 0))  over w7)::int as sea_roll_low,
         (sum(coalesce(s.sea_in_high, 0)) over w8)::int as sea_roll_high,
         (sum(case when s.sea_in_low is not null and coalesce(s.ports_uncalibrated, 1) = 0
                  then 1 else 0 end) over w7)::int as sea_measured_days_window,
         (sum(case when s.sea_in_high is not null and coalesce(s.ports_uncalibrated, 1) = 0
                  then 1 else 0 end) over w8)::int as sea_measured_days_window_high
  from est e
  left join sea s on s.day = e.day
  window w7 as (order by e.day rows between 6 preceding and current row),
         w8 as (order by e.day rows between 7 preceding and current row)
) x
where x.day >= x.d0;

revoke all on public.v_flux_stock_daily from anon, authenticated;
grant select on public.v_flux_stock_daily to service_role;

notify pgrst, 'reload schema';
