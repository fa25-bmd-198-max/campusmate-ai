-- ============================================================
-- Migration 007: Connections & Notifications
-- Depends on: 001_profiles_and_courses
-- ============================================================

-- ── connections ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.connections (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id   uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status      text        NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending','accepted','declined')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT connections_no_self    CHECK (sender_id <> receiver_id),
  CONSTRAINT connections_unique_pair UNIQUE (sender_id, receiver_id)
);

CREATE INDEX IF NOT EXISTS idx_connections_sender_id   ON public.connections (sender_id);
CREATE INDEX IF NOT EXISTS idx_connections_receiver_id ON public.connections (receiver_id);
CREATE INDEX IF NOT EXISTS idx_connections_status      ON public.connections (receiver_id, status);

-- ── notifications ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type       text        NOT NULL
             CHECK (type IN ('study_reminder','group_invite','deadline','exam_reminder','ai_rec','connection_request')),
  title      text        NOT NULL,
  message    text,
  link       text,
  read       boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread  ON public.notifications (user_id, read) WHERE read = false;

-- ── Row Level Security ──────────────────────────────────────
ALTER TABLE public.connections   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- connections: both parties can read; only sender can insert; both can update status
CREATE POLICY "connections_select"
  ON public.connections FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "connections_insert"
  ON public.connections FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "connections_update"
  ON public.connections FOR UPDATE
  USING (auth.uid() = receiver_id)         -- only receiver accepts/declines
  WITH CHECK (auth.uid() = receiver_id);

CREATE POLICY "connections_delete"
  ON public.connections FOR DELETE
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- notifications: private to the recipient
CREATE POLICY "notifications_select"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "notifications_insert"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);  -- any authenticated user can create notifications for others via RPC

CREATE POLICY "notifications_update"
  ON public.notifications FOR UPDATE
  USING  (auth.uid() = user_id)         -- only owner marks as read
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notifications_delete"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

-- ── Helper RPC: create a notification for any user ───────────
-- Called by edge functions or client with elevated trust
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id uuid,
  p_type    text,
  p_title   text,
  p_message text DEFAULT NULL,
  p_link    text DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, link)
  VALUES (p_user_id, p_type, p_title, p_message, p_link)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
