-- Lien figé beaches -> cb_places (enrichissement plages, validé Kami 16/06/2026).
-- Additif. cb_slug pointe (logiquement) vers cb_places.slug ; pas de FK dure car
-- cb_places est re-scrapé indépendamment. Rempli une fois par scripts/match-beaches-cb.ts.
alter table beaches
  add column if not exists cb_slug   text,
  add column if not exists cb_match_m integer;

-- PostgREST self-hosted : recharger le cache de schema
notify pgrst, 'reload schema';
