-- Arrêts intermédiaires (chantier validé Kami 13/06/2026) : les noms de
-- lignes PDF e-ktel contiennent la séquence complète d'arrêts
-- ('CHANIA-GEORGIOUPOLIS-KAVROS-RETHYMNO-BALI-HERAKLION'). On la conserve
-- désormais : via_stops = arrêts entre les deux terminus, dans l'ordre.
-- NULL = pas d'intermédiaire connu (routes directes, herlas).

alter table bus_routes
  add column if not exists via_stops jsonb;

-- PostgREST self-hosted : recharger le cache de schema
notify pgrst, 'reload schema';
