BEGIN;

ALTER TABLE guides_queue
  ADD COLUMN IF NOT EXISTS format TEXT NOT NULL DEFAULT 'mid' CHECK (format IN ('pillar','mid','short')),
  ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'seed',
  ADD COLUMN IF NOT EXISTS source_meta JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_guides_queue_pending
  ON guides_queue (status, format, priority DESC, created_at ASC)
  WHERE status = 'pending';

ALTER TABLE guides
  ADD COLUMN IF NOT EXISTS source_meta JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS target_query TEXT,
  ADD COLUMN IF NOT EXISTS format_tier TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'guides_format_tier_check'
  ) THEN
    ALTER TABLE guides
      ADD CONSTRAINT guides_format_tier_check
      CHECK (format_tier IS NULL OR format_tier IN ('pillar','mid','short'));
  END IF;
END $$;

COMMIT;
