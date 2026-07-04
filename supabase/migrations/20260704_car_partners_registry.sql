-- Registre des loueurs en base (remplace la liste statique car-partners.ts) :
-- onboarding d'un loueur = un INSERT, plus de déploiement. Modèle appel d'offres
-- « first-come » : une demande part à TOUS les loueurs actifs de la zone
-- (car_quote_invites, un jeton par loueur), le PREMIER qui soumet son prix gagne
-- (verrou sur car_requests.status : passe de 'sent' à 'quoted').

create table if not exists public.car_partners (
  id            bigint generated always as identity primary key,
  name          text not null,
  email         text not null unique,
  phone         text,
  whatsapp      text,
  zone_ids      text[] not null default '{}',   -- chania-west | rethymno | heraklion-center | lasithi-east
  commission    numeric not null default 0.10,
  lead_routing  text not null default 'direct', -- 'direct' (auto) | 'relay' (Kami transfère)
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);
create index if not exists car_partners_zone_idx on public.car_partners using gin (zone_ids);

-- Une ligne par loueur invité sur une demande (chaque loueur a son propre jeton).
create table if not exists public.car_quote_invites (
  id               bigint generated always as identity primary key,
  request_id       bigint not null references public.car_requests(id) on delete cascade,
  partner_id       bigint not null references public.car_partners(id),
  quote_token_hash text not null,
  created_at       timestamptz not null default now()
);
create unique index if not exists car_quote_invites_token_idx on public.car_quote_invites (quote_token_hash);
create index if not exists car_quote_invites_request_idx on public.car_quote_invites (request_id);

-- Le loueur gagnant n'est connu qu'à la 1re soumission de prix : on relâche la
-- contrainte NOT NULL et on trace le gagnant.
alter table public.car_requests
  alter column partner_name  drop not null,
  alter column partner_email drop not null,
  add column if not exists quoted_by_partner_id bigint references public.car_partners(id);

-- Seed : le partenaire existant Auto Smart (mêmes zones qu'avant).
insert into public.car_partners (name, email, phone, whatsapp, zone_ids, commission, lead_routing, active)
values ('Auto Smart Car Rental', 'autosmartrental@gmail.com', '+306974147291', '+306974147291',
        array['chania-west','rethymno','heraklion-center'], 0.10, 'direct', true)
on conflict (email) do nothing;

revoke all on public.car_partners from anon, authenticated;
revoke all on public.car_quote_invites from anon, authenticated;
grant select, insert, update on public.car_partners to service_role;
grant select, insert, update, delete on public.car_quote_invites to service_role;

notify pgrst, 'reload schema';
