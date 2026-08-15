-- ============================================
-- SUBFOLDERS, TAGS, SUSPEND, EXTRA NOTES
-- Run this in the Supabase SQL Editor
-- ============================================

ALTER TABLE folders
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES folders(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id);

ALTER TABLE flashcards
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE flashcards
  ADD COLUMN IF NOT EXISTS suspended BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE flashcards
  ADD COLUMN IF NOT EXISTS extra TEXT;

CREATE INDEX IF NOT EXISTS idx_flashcards_tags ON flashcards USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_flashcards_suspended ON flashcards(user_id, suspended);
