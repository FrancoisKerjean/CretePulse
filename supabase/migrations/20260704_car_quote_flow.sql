-- Flux devis location voiture (appel d'offres automatisé) :
--   1. lead créé (car_requests, status 'sent') + quote_token → email loueur
--   2. loueur soumet son prix via /car-quote/{token} → status 'quoted',
--      quoted_price/quoted_at + accept_token → email prix au client
--   3. client accepte via /car-offer/{token} → status 'accepted', accepted_at
--      → emails de mise en relation (coordonnées échangées)
-- Tokens stockés hashés (SHA256), comme cb_reviews. Nullifiés après usage.

alter table public.car_requests
  add column if not exists quote_token_hash  text,
  add column if not exists accept_token_hash text,
  add column if not exists quoted_price      numeric,
  add column if not exists quoted_currency   text default 'EUR',
  add column if not exists quoted_at         timestamptz,
  add column if not exists accepted_at       timestamptz;

create unique index if not exists car_requests_quote_token_idx
  on public.car_requests (quote_token_hash) where quote_token_hash is not null;
create unique index if not exists car_requests_accept_token_idx
  on public.car_requests (accept_token_hash) where accept_token_hash is not null;

notify pgrst, 'reload schema';
