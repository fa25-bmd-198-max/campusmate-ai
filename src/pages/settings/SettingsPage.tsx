import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  User, Lock, Bell, Palette, Shield,
  Upload, Trash2, Plus, Check,
} from 'lucide-react'
import { Avatar, Badge, Button, Card, Input, Modal, Spinner } from '@/components/ui'
import { useProfile, useUpdateProfile, useUploadAvatar, useCourses, useAddCourse, useDeleteCourse } from '@/hooks/useProfile'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/context/ThemeContext'
import { cn } from '@/utils/cn'
import toast from 'react-hot-toast'
import type { LearningStyle } from '@/types/database.types'

// ── Nav tabs ──────────────────────────────────────────────────
const TABS = ['Profile', 'Password', 'Notifications', 'Appearance', 'Privacy'] as const
type Tab = (typeof TABS)[number]

// ── Tag input ─────────────────────────────────────────────────
function TagInput({ label, value, onChange, placeholder }: {
  label: string; value: string[]; onChange: (v: string[]) => void; placeholder?: string
}) {
  const [input, setInput] = useState('')
  const add = () => {
    const t = input.trim()
    if (t && !value.includes(t)) { onChange([...value, t]); setInput('') }
  }
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      <div className="flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder={placeholder ?? 'Type and press Enter'}
          className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        />
        <Button type="button" variant="secondary" size="sm" onClick={add}>Add</Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {value.map(tag => (
            <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
              {tag}
              <button type="button" onClick={() => onChange(value.filter(t => t !== tag))} className="hover:opacity-70" aria-label={`Remove ${tag}`}>×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Password schema ───────────────────────────────────────────
const pwSchema = z.object({
  newPassword: z.string().min(8,'Min 8 chars').regex(/[A-Z]/,'Needs uppercase').regex(/[0-9]/,'Needs number').regex(/[^A-Za-z0-9]/,'Needs special char'),
  confirmPassword: z.string(),
}).refine(d => d.newPassword === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] })
type PwForm = z.infer<typeof pwSchema>

// ── Profile tab ───────────────────────────────────────────────
function ProfileTab() {
  const { user }            = useAuth()
  const { profile }         = useProfile()
  const updateProfile       = useUpdateProfile()
  const uploadAvatar        = useUploadAvatar()
  const fileRef             = useRef<HTMLInputElement>(null)

  const [fullName,      setFullName]      = useState(profile?.full_name ?? '')
  const [bio,           setBio]           = useState(profile?.bio ?? '')
  const [university,    setUniversity]    = useState(profile?.university ?? '')
  const [department,    setDepartment]    = useState(profile?.department ?? '')
  const [degree,        setDegree]        = useState(profile?.degree ?? '')
  const [semester,      setSemester]      = useState(String(profile?.semester ?? ''))
  const [learningStyle, setLearningStyle] = useState<LearningStyle | null>(profile?.learning_style ?? null)
  const [studyHours,    setStudyHours]    = useState(profile?.study_hours_per_day ?? 4)
  const [skills,        setSkills]        = useState<string[]>(profile?.skills ?? [])
  const [interests,     setInterests]     = useState<string[]>(profile?.interests ?? [])
  const [weakSubjects,  setWeakSubjects]  = useState<string[]>(profile?.weak_subjects ?? [])

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5 MB'); return }
    await uploadAvatar.mutateAsync(file)
    toast.success('Avatar updated')
  }

  const handleSave = async () => {
    if (!user) return
    await updateProfile.mutateAsync({
      full_name: fullName, bio: bio || null, university, department, degree,
      semester: semester ? Number(semester) : null,
      learning_style: learningStyle, study_hours_per_day: studyHours,
      skills, interests, weak_subjects: weakSubjects,
    })
    toast.success('Profile saved')
  }

  const STYLES: { value: LearningStyle; label: string; emoji: string }[] = [
    { value: 'visual', label: 'Visual', emoji: '👁️' },
    { value: 'auditory', label: 'Auditory', emoji: '👂' },
    { value: 'reading', label: 'Reading', emoji: '📖' },
    { value: 'kinesthetic', label: 'Kinesthetic', emoji: '🤝' },
  ]

  return (
    <div className="space-y-6">
      {/* Avatar */}
      <Card>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Profile photo</h3>
        <div className="flex items-center gap-4">
          <Avatar src={profile?.avatar_url} name={profile?.full_name ?? ''} size="xl" />
          <div className="space-y-2">
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarChange} />
            <Button variant="secondary" size="sm" leftIcon={uploadAvatar.isPending ? <Spinner size="xs" /> : <Upload className="h-4 w-4" />}
              onClick={() => fileRef.current?.click()} loading={uploadAvatar.isPending}>
              Upload photo
            </Button>
            <p className="text-xs text-gray-400">JPG, PNG or WebP. Max 5 MB.</p>
          </div>
        </div>
      </Card>

      {/* Basic info */}
      <Card>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Basic information</h3>
        <div className="space-y-4">
          <Input label="Full name" value={fullName} onChange={e => setFullName(e.target.value)} />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bio</label>
            <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} maxLength={300}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              placeholder="Tell other students about yourself…" />
            <p className="mt-1 text-right text-xs text-gray-400">{bio.length}/300</p>
          </div>
        </div>
      </Card>

      {/* Academic info */}
      <Card>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Academic information</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="University" value={university} onChange={e => setUniversity(e.target.value)} />
          <Input label="Department" value={department} onChange={e => setDepartment(e.target.value)} />
          <Input label="Degree program" value={degree} onChange={e => setDegree(e.target.value)} />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Semester</label>
            <select value={semester} onChange={e => setSemester(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
              <option value="">Select…</option>
              {Array.from({length:12},(_,i)=>i+1).map(n=><option key={n} value={n}>Semester {n}</option>)}
            </select>
          </div>
        </div>
      </Card>

      {/* Learning style */}
      <Card>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Learning style</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {STYLES.map(s => (
            <button key={s.value} type="button" onClick={() => setLearningStyle(s.value)}
              className={cn('flex flex-col items-center gap-1 rounded-xl border p-3 text-center transition-colors text-sm font-medium',
                learningStyle === s.value ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400')}>
              <span>{s.emoji}</span>{s.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Study hours */}
      <Card>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Daily study hours: <span className="text-primary-600">{studyHours}h</span>
        </h3>
        <input type="range" min={1} max={12} value={studyHours}
          aria-label={`Daily study hours: ${studyHours}`}
          aria-valuemin={1} aria-valuemax={12} aria-valuenow={studyHours}
          onChange={e => setStudyHours(Number(e.target.value))} className="w-full accent-primary-600" />
        <div className="mt-1 flex justify-between text-xs text-gray-400"><span>1h</span><span>6h</span><span>12h</span></div>
      </Card>

      {/* Tags */}
      <Card>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Skills & Interests</h3>
        <div className="space-y-4">
          <TagInput label="Skills" value={skills} onChange={setSkills} placeholder="e.g. Python, React…" />
          <TagInput label="Interests" value={interests} onChange={setInterests} placeholder="e.g. Machine Learning…" />
          <TagInput label="Weak subjects" value={weakSubjects} onChange={setWeakSubjects} placeholder="e.g. Statistics…" />
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} loading={updateProfile.isPending} leftIcon={<Check className="h-4 w-4" />}>Save changes</Button>
      </div>
    </div>
  )
}

// ── Courses tab ───────────────────────────────────────────────
function CoursesTab() {
  const { data: courses = [], isLoading } = useCourses()
  const addCourse    = useAddCourse()
  const deleteCourse = useDeleteCourse()
  const [confirmId,  setConfirmId]  = useState<string | null>(null)
  const [name,       setName]       = useState('')
  const [code,       setCode]       = useState('')
  const [instructor, setInstructor] = useState('')

  const handleAdd = async () => {
    if (!name.trim()) return
    if (courses.length >= 12) { toast.error('Maximum 12 courses allowed'); return }
    await addCourse.mutateAsync({ name: name.trim(), code: code.trim() || null, instructor: instructor.trim() || null })
    setName(''); setCode(''); setInstructor('')
    toast.success('Course added')
  }

  const handleDelete = async (id: string) => {
    await deleteCourse.mutateAsync(id)
    setConfirmId(null)
    toast.success('Course removed')
  }

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Add course</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input placeholder="Course name *" value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd() } }} />
          <Input placeholder="Code (optional)" value={code} onChange={e => setCode(e.target.value)} />
          <Input placeholder="Instructor (optional)" value={instructor} onChange={e => setInstructor(e.target.value)} />
        </div>
        <div className="mt-3 flex justify-end">
          <Button onClick={handleAdd} loading={addCourse.isPending} leftIcon={<Plus className="h-4 w-4" />}>Add course</Button>
        </div>
      </Card>

      <Card>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Your courses <Badge color="default" className="ml-2">{courses.length}/12</Badge>
        </h3>
        {isLoading ? <Spinner className="mx-auto" /> : courses.length === 0
          ? <p className="text-sm text-gray-400 dark:text-gray-600">No courses yet. Add your first one above.</p>
          : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800" role="list">
              {courses.map(c => (
                <li key={c.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{c.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {[c.code, c.instructor].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <button onClick={() => setConfirmId(c.id)} aria-label={`Remove ${c.name}`}
                    className="text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
      </Card>

      <Modal open={!!confirmId} onClose={() => setConfirmId(null)} title="Remove course?"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setConfirmId(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => confirmId && handleDelete(confirmId)} loading={deleteCourse.isPending}>Remove</Button>
          </div>
        }>
        <p className="text-body text-gray-600 dark:text-gray-400">
          This will remove the course from your profile. Your notes and quizzes linked to it will not be deleted.
        </p>
      </Modal>
    </div>
  )
}

// ── Password tab ──────────────────────────────────────────────
function PasswordTab() {
  const { updatePassword } = useAuth()
  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm<PwForm>({ resolver: zodResolver(pwSchema) })

  const onSubmit = async (data: PwForm) => {
    const { error } = await updatePassword(data.newPassword)
    if (error) { setError('root', { message: error.message }); return }
    toast.success('Password updated')
    reset()
  }

  return (
    <Card>
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Change password</h3>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md" noValidate>
        {errors.root && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {errors.root.message}
          </div>
        )}
        <Input label="New password" type="password" autoComplete="new-password" error={errors.newPassword?.message} required {...register('newPassword')} />
        <Input label="Confirm new password" type="password" autoComplete="new-password" error={errors.confirmPassword?.message} required {...register('confirmPassword')} />
        <Button type="submit" loading={isSubmitting} leftIcon={<Lock className="h-4 w-4" />}>Update password</Button>
      </form>
    </Card>
  )
}

// ── Notifications tab ─────────────────────────────────────────
function NotificationsTab() {
  const { profile }    = useProfile()
  const updateProfile  = useUpdateProfile()

  const prefs = profile?.notification_prefs ?? {
    study_reminder: true, group_invite: true, deadline: true, exam_reminder: true, ai_rec: true,
  }

  const ITEMS = [
    { key: 'study_reminder', label: 'Study session reminders', desc: '1 hour before a scheduled session' },
    { key: 'group_invite',   label: 'Group invitations',       desc: 'When someone invites you to a group' },
    { key: 'deadline',       label: 'Assignment deadlines',    desc: '24 hours before a deadline' },
    { key: 'exam_reminder',  label: 'Exam reminders',          desc: '48 hours before an exam' },
    { key: 'ai_rec',         label: 'AI recommendations',      desc: 'New personalised suggestions' },
  ]

  const toggle = async (key: string) => {
    const updated = { ...prefs, [key]: !prefs[key] }
    await updateProfile.mutateAsync({ notification_prefs: updated })
  }

  return (
    <Card>
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Notification preferences</h3>
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {ITEMS.map(item => (
          <div key={item.key} className="flex items-center justify-between py-4">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{item.label}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{item.desc}</p>
            </div>
            <button
              role="switch" aria-checked={!!prefs[item.key]}
              onClick={() => toggle(item.key)}
              className={cn('relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors',
                prefs[item.key] ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-700')}
            >
              <span aria-hidden="true" className={cn('pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform',
                prefs[item.key] ? 'translate-x-5' : 'translate-x-0')} />
            </button>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ── Appearance tab ────────────────────────────────────────────
function AppearanceTab() {
  const { theme, setTheme } = useTheme()

  const THEMES = [
    { value: 'light' as const, label: 'Light', emoji: '☀️' },
    { value: 'dark'  as const, label: 'Dark',  emoji: '🌙' },
    { value: 'system' as const,label: 'System',emoji: '💻' },
  ]

  return (
    <Card>
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Theme</h3>
      <div className="grid grid-cols-3 gap-3 max-w-sm">
        {THEMES.map(t => (
          <button key={t.value} type="button" onClick={() => setTheme(t.value)}
            className={cn('flex flex-col items-center gap-2 rounded-xl border p-4 text-sm font-medium transition-colors',
              theme === t.value ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400')}>
            <span className="text-2xl">{t.emoji}</span>
            {t.label}
            {theme === t.value && <Check className="h-3.5 w-3.5 text-primary-600 dark:text-primary-400" />}
          </button>
        ))}
      </div>
    </Card>
  )
}

// ── Privacy tab ───────────────────────────────────────────────
function PrivacyTab() {
  const { profile }   = useProfile()
  const updateProfile = useUpdateProfile()

  const toggle = async (key: 'privacy_public' | 'show_in_matching') => {
    await updateProfile.mutateAsync({ [key]: !profile?.[key] })
    toast.success('Privacy preference saved')
  }

  const ITEMS = [
    { key: 'privacy_public'  as const, label: 'Public profile',         desc: 'Other students can view your profile' },
    { key: 'show_in_matching' as const,label: 'Appear in partner matching', desc: 'Allow the AI to recommend you as a study partner' },
  ]

  return (
    <Card>
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Privacy settings</h3>
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {ITEMS.map(item => (
          <div key={item.key} className="flex items-center justify-between py-4">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{item.label}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{item.desc}</p>
            </div>
            <button
              role="switch" aria-checked={!!profile?.[item.key]}
              onClick={() => toggle(item.key)}
              className={cn('relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors',
                profile?.[item.key] ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-700')}
            >
              <span aria-hidden="true" className={cn('pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform',
                profile?.[item.key] ? 'translate-x-5' : 'translate-x-0')} />
            </button>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ── Main SettingsPage ─────────────────────────────────────────
const TAB_ICONS: Record<Tab, React.ReactNode> = {
  Profile:       <User       className="h-4 w-4" />,
  Password:      <Lock       className="h-4 w-4" />,
  Notifications: <Bell       className="h-4 w-4" />,
  Appearance:    <Palette    className="h-4 w-4" />,
  Privacy:       <Shield     className="h-4 w-4" />,
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Profile')

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6">
        <h1 className="text-h1 font-semibold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="mt-1 text-body text-gray-500 dark:text-gray-400">Manage your account, preferences, and privacy</p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Sidebar nav */}
        <nav className="shrink-0 lg:w-48" aria-label="Settings navigation">
          <ul className="flex gap-1 lg:flex-col" role="list">
            {TABS.map(tab => (
              <li key={tab} role="listitem">
                <button
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                    activeTab === tab
                      ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800',
                  )}
                >
                  {TAB_ICONS[tab]}
                  <span className="hidden lg:inline">{tab}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Tab content */}
        <div className="min-w-0 flex-1">
          {activeTab === 'Profile'       && <><ProfileTab /><div className="mt-6"><CoursesTab /></div></>}
          {activeTab === 'Password'      && <PasswordTab />}
          {activeTab === 'Notifications' && <NotificationsTab />}
          {activeTab === 'Appearance'    && <AppearanceTab />}
          {activeTab === 'Privacy'       && <PrivacyTab />}
        </div>
      </div>
    </div>
  )
}
