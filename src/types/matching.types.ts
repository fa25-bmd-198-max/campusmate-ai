export type {
  ConnectionRow,
  ConnectionStatus,
  ConnectionInsert,
} from './database.types'

import type { ProfileRow } from './database.types'

// ── AI match result (returned from Gemini + enriched with profile) ──
export interface PartnerMatch {
  user_id:             string
  score:               number          // 0–100
  explanation:         string
  shared_courses:      string[]
  shared_availability: string[]
  profile:             ProfileRow      // full profile joined after AI ranking
}

// ── Connection with the other party's profile joined ────────────
export interface ConnectionWithProfile {
  id:          string
  sender_id:   string
  receiver_id: string
  status:      'pending' | 'accepted' | 'declined'
  created_at:  string
  /** The other party (not the current user) */
  otherProfile: ProfileRow | null
  /** Whether the current user is the sender */
  isSender: boolean
}
