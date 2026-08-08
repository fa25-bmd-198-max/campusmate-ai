-- ============================================================
-- Migration 002: Notes & Uploads
-- Depends on: 001_profiles_and_courses
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notes (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title          text        NOT NULL,
  subject        text,
  file_path      text,                    -- Supabase Storage path: notes/{userId}/{noteId}/{filename}
  file_type      text        CHECK (file_type IN ('pdf','docx','pptx','txt')),
  file_size      int         CHECK (file_size > 0),
  status         text        NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending','processing','ready','error')),
  -- AI-generated content
  summary        text,
  key_concepts   text[]      DEFAULT '{}',
  definitions    jsonb       DEFAULT '[]',  -- [{ "term": "...", "definition": "..." }]
  formulas       text[]      DEFAULT '{}',
  revision_notes text,
  exam_topics    text[]      DEFAULT '{}',
  -- Metadata
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_notes_user_id   ON public.notes (user_id);
CREATE INDEX IF NOT EXISTS idx_notes_status    ON public.notes (user_id, status);
CREATE INDEX IF NOT EXISTS idx_notes_subject   ON public.notes (user_id, subject);
CREATE INDEX IF NOT EXISTS idx_notes_created   ON public.notes (user_id, created_at DESC);

-- Full-text search index on title + subject
CREATE INDEX IF NOT EXISTS idx_notes_fts ON public.notes
  USING gin(to_tsvector('english', coalesce(title,'') || ' ' || coalesce(subject,'')));

-- ── Row Level Security ──────────────────────────────────────
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Notes are strictly private — only the owner can do anything
CREATE POLICY "notes_all"
  ON public.notes FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
