-- Publish ownership token for Stays listings (B3 hardening).
alter table public.stay_listings add column if not exists publish_token_hash text;
notify pgrst, 'reload schema';
