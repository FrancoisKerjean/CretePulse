-- Multi-offres loueur (retour Lux Trans « only one option to send » 08/07) : un
-- loueur peut proposer PLUSIEURS variantes pour une même demande (ex. Aygo
-- manuelle 30€/j VS C1 auto 38€/j). Chaque variante = une ligne ici, rattachée
-- à l'invite du loueur. Le client compare toutes les variantes de tous les
-- loueurs et en choisit UNE. Compat : l'invite garde un snapshot de la MEILLEURE
-- option (car_quote_invites.quote_*) → cockpit / commissions / relances / expiry
-- existants tournent sans réécriture.
create table if not exists public.car_quote_options (
  id          bigint generated always as identity primary key,
  invite_id   bigint not null references public.car_quote_invites(id) on delete cascade,
  request_id  bigint not null references public.car_requests(id) on delete cascade,
  partner_id  bigint not null references public.car_partners(id),
  price       numeric not null,
  currency    text not null default 'EUR',
  car_model   text,
  gearbox     text,                              -- 'automatic' | 'manual' | null
  inclusions  jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists car_quote_options_request_idx on public.car_quote_options(request_id);
create index if not exists car_quote_options_invite_idx  on public.car_quote_options(invite_id);

notify pgrst, 'reload schema';
