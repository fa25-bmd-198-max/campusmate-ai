// ── Re-export DB row types for convenience ────────────────────
export type { NoteRow, NoteStatus, NoteFileType, NoteInsert } from './database.types'

// ── Upload progress state ─────────────────────────────────────
export type UploadStage =
  | 'idle'
  | 'validating'
  | 'uploading'
  | 'extracting'
  | 'summarising'
  | 'saving'
  | 'done'
  | 'error'

export interface UploadState {
  stage:    UploadStage
  progress: number          // 0–100 for the upload bytes phase
  error:    string | null
}

// ── Note list item (lighter projection used in library) ────────
export interface NoteListItem {
  id:         string
  title:      string
  subject:    string | null
  file_type:  string | null
  file_size:  number | null
  status:     string
  created_at: string
}
