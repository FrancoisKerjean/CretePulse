-- crete.direct Stays : espace proprietaire et synchro iCal (lot B, 29/07/2026)
--
-- L'espace proprietaire suit la meme convention que les autres liens du site :
-- pas de compte, pas de mot de passe, un jeton dont seul le SHA256 vit en base.
-- Un proprietaire qui confie sa maison doit pouvoir voir ses reservations,
-- changer son prix et bloquer ses dates sans creer de compte.

alter table public.stay_owners
  add column if not exists owner_token_hash text unique,
  -- Pays et type d'entite du compte de versement, demandes une fois a la
  -- premiere acceptation puis reutilises.
  add column if not exists country text,
  add column if not exists business_type text;

alter table public.stay_listings
  -- Derniere synchro iCal reussie et derniere erreur : un flux mort se repere a
  -- une date qui n'avance plus, sans avoir a fouiller les journaux.
  add column if not exists ical_synced_at timestamptz,
  add column if not exists ical_last_error text;

create index if not exists stay_listings_ical_sync_idx
  on public.stay_listings (status, ical_synced_at);

-- Le cron d'expiration balaie les demandes en attente par anciennete.
create index if not exists stay_requests_pending_idx
  on public.stay_requests (status, created_at);

notify pgrst, 'reload schema';
