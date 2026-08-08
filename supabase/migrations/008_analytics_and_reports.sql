-- ============================================================
-- Migration 008: Study Logs & Reports (Analytics)
-- Depends on: 001_profiles_and_courses, 006_planner_and_calendar
-- ============================================================

-- ── study_logs ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.study_logs (
  id           uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid  NOT NULL REFERENCES public.profiles(id)       ON DELETE CASCADE,
  session_id   uuid           REFERENCES public.study_sessions(id) ON DELETE SET NULL,
  subject      text,
  duration_min int   NOT NULL CHECK (duration_min > 0),
  logged_at    date  NOT NULL DEFAULT CURRENT_DATE
);

CREATE INDEX IF NOT EXISTS idx_study_logs_user_id   ON public.study_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_study_logs_logged_at ON public.study_logs (user_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_study_logs_subject   ON public.study_logs (user_id, subject);

-- ── reports ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reports (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content_type text        NOT NULL
               CHECK (content_type IN ('note','group','profile','message')),
  content_id   uuid        NOT NULL,
  reason       text        NOT NULL CHECK (length(reason) >= 10),
  status       text        NOT NULL DEFAULT 'open'
               CHECK (status IN ('open','resolved','dismissed')),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON public.reports (reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_status      ON public.reports (status, created_at DESC);

-- ── Row Level Security ──────────────────────────────────────
ALTER TABLE public.study_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports    ENABLE ROW LEVEL SECURITY;

-- study_logs: private to owner
CREATE POLICY "study_logs_all"
  ON public.study_logs FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- reports: reporter can create and read their own reports; admins read all via service role
CREATE POLICY "reports_insert"
  ON public.reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "reports_select"
  ON public.reports FOR SELECT
  USING (auth.uid() = reporter_id);

-- ── Aggregate helpers ─────────────────────────────────────────

-- Returns total study minutes per day for the last N days
CREATE OR REPLACE FUNCTION public.get_study_hours_summary(
  p_user_id uuid,
  p_days    int DEFAULT 30
)
RETURNS TABLE (logged_at date, total_minutes bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT logged_at, SUM(duration_min) AS total_minutes
  FROM public.study_logs
  WHERE user_id = p_user_id
    AND logged_at >= CURRENT_DATE - (p_days - 1)
  GROUP BY logged_at
  ORDER BY logged_at;
$$;

-- Returns average quiz score per subject for a user
CREATE OR REPLACE FUNCTION public.get_quiz_performance(p_user_id uuid)
RETURNS TABLE (subject text, avg_score numeric, attempt_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT q.subject,
         ROUND(AVG(qa.score / qa.total * 100), 1) AS avg_score,
         COUNT(*) AS attempt_count
  FROM public.quiz_attempts qa
  JOIN public.quizzes q ON q.id = qa.quiz_id
  WHERE qa.user_id = p_user_id
    AND q.subject IS NOT NULL
  GROUP BY q.subject
  ORDER BY avg_score DESC;
$$;
