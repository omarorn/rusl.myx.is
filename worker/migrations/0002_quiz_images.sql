-- Quiz images for the "Hversu vel þekkir þú ruslið?" game
-- Run with: wrangler d1 execute trash-myx-db --remote --file=./migrations/0002_quiz_images.sql

-- Quiz myndir - safn af flokkuðum myndum til að nota í spurningaleik
CREATE TABLE IF NOT EXISTS quiz_images (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  image_key TEXT NOT NULL,        -- R2 bucket key
  item TEXT NOT NULL,             -- What the item is (e.g., "Plastflaska")
  bin TEXT NOT NULL,              -- Correct bin (paper, plastic, food, mixed, recycling_center)
  reason TEXT,                    -- Why it goes in that bin
  confidence REAL,                -- AI confidence when classified
  submitted_by TEXT,              -- User hash who submitted
  approved INTEGER DEFAULT 1,     -- Moderation flag
  times_shown INTEGER DEFAULT 0,  -- Quiz stats
  times_correct INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_quiz_images_bin ON quiz_images(bin);
CREATE INDEX IF NOT EXISTS idx_quiz_images_approved ON quiz_images(approved);

-- Quiz skor - leaderboard
CREATE TABLE IF NOT EXISTS quiz_scores (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  user_hash TEXT NOT NULL,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  mode TEXT NOT NULL,             -- 'timed', 'survival', 'learning'
  time_seconds INTEGER,           -- For timed mode
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_quiz_scores_mode ON quiz_scores(mode, score DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_scores_user ON quiz_scores(user_hash);
