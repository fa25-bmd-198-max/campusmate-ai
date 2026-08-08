import { supabase, uploadNoteFile, deleteNoteFile } from './supabase'
import { generateStructuredOutput, Prompts, SummarySchema } from './ai'
import { extractTextFromFile, detectFileType } from '@/utils/fileParser'
import type { NoteRow, NoteListItem, UploadStage } from '@/types/notes.types'
import type { SummaryResult } from '@/types/ai.types'

// ── Constants ─────────────────────────────────────────────────
const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20 MB

// ── Validation ────────────────────────────────────────────────

export function validateNoteFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) {
    return `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 20 MB.`
  }
  const fileType = detectFileType(file)
  if (!fileType) {
    return `Unsupported file type. Please upload a PDF, DOCX, PPTX, or TXT file.`
  }
  return null
}

// ── Fetch ─────────────────────────────────────────────────────

export async function getNotes(userId: string): Promise<NoteListItem[]> {
  const { data, error } = await supabase
    .from('notes')
    .select('id, title, subject, file_type, file_size, status, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as NoteListItem[]
}

export async function getNote(noteId: string): Promise<NoteRow | null> {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('id', noteId)
    .maybeSingle()
  if (error) throw error
  return data as NoteRow | null
}

// ── Create (without file) ─────────────────────────────────────

export async function createNoteRecord(
  userId: string,
  title: string,
  filePath: string,
  fileType: 'pdf' | 'docx' | 'pptx' | 'txt',
  fileSize: number,
  subject: string | null,
): Promise<NoteRow> {
  const { data, error } = await supabase
    .from('notes')
    .insert({
      user_id:   userId,
      title,
      file_path: filePath,
      file_type: fileType,
      file_size: fileSize,
      subject,
      status: 'processing',
    })
    .select()
    .single()
  if (error) throw error
  return data as NoteRow
}

// ── Update AI summary ─────────────────────────────────────────

export async function updateNoteSummary(
  noteId: string,
  summary: SummaryResult,
): Promise<void> {
  const { error } = await supabase
    .from('notes')
    .update({
      status:         'ready',
      summary:        summary.summary,
      key_concepts:   summary.key_concepts,
      definitions:    summary.definitions,
      formulas:       summary.formulas,
      revision_notes: summary.revision_notes,
      exam_topics:    summary.exam_topics,
    })
    .eq('id', noteId)
  if (error) throw error
}

export async function setNoteError(noteId: string): Promise<void> {
  const { error } = await supabase
    .from('notes')
    .update({ status: 'error' })
    .eq('id', noteId)
  if (error) throw error
}

// ── Subject tag ───────────────────────────────────────────────

export async function updateNoteSubject(
  noteId: string,
  subject: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('notes')
    .update({ subject })
    .eq('id', noteId)
  if (error) throw error
}

// ── Delete ────────────────────────────────────────────────────

export async function deleteNote(noteId: string, filePath: string | null): Promise<void> {
  // Remove storage file first (best-effort — don't block on error)
  if (filePath) {
    try { await deleteNoteFile(filePath) } catch { /* storage cleanup failure is non-fatal */ }
  }
  const { error } = await supabase.from('notes').delete().eq('id', noteId)
  if (error) throw error
}

// ── Full upload + AI pipeline ─────────────────────────────────

export interface UploadNoteOptions {
  userId:   string
  file:     File
  title:    string
  subject:  string | null
  onStage?: (stage: UploadStage, progress?: number) => void
}

/**
 * Orchestrates the full note upload pipeline:
 * 1. Validate file type and size
 * 2. Create a placeholder DB row (status = 'processing')
 * 3. Upload file to Supabase Storage
 * 4. Extract text from the file
 * 5. Call Gemini for AI summarisation
 * 6. Update the DB row with AI results (status = 'ready')
 *
 * Returns the final NoteRow on success.
 * On any failure after the DB row is created, sets status = 'error'.
 */
export async function uploadAndSummariseNote(
  options: UploadNoteOptions,
): Promise<NoteRow> {
  const { userId, file, title, subject, onStage } = options

  // 1. Validate
  onStage?.('validating')
  const validationError = validateNoteFile(file)
  if (validationError) throw new Error(validationError)

  const fileType = detectFileType(file)!

  // 2. Create placeholder DB row with a temp path — we need the noteId for the storage path
  //    We first create the record, then upload using the noteId
  onStage?.('uploading', 0)
  const placeholderNote = await createNoteRecord(userId, title, '', fileType, file.size, subject)
  const noteId = placeholderNote.id

  let filePath = ''
  try {
    // 3. Upload file to Supabase Storage
    filePath = await uploadNoteFile(userId, noteId, file)

    // Update the file path now that we have it
    await supabase.from('notes').update({ file_path: filePath }).eq('id', noteId)
    onStage?.('uploading', 100)

    // 4. Extract text
    onStage?.('extracting')
    const extractedText = await extractTextFromFile(file)

    // 5. AI summarisation
    onStage?.('summarising')
    const summary = await generateStructuredOutput<SummaryResult>(
      Prompts.summarise(extractedText),
      SummarySchema,
    )

    // 6. Save AI results
    onStage?.('saving')
    await updateNoteSummary(noteId, summary)

    onStage?.('done')

    // Return the complete note
    const finalNote = await getNote(noteId)
    return finalNote!
  } catch (err) {
    // Mark as error in DB so the UI can show a retry option
    await setNoteError(noteId).catch(() => {})
    throw err
  }
}
