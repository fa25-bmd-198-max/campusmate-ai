-- ============================================================
-- Migration 005: Study Groups, Group Members, Group Messages,
--                Project Teams & Team Members
-- Depends on: 001_profiles_and_courses
-- ============================================================

-- ── study_groups ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.study_groups (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  description text,
  subject     text,
  is_private  boolean     NOT NULL DEFAULT false,
  max_members int         NOT NULL DEFAULT 20 CHECK (max_members BETWEEN 2 AND 200),
  admin_id    uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_study_groups_admin_id  ON public.study_groups (admin_id);
CREATE INDEX IF NOT EXISTS idx_study_groups_subject   ON public.study_groups (subject);
CREATE INDEX IF NOT EXISTS idx_study_groups_private   ON public.study_groups (is_private);

-- Full-text search on group name
CREATE INDEX IF NOT EXISTS idx_study_groups_fts ON public.study_groups
  USING gin(to_tsvector('english', coalesce(name,'') || ' ' || coalesce(description,'')));

-- ── group_members ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.group_members (
  group_id  uuid        NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  user_id   uuid        NOT NULL REFERENCES public.profiles(id)     ON DELETE CASCADE,
  role      text        NOT NULL DEFAULT 'member' CHECK (role IN ('admin','member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_user_id  ON public.group_members (user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members (group_id);

-- ── group_messages ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.group_messages (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   uuid        NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES public.profiles(id)     ON DELETE CASCADE,
  content    text        NOT NULL CHECK (length(content) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_group_messages_group_id ON public.group_messages (group_id, created_at ASC);

-- ── project_teams ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.project_teams (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text        NOT NULL,
  description     text,
  course          text,
  required_skills text[]      DEFAULT '{}',
  deadline        date,
  lead_id         uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_teams_lead_id ON public.project_teams (lead_id);

-- ── team_members ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.team_members (
  team_id   uuid        NOT NULL REFERENCES public.project_teams(id) ON DELETE CASCADE,
  user_id   uuid        NOT NULL REFERENCES public.profiles(id)      ON DELETE CASCADE,
  role      text        NOT NULL DEFAULT 'member' CHECK (role IN ('lead','member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members (user_id);

-- ── Row Level Security ──────────────────────────────────────

ALTER TABLE public.study_groups  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_teams  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members   ENABLE ROW LEVEL SECURITY;

-- study_groups: public groups visible to all authenticated users; private only to members
CREATE POLICY "study_groups_select"
  ON public.study_groups FOR SELECT
  USING (
    is_private = false
    OR EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = id AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "study_groups_insert"
  ON public.study_groups FOR INSERT
  WITH CHECK (auth.uid() = admin_id);

CREATE POLICY "study_groups_update"
  ON public.study_groups FOR UPDATE
  USING (auth.uid() = admin_id)
  WITH CHECK (auth.uid() = admin_id);

CREATE POLICY "study_groups_delete"
  ON public.study_groups FOR DELETE
  USING (auth.uid() = admin_id);

-- group_members: readable by any authenticated user (needed for matching), writable by self or group admin
CREATE POLICY "group_members_select"
  ON public.group_members FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "group_members_insert"
  ON public.group_members FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.study_groups sg
      WHERE sg.id = group_id AND sg.admin_id = auth.uid()
    )
  );

CREATE POLICY "group_members_delete"
  ON public.group_members FOR DELETE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.study_groups sg
      WHERE sg.id = group_id AND sg.admin_id = auth.uid()
    )
  );

-- group_messages: members can read and insert; no editing/deleting others' messages
CREATE POLICY "group_messages_select"
  ON public.group_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_id AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "group_messages_insert"
  ON public.group_messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_id AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "group_messages_delete"
  ON public.group_messages FOR DELETE
  USING (auth.uid() = user_id);

-- project_teams: visible to all authenticated users
CREATE POLICY "project_teams_select"
  ON public.project_teams FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "project_teams_insert"
  ON public.project_teams FOR INSERT
  WITH CHECK (auth.uid() = lead_id);

CREATE POLICY "project_teams_update"
  ON public.project_teams FOR UPDATE
  USING (auth.uid() = lead_id)
  WITH CHECK (auth.uid() = lead_id);

CREATE POLICY "project_teams_delete"
  ON public.project_teams FOR DELETE
  USING (auth.uid() = lead_id);

-- team_members: readable by all; insertable by self or team lead
CREATE POLICY "team_members_select"
  ON public.team_members FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "team_members_insert"
  ON public.team_members FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.project_teams pt
      WHERE pt.id = team_id AND pt.lead_id = auth.uid()
    )
  );

CREATE POLICY "team_members_delete"
  ON public.team_members FOR DELETE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.project_teams pt
      WHERE pt.id = team_id AND pt.lead_id = auth.uid()
    )
  );
