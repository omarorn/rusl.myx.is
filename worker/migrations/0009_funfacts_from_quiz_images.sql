-- Fun facts should be based on saved quiz_images (from scans), not a static facts list
-- Creates user tracking for which quiz_images a user has viewed

CREATE TABLE IF NOT EXISTS user_quiz_facts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  user_hash TEXT NOT NULL,
  quiz_image_id TEXT NOT NULL,
  seen_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (quiz_image_id) REFERENCES quiz_images(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_quiz_facts_unique ON user_quiz_facts(user_hash, quiz_image_id);
CREATE INDEX IF NOT EXISTS idx_user_quiz_facts_user ON user_quiz_facts(user_hash, seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_quiz_facts_image ON user_quiz_facts(quiz_image_id);
