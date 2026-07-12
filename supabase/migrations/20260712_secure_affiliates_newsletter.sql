-- Security hardening: lock down PII tables that were readable by the public
-- PostgREST `anon` role (the anon key ships in the browser bundle).
--
-- Before this migration, `affiliates`, `affiliate_clicks` and
-- `newsletter_subscribers` had NO row level security and NO REVOKE, so anyone
-- could forge `GET /affiliates?select=email,code_promo` (partner emails +
-- promo codes) or `GET /newsletter_subscribers?select=email,confirm_token`
-- (mailing list + double-opt-in tokens) directly with the public anon key.
--
-- Pattern mirrors migration 20260615120000_cb_reviews.sql (the correct model):
-- these tables are only ever accessed server-side via the service_role client
-- (newsletter routes, affiliate-store, affiliate-places, register). Confirmed
-- no anon reader remains after switching affiliate-places.ts to supabaseAdmin.
--
-- Applied on the self-hosted Postgres behind PostgREST (DB `cretepulse`). Idempotent.
--
-- Apply (owner / deploy):
--   cat supabase/migrations/20260712_secure_affiliates_newsletter.sql | ssh kairos-vps \
--     docker exec -i cretepulse-postgres psql -U postgres -d cretepulse
--   then reload PostgREST schema cache:
--   ssh kairos-vps "docker exec cretepulse-postgres psql -U postgres -d cretepulse -c \"NOTIFY pgrst, 'reload schema';\""

ALTER TABLE affiliates            ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_clicks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON affiliates, affiliate_clicks, newsletter_subscribers FROM anon, authenticated;
GRANT  ALL ON affiliates, affiliate_clicks, newsletter_subscribers TO service_role;
-- affiliate_clicks uses a bigserial id → its sequence must stay usable by the writer role.
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

NOTIFY pgrst, 'reload schema';
