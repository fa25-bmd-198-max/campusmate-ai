export type {
  StudyGroupRow,
  GroupMemberRow,
  GroupMessageRow,
  StudyGroupInsert,
  GroupMemberInsert,
  GroupMessageInsert,
  GroupRole,
  ProjectTeamRow,
  TeamMemberRow,
} from './database.types'

import type { ProfileRow } from './database.types'

// ── Group with enriched data ──────────────────────────────────
export interface GroupWithMemberCount extends StudyGroupLike {
  member_count: number
  is_member:    boolean
}

export interface StudyGroupLike {
  id:          string
  name:        string
  description: string | null
  subject:     string | null
  is_private:  boolean
  max_members: number
  admin_id:    string | null
  created_at:  string
}

// ── Message with sender profile ───────────────────────────────
export interface MessageWithProfile {
  id:         string
  group_id:   string
  user_id:    string
  content:    string
  created_at: string
  profile:    Pick<ProfileRow, 'id' | 'full_name' | 'avatar_url'> | null
}

// ── Member with profile ───────────────────────────────────────
export interface MemberWithProfile {
  group_id:  string
  user_id:   string
  role:      'admin' | 'member'
  joined_at: string
  profile:   ProfileRow | null
}

// ── Team with enriched data ───────────────────────────────────
export interface TeamWithMemberCount {
  id:              string
  name:            string
  description:     string | null
  course:          string | null
  required_skills: string[]
  deadline:        string | null
  lead_id:         string | null
  created_at:      string
  member_count:    number
  is_member:       boolean
}

export interface TeamMemberWithProfile {
  team_id:   string
  user_id:   string
  role:      'lead' | 'member'
  joined_at: string
  profile:   ProfileRow | null
}

// ── AI recommendations ────────────────────────────────────────
export interface AITeammateRecommendation {
  user_id:          string
  match_percentage: number
  matching_skills:  string[]
  explanation:      string
  profile:          ProfileRow
}
