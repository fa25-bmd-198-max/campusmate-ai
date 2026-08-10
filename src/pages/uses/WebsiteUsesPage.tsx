import {
  FileText, Layers, ClipboardCheck, Bot,
  CalendarDays, UsersRound, Briefcase,
  CheckCircle, Sparkles,
} from 'lucide-react'

// ── Feature data ──────────────────────────────────────────────

const FEATURES = [
  {
    icon:    <FileText className="h-7 w-7" />,
    color:   'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400',
    border:  'border-violet-100 dark:border-violet-900/40',
    title:   'AI-Powered Notes & Summarizer',
    tagline: 'Turn hours of reading into minutes of insight',
    points: [
      'Upload lecture notes, PDFs, DOCX, or PPTX files instantly',
      'AI generates clean, structured summaries automatically',
      'Extracts key concepts, definitions, and exam topics',
      'Produces revision notes and formula sheets from your content',
      'Supports files up to 20 MB — no manual effort needed',
    ],
  },
  {
    icon:    <Layers className="h-7 w-7" />,
    color:   'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400',
    border:  'border-sky-100 dark:border-sky-900/40',
    title:   'Interactive Flashcards',
    tagline: 'Study smarter with auto-generated cards',
    points: [
      'One click generates a complete flashcard set from any note',
      'Each card covers a unique concept, term, or formula',
      'Mark cards as mastered to track your progress',
      'Flip through cards in a focused review session anytime',
      'Filter by subject or topic to target weak areas',
    ],
  },
  {
    icon:    <ClipboardCheck className="h-7 w-7" />,
    color:   'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    border:  'border-emerald-100 dark:border-emerald-900/40',
    title:   'AI Quizzes & Assessments',
    tagline: 'Practice exactly what you uploaded',
    points: [
      'Auto-generates Multiple Choice, True/False, Fill-in-the-Blank, and Short Answer questions',
      'Questions are drawn directly from your uploaded lecture material',
      'Choose how many questions and which types to include',
      'Instant scoring with explanations for every answer',
      'Review your attempt history to measure improvement over time',
    ],
  },
  {
    icon:    <Bot className="h-7 w-7" />,
    color:   'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    border:  'border-amber-100 dark:border-amber-900/40',
    title:   'Personal AI Study Assistant',
    tagline: 'Your always-available academic tutor',
    points: [
      'Chat naturally and get instant, clear academic answers',
      'Pre-loaded with your note context when opened from a note page',
      'Handles complex questions, explanations, and concept breakdowns',
      'Remembers conversation history throughout your session',
      'Available on every page via the floating assistant button',
    ],
  },
  {
    icon:    <CalendarDays className="h-7 w-7" />,
    color:   'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
    border:  'border-rose-100 dark:border-rose-900/40',
    title:   'Smart Study Planner',
    tagline: 'AI builds your day-by-day schedule',
    points: [
      'Input your subjects, exam dates, and available study days',
      'AI generates a personalised day-by-day study schedule',
      'Balances revision sessions, practice tests, and rest breaks',
      'Mark sessions complete and track your overall progress',
      'Regenerate your plan anytime your schedule changes',
    ],
  },
  {
    icon:    <UsersRound className="h-7 w-7" />,
    color:   'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
    border:  'border-indigo-100 dark:border-indigo-900/40',
    title:   'Study Groups & Teams',
    tagline: 'Collaborate and learn together',
    points: [
      'Create or join study groups for any subject or course',
      'AI matches you with compatible study partners based on your profile',
      'Form project teams with defined roles and shared goals',
      'Manage group members, descriptions, and activity in one place',
      'Send connection requests and build your academic network',
    ],
  },
  {
    icon:    <Briefcase className="h-7 w-7" />,
    color:   'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400',
    border:  'border-teal-100 dark:border-teal-900/40',
    title:   'Project Portfolios',
    tagline: 'Showcase your academic work in one place',
    points: [
      'Document web apps, research tasks, and academic projects',
      'Assign team members and track project status',
      'Link projects to relevant courses and subjects',
      'Share your profile and portfolio with peers and educators',
      'Build a visible record of your academic achievements',
    ],
  },
]

// ── Feature Card ──────────────────────────────────────────────

function FeatureCard({
  icon, color, border, title, tagline, points,
}: (typeof FEATURES)[number]) {
  return (
    <div className={`
      group flex flex-col rounded-2xl border bg-white p-7
      shadow-sm transition-all duration-300
      hover:shadow-lg hover:-translate-y-1
      dark:bg-gray-900 dark:border-gray-800
      ${border}
    `}>
      {/* Icon badge */}
      <div className={`inline-flex h-14 w-14 items-center justify-center rounded-xl ${color} mb-5`}>
        {icon}
      </div>

      {/* Title + tagline */}
      <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-snug">
        {title}
      </h2>
      <p className="mt-1 mb-4 text-sm text-gray-500 dark:text-gray-400 font-medium">
        {tagline}
      </p>

      {/* Divider */}
      <div className="mb-4 h-px bg-gray-100 dark:bg-gray-800" />

      {/* Points */}
      <ul className="space-y-2.5 flex-1">
        {points.map((point) => (
          <li key={point} className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-gray-400">
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────

export default function WebsiteUsesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-violet-950/20">

      {/* ── Hero header ──────────────────────────────────────── */}
      <header className="mx-auto max-w-4xl px-6 pt-16 pb-12 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-1.5 text-xs font-semibold text-violet-700 dark:border-violet-800 dark:bg-violet-900/20 dark:text-violet-300 mb-6">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          AI-Powered Academic Platform
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100 sm:text-5xl">
          Everything you need to{' '}
          <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
            study smarter
          </span>
        </h1>

        <p className="mt-5 max-w-2xl mx-auto text-lg text-gray-500 dark:text-gray-400 leading-relaxed">
          CampusMate AI combines powerful AI tools with smart collaboration features
          to help students save time, stay organised, and achieve better results.
        </p>

        {/* Stats row */}
        <div className="mt-10 flex flex-wrap justify-center gap-8">
          {[
            { value: '7',      label: 'Core AI Features'   },
            { value: 'All',    label: 'File Formats Supported' },
            { value: '100%',   label: 'Personalised to You' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stat.value}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
            </div>
          ))}
        </div>
      </header>

      {/* ── Feature grid ─────────────────────────────────────── */}
      <main className="mx-auto max-w-7xl px-6 pb-20">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>

        {/* ── Bottom CTA banner ─────────────────────────────── */}
        <div className="mt-14 rounded-3xl bg-gradient-to-r from-violet-600 to-indigo-600 p-10 text-center shadow-xl">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Ready to transform how you study?
          </h2>
          <p className="mt-3 text-violet-200 text-base max-w-xl mx-auto">
            Upload your first lecture note and let the AI do the heavy lifting —
            summaries, flashcards, and quizzes in seconds.
          </p>
          <a
            href="/register"
            className="
              mt-6 inline-flex items-center gap-2 rounded-xl
              bg-white px-7 py-3 text-sm font-semibold text-violet-700
              shadow-md transition hover:bg-violet-50 hover:shadow-lg
              focus:outline-none focus-visible:ring-2 focus-visible:ring-white
            "
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Get started for free
          </a>
        </div>
      </main>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 dark:border-gray-800 py-8 text-center">
        <p className="text-sm text-gray-400 dark:text-gray-600 tracking-wide">
          Created by{' '}
          <span className="font-semibold text-gray-600 dark:text-gray-400">Javeria</span>
        </p>
      </footer>

    </div>
  )
}
