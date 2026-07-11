-- Van partage a la demande : capture d'intention sur paires bus non
-- desservies ou uniquement en correspondance (lot 1). Aucun email envoye
-- en v1 : seule la demande est stockee, le concierge se declenche a partir
-- d'un seuil (~4 demandes matchables/paire/semaine). Modele GoOpti.
-- Cloisonnement RGPD identique a car_requests : service_role only.

create table if not exists public.van_requests (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  locale text not null default 'en',
  from_slug text not null,
  to_slug text not null,
  from_place text,        -- libelle affiche cote UI (pour lecture ops sans join)
  to_place text,
  travel_date date not null,
  pax smallint not null default 1,
  customer_email text not null,
  note text,
  source text not null,   -- 'journey-no-route' | 'journey-indirect'
  best_changes smallint,  -- 0 = paire non desservie ; >=1 = uniquement en correspondance
  ip_hash text,           -- SHA256(IP + sel) ; jamais l'IP en clair (RGPD)
  status text not null default 'captured'
);
create index if not exists van_requests_created_idx on public.van_requests (created_at desc);
create index if not exists van_requests_pair_date_idx on public.van_requests (from_slug, to_slug, travel_date);
create index if not exists van_requests_ip_hash_created_idx on public.van_requests (ip_hash, created_at);
create index if not exists van_requests_dedup_idx on public.van_requests (customer_email, from_slug, to_slug, travel_date);

revoke all on public.van_requests from anon, authenticated;
grant select, insert, update on public.van_requests to service_role;
grant usage, select on sequence public.van_requests_id_seq to service_role;

notify pgrst, 'reload schema';
