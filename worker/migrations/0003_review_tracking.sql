-- Post-processing review tracking
-- Run with: wrangler d1 execute trash-myx-db --remote --file=./migrations/0003_review_tracking.sql

-- Add review columns to scans table
ALTER TABLE scans ADD COLUMN reviewed_at INTEGER;
ALTER TABLE scans ADD COLUMN reviewed_by TEXT;  -- 'gemini_pro', 'claude'
ALTER TABLE scans ADD COLUMN original_item TEXT;
ALTER TABLE scans ADD COLUMN original_bin TEXT;
ALTER TABLE scans ADD COLUMN review_confidence REAL;
ALTER TABLE scans ADD COLUMN review_reason TEXT;

-- Add review columns to quiz_images table
ALTER TABLE quiz_images ADD COLUMN reviewed_at INTEGER;
ALTER TABLE quiz_images ADD COLUMN reviewed_by TEXT;
ALTER TABLE quiz_images ADD COLUMN original_item TEXT;
ALTER TABLE quiz_images ADD COLUMN original_bin TEXT;
ALTER TABLE quiz_images ADD COLUMN review_confidence REAL;
ALTER TABLE quiz_images ADD COLUMN review_reason TEXT;

-- Index for finding unreviewed items
CREATE INDEX IF NOT EXISTS idx_scans_reviewed ON scans(reviewed_at);
CREATE INDEX IF NOT EXISTS idx_quiz_reviewed ON quiz_images(reviewed_at);

-- Review log table for analytics
CREATE TABLE IF NOT EXISTS review_log (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  created_at INTEGER DEFAULT (unixepoch()),
  items_reviewed INTEGER NOT NULL,
  items_changed INTEGER NOT NULL,
  model_used TEXT NOT NULL,  -- 'gemini_pro', 'claude'
  duration_ms INTEGER,
  errors TEXT
);
