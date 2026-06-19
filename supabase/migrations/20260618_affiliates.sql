-- Affiliate self-service program (crete.direct -> partner).
-- Applied on the self-hosted Postgres behind PostgREST (DB `cretepulse`),
-- same place as affiliate_prospects. Idempotent.
--
-- Apply (owner / deploy):
--   cat supabase/migrations/20260618_affiliates.sql | ssh kairos-vps \
--     docker exec -i cretepulse-postgres psql -U postgres -d cretepulse
--   then reload PostgREST schema cache:
--   ssh kairos-vps "docker exec cretepulse-postgres psql -U postgres -d cretepulse -c \"NOTIFY pgrst, 'reload schema';\""

create table if not exists affiliates (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  name            text not null,
  category        text not null,
  category_other  text,
  area            text,
  email           text not null,
  redirect_url    text not null,
  code_promo      text not null unique,
  commission_pct  numeric not null default 15,
  status          text not null default 'active',
  prospect_id     uuid,
  created_at      timestamptz not null default now()
);

create index if not exists idx_affiliates_email on affiliates (email);

create table if not exists affiliate_clicks (
  id            bigserial primary key,
  affiliate_id  uuid not null references affiliates(id) on delete cascade,
  ts            timestamptz not null default now(),
  referer       text,
  ua            text,
  ip_hash       text
);

create index if not exists idx_affiliate_clicks_aff_ts on affiliate_clicks (affiliate_id, ts);
