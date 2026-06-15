-- Abonnements web push (VAPID). Stocke l'endpoint pseudonyme délivré par le
-- navigateur + les clés de chiffrement + la langue + les topics souscrits.
-- RGPD : aucune PII, consentement explicite par opt-in. Lecture/écriture
-- réservées au service role (l'anon ne doit jamais lire les endpoints).
create table if not exists push_subscriptions (
  endpoint    text primary key,
  p256dh      text not null,
  auth        text not null,
  locale      text not null default 'en',
  topics      text[] not null default array['bus_alerts','urgent_news'],
  created_at  timestamptz not null default now(),
  last_ok_at  timestamptz
);

alter table push_subscriptions enable row level security;
-- Pas de policy publique : seul le service role (bypass RLS) accède.
-- Double barrière RGPD : aucun grant pour anon/authenticated + RLS sans policy.
revoke all on push_subscriptions from anon, authenticated;
grant all on push_subscriptions to service_role;

-- Détection des news urgentes pour le push (anti-spam : très peu de true).
alter table news add column if not exists is_urgent boolean not null default false;
-- Dédup : une ligne déjà poussée ne sera jamais re-poussée.
alter table news add column if not exists pushed boolean not null default false;
-- Idem pour les alertes bus.
alter table bus_alerts add column if not exists pushed boolean not null default false;

-- PostgREST self-hosted : recharger le cache de schéma.
notify pgrst, 'reload schema';
