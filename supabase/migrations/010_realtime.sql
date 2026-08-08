-- ============================================================
-- Migration 010: Enable Supabase Realtime
-- Depends on: 005_groups_and_teams, 007_connections_and_notifications
-- ============================================================

-- Enable Realtime replication for tables that need live updates.
-- This adds each table to the supabase_realtime publication.

-- Group chat: live messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;

-- Notifications: live notification delivery
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Connections: live accept/decline updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.connections;

-- ── Realtime RLS note ────────────────────────────────────────
-- Supabase Realtime respects RLS policies automatically when
-- using the Realtime Channels API with row-level filtering.
-- No additional configuration is required beyond enabling RLS
-- (already done in migrations 005 and 007).
