-- ============================================================
-- Migration 004: Quizzes, Questions & Attempts
-- Depends on: 001_profiles_and_courses, 002_notes
-- ============================================================

CREATE TABLE IF NOT EXISTS public.quizzes (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  note_id        uuid        REFERENCES public.notes(id) ON DELETE SET NULL,
  title          text        NOT NULL,
  subject        text,
  question_count int         CHECK (question_count BETWEEN 1 AND 100),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quizzes_user_id ON public.quizzes (user_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_note_id ON public.quizzes (note_id);

CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id        uuid        NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  type           text        NOT NULL
                             CHECK (type IN ('mcq','true_false','fill_blank','short_answer')),
  question       text        NOT NULL,
  options        jsonb,      -- ["Option A","Option B","Option C","Option D"] for MCQ, null otherwise
  correct_answer text        NOT NULL,
  explanation    text,
  sort_order     int         NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id ON public.quiz_questions (quiz_id, sort_order);

CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  quiz_id      uuid        NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  score        numeric     NOT NULL CHECK (score >= 0),
  total        int         NOT NULL CHECK (total > 0),
  answers      jsonb       NOT NULL DEFAULT '[]', -- [{ "question_id": "...", "answer": "...", "correct": bool }]
  completed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON public.quiz_attempts (user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON public.quiz_attempts (quiz_id);

-- ── Row Level Security ──────────────────────────────────────
ALTER TABLE public.quizzes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts  ENABLE ROW LEVEL SECURITY;

-- Quizzes: owner only
CREATE POLICY "quizzes_all"
  ON public.quizzes FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Quiz questions: owner of the parent quiz
CREATE POLICY "quiz_questions_all"
  ON public.quiz_questions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.quizzes q
      WHERE q.id = quiz_id AND q.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quizzes q
      WHERE q.id = quiz_id AND q.user_id = auth.uid()
    )
  );

-- Quiz attempts: owner only
CREATE POLICY "quiz_attempts_all"
  ON public.quiz_attempts FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
