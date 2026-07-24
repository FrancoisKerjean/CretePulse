-- Devis multiples : chaque loueur invité porte SON devis + statut, au lieu du
-- devis gagnant unique sur car_requests (modèle first-come remplacé).
ALTER TABLE car_quote_invites
  ADD COLUMN IF NOT EXISTS status           text NOT NULL DEFAULT 'invited',
  ADD COLUMN IF NOT EXISTS quote_price      numeric,
  ADD COLUMN IF NOT EXISTS quote_currency   text,
  ADD COLUMN IF NOT EXISTS quote_car_model  text,
  ADD COLUMN IF NOT EXISTS quote_inclusions jsonb,
  ADD COLUMN IF NOT EXISTS quoted_at        timestamptz,
  ADD COLUMN IF NOT EXISTS declined_at      timestamptz,
  ADD COLUMN IF NOT EXISTS relanced_at      timestamptz;

CREATE INDEX IF NOT EXISTS idx_car_quote_invites_request ON car_quote_invites (request_id);

ALTER TABLE car_requests
  ADD COLUMN IF NOT EXISTS client_relanced_at   timestamptz,
  ADD COLUMN IF NOT EXISTS client_relance_count int NOT NULL DEFAULT 0;
