-- Idempotence des emails de clôture envoyés aux loueurs qui ont répondu.
-- Permet de remercier les loueurs non retenus ou les demandes clôturées sans
-- choix client, puis de rattraper les envois via le cron car-relance.
ALTER TABLE public.car_quote_invites
  ADD COLUMN IF NOT EXISTS closed_notified_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_car_quote_invites_closed_notify
  ON public.car_quote_invites (closed_notified_at, status)
  WHERE quote_price IS NOT NULL;

ALTER TABLE public.car_requests
  ADD COLUMN IF NOT EXISTS closure_reason text;

CREATE INDEX IF NOT EXISTS idx_car_requests_closure_reason
  ON public.car_requests (closure_reason)
  WHERE closure_reason IS NOT NULL;

notify pgrst, 'reload schema';
