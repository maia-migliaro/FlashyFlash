-- ============================================
-- SPACED REPETITION (SM-2 / Anki-like)
-- Run this in the Supabase SQL Editor
-- ============================================

ALTER TABLE flashcards
  ADD COLUMN IF NOT EXISTS ease_factor REAL NOT NULL DEFAULT 2.5,
  ADD COLUMN IF NOT EXISTS interval_days INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS repetitions INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS due_date DATE NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS state TEXT NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS last_rating TEXT;

CREATE INDEX IF NOT EXISTS idx_flashcards_due_date ON flashcards(user_id, due_date);
