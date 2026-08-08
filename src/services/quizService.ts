import { supabase } from './supabase'
import { generateStructuredOutput, Prompts, QuizSchema } from './ai'
import { getNote } from './notesService'
import type { QuizRow, QuizQuestionRow, QuizAttemptRow } from '@/types/quiz.types'
import type { GenerateQuizOptions, ScoredAnswer, PerformanceInsight } from '@/types/quiz.types'
import type { QuizItem } from '@/types/ai.types'

// ── Fetch ─────────────────────────────────────────────────────

export async function getQuizzes(userId: string): Promise<QuizRow[]> {
  const { data, error } = await supabase
    .from('quizzes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as QuizRow[]
}

export async function getQuiz(quizId: string): Promise<QuizRow | null> {
  const { data, error } = await supabase
    .from('quizzes')
    .select('*')
    .eq('id', quizId)
    .maybeSingle()
  if (error) throw error
  return data as QuizRow | null
}

export async function getQuizQuestions(quizId: string): Promise<QuizQuestionRow[]> {
  const { data, error } = await supabase
    .from('quiz_questions')
    .select('*')
    .eq('quiz_id', quizId)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return (data ?? []) as QuizQuestionRow[]
}

export async function deleteQuiz(quizId: string): Promise<void> {
  const { error } = await supabase.from('quizzes').delete().eq('id', quizId)
  if (error) throw error
}

// ── Attempts ──────────────────────────────────────────────────

export async function getAttempts(userId: string): Promise<QuizAttemptRow[]> {
  const { data, error } = await supabase
    .from('quiz_attempts')
    .select('*')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as QuizAttemptRow[]
}

export async function getAttempt(attemptId: string): Promise<QuizAttemptRow | null> {
  const { data, error } = await supabase
    .from('quiz_attempts')
    .select('*')
    .eq('id', attemptId)
    .maybeSingle()
  if (error) throw error
  return data as QuizAttemptRow | null
}

export async function saveAttempt(
  userId:   string,
  quizId:   string,
  answers:  ScoredAnswer[],
): Promise<QuizAttemptRow> {
  const score = answers.filter((a) => a.correct).length
  const total = answers.length

  const { data, error } = await supabase
    .from('quiz_attempts')
    .insert({
      user_id: userId,
      quiz_id: quizId,
      score,
      total,
      answers: answers.map((a) => ({
        question_id: a.question_id,
        answer:      a.answer,
        correct:     a.correct,
      })),
    })
    .select()
    .single()
  if (error) throw error

  // Log study time (10 min per 5 questions, minimum 5)
  const studyMinutes = Math.max(5, Math.round((total / 5) * 10))
  try {
    await supabase.from('study_logs').insert({
      user_id:      userId,
      duration_min: studyMinutes,
      logged_at:    new Date().toISOString().slice(0, 10),
    })
  } catch { /* study log is non-fatal */ }

  return data as QuizAttemptRow
}

// ── Scoring ───────────────────────────────────────────────────

export function scoreAttempt(
  questions:  QuizQuestionRow[],
  userAnswers: Record<string, string>, // questionId → answer
): ScoredAnswer[] {
  return questions.map((q) => {
    const userAnswer    = userAnswers[q.id] ?? ''
    const correctAnswer = q.correct_answer

    // Case-insensitive comparison; strip whitespace
    const isCorrect =
      userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase()

    return {
      question_id:    q.id,
      answer:         userAnswer,
      correct:        isCorrect,
      correct_answer: correctAnswer,
      explanation:    q.explanation ?? '',
    }
  })
}

export function buildPerformanceInsights(
  questions:     QuizQuestionRow[],
  scoredAnswers: ScoredAnswer[],
): PerformanceInsight {
  const totalScore = scoredAnswers.filter((a) => a.correct).length
  const totalCount = scoredAnswers.length
  const percentage = totalCount > 0 ? Math.round((totalScore / totalCount) * 100) : 0

  // Group by question type to find best/worst
  const typeScores: Record<string, { correct: number; total: number }> = {}
  scoredAnswers.forEach((a) => {
    const q = questions.find((q) => q.id === a.question_id)
    if (!q) return
    const t = q.type
    if (!typeScores[t]) typeScores[t] = { correct: 0, total: 0 }
    typeScores[t].total++
    if (a.correct) typeScores[t].correct++
  })

  const typeEntries = Object.entries(typeScores)
  const sorted = typeEntries.sort(
    (a, b) => (b[1].correct / b[1].total) - (a[1].correct / a[1].total),
  )

  const TYPE_LABELS: Record<string, string> = {
    mcq:          'Multiple Choice',
    true_false:   'True / False',
    fill_blank:   'Fill in the Blank',
    short_answer: 'Short Answer',
  }

  return {
    bestTopic:  sorted.length > 0 ? (TYPE_LABELS[sorted[0][0]] ?? sorted[0][0]) : null,
    worstTopic: sorted.length > 1 ? (TYPE_LABELS[sorted[sorted.length - 1][0]] ?? sorted[sorted.length - 1][0]) : null,
    totalScore,
    totalCount,
    percentage,
  }
}

// ── Generation pipeline ───────────────────────────────────────

export async function generateQuiz(
  userId:  string,
  options: GenerateQuizOptions,
): Promise<QuizRow> {
  const { noteId, noteTitle, questionCount, types, subject } = options

  // 1. Fetch note content
  const note = await getNote(noteId)
  if (!note) throw new Error('Note not found.')
  if (note.status !== 'ready') {
    throw new Error('This note is still processing. Please wait until the AI summary is ready.')
  }

  // Build content string (same approach as flashcard generation)
  const parts: string[] = []
  if (note.summary)              parts.push(`SUMMARY:\n${note.summary}`)
  if (note.key_concepts?.length) parts.push(`KEY CONCEPTS:\n${note.key_concepts.join(', ')}`)
  if (note.definitions?.length) {
    parts.push(`DEFINITIONS:\n${note.definitions.map((d) => `${d.term}: ${d.definition}`).join('\n')}`)
  }
  if (note.formulas?.length)     parts.push(`FORMULAS:\n${note.formulas.join('\n')}`)
  if (note.revision_notes)       parts.push(`REVISION NOTES:\n${note.revision_notes}`)
  if (note.exam_topics?.length)  parts.push(`EXAM TOPICS:\n${note.exam_topics.join(', ')}`)

  if (parts.length === 0) throw new Error('This note has no AI content to generate questions from.')

  // 2. AI generation
  const items: QuizItem[] = await generateStructuredOutput(
    Prompts.quiz(parts.join('\n\n'), questionCount, types),
    QuizSchema,
  )

  if (items.length === 0) throw new Error('AI returned no questions.')

  // 3. Insert quiz record
  const { data: quizData, error: quizErr } = await supabase
    .from('quizzes')
    .insert({
      user_id:        userId,
      note_id:        noteId,
      title:          noteTitle,
      subject:        subject ?? note.subject,
      question_count: items.length,
    })
    .select()
    .single()
  if (quizErr) throw quizErr
  const quiz = quizData as QuizRow

  // 4. Insert questions in one batch
  const questionRows = items.map((item, idx) => ({
    quiz_id:        quiz.id,
    type:           item.type,
    question:       item.question,
    options:        item.options ?? null,
    correct_answer: item.correct_answer,
    explanation:    item.explanation,
    sort_order:     idx,
  }))

  const { error: qErr } = await supabase.from('quiz_questions').insert(questionRows)
  if (qErr) {
    await supabase.from('quizzes').delete().eq('id', quiz.id)
    throw qErr
  }

  return quiz
}
