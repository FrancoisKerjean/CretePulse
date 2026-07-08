-- Verticale activités (clone du modèle car-rental multi-devis) :
-- demandes clients (activity_requests), registre prestataires
-- (activity_partners), invites multi-devis (activity_quote_invites),
-- référentiel catégories (activity_categories).
-- Mêmes conventions que car_* : service_role only, tokens hashés,
-- grants explicites, notify pgrst.

create table if not exists public.activity_categories (
  slug       text primary key,          -- food-tours | boat-trips | hiking
  name_en    text not null,
  sort_order smallint not null default 0,
  active     boolean not null default true
);
insert into public.activity_categories (slug, name_en, sort_order) values
  ('food-tours', 'Food & wine tours', 1),
  ('boat-trips', 'Boat trips', 2),
  ('hiking',     'Hiking & nature', 3)
on conflict (slug) do nothing;

create table if not exists public.activity_partners (
  id            bigint generated always as identity primary key,
  name          text not null,
  email         text not null unique,
  phone         text,
  whatsapp      text,
  category_slug text not null references public.activity_categories(slug),
  cities        text[] not null default '{}',  -- chania|rethymno|heraklion|agios-nikolaos|ierapetra
  languages     text[] not null default '{en}',
  commission    numeric not null default 0.10,
  lead_routing  text not null default 'direct', -- 'direct' | 'relay'
  active        boolean not null default true,
  outreach_status text not null default 'new',  -- 'new' | 'inbound' (car: colonne hors-repo, ici migrée proprement)
  created_at    timestamptz not null default now()
);
create index if not exists activity_partners_cities_idx on public.activity_partners using gin (cities);

create table if not exists public.activity_requests (
  id                   bigint generated always as identity primary key,
  created_at           timestamptz not null default now(),
  locale               text not null default 'en',
  category_slug        text not null references public.activity_categories(slug),
  city                 text not null,
  activity_date        date not null,
  timeslot             text,               -- morning | afternoon | evening | flexible
  adults               smallint not null default 2,
  children             smallint not null default 0,
  preferred_language   text,               -- en | fr | de | el | it
  customer_name        text not null,
  customer_email       text not null,
  customer_phone       text,
  note                 text,
  source               text,
  status               text not null default 'sent', -- sent | quoted | accepted | declined_by_client | email_failed
  ip_hash              text,
  -- tokens client (rotatifs, hash SHA256, jamais en clair)
  accept_token_hash    text,
  -- snapshot du devis choisi (noms identiques car_requests)
  quoted_by_partner_id bigint references public.activity_partners(id),
  quoted_price         numeric,
  quoted_currency      text default 'EUR',
  quoted_details       text,               -- équivalent quoted_car_model : titre de l'offre
  quoted_inclusions    jsonb,
  quoted_at            timestamptz,
  accepted_at          timestamptz,
  partner_name         text,
  partner_email        text,
  -- relances client (clone car multi-devis)
  client_relanced_at   timestamptz,
  client_relance_count int not null default 0,
  no_quote_notified_at timestamptz,
  -- back-office commissions (clone 20260705_car_admin.sql)
  outcome              text,               -- 'done' (activité effectuée) | 'lost' | null
  outcome_at           timestamptz,
  final_amount_eur     numeric,
  commission_eur       numeric,
  commission_paid_at   timestamptz,
  admin_note           text
);
create index if not exists activity_requests_created_idx on public.activity_requests (created_at desc);
create index if not exists activity_requests_dedup_idx on public.activity_requests (customer_email, category_slug, city, activity_date);
create index if not exists idx_activity_requests_ip_hash_created on public.activity_requests (ip_hash, created_at);
create unique index if not exists activity_requests_accept_token_idx
  on public.activity_requests (accept_token_hash) where accept_token_hash is not null;

create table if not exists public.activity_quote_invites (
  id               bigint generated always as identity primary key,
  request_id       bigint not null references public.activity_requests(id) on delete cascade,
  partner_id       bigint not null references public.activity_partners(id),
  quote_token_hash text not null,
  status           text not null default 'invited', -- invited|quoted|declined|chosen|not_chosen
  quote_price      numeric,
  quote_currency   text,
  quote_details    text,
  quote_inclusions jsonb,
  quoted_at        timestamptz,
  declined_at      timestamptz,
  relanced_at      timestamptz,
  created_at       timestamptz not null default now()
);
create unique index if not exists activity_quote_invites_token_idx on public.activity_quote_invites (quote_token_hash);
create index if not exists activity_quote_invites_request_idx on public.activity_quote_invites (request_id);

-- Données personnelles : aucun accès aux rôles publics.
revoke all on public.activity_categories from anon, authenticated;
revoke all on public.activity_partners from anon, authenticated;
revoke all on public.activity_requests from anon, authenticated;
revoke all on public.activity_quote_invites from anon, authenticated;
grant select on public.activity_categories to service_role;
grant select, insert, update on public.activity_partners to service_role;
grant select, insert, update on public.activity_requests to service_role;
grant select, insert, update, delete on public.activity_quote_invites to service_role;
grant usage, select on sequence public.activity_partners_id_seq to service_role;
grant usage, select on sequence public.activity_requests_id_seq to service_role;
grant usage, select on sequence public.activity_quote_invites_id_seq to service_role;

notify pgrst, 'reload schema';
