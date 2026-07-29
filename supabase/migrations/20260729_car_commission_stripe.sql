-- Encaissement de la commission loueur par Stripe.
--
-- Modele : le loueur encaisse son client en direct, crete.direct lui facture la
-- commission. Le paiement va donc DIRECTEMENT sur le compte plateforme, sans
-- transfer_data ni compte connecte : aucune dependance a Stripe Connect, qui
-- n'est pas active en live (verifie 29/07/2026, requestId req_LTgM8Q2P3wMWA8).

alter table public.car_requests
  -- Session Checkout de la commission. Unique : garde-fou contre un second
  -- appel Stripe sur la meme location si le back-office rejoue setOutcome.
  add column if not exists commission_session_id         text,
  add column if not exists commission_payment_intent_id  text,
  -- Horodatage de l'envoi au loueur, distinct de commission_paid_at : il permet
  -- de voir une demande partie mais jamais reglee.
  add column if not exists commission_requested_at       timestamptz;

create unique index if not exists car_requests_commission_session_idx
  on public.car_requests (commission_session_id)
  where commission_session_id is not null;

-- Registre d'idempotence partage avec Stays. `request_id` seul est ambigu : un
-- id de car_requests et un id de stay_requests sont deux petits entiers qui se
-- recouvrent. `scope` leve l'ambiguite. Defaut 'stays' pour les lignes deja en
-- base (aucune a ce jour, mais la valeur reste juste si une arrive avant le deploy).
alter table public.stripe_webhook_events
  add column if not exists scope text not null default 'stays';

-- PostgREST self-hosted : recharger le cache de schema pour exposer les colonnes.
notify pgrst, 'reload schema';
