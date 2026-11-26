-- Catalogue de prix des loueurs partenaires + acompte en ligne.
-- Spec : docs/superpowers/specs/2026-11-25-car-catalogue-acompte-design.md (sections 6, 8, 9).
--
-- Migration additive : add column if not exists, create table if not exists,
-- create index if not exists. Rien de destructif, sans effet tant que le code
-- ne lit pas ces colonnes.

-- Portail loueur, conditions acceptées et état du catalogue de tarifs.
alter table public.car_partners
  add column if not exists portal_token              text unique,
  add column if not exists terms_version             text,
  add column if not exists terms_accepted_at         timestamptz,
  add column if not exists rates_expiry_reminded_at  timestamptz,
  add column if not exists rates_status              text not null default 'none'
    check (rates_status in ('none','draft','live','paused')),
  add column if not exists rates_paused_until        date,
  add column if not exists rates_published_at        timestamptz,
  add column if not exists catalogue_conditions      jsonb;

-- Grille tarifaire : un prix par jour selon catégorie, période et durée minimale.
create table if not exists public.car_partner_rates (
  id          bigserial primary key,
  partner_id  bigint not null references public.car_partners(id) on delete cascade,
  category    text not null check (category in ('city','compact','sedan','automatic','suv')),
  period_from date not null,
  period_to   date not null check (period_to >= period_from),
  min_days    int not null check (min_days >= 1),
  eur_per_day numeric not null check (eur_per_day > 0),
  source      text,
  created_at  timestamptz not null default now(),
  unique (partner_id, category, period_from, min_days)
);

-- Origine d'une option : devis du loueur ou calcul depuis le catalogue.
alter table public.car_quote_options
  add column if not exists source text not null default 'quote'
    check (source in ('quote','catalogue'));

-- Acompte : suivi de la confirmation par le loueur et du remboursement.
-- Valeurs de booking_status (colonne texte sans contrainte) pour l'acompte :
-- pending_payment, awaiting_partner, confirmed, refunded, cancelled_kept.
alter table public.car_requests
  add column if not exists deposit_option_id      bigint,
  add column if not exists deposit_eur            numeric,
  add column if not exists deposit_rate           numeric,
  add column if not exists confirm_deadline_at    timestamptz,
  add column if not exists confirm_reminded_at    timestamptz,
  add column if not exists partner_confirm_token  text unique,
  add column if not exists partner_confirmed_at   timestamptz,
  add column if not exists refund_reason          text
    check (refund_reason in ('partner_declined','partner_timeout','client_cancelled','partner_cancelled','ops'));

-- Le cron de relance et d'expiration balaie cet index, pas la table entière.
create index if not exists car_requests_confirm_deadline_idx
  on public.car_requests (confirm_deadline_at)
  where booking_status = 'awaiting_partner';

-- Défaillance du loueur après un acompte payé : consignée sur SON invitation,
-- pour survivre au client qui réserve une autre offre sur la même demande
-- (compte pour la règle de suspension : 3 défaillances en 30 jours).
alter table public.car_quote_invites
  add column if not exists deposit_failure_reason text
    check (deposit_failure_reason in ('partner_declined','partner_timeout','partner_cancelled')),
  add column if not exists deposit_failed_at      timestamptz;

create index if not exists car_quote_invites_deposit_failed_idx
  on public.car_quote_invites (partner_id, deposit_failed_at)
  where deposit_failed_at is not null;

-- Compensation de l'acompte sur la facture de commission du loueur.
alter table public.car_commission_invoices
  add column if not exists settlement text
    check (settlement in ('deposit_compensation'));

notify pgrst, 'reload schema';
