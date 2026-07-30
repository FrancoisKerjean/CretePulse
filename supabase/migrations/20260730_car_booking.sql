-- Tunnel voyageur car-rental : paiement en ligne, fonds retenus, versement au
-- loueur a la fermeture du droit au remboursement.
--
-- Colonnes sur car_requests plutot qu'une table dediee : une demande donne au
-- plus une reservation, et tout le back-office lit deja car_requests.
--
-- Modele de fonds : CHARGES SEPAREES. Le paiement va sur le compte plateforme,
-- puis un transfert part vers le compte connecte du loueur. C'est l'inverse de
-- Stays (charge de destination) et c'est volontaire : tant que les fonds sont
-- chez nous, un remboursement ne reprend d'argent a personne.

alter table public.car_requests
  -- null | pending_payment | paid | transferred | cancelled | refunded
  add column if not exists booking_status            text,
  add column if not exists booking_amount_eur        numeric,
  -- Option d'annulation. Ce n'est PAS une assurance : distribuer de l'assurance
  -- est une activite reglementee. C'est une condition tarifaire du service.
  add column if not exists cancellation_option       boolean not null default false,
  add column if not exists booking_session_id        text,
  add column if not exists booking_payment_intent_id text,
  add column if not exists booking_paid_at           timestamptz,
  -- Jeton de paiement ET d'annulation. Seul le SHA256 vit en base, le clair ne
  -- passe que par l'URL envoyee au client (meme convention que les jetons Stays).
  add column if not exists booking_token_hash        text,
  add column if not exists transfer_due_at           timestamptz,
  add column if not exists transfer_id               text,
  add column if not exists transferred_at            timestamptz,
  add column if not exists cancelled_at              timestamptz,
  add column if not exists refund_id                 text,
  add column if not exists refund_amount_eur         numeric;

-- Deux clics ne creent pas deux paiements, ni deux versements.
create unique index if not exists car_requests_booking_session_idx
  on public.car_requests (booking_session_id) where booking_session_id is not null;
create unique index if not exists car_requests_transfer_idx
  on public.car_requests (transfer_id) where transfer_id is not null;
create index if not exists car_requests_booking_token_idx
  on public.car_requests (booking_token_hash) where booking_token_hash is not null;
-- Le cron de versement balaie cet index, pas la table entiere.
create index if not exists car_requests_transfer_due_idx
  on public.car_requests (transfer_due_at)
  where booking_status = 'paid' and transfer_id is null;

-- Compte de versement du loueur (Stripe Connect Express).
alter table public.car_partners
  add column if not exists stripe_connect_account_id text,
  add column if not exists kyc_status                text not null default 'none';

create unique index if not exists car_partners_connect_idx
  on public.car_partners (stripe_connect_account_id)
  where stripe_connect_account_id is not null;

notify pgrst, 'reload schema';
