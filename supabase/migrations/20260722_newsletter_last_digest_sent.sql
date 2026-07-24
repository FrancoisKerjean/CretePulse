-- Weekly digest idempotency: remember when each subscriber last received the
-- newsletter so the cron never double-sends on an at-least-once retry.
ALTER TABLE newsletter_subscribers
  ADD COLUMN IF NOT EXISTS last_digest_sent_at timestamptz;

NOTIFY pgrst, 'reload schema';
