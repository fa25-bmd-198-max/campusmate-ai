import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { GraduationCap, ChevronRight, ChevronLeft, Check } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { completeOnboarding } from '@/services/profileService'
import { cn } from '@/utils/cn'
import toast from 'react-hot-toast'
import type { LearningStyle } from '@/types/database.types'

// ── Steps definition ──────────────────────────────────────────
const STEPS = [
  'Personal Info',
  'Academic Info',
  'Courses',
  'Skills & Interests',
  'Availability',
  'Goals',
] as const

// ── Step 1 schema ─────────────────────────────────────────────
const step1Schema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  bio:       z.string().max(300, 'Bio must be under 300 characters').optional(),
})

// ── Step 2 schema ─────────────────────────────────────────────
const step2Schema = z.object({
  university:  z.string().min(2, 'Enter your university name'),
  department:  z.string().min(2, 'Enter your department'),
  degree:      z.string().min(2, 'Enter your degree program'),
  semester:    z.coerce.number().int().min(1).max(20),
})

// ── Tag input helper ──────────────────────────────────────────
function TagInput({
  label, value, onChange, placeholder, maxTags = 15,
}: {
  label: string; value: string[]; onChange: (v: string[]) => void
  placeholder?: string; maxTags?: number
}) {
  const [input, setInput] = useState('')

  const add = () => {
    const trimmed = input.trim()
    if (trimmed && !value.includes(trimmed) && value.length < maxTags) {
      onChange([...value, trimmed])
      setInput('')
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder={placeholder ?? `Type and press Enter`}
          className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        />
        <Button type="button" variant="secondary" size="sm" onClick={add}>Add</Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {value.map(tag => (
            <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
              {tag}
              <button
                type="button"
                onClick={() => onChange(value.filter(t => t !== tag))}
                aria-label={`Remove ${tag}`}
                className="ml-0.5 hover:text-primary-900 dark:hover:text-white"
              >×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Learning style cards ──────────────────────────────────────
const STYLES: { value: LearningStyle; label: string; description: string; emoji: string }[] = [
  { value: 'visual',      label: 'Visual',      description: 'Diagrams, charts, and mind maps', emoji: '👁️' },
  { value: 'auditory',    label: 'Auditory',     description: 'Listening, discussion, podcasts',  emoji: '👂' },
  { value: 'reading',     label: 'Reading',      description: 'Notes, textbooks, written content', emoji: '📖' },
  { value: 'kinesthetic', label: 'Kinesthetic',  description: 'Practice, hands-on, real examples', emoji: '🤝' },
]

const DAYS = ['mon','tue','wed','thu','fri','sat','sun'] as const

export default function OnboardingPage() {
  const { user }     = useAuth()
  const navigate     = useNavigate()

  const [step, setStep]       = useState(0)
  const [saving, setSaving]   = useState(false)

  // Collected data across steps
  const [personal,  setPersonal]  = useState({ full_name: '', bio: '' })
  const [academic,  setAcademic]  = useState({ university: '', department: '', degree: '', semester: 1 })
  const [courses,   setCourses]   = useState<{ name: string; code: string }[]>([])
  const [courseInput, setCourseInput] = useState({ name: '', code: '' })
  const [skills,    setSkills]    = useState<string[]>([])
  const [interests, setInterests] = useState<string[]>([])
  const [weakSubjects, setWeakSubjects] = useState<string[]>([])
  const [learningStyle, setLearningStyle] = useState<LearningStyle | null>(null)
  const [studyHours, setStudyHours] = useState(4)
  const [availability, setAvailability] = useState<Record<string, boolean>>({
    mon: false, tue: false, wed: false, thu: false, fri: false, sat: false, sun: false,
  })
  const [goals, setGoals]   = useState<string[]>([])

  // ── Step forms ──────────────────────────────────────────
  const form1 = useForm({ resolver: zodResolver(step1Schema), defaultValues: personal })
  const form2 = useForm({ resolver: zodResolver(step2Schema), defaultValues: { ...academic, semester: academic.semester } })

  // ── Navigate steps ────────────────────────────────────────
  const goBack = () => setStep(s => Math.max(0, s - 1))

  const submitStep1 = form1.handleSubmit(data => {
    setPersonal({ full_name: data.full_name, bio: data.bio ?? '' })
    setStep(1)
  })

  const submitStep2 = form2.handleSubmit(data => {
    setAcademic({ university: data.university, department: data.department, degree: data.degree, semester: data.semester })
    setStep(2)
  })

  const addCourse = () => {
    if (!courseInput.name.trim()) return
    if (courses.length >= 12) { toast.error('Maximum 12 courses allowed'); return }
    setCourses(prev => [...prev, { name: courseInput.name.trim(), code: courseInput.code.trim() }])
    setCourseInput({ name: '', code: '' })
  }

  // ── Final save ─────────────────────────────────────────────
  const handleFinish = async () => {
    if (!user) return
    setSaving(true)
    try {
      await completeOnboarding(user.id, {
        full_name:           personal.full_name,
        bio:                 personal.bio || null,
        university:          academic.university,
        department:          academic.department,
        degree:              academic.degree,
        semester:            academic.semester,
        skills,
        interests,
        weak_subjects:       weakSubjects,
        learning_style:      learningStyle,
        study_hours_per_day: studyHours,
        weekly_availability: Object.fromEntries(
          DAYS.filter(d => availability[d]).map(d => [d, [9, 17]])
        ),
        academic_goals: goals,
      })

      // Add courses separately
      if (courses.length > 0) {
        const { supabase } = await import('@/services/supabase')
        await supabase.from('courses').insert(
          courses.map(c => ({ user_id: user.id, name: c.name, code: c.code || null }))
        )
      }

      toast.success('Profile saved! Welcome to CampusMate AI 🎓')
      navigate('/dashboard', { replace: true })
    } catch (err) {
      toast.error('Could not save profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Top gradient bar */}
      <div className="h-1 w-full bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-400" />

      <div className="mx-auto max-w-2xl px-4 py-10">
        {/* Logo */}
        <div className="mb-8 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 text-white">
            <GraduationCap className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
            CampusMate <span className="text-primary-600">AI</span>
          </span>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Step {step + 1} of {STEPS.length} — <span className="text-primary-600">{STEPS[step]}</span>
            </p>
            <p className="text-xs text-gray-400">{Math.round(((step + 1) / STEPS.length) * 100)}%</p>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
            <div
              className="h-full rounded-full bg-primary-600 transition-all duration-300"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
          {/* Step dots */}
          <div className="mt-3 flex justify-between">
            {STEPS.map((s, i) => (
              <div key={s} className="flex flex-col items-center gap-1">
                <span className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition-colors',
                  i < step  ? 'bg-primary-600 text-white' :
                  i === step ? 'bg-primary-100 text-primary-700 ring-2 ring-primary-600 dark:bg-primary-900/40 dark:text-primary-300' :
                               'bg-gray-200 text-gray-500 dark:bg-gray-800 dark:text-gray-500',
                )}>
                  {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-card dark:border-gray-800 dark:bg-gray-900">

          {/* ── Step 1: Personal Info ─────────────────────────── */}
          {step === 0 && (
            <form onSubmit={submitStep1} className="space-y-5">
              <div>
                <h2 className="text-h2 font-semibold text-gray-900 dark:text-gray-100">Let's set up your profile</h2>
                <p className="mt-1 text-body text-gray-500 dark:text-gray-400">Tell us a little about yourself</p>
              </div>
              <Input label="Full name" placeholder="Alex Johnson" error={form1.formState.errors.full_name?.message} required {...form1.register('full_name')} />
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bio <span className="text-gray-400 font-normal">(optional)</span></label>
                <textarea
                  {...form1.register('bio')}
                  placeholder="CS student passionate about AI and web development..."
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                />
              </div>
              <div className="flex justify-end pt-2">
                <Button type="submit" rightIcon={<ChevronRight className="h-4 w-4" />}>Continue</Button>
              </div>
            </form>
          )}

          {/* ── Step 2: Academic Info ────────────────────────── */}
          {step === 1 && (
            <form onSubmit={submitStep2} className="space-y-5">
              <div>
                <h2 className="text-h2 font-semibold text-gray-900 dark:text-gray-100">Academic information</h2>
                <p className="mt-1 text-body text-gray-500 dark:text-gray-400">Help us personalize your AI experience</p>
              </div>
              <Input label="University" placeholder="University of Technology" error={form2.formState.errors.university?.message} required {...form2.register('university')} />
              <Input label="Department" placeholder="Computer Science" error={form2.formState.errors.department?.message} required {...form2.register('department')} />
              <Input label="Degree program" placeholder="B.Sc. Computer Science" error={form2.formState.errors.degree?.message} required {...form2.register('degree')} />
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current semester <span className="text-red-500">*</span></label>
                <select
                  {...form2.register('semester')}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                    <option key={n} value={n}>Semester {n}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-between pt-2">
                <Button type="button" variant="ghost" leftIcon={<ChevronLeft className="h-4 w-4" />} onClick={goBack}>Back</Button>
                <Button type="submit" rightIcon={<ChevronRight className="h-4 w-4" />}>Continue</Button>
              </div>
            </form>
          )}

          {/* ── Step 3: Courses ──────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-h2 font-semibold text-gray-900 dark:text-gray-100">Your courses</h2>
                <p className="mt-1 text-body text-gray-500 dark:text-gray-400">Add the courses you're enrolled in this semester</p>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Course name (e.g. Data Structures)"
                  value={courseInput.name}
                  onChange={e => setCourseInput(p => ({ ...p, name: e.target.value }))}
                  wrapperClassName="flex-1"
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCourse() } }}
                />
                <Input
                  placeholder="Code (optional)"
                  value={courseInput.code}
                  onChange={e => setCourseInput(p => ({ ...p, code: e.target.value }))}
                  wrapperClassName="w-32"
                />
                <Button type="button" variant="secondary" onClick={addCourse} className="self-start mt-0">Add</Button>
              </div>
              {courses.length > 0 && (
                <ul className="space-y-2" role="list">
                  {courses.map((c, i) => (
                    <li key={i} className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800">
                      <span className="text-sm text-gray-800 dark:text-gray-200">{c.name}{c.code && <span className="ml-2 text-xs text-gray-400">{c.code}</span>}</span>
                      <button onClick={() => setCourses(prev => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500" aria-label={`Remove ${c.name}`}>×</button>
                    </li>
                  ))}
                </ul>
              )}
              {courses.length === 0 && (
                <p className="text-sm text-gray-400 dark:text-gray-600">No courses added yet. You can skip and add them later.</p>
              )}
              <div className="flex justify-between pt-2">
                <Button type="button" variant="ghost" leftIcon={<ChevronLeft className="h-4 w-4" />} onClick={goBack}>Back</Button>
                <Button type="button" rightIcon={<ChevronRight className="h-4 w-4" />} onClick={() => setStep(3)}>Continue</Button>
              </div>
            </div>
          )}

          {/* ── Step 4: Skills & Interests ───────────────────── */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-h2 font-semibold text-gray-900 dark:text-gray-100">Skills & Interests</h2>
                <p className="mt-1 text-body text-gray-500 dark:text-gray-400">Help us recommend the right study partners and content</p>
              </div>
              <TagInput label="Skills" value={skills} onChange={setSkills} placeholder="e.g. Python, Data Analysis…" />
              <TagInput label="Interests" value={interests} onChange={setInterests} placeholder="e.g. Machine Learning, UI Design…" />
              <TagInput label="Weak subjects" value={weakSubjects} onChange={setWeakSubjects} placeholder="e.g. Linear Algebra, Statistics…" />
              <div>
                <p className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">Learning style</p>
                <div className="grid grid-cols-2 gap-3">
                  {STYLES.map(s => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setLearningStyle(s.value)}
                      className={cn(
                        'flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition-colors',
                        learningStyle === s.value
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                          : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600',
                      )}
                    >
                      <span className="text-xl">{s.emoji}</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{s.label}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{s.description}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-between pt-2">
                <Button type="button" variant="ghost" leftIcon={<ChevronLeft className="h-4 w-4" />} onClick={goBack}>Back</Button>
                <Button type="button" rightIcon={<ChevronRight className="h-4 w-4" />} onClick={() => setStep(4)}>Continue</Button>
              </div>
            </div>
          )}

          {/* ── Step 5: Availability ─────────────────────────── */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-h2 font-semibold text-gray-900 dark:text-gray-100">Study schedule</h2>
                <p className="mt-1 text-body text-gray-500 dark:text-gray-400">When are you typically available to study?</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Daily study hours: <span className="text-primary-600 font-semibold">{studyHours}h</span>
                </label>
                <input
                  type="range" min={1} max={12} value={studyHours}
                  aria-label={`Daily study hours: ${studyHours}`}
                  aria-valuemin={1} aria-valuemax={12} aria-valuenow={studyHours}
                  onChange={e => setStudyHours(Number(e.target.value))}
                  className="w-full accent-primary-600"
                />
                <div className="mt-1 flex justify-between text-xs text-gray-400">
                  <span>1h</span><span>6h</span><span>12h</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Available days</label>
                <div className="flex gap-2 flex-wrap">
                  {DAYS.map(day => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setAvailability(p => ({ ...p, [day]: !p[day] }))}
                      className={cn(
                        'rounded-lg px-3 py-2 text-sm font-medium capitalize transition-colors',
                        availability[day]
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700',
                      )}
                    >{day}</button>
                  ))}
                </div>
              </div>
              <div className="flex justify-between pt-2">
                <Button type="button" variant="ghost" leftIcon={<ChevronLeft className="h-4 w-4" />} onClick={goBack}>Back</Button>
                <Button type="button" rightIcon={<ChevronRight className="h-4 w-4" />} onClick={() => setStep(5)}>Continue</Button>
              </div>
            </div>
          )}

          {/* ── Step 6: Goals ────────────────────────────────── */}
          {step === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-h2 font-semibold text-gray-900 dark:text-gray-100">Academic goals</h2>
                <p className="mt-1 text-body text-gray-500 dark:text-gray-400">What do you want to achieve this semester?</p>
              </div>
              <TagInput label="Goals" value={goals} onChange={setGoals} placeholder="e.g. Pass Algorithm exam, Improve GPA…" maxTags={10} />
              <div className="rounded-xl border border-primary-200 bg-primary-50 p-4 dark:border-primary-800 dark:bg-primary-900/20">
                <p className="text-sm font-medium text-primary-800 dark:text-primary-300">🎓 You're all set!</p>
                <p className="mt-1 text-xs text-primary-700 dark:text-primary-400">
                  Your AI-powered study experience is ready. You can always update your profile from Settings.
                </p>
              </div>
              <div className="flex justify-between pt-2">
                <Button type="button" variant="ghost" leftIcon={<ChevronLeft className="h-4 w-4" />} onClick={goBack}>Back</Button>
                <Button type="button" loading={saving} onClick={handleFinish} leftIcon={<Check className="h-4 w-4" />}>
                  Complete setup
                </Button>
              </div>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-caption text-gray-400 dark:text-gray-600">
          You can skip optional steps and complete them from your Profile settings later.
        </p>
      </div>
    </div>
  )
}
