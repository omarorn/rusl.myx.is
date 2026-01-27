-- Add image support to fun_facts table and create user viewing history
-- Run with: wrangler d1 migrations apply trash-myx-db --local
-- Run with: wrangler d1 migrations apply trash-myx-db --remote

-- Add image column to fun_facts (cartoon illustration for each fun fact)
ALTER TABLE fun_facts ADD COLUMN image_key TEXT;

-- Create user_fun_facts table to track what users have seen
CREATE TABLE IF NOT EXISTS user_fun_facts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  user_hash TEXT NOT NULL,
  fun_fact_id INTEGER NOT NULL,
  seen_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (fun_fact_id) REFERENCES fun_facts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_fun_facts_user ON user_fun_facts(user_hash);
CREATE INDEX IF NOT EXISTS idx_user_fun_facts_fact ON user_fun_facts(fun_fact_id);
CREATE INDEX IF NOT EXISTS idx_user_fun_facts_seen ON user_fun_facts(seen_at);

-- Add some initial images (placeholders - will be updated with actual R2 keys)
-- Format: funfacts/illustration_<category>_<id>.png
UPDATE fun_facts SET image_key = 'funfacts/illustration_plastic_01.png' WHERE fact_is LIKE '%plastflaska%';
UPDATE fun_facts SET image_key = 'funfacts/illustration_metal_01.png' WHERE fact_is LIKE '%álumbúð%';
UPDATE fun_facts SET image_key = 'funfacts/illustration_3dprint_01.png' WHERE fact_is LIKE '%3D prentað%';
UPDATE fun_facts SET image_key = 'funfacts/illustration_glass_01.png' WHERE fact_is LIKE '%Gler%';
UPDATE fun_facts SET image_key = 'funfacts/illustration_paper_01.png' WHERE fact_is LIKE '%Pappír%';
UPDATE fun_facts SET image_key = 'funfacts/illustration_food_01.png' WHERE fact_is LIKE '%Matarúrgangur%';
UPDATE fun_facts SET image_key = 'funfacts/illustration_general_01.png' WHERE fact_is LIKE '%Íslendingar framleiða%';
UPDATE fun_facts SET image_key = 'funfacts/illustration_deposit_01.png' WHERE fact_is LIKE '%Skilagjaldskerfið%';
UPDATE fun_facts SET image_key = 'funfacts/illustration_general_02.png' WHERE fact_is LIKE '%SORPA brennir%';
UPDATE fun_facts SET image_key = 'funfacts/illustration_recycling_01.png' WHERE fact_is LIKE '%olíu%';
UPDATE fun_facts SET image_key = 'funfacts/illustration_recycling_02.png' WHERE fact_is LIKE '%Rafhlöður%';
