-- crete.direct « Stays » — seasonal rental marketplace (Phase 1)
-- Convention: idempotent, explicit grants, ends with notify pgrst.

create extension if not exists btree_gist;

-- Idempotent Stripe webhook ledger (ported from Kairos siteweb)
create table if not exists public.stripe_webhook_events (
  stripe_event_id text primary key,
  received_at timestamptz not null default now(),
  type text,
  request_id bigint,
  processed boolean not null default false
);

create table if not exists public.stay_owners (
  id bigint primary key generated always as identity,
  name text,
  email text not null unique,
  phone text,
  stripe_connect_account_id text unique,
  kyc_status text not null default 'none', -- none | pending | complete
  created_at timestamptz not null default now()
);

create table if not exists public.stay_listings (
  id bigint primary key generated always as identity,
  owner_id bigint not null references public.stay_owners(id) on delete cascade,
  slug text not null unique,
  airbnb_id text,
  airbnb_url text,
  title text,
  description text,
  photos text[] not null default '{}',
  zone_id text,
  location_slug text,
  lat double precision,
  lng double precision,
  property_type text,
  bedrooms smallint,
  beds smallint,
  max_guests smallint,
  base_price_eur numeric not null default 0,     -- owner NET price
  cleaning_fee_eur numeric not null default 0,
  min_nights smallint not null default 1,
  amenities jsonb not null default '[]',
  commission_rate numeric not null default 5,    -- percent added to guest
  ical_private_url text,
  ical_sync_meta jsonb,
  status text not null default 'draft',           -- draft | published | unpublished
  created_at timestamptz not null default now()
);
create index if not exists stay_listings_status_idx on public.stay_listings (status);
create index if not exists stay_listings_owner_idx on public.stay_listings (owner_id);

create table if not exists public.stay_availability (
  id bigint primary key generated always as identity,
  listing_id bigint not null references public.stay_listings(id) on delete cascade,
  date date not null,
  status text not null default 'available',       -- available | booked | blocked_ota | hold
  source text,
  request_id bigint,
  price_override numeric,
  unique (listing_id, date)
);
create index if not exists stay_availability_listing_date_idx on public.stay_availability (listing_id, date);

create table if not exists public.stay_requests (
  id bigint primary key generated always as identity,
  listing_id bigint not null references public.stay_listings(id) on delete cascade,
  guest_name text not null,
  guest_email text not null,
  guest_phone text,
  date_from date not null,
  date_to date not null,
  pax smallint,
  message text,
  status text not null default 'pending',
    -- pending | approved | declined | expired | deposit_paid | confirmed | cancelled
  quoted_price_eur numeric,                       -- owner NET price fixed at approval
  quoted_at timestamptz,
  approve_token_hash text unique,
  pay_token_hash text unique,
  stripe_session_id text,
  deposit_amount numeric,
  deposit_paid_at timestamptz,
  deposit_payment_intent_id text,
  balance_amount numeric,
  balance_paid_at timestamptz,
  balance_payment_intent_id text,
  commission_eur numeric,
  ip_hash text,
  created_at timestamptz not null default now()
);
create index if not exists stay_requests_listing_idx on public.stay_requests (listing_id);
create index if not exists stay_requests_dedup_idx on public.stay_requests (guest_email, listing_id, date_from);
create index if not exists stay_requests_ip_idx on public.stay_requests (ip_hash, created_at);

-- Double-booking impossible at DB level for paid/confirmed stays.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'stay_requests_no_overlap'
  ) then
    alter table public.stay_requests
      add constraint stay_requests_no_overlap
      exclude using gist (
        listing_id with =,
        daterange(date_from, date_to, '[)') with &&
      )
      where (status in ('deposit_paid', 'confirmed'));
  end if;
end $$;

-- Atomic confirmation: flip status + write availability in one call.
-- Raises 23P01 (exclusion_violation) if the dates were taken meanwhile.
create or replace function public.mark_stay_deposit_paid(
  p_request_id bigint,
  p_session_id text,
  p_payment_intent_id text
)
returns setof public.stay_requests
language plpgsql
as $$
declare
  r public.stay_requests;
  d date;
begin
  update public.stay_requests
     set status = 'deposit_paid',
         deposit_paid_at = now(),
         deposit_payment_intent_id = p_payment_intent_id,
         stripe_session_id = coalesce(p_session_id, stripe_session_id)
   where id = p_request_id
     and status in ('approved', 'pending')
   returning * into r;

  if r.id is null then
    return; -- already processed or not approvable; caller treats as no-op
  end if;

  d := r.date_from;
  while d < r.date_to loop
    insert into public.stay_availability (listing_id, date, status, source, request_id)
    values (r.listing_id, d, 'booked', 'stays', r.id)
    on conflict (listing_id, date)
    do update set status = 'booked', source = 'stays', request_id = r.id;
    d := d + 1;
  end loop;

  return next r;
end $$;

revoke all on public.stripe_webhook_events from anon, authenticated;
revoke all on public.stay_owners from anon, authenticated;
revoke all on public.stay_listings from anon, authenticated;
revoke all on public.stay_availability from anon, authenticated;
revoke all on public.stay_requests from anon, authenticated;

grant select, insert, update on public.stripe_webhook_events to service_role;
grant select, insert, update on public.stay_owners to service_role;
grant select, insert, update on public.stay_listings to service_role;
grant select, insert, update, delete on public.stay_availability to service_role;
grant select, insert, update on public.stay_requests to service_role;
grant execute on function public.mark_stay_deposit_paid(bigint, text, text) to service_role;

notify pgrst, 'reload schema';
