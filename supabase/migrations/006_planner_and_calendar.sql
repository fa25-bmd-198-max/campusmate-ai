-- ============================================================
-- Migration 006: Study Plans, Study Sessions & Calendar Events
-- Depends on: 001_profiles_and_courses, 005_groups_and_teams
-- ============================================================

-- ── study_plans ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.study_plans (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title      text        NOT NULL,
  config     jsonb       DEFAULT '{}', -- original planner input params
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_study_plans_user_id ON public.study_plans (user_id);

-- ── study_sessions ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.study_sessions (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id      uuid        REFERENCES public.study_plans(id) ON DELETE SET NULL,
  subject      text,
  topic        text,
  session_type text        CHECK (session_type IN ('revision','practice_test','rest')),
  scheduled_at timestamptz,
  duration_min int         CHECK (duration_min > 0),
  completed    boolean     NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id      ON public.study_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_plan_id      ON public.study_sessions (plan_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_scheduled_at ON public.study_sessions (user_id, scheduled_at);

-- ── calendar_events ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES public.profiles(id)      ON DELETE CASCADE,
  title      text        NOT NULL,
  event_type text        NOT NULL
             CHECK (event_type IN ('exam','assignment','study','meeting','reminder')),
  starts_at  timestamptz NOT NULL,
  ends_at    timestamptz,
  notes      text,
  group_id   uuid        REFERENCES public.study_groups(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT calendar_events_ends_after_starts CHECK (ends_at IS NULL OR ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id   ON public.calendar_events (user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_starts_at ON public.calendar_events (user_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_calendar_events_type      ON public.calendar_events (user_id, event_type);

-- ── Row Level Security ──────────────────────────────────────
ALTER TABLE public.study_plans    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "study_plans_all"
  ON public.study_plans FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "study_sessions_all"
  ON public.study_sessions FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "calendar_events_all"
  ON public.calendar_events FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
