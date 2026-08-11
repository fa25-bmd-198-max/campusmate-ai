import { Link } from 'react-router-dom'
import {
  FileText, Layers, ClipboardCheck, Bot,
  CalendarDays, UsersRound, Briefcase,
  CheckCircle, ArrowRight, GraduationCap,
} from 'lucide-react'

// ── Palette ────────────────────────────────────────────────────
const C = {
  charcoal:   '#36454f',
  burgundy:   '#3c0000',
  forest:     '#1c3a2a',
  offwhite:   '#f5f0eb',
  card:       '#ffffff',
  border:     '#ddd6cc',
  muted:      '#6b7c87',
  accent:     '#f5a0a0',   // soft rose on dark bg
}

// ── Feature data ───────────────────────────────────────────────
const FEATURES = [
  {
    icon:    <FileText    className="h-6 w-6" />,
    accent:  '#7c3d12',   // warm brown
    bg:      '#fff7ed',
    border:  '#fed7aa',
    title:   'AI Notes & Summarizer',
    tagline: 'Turn hours of reading into minutes',
    points: [
      'Upload PDFs, DOCX, PPTX, or TXT lecture files',
      'AI generates comprehensive structured summaries',
      'Extracts key concepts, definitions & exam topics',
      'Produces revision notes and formula sheets',
    ],
  },
  {
    icon:    <Layers      className="h-6 w-6" />,
    accent:  '#1e3a8a',
    bg:      '#eff6ff',
    border:  '#bfdbfe',
    title:   'Interactive Flashcards',
    tagline: 'Study smarter with auto-generated cards',
    points: [
      'One-click flashcard generation from any note',
      'Mark cards as mastered to track progress',
      'Focused review sessions by topic or subject',
      'Spaced repetition to maximise retention',
    ],
  },
  {
    icon:    <ClipboardCheck className="h-6 w-6" />,
    accent:  '#14532d',
    bg:      '#f0fdf4',
    border:  '#bbf7d0',
    title:   'AI Quizzes & Assessments',
    tagline: 'Practice exactly what you uploaded',
    points: [
      'MCQ, True/False, Fill-in-Blank & Short Answer',
      'Questions drawn directly from your material',
      'Instant scoring with detailed explanations',
      'Track attempt history and measure improvement',
    ],
  },
  {
    icon:    <Bot         className="h-6 w-6" />,
    accent:  '#3c0000',
    bg:      '#fff1f2',
    border:  '#fecdd3',
    title:   'Personal AI Assistant',
    tagline: 'Your always-available academic tutor',
    points: [
      'Chat naturally and get instant academic answers',
      'Opens pre-loaded with your note context',
      'Handles complex explanations and breakdowns',
      'Available on every page via floating button',
    ],
  },
  {
    icon:    <CalendarDays className="h-6 w-6" />,
    accent:  '#1c3a2a',
    bg:      '#f0fdf4',
    border:  '#bbf7d0',
    title:   'Smart Study Planner',
    tagline: 'AI builds your personalised schedule',
    points: [
      'Input subjects, exam dates and available days',
      'AI creates a day-by-day study plan for you',
      'Balances revision, practice tests and rest',
      'Regenerate anytime your schedule changes',
    ],
  },
  {
    icon:    <UsersRound  className="h-6 w-6" />,
    accent:  '#4c1d95',
    bg:      '#f5f3ff',
    border:  '#ddd6fe',
    title:   'Study Groups & Teams',
    tagline: 'Collaborate and learn together',
    points: [
      'Create or join groups for any subject or course',
      'AI matches you with compatible study partners',
      'Form project teams with roles and shared goals',
      'Build your academic network with connection requests',
    ],
  },
  {
    icon:    <Briefcase   className="h-6 w-6" />,
    accent:  '#36454f',
    bg:      '#f8fafc',
    border:  '#cbd5e1',
    title:   'Project Portfolios',
    tagline: 'Showcase your academic work',
    points: [
      'Document web apps, research and academic projects',
      'Assign team members and track project status',
      'Link projects to courses and subjects',
      'Build a visible record of your achievements',
    ],
  },
]

// ── Feature Card ───────────────────────────────────────────────
function FeatureCard({ icon, accent, bg, border, title, tagline, points }: (typeof FEATURES)[number]) {
  return (
    <div
      className="group flex flex-col rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
      style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, boxShadow: '0 2px 8px rgba(54,69,79,0.08)' }}
    >
      {/* Icon */}
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl"
           style={{ backgroundColor: bg, color: accent, border: `1px solid ${border}` }}>
        {icon}
      </div>

      {/* Title */}
      <h3 className="text-base font-bold leading-snug" style={{ color: C.charcoal }}>{title}</h3>
      <p className="mt-1 mb-4 text-xs font-medium" style={{ color: C.muted }}>{tagline}</p>

      {/* Divider */}
      <div className="mb-4 h-px" style={{ backgroundColor: C.border }} />

      {/* Points */}
      <ul className="flex-1 space-y-2">
        {points.map((p) => (
          <li key={p} className="flex items-start gap-2.5 text-sm" style={{ color: '#4a5568' }}>
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: accent }} aria-hidden="true" />
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────
export default function WebsiteUsesPage() {
  return (
    <div style={{ backgroundColor: C.offwhite, minHeight: '100vh' }}>

      {/* ── Navbar ──────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-4"
           style={{ backgroundColor: C.charcoal, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ backgroundColor: C.burgundy }}>
            <GraduationCap className="h-4 w-4 text-white" />
          </span>
          <span className="text-base font-bold text-white tracking-tight">
            CampusMate <span style={{ color: C.accent }}>AI</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login"
            className="rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:bg-white/10"
            style={{ color: 'rgba(255,255,255,0.8)' }}>
            Sign in
          </Link>
          <Link to="/register"
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-lg"
            style={{ backgroundColor: C.burgundy }}>
            Get started
          </Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden px-6 py-24 text-center"
        style={{
          background: `linear-gradient(135deg, ${C.charcoal} 0%, #2a3840 50%, ${C.forest} 100%)`,
        }}
      >
        {/* Decorative circles */}
        <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full opacity-10"
             style={{ backgroundColor: C.burgundy }} />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full opacity-10"
             style={{ backgroundColor: C.accent }} />

        <div className="relative mx-auto max-w-3xl">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold"
               style={{ backgroundColor: 'rgba(245,160,160,0.15)', color: C.accent, border: '1px solid rgba(245,160,160,0.3)' }}>
            <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ backgroundColor: C.accent }} />
            AI-Powered Academic Platform
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Study smarter,{' '}
            <span className="relative">
              <span style={{
                background: `linear-gradient(90deg, ${C.accent}, #fca5a5)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                not harder
              </span>
            </span>
          </h1>

          <p className="mt-6 text-lg leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>
            CampusMate AI gives every student a personal AI tutor, smart study tools,
            and a collaborative learning network — all in one place.
          </p>

          {/* CTA buttons */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link to="/register"
              className="inline-flex items-center gap-2 rounded-xl px-8 py-3.5 text-sm font-bold text-white shadow-lg transition-all hover:opacity-90 hover:shadow-xl hover:-translate-y-0.5"
              style={{ backgroundColor: C.burgundy }}>
              Start for free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/login"
              className="inline-flex items-center gap-2 rounded-xl border px-8 py-3.5 text-sm font-semibold text-white transition-all hover:bg-white/10"
              style={{ borderColor: 'rgba(255,255,255,0.25)' }}>
              Sign in
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-6">
            {[
              { value: '7',     label: 'AI-powered features' },
              { value: '4',     label: 'File formats supported' },
              { value: '100%',  label: 'Personalised to you' },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-extrabold text-white">{s.value}</p>
                <p className="mt-1 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section title ────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-6 pt-16 pb-4 text-center">
        <h2 className="text-2xl font-bold sm:text-3xl" style={{ color: C.charcoal }}>
          Everything you need, in one platform
        </h2>
        <p className="mt-3 text-base" style={{ color: C.muted }}>
          Seven powerful tools that work together to help you learn faster and achieve more.
        </p>
      </section>

      {/* ── Feature grid ─────────────────────────────────────── */}
      <main className="mx-auto max-w-7xl px-6 pb-20">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-8">
          {FEATURES.map((f) => <FeatureCard key={f.title} {...f} />)}
        </div>

        {/* ── CTA Banner ───────────────────────────────────── */}
        <div className="mt-16 rounded-3xl overflow-hidden relative"
             style={{
               background: `linear-gradient(135deg, ${C.burgundy} 0%, #5a0000 40%, #2d0000 100%)`,
               boxShadow: '0 20px 60px rgba(60,0,0,0.35)',
             }}>
          {/* Decorative */}
          <div className="pointer-events-none absolute right-0 top-0 h-full w-1/2 opacity-5"
               style={{ background: 'radial-gradient(circle at 80% 50%, white, transparent)' }} />

          <div className="relative px-10 py-14 text-center">
            <h2 className="text-2xl font-extrabold text-white sm:text-3xl">
              Ready to transform how you study?
            </h2>
            <p className="mt-4 text-base max-w-xl mx-auto" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Upload your first lecture note and let the AI generate a comprehensive
              summary, flashcards, and quiz — all in under a minute.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link to="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-sm font-bold shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5"
                style={{ color: C.burgundy }}>
                Create free account
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/login"
                className="inline-flex items-center gap-2 rounded-xl border px-8 py-3.5 text-sm font-semibold text-white transition-all hover:bg-white/10"
                style={{ borderColor: 'rgba(255,255,255,0.3)' }}>
                Already have an account? Sign in
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="py-10 text-center" style={{ borderTop: `1px solid ${C.border}` }}>
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg"
                style={{ backgroundColor: C.charcoal }}>
            <GraduationCap className="h-4 w-4 text-white" />
          </span>
          <span className="text-sm font-bold" style={{ color: C.charcoal }}>CampusMate AI</span>
        </div>
        <p className="text-sm" style={{ color: C.muted }}>
          Created by{' '}
          <span className="font-semibold" style={{ color: C.charcoal }}>Javeria</span>
        </p>
      </footer>

    </div>
  )
}
