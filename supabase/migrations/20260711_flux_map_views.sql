-- Carte /admin/flux : géocodage des paires OD bus_search + agrégats carto.
-- Extension du plan flux 2026-07-10. Lecture service_role only (données internes).

-- Alias curés : slugs vus dans bus_search sans correspondance dans les tables
-- géo existantes (bus_destinations, villages, beaches, bus_stops). Coordonnées
-- vérifiées à la main, priorité maximale dans v_flux_geo_slugs.
create table if not exists public.flux_geo_aliases (
  slug text primary key,
  lat double precision not null,
  lng double precision not null
);

insert into public.flux_geo_aliases (slug, lat, lng) values
  ('chania-airport',    35.5317, 24.1497),
  ('heraklion-airport', 35.3397, 25.1803),
  ('chora-sfakion',     35.2010, 24.1365),
  ('almyrida',          35.4480, 24.1610),
  ('kolymbari',         35.5420, 23.7800),
  ('sougia',            35.2480, 23.8090),
  ('stalida',           35.2930, 25.4370),
  ('paleochora',        35.2300, 23.6810),
  ('georgioupolis',     35.3620, 24.2640),
  ('agia-galini',       35.0960, 24.6890),
  ('panormo',           35.4160, 24.6930),
  ('bali',              35.4100, 24.7830),
  ('vamos',             35.4070, 24.1990),
  ('maleme',            35.5220, 23.8280),
  ('palekastro',        35.1960, 26.2550),
  ('cretaquarium',      35.3310, 25.2810),
  ('agia-marina',       35.5160, 23.9250),
  ('kalo-chorio',       35.1570, 25.7960),
  ('xyloskalo',         35.3080, 23.9190),
  ('myrtos',            35.0040, 25.5850),
  ('makry-gyalos',      35.0380, 25.9730),
  ('mochlos',           35.1850, 25.9060),
  ('tavronitis',        35.5130, 23.8550),
  ('kountoura',         35.2430, 23.6380),
  ('rousospiti',        35.3360, 24.5030),
  ('gouves',            35.3280, 25.2930),
  ('episkopi-pediados', 35.2560, 25.2620)
on conflict (slug) do update set lat = excluded.lat, lng = excluded.lng;

-- Annuaire slug -> coordonnées, une ligne par slug, priorité :
-- alias curés > bus_destinations > villages > beaches > bus_stops (nom slugifié).
create or replace view public.v_flux_geo_slugs as
select distinct on (slug) slug, lat, lng from (
  select slug, lat, lng, 0 as prio from public.flux_geo_aliases
  union all
  select slug, lat, lng, 1 from public.bus_destinations where lat is not null
  union all
  select slug, latitude, longitude, 2 from public.villages where latitude is not null
  union all
  select slug, latitude, longitude, 3 from public.beaches where latitude is not null
  union all
  select trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')), lat, lng, 4
    from public.bus_stops where lat is not null
) g
where slug is not null and slug <> ''
order by slug, prio;

-- Paires OD géocodées 30 j (bus_search + bus_search_zero). Les slugs sont
-- re-normalisés (certains prop_value contiennent des espaces/majuscules issus
-- des noms d'arrêts ektel). Les paires non géocodables sont simplement absentes.
create or replace view public.v_flux_od_geo as
with od as (
  select event_name,
         trim(both '-' from regexp_replace(lower(split_part(prop_value, '→', 1)), '[^a-z0-9]+', '-', 'g')) as f,
         trim(both '-' from regexp_replace(lower(split_part(prop_value, '→', 2)), '[^a-z0-9]+', '-', 'g')) as t,
         sum(events_count)::int as total
  from public.flux_intent_daily
  where event_name in ('bus_search', 'bus_search_zero')
    and day > current_date - 30
  group by 1, 2, 3
)
select od.event_name, od.f, od.t, od.total,
       gf.lat as f_lat, gf.lng as f_lng, gt.lat as t_lat, gt.lng as t_lng
from od
join public.v_flux_geo_slugs gf on gf.slug = od.f
join public.v_flux_geo_slugs gt on gt.slug = od.t
where od.f <> od.t;

-- Densité GPS bus 7 j, maille ~110 m (3 décimales) : ~centaines de lignes.
create or replace view public.v_flux_bus_heat as
select round(lat::numeric, 3)::float as lat, round(lng::numeric, 3)::float as lng, count(*)::int as n
from public.flux_bus_positions
where recorded_at > now() - interval '7 days'
group by 1, 2;

-- Vols par aéroport (v_flux_flights_daily agrège HER+CHQ ensemble).
create or replace view public.v_flux_flights_airport as
select airport, service_date, count(*)::int as flights, count(landed_at)::int as landed
from public.flux_flight_arrivals
group by 1, 2;

revoke all on public.flux_geo_aliases, public.v_flux_geo_slugs, public.v_flux_od_geo,
  public.v_flux_bus_heat, public.v_flux_flights_airport from anon, authenticated;
grant select on public.flux_geo_aliases, public.v_flux_geo_slugs, public.v_flux_od_geo,
  public.v_flux_bus_heat, public.v_flux_flights_airport to service_role;

notify pgrst, 'reload schema';
