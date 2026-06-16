-- supabase/migrations/20260615120000_cb_reviews.sql

CREATE TABLE cb_reviews (
  id                  bigserial PRIMARY KEY,
  place_slug          text   NOT NULL,
  rating              int    NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment             text   CHECK (comment IS NULL OR length(comment) <= 1000),
  author_name         text   NOT NULL CHECK (length(author_name) BETWEEN 1 AND 40),
  email               text   NOT NULL,
  status              text   NOT NULL CHECK (status IN ('pending','published','removed','expired','pending_review')),
  confirm_token_hash  text,
  delete_token_hash   text,
  consent_at          timestamptz NOT NULL,
  consent_text_hash   text   NOT NULL,
  ip_hash             text   NOT NULL,
  salt_version        int    NOT NULL DEFAULT 1,
  locale              text   NOT NULL CHECK (locale IN ('en','fr','de','el','it','nl','pl','es','pt','ru','ja','ko','zh','tr','sv','da','no','fi','cs','hu','ro','ar')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  published_at        timestamptz,
  removed_at          timestamptz,
  removed_reason      text,
  UNIQUE (place_slug, email)
);
CREATE INDEX idx_cb_reviews_slug_status   ON cb_reviews(place_slug, status);
CREATE INDEX idx_cb_reviews_status_created ON cb_reviews(status, created_at);
CREATE UNIQUE INDEX idx_cb_reviews_confirm_token_hash ON cb_reviews(confirm_token_hash) WHERE confirm_token_hash IS NOT NULL;
CREATE UNIQUE INDEX idx_cb_reviews_delete_token_hash  ON cb_reviews(delete_token_hash)  WHERE delete_token_hash  IS NOT NULL;

CREATE TABLE cb_review_votes (
  review_id    bigint REFERENCES cb_reviews(id) ON DELETE CASCADE,
  ip_hash      text   NOT NULL,
  value        int    NOT NULL CHECK (value IN (-1, 1)),
  salt_version int    NOT NULL DEFAULT 1,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (review_id, ip_hash)
);

CREATE TABLE cb_review_reports (
  review_id    bigint REFERENCES cb_reviews(id) ON DELETE CASCADE,
  ip_hash      text   NOT NULL,
  reason       text   CHECK (reason IN ('spam','abuse','offtopic')),
  salt_version int    NOT NULL DEFAULT 1,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (review_id, ip_hash)
);

CREATE TABLE cb_review_admin_log (
  id           bigserial PRIMARY KEY,
  review_id    bigint REFERENCES cb_reviews(id) ON DELETE SET NULL,
  action       text NOT NULL CHECK (action IN ('remove','restore','review_pending')),
  reason       text,
  admin_ip     text,
  performed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE cb_review_banned_emails (
  email_hash  text NOT NULL,
  place_slug  text NOT NULL,
  banned_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (email_hash, place_slug)
);

CREATE VIEW cb_reviews_with_counts AS
SELECT
  r.*,
  COALESCE(SUM(CASE WHEN v.value =  1 THEN 1 ELSE 0 END), 0)::int AS upvotes,
  COALESCE(SUM(CASE WHEN v.value = -1 THEN 1 ELSE 0 END), 0)::int AS downvotes
FROM cb_reviews r
LEFT JOIN cb_review_votes v ON v.review_id = r.id
GROUP BY r.id;

ALTER TABLE cb_reviews              ENABLE ROW LEVEL SECURITY;
ALTER TABLE cb_review_votes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE cb_review_reports       ENABLE ROW LEVEL SECURITY;
ALTER TABLE cb_review_admin_log     ENABLE ROW LEVEL SECURITY;
ALTER TABLE cb_review_banned_emails ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON cb_reviews, cb_review_votes, cb_review_reports, cb_review_admin_log, cb_review_banned_emails FROM anon;
REVOKE ALL ON cb_reviews_with_counts FROM anon;
GRANT  ALL ON cb_reviews, cb_review_votes, cb_review_reports, cb_review_admin_log, cb_review_banned_emails TO service_role;
GRANT  SELECT ON cb_reviews_with_counts TO service_role;

NOTIFY pgrst, 'reload schema';
