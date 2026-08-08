-- ============================================================
-- Migration 009: Storage Buckets & Additional Indexes
-- Depends on: all previous migrations
-- ============================================================

-- ── Storage Buckets ──────────────────────────────────────────
-- NOTE: Supabase creates storage.buckets via the Storage API/Dashboard.
-- These INSERT statements are for documentation / seed scripts.
-- Run via the Supabase Dashboard > Storage, or via the CLI seed.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'avatars',
    'avatars',
    true,                                    -- public bucket: profile photos readable by anyone
    5242880,                                 -- 5 MB max per file
    ARRAY['image/jpeg','image/png','image/webp','image/gif']
  ),
  (
    'notes',
    'notes',
    false,                                   -- private bucket: only owner via RLS
    20971520,                                -- 20 MB max per file
    ARRAY['application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'text/plain']
  ),
  (
    'group-resources',
    'group-resources',
    false,                                   -- private: group members only
    10485760,                                -- 10 MB max per file
    ARRAY['application/pdf',
          'image/jpeg','image/png',
          'text/plain']
  )
ON CONFLICT (id) DO NOTHING;

-- ── Storage RLS Policies ─────────────────────────────────────

-- avatars: public read, owner write
CREATE POLICY "avatars_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_owner_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "avatars_owner_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "avatars_owner_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- notes: owner only
CREATE POLICY "notes_owner_all"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'notes'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'notes'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- group-resources: group members read, members write
CREATE POLICY "group_resources_member_select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'group-resources'
    AND EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id::text = (storage.foldername(name))[1]
        AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "group_resources_member_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'group-resources'
    AND EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id::text = (storage.foldername(name))[1]
        AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "group_resources_owner_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'group-resources'
    AND auth.uid()::text = owner
  );

-- ── Additional composite indexes for frequent queries ────────

-- Dashboard: upcoming exams query
CREATE INDEX IF NOT EXISTS idx_calendar_events_upcoming
  ON public.calendar_events (user_id, event_type, starts_at)
  WHERE event_type = 'exam';

-- Notifications: unread count badge
CREATE INDEX IF NOT EXISTS idx_notifications_unread_count
  ON public.notifications (user_id)
  WHERE read = false;

-- Study streak calculation
CREATE INDEX IF NOT EXISTS idx_study_logs_streak
  ON public.study_logs (user_id, logged_at DESC);

-- Quiz performance per subject
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_perf
  ON public.quiz_attempts (user_id, completed_at DESC);

-- Matching: find users in same courses
CREATE INDEX IF NOT EXISTS idx_courses_name ON public.courses (name);
