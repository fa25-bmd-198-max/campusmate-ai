-- ============================================================
-- Migration 001: Profiles & Courses
-- Depends on: auth.users (built-in Supabase Auth)
-- ============================================================

-- ── profiles ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id                  uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name           text        NOT NULL DEFAULT '',
  avatar_url          text,
  university          text,
  department          text,
  degree              text,
  semester            int         CHECK (semester BETWEEN 1 AND 20),
  bio                 text,
  learning_style      text        CHECK (learning_style IN ('visual','auditory','reading','kinesthetic')),
  study_hours_per_day int         CHECK (study_hours_per_day BETWEEN 0 AND 24),
  weekly_availability jsonb       DEFAULT '{}',        -- { "mon": [9,17], "tue": [14,20], ... }
  academic_goals      text[]      DEFAULT '{}',
  skills              text[]      DEFAULT '{}',
  weak_subjects       text[]      DEFAULT '{}',
  interests           text[]      DEFAULT '{}',
  is_admin            boolean     NOT NULL DEFAULT false,
  privacy_public      boolean     NOT NULL DEFAULT true,
  show_in_matching    boolean     NOT NULL DEFAULT true,
  onboarding_complete boolean     NOT NULL DEFAULT false,
  notification_prefs  jsonb       DEFAULT '{"study_reminder":true,"group_invite":true,"deadline":true,"exam_reminder":true,"ai_rec":true}',
  is_active           boolean     NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Index for matching / listing
CREATE INDEX IF NOT EXISTS idx_profiles_show_in_matching ON public.profiles (show_in_matching) WHERE show_in_matching = true;
CREATE INDEX IF NOT EXISTS idx_profiles_university       ON public.profiles (university);

-- ── courses ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.courses (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  code        text,
  instructor  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_courses_user_id ON public.courses (user_id);

-- ── updated_at trigger ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── handle_new_user trigger ──────────────────────────────────
-- Auto-creates a profiles row whenever a new auth.users row is inserted.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── Row Level Security ──────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can read public profiles; users always see their own
CREATE POLICY "profiles_select"
  ON public.profiles FOR SELECT
  USING (privacy_public = true OR auth.uid() = id);

-- Only the owner can insert their own profile row
CREATE POLICY "profiles_insert"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Only the owner can update their own profile
CREATE POLICY "profiles_update"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Only the owner can delete their profile
CREATE POLICY "profiles_delete"
  ON public.profiles FOR DELETE
  USING (auth.uid() = id);

-- ── RLS: courses ────────────────────────────────────────────
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "courses_all"
  ON public.courses FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
