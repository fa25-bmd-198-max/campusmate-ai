-- ============================================================
-- Migration 003: Flashcard Sets & Flashcards
-- Depends on: 001_profiles_and_courses, 002_notes
-- ============================================================

CREATE TABLE IF NOT EXISTS public.flashcard_sets (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  note_id     uuid        REFERENCES public.notes(id) ON DELETE SET NULL,
  title       text        NOT NULL,
  subject     text,
  card_count  int         NOT NULL DEFAULT 0 CHECK (card_count >= 0),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_flashcard_sets_user_id ON public.flashcard_sets (user_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_sets_note_id ON public.flashcard_sets (note_id);

CREATE TABLE IF NOT EXISTS public.flashcards (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id      uuid        NOT NULL REFERENCES public.flashcard_sets(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question    text        NOT NULL,
  answer      text        NOT NULL,
  topic       text,
  mastered    boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_flashcards_set_id    ON public.flashcards (set_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_user_id   ON public.flashcards (user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_mastered  ON public.flashcards (set_id, mastered);

-- Full-text search on question + topic
CREATE INDEX IF NOT EXISTS idx_flashcards_fts ON public.flashcards
  USING gin(to_tsvector('english', coalesce(question,'') || ' ' || coalesce(topic,'')));

-- ── Trigger: keep card_count in sync ─────────────────────────
CREATE OR REPLACE FUNCTION public.sync_flashcard_set_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.flashcard_sets SET card_count = card_count + 1 WHERE id = NEW.set_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.flashcard_sets SET card_count = GREATEST(card_count - 1, 0) WHERE id = OLD.set_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_flashcard_count ON public.flashcards;
CREATE TRIGGER trg_flashcard_count
  AFTER INSERT OR DELETE ON public.flashcards
  FOR EACH ROW EXECUTE FUNCTION public.sync_flashcard_set_count();

-- ── Row Level Security ──────────────────────────────────────
ALTER TABLE public.flashcard_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "flashcard_sets_all"
  ON public.flashcard_sets FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "flashcards_all"
  ON public.flashcards FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
