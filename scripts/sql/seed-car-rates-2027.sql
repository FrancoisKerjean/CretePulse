-- Amorçage des grilles tarifaires 2027 depuis les devis 2026 (crete.direct, loueurs de voitures).
--
-- Ce que fait le script : pour chaque loueur actif, calcule la médiane du prix par jour
-- (price / greatest(1, date_to - date_from)) des devis (car_quote_options.source = 'quote'),
-- groupée par (loueur, car_requests.car_type, saison du mois de date_from), puis insère
-- des lignes dans car_partner_rates. Le loueur le corrige et le publie depuis son portail.
--   - saisons : 7-8 pic ; 6 et 9 haute ; 5 et 10 intermédiaire (autres mois ignorés)
--   - seulement les groupes d'au moins 2 devis, médiane >= 10 EUR/jour
--   - périodes 2027, min_days = 3, source = 'devis 2026, médiane de N'
--   - un loueur actif en rates_status 'none' qui reçoit au moins une ligne passe en 'draft'
--     (draft, live et paused ne sont jamais modifiés ; jamais de 'live')
-- Les grilles draft ne sont jamais montrées aux voyageurs.
--
-- Sûr à relancer : on conflict do nothing sur (partner_id, category, period_from, min_days).
--
-- Pour annuler :
--   delete from car_partner_rates where source like 'devis 2026, médiane de %';
--   update car_partners p set rates_status = 'none'
--     where rates_status = 'draft'
--       and not exists (select 1 from car_partner_rates r where r.partner_id = p.id);

begin;

with periods(season, period_from, period_to) as (
  values ('peak',   date '2027-07-01', date '2027-08-31'),
         ('high',   date '2027-06-01', date '2027-06-30'),
         ('high',   date '2027-09-01', date '2027-09-30'),
         ('mid',    date '2027-05-01', date '2027-05-31'),
         ('mid',    date '2027-10-01', date '2027-10-31')
),
quotes as (
  select o.partner_id,
         r.car_type as category,
         case when extract(month from r.date_from) in (7, 8) then 'peak'
              when extract(month from r.date_from) in (6, 9) then 'high'
              when extract(month from r.date_from) in (5, 10) then 'mid' end as season,
         o.price / greatest(1, r.date_to - r.date_from) as per_day
  from car_quote_options o
  join car_requests r on r.id = o.request_id
  join car_partners p on p.id = o.partner_id and p.active
  where o.source = 'quote'
    and o.price > 0
    and r.car_type in ('city', 'compact', 'sedan', 'automatic', 'suv')
),
medians as (
  select partner_id, category, season, count(*) as n,
         round((percentile_cont(0.5) within group (order by per_day))::numeric, 2) as eur_per_day
  from quotes
  where season is not null
  group by 1, 2, 3
  having count(*) >= 2
),
ins as (
  insert into car_partner_rates (partner_id, category, period_from, period_to, min_days, eur_per_day, source)
  select m.partner_id, m.category, p.period_from, p.period_to, 3, m.eur_per_day,
         'devis 2026, médiane de ' || m.n
  from medians m
  join periods p on p.season = m.season
  where m.eur_per_day >= 10
  on conflict (partner_id, category, period_from, min_days) do nothing
  returning partner_id
)
select 1 from ins limit 0;

update car_partners p
   set rates_status = 'draft'
 where p.active
   and p.rates_status = 'none'
   and exists (select 1 from car_partner_rates r where r.partner_id = p.id);

commit;
