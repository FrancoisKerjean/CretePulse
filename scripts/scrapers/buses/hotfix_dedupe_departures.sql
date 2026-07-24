-- Hotfix immédiat pour les 91 routes herlas avec doublons dans `departures`
-- (bug 02/06/2026, cf. session_log + parsers.py refactor). Dédup + tri en place.
-- Le prochain run du scraper (parsers.py corrigé) remplira `departures_by_day`
-- avec les sous-grilles par jour ; ce hotfix n'est qu'un pansement d'affichage.
--
-- À exécuter UNE FOIS via Supabase SQL Editor ou psql.
-- Idempotent : ré-exécution sans effet (déjà dédupliqué).

with deduped as (
  select id,
         (select coalesce(jsonb_agg(t order by t), '[]'::jsonb)
          from (select distinct value as t
                from jsonb_array_elements_text(departures)) s) as clean
  from bus_routes
  where departures is not null
)
update bus_routes br
set departures = d.clean
from deduped d
where br.id = d.id
  and br.departures is distinct from d.clean;

-- Vérif post-hotfix (doit retourner 0) :
-- select br.id, br.from_place, br.to_place,
--        jsonb_array_length(br.departures) as n,
--        (select count(distinct value) from jsonb_array_elements_text(br.departures)) as n_unique
-- from bus_routes br
-- where br.departures is not null
-- having jsonb_array_length(br.departures) <> (select count(distinct value) from jsonb_array_elements_text(br.departures));
