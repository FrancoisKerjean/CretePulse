-- Capteur ferries : comptage des traversees a quai + calibration passagers.
--
-- Dernier angle mort du socle flux : les entrees par avion sont mesurees depuis
-- le 10/07/2026, les entrees par la mer ne l'etaient pas. Source retenue apres
-- recon du 29/07/2026 : GTP (www.gtp.gr/RoutesForm.asp), seul agregateur
-- complet accessible sans compte. aisstream.io demande la creation d'un compte
-- (owner Kami), openseas.gr refuse le port 443, et la cle publique "Demo" de
-- ferries.gtp.gr ne rend qu'un sous-ensemble (2 arrivees/jour a Heraklion).
--
-- Identite stable, lecon de la regression vols du 29/07 : la cle ne contient
-- AUCUN champ mouvant. sched_slot est l'heure a quai de la PREMIERE observation
-- et ne bouge plus ; sched_time garde la derniere heure publiee. Ni sched_id ni
-- route_id ne servent de cle : GTP les reattribue quand une compagnie republie
-- un horaire, et route_id porte jusqu'a trois traversees du meme jour.
--
-- company_code entre dans la cle parce que Blue Star et Minoan quittent
-- Heraklion a 21:00 le meme soir : sans elle, un navire disparaitrait chaque
-- nuit. Il est NOT NULL parce qu'un NULL dans une contrainte unique n'entre en
-- collision avec rien sous Postgres : chaque passage inserait une ligne de plus.

create table if not exists public.flux_ferry_crossings (
  id                     bigint generated always as identity primary key,
  port_code              text not null,          -- HER | SOU | SIT (ports calibres par ELSTAT)
  gtp_port_id            text not null,          -- PortPage.asp?id= : 1417 | 691 | 1703
  direction              text not null,          -- vu du port cretois : arrival | departure
  service_date           date not null,          -- jour d'accostage ou d'appareillage a quai
  sched_slot             text not null,          -- heure a quai, PREMIERE observation, immuable
  sched_time             text not null,          -- derniere heure publiee par GTP
  company_code           text not null,
  company_name           text,
  ship_type              text,                   -- cc | cf | cm | hf | mv | rr | ci (legende GTP)
  counterpart_port_id    text,                   -- terminus de la ligne (escale la plus longue)
  counterpart_port_name  text,
  route_id               text,                   -- informatif, jamais une cle
  sched_id               text,                   -- informatif, jamais une cle
  legs_seen              int not null default 1, -- escales GTP regroupees en ce mouvement
  seen_count             int not null default 1,
  first_seen_at          timestamptz not null default now(),
  last_seen_at           timestamptz not null default now(),
  unique (port_code, direction, service_date, company_code, sched_slot)
);

create index if not exists flux_ferry_crossings_day
  on public.flux_ferry_crossings (service_date, port_code, direction);

revoke all on public.flux_ferry_crossings from anon, authenticated;
grant select on public.flux_ferry_crossings to service_role;

-- Le journal de runs datait le RUN, pas la journee interrogee. Un balayage de
-- 90 jours tourne en une fois : sans cette colonne, la couverture n'aurait
-- credite que la journee du balayage et le denominateur serait reste ampute.
alter table public.flux_collector_runs add column if not exists service_date date;

-- --------------------------------------------------------------------------
-- Calibration : la table servait les aeroports, elle sert maintenant aussi les
-- ports. HER designe a la fois un aeroport et un port : c'est scope qui les
-- distingue, donc la contrainte unique doit le porter.

alter table public.flux_calibration
  add column if not exists scope text not null default 'airport';
-- La couverture se compte en JOURS interroges. GTP n'ouvre ses horaires que le
-- 28/07/2026 : le 3e trimestre 2026 a bien ses trois mois non vides mais il lui
-- manque 27 jours de juillet, soit un denominateur ampute de 29 % et donc un
-- coefficient gonfle d'autant. Compter en mois aurait laisse passer ce trou.
alter table public.flux_calibration drop column if exists quarter_months_covered;
alter table public.flux_calibration
  add column if not exists quarter_days_covered int;
alter table public.flux_calibration
  add column if not exists quarter_days_total int;

alter table public.flux_calibration
  drop constraint if exists flux_calibration_month_airport_direction_key;
alter table public.flux_calibration
  drop constraint if exists flux_calibration_scope_key;
alter table public.flux_calibration
  add constraint flux_calibration_scope_key unique (month, scope, airport, direction);

comment on column public.flux_calibration.airport is
  'Code du noeud : aeroport (HER, CHQ) si scope=airport, port (HER, SOU, SIT) si scope=port.';
comment on column public.flux_calibration.flights_official is
  'Mouvements du denominateur : vols pour un aeroport, traversees pour un port.';
comment on column public.flux_calibration.quarter_days_covered is
  'Ports uniquement : jours du trimestre effectivement interroges. En dessous de '
  'quarter_days_total le denominateur est partiel et le coefficient surestime : '
  'la vue journaliere ferries refuse alors de s''en servir.';

-- --------------------------------------------------------------------------
-- Vue journaliere ferries : traversees comptees x coefficient officiel.
-- Aucun jour n'est comble par une moyenne : contrairement aux vols, il n'existe
-- pas de serie officielle QUOTIDIENNE cote mer. Un jour non collecte reste vide
-- plutot que d'etre invente.

drop view if exists public.v_flux_ferry_daily;

create view public.v_flux_ferry_daily as
with daily as (
  select service_date as day, port_code, direction, count(*)::int as crossings
  from public.flux_ferry_crossings
  group by 1, 2, 3
),
coefs as (
  -- Fourchette data-driven : min/max des coefficients du mois vise et de ses
  -- deux mois voisins, comme cote aerien. Un trimestre incomplet est exclu.
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
       round(d.crossings * c.coef_low)::int  as pax_low,
       round(d.crossings * c.coef_high)::int as pax_high,
       c.samples as coef_samples
from daily d
left join coefs c on c.port_code = d.port_code and c.direction = d.direction
                 and c.mo = extract(month from d.day)::int;

revoke all on public.v_flux_ferry_daily from anon, authenticated;
grant select on public.v_flux_ferry_daily to service_role;

notify pgrst, 'reload schema';

-- --------------------------------------------------------------------------
-- Composante ferry dans l'estimateur de stock.
--
-- stock_low / stock_high restent AERIENS : c'est la serie suivie depuis le
-- 28/07 et dont la stabilite conditionne la decision de publication du 18/08.
-- La composante maritime arrive a cote, dans stock_with_sea_low / _high, qui
-- ne valent que si la fenetre de sejour est integralement couverte cote mer.
-- Un jour sans collecte ferry ne se comble PAS : il n'existe aucune serie
-- officielle quotidienne maritime, donc rien a emprunter sans inventer.

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
