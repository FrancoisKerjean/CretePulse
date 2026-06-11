-- Leads location de voiture (wizard /car-rental). Acces service_role only,
-- aucun acces anon (donnees personnelles).
-- Roles reels du PostgREST self-hosted (init/00-roles.sql sur le VPS) :
-- anon / authenticated / service_role (pas de web_anon).
-- Les tables neuves n'heritent d'aucun grant (pas de default privileges) :
-- grants table-level explicites, modele newsletter_subscribers / buses.
create table if not exists public.car_requests (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  locale text not null default 'en',
  pickup_slug text not null,
  zone_id text not null,
  partner_name text not null,
  partner_email text not null,
  date_from date not null,
  time_from text,
  date_to date not null,
  time_to text,
  flight_no text,
  car_type text not null,
  pax smallint,
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  note text,
  source text, -- page d'origine (?pickup= contextuel)
  status text not null default 'sent' -- sent | email_failed
);
create index if not exists car_requests_created_idx on public.car_requests (created_at desc);
create index if not exists car_requests_dedup_idx on public.car_requests (customer_email, pickup_slug, date_from);

-- Donnees personnelles : aucun acces aux roles publics (explicite, defense en profondeur).
revoke all on public.car_requests from anon, authenticated;
-- L'API route insere, lit (dedup) et met a jour le status (email_failed).
grant select, insert, update on public.car_requests to service_role;
grant usage, select on sequence public.car_requests_id_seq to service_role;

-- PostgREST self-hosted : recharger le cache de schema pour exposer la table
notify pgrst, 'reload schema';
