-- Calibration pax/vol pour l'estimateur de stock touristes.
-- Source officielle : hcaa_crete_monthly (XLSX ΚΙΝΗΣΗ ΑΕΡΟΛΙΜΕΝΩΝ ypa.gr, deja ingere,
-- source_xlsx_url par ligne). Jamais de coefficient invente :
--   method 'hcaa-movements' = pax officiels / (mouvements airlines / 2)
--   method 'measured'       = pax officiels / vols comptes par flux_flight_arrivals
--                             (recalage automatique des qu'un mois complet est compte,
--                              cf vps/flux/calibration_refresh.py)

create table if not exists public.flux_calibration (
  id bigint generated always as identity primary key,
  month date not null,               -- 1er du mois civil
  airport text not null default 'HER',
  direction text not null,           -- 'arrival' | 'departure'
  pax_official int,                  -- HCAA : pax_disembark (arrival) / pax_embark (departure)
  flights_official int,              -- HCAA : aircraft_total / 2 (mouvements = atterrissages + decollages)
  flights_counted int,               -- vols comptes par notre capteur (mois complet uniquement)
  coef double precision,             -- pax par vol pour ce mois
  method text not null,              -- 'hcaa-movements' | 'measured'
  source_url text,
  updated_at timestamptz not null default now(),
  -- Elargie le 29/07/2026 : HER designe un aeroport ET un port, c'est scope
  -- qui les distingue (cf 20260729c_flux_ferry.sql).
  unique (month, airport, direction)
);

-- Seed initial depuis la table officielle (re-runnable, aussi execute par calibration_refresh.py).
insert into public.flux_calibration
  (month, scope, airport, direction, pax_official, flights_official, coef, method, source_url)
select make_date(h.year, h.month, 1), 'airport', h.airport_iata, d.direction,
       case d.direction when 'arrival' then h.pax_disembark else h.pax_embark end,
       h.aircraft_total / 2,
       (case d.direction when 'arrival' then h.pax_disembark else h.pax_embark end)::double precision
         / nullif(h.aircraft_total / 2, 0),
       'hcaa-movements', h.source_xlsx_url
from public.hcaa_crete_monthly h
cross join (values ('arrival'), ('departure')) as d(direction)
where h.airport_iata in ('HER', 'CHQ') and h.aircraft_total > 0
on conflict (month, scope, airport, direction) do update set
  pax_official = excluded.pax_official,
  flights_official = excluded.flights_official,
  coef = case when flux_calibration.method = 'measured' then flux_calibration.coef else excluded.coef end,
  source_url = excluded.source_url,
  updated_at = now();

revoke all on public.flux_calibration from anon, authenticated;
grant select on public.flux_calibration to service_role;

notify pgrst, 'reload schema';
