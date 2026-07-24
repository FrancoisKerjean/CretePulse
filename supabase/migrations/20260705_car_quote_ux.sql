-- Devis enrichi (trou 2) + idempotence du cron de silence (trou 3).
--   quoted_car_model     : modèle proposé par le loueur (optionnel, ex "VW Polo 2023")
--   quoted_inclusions    : clés d'inclusions cochées par le loueur (jsonb array de string)
--   no_quote_notified_at : horodatage de l'email "aucune agence n'a répondu" (une seule fois)
alter table public.car_requests
  add column if not exists quoted_car_model     text,
  add column if not exists quoted_inclusions    jsonb,
  add column if not exists no_quote_notified_at timestamptz;

notify pgrst, 'reload schema';
