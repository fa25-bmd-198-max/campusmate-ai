import { supabase } from './supabase'
import { generateStructuredOutput, Prompts, FlashcardsSchema } from './ai'
import { getNote } from './notesService'
import type { FlashcardSetRow, FlashcardRow } from '@/types/flashcard.types'
import type { FlashcardItem } from '@/types/ai.types'
import type { GenerateFlashcardsOptions } from '@/types/flashcard.types'

// ── Sets ──────────────────────────────────────────────────────

export async function getFlashcardSets(userId: string): Promise<FlashcardSetRow[]> {
  const { data, error } = await supabase
    .from('flashcard_sets')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as FlashcardSetRow[]
}

export async function getFlashcardSet(setId: string): Promise<FlashcardSetRow | null> {
  const { data, error } = await supabase
    .from('flashcard_sets')
    .select('*')
    .eq('id', setId)
    .maybeSingle()
  if (error) throw error
  return data as FlashcardSetRow | null
}

export async function deleteFlashcardSet(setId: string): Promise<void> {
  // Cascading delete on flashcards is handled by the DB constraint
  const { error } = await supabase.from('flashcard_sets').delete().eq('id', setId)
  if (error) throw error
}

// ── Cards ─────────────────────────────────────────────────────

export async function getFlashcards(setId: string): Promise<FlashcardRow[]> {
  const { data, error } = await supabase
    .from('flashcards')
    .select('*')
    .eq('set_id', setId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as FlashcardRow[]
}

export async function updateMastery(
  cardId: string,
  mastered: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('flashcards')
    .update({ mastered })
    .eq('id', cardId)
  if (error) throw error
}

export async function resetSetMastery(setId: string): Promise<void> {
  const { error } = await supabase
    .from('flashcards')
    .update({ mastered: false })
    .eq('set_id', setId)
  if (error) throw error
}

// ── Generation pipeline ───────────────────────────────────────

/**
 * Generates flashcards from a note's AI summary / key concepts.
 * Falls back to a generic content string if the note has no summary.
 *
 * Steps:
 * 1. Fetch the note to get its AI-extracted text
 * 2. Call Gemini with the flashcard prompt
 * 3. Insert flashcard_sets row
 * 4. Insert all flashcard rows in one batch
 * 5. Return the created set
 */
export async function generateFlashcards(
  userId: string,
  options: GenerateFlashcardsOptions,
): Promise<FlashcardSetRow> {
  const { noteId, noteTitle, count, subject } = options

  // 1. Build content string from note's AI output
  const note = await getNote(noteId)
  if (!note) throw new Error('Note not found.')
  if (note.status !== 'ready') {
    throw new Error('This note is still being processed. Please wait until the AI summary is ready.')
  }

  // Build a rich text blob for the AI to work with
  const contentParts: string[] = []
  if (note.summary)        contentParts.push(`SUMMARY:\n${note.summary}`)
  if (note.key_concepts?.length) contentParts.push(`KEY CONCEPTS:\n${note.key_concepts.join(', ')}`)
  if (note.definitions?.length) {
    const defs = note.definitions.map((d) => `${d.term}: ${d.definition}`).join('\n')
    contentParts.push(`DEFINITIONS:\n${defs}`)
  }
  if (note.formulas?.length) contentParts.push(`FORMULAS:\n${note.formulas.join('\n')}`)
  if (note.revision_notes) contentParts.push(`REVISION NOTES:\n${note.revision_notes}`)
  if (note.exam_topics?.length)  contentParts.push(`EXAM TOPICS:\n${note.exam_topics.join(', ')}`)

  if (contentParts.length === 0) {
    throw new Error('This note has no AI-generated content to create flashcards from.')
  }

  const contentText = contentParts.join('\n\n')

  // 2. AI generation
  const items: FlashcardItem[] = await generateStructuredOutput(
    Prompts.flashcards(contentText, count),
    FlashcardsSchema,
  )

  if (items.length === 0) throw new Error('AI returned no flashcards.')

  // 3. Insert set
  const { data: setData, error: setErr } = await supabase
    .from('flashcard_sets')
    .insert({
      user_id:    userId,
      note_id:    noteId,
      title:      noteTitle,
      subject:    subject ?? note.subject,
      card_count: items.length,
    })
    .select()
    .single()
  if (setErr) throw setErr
  const set = setData as FlashcardSetRow

  // 4. Insert all cards in one batch
  const cardRows = items.map((item) => ({
    set_id:   set.id,
    user_id:  userId,
    question: item.question,
    answer:   item.answer,
    topic:    item.topic,
    mastered: false,
  }))

  const { error: cardsErr } = await supabase.from('flashcards').insert(cardRows)
  if (cardsErr) {
    // Best-effort cleanup: delete the set if cards failed
    await supabase.from('flashcard_sets').delete().eq('id', set.id)
    throw cardsErr
  }

  return set
}
