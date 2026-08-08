import { useParams, Link } from 'react-router-dom'
import {
  MapPin, BookOpen, Target, Clock,
  GraduationCap, Brain, Edit2,
} from 'lucide-react'
import { Avatar, Badge, Button, Card, Skeleton } from '@/components/ui'
import { EmptyState } from '@/components/shared'
import ReportButton from '@/components/shared/ReportButton'
import { useProfile, useCourses } from '@/hooks/useProfile'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/utils/cn'

const STYLE_LABELS: Record<string, string> = {
  visual: 'Visual learner', auditory: 'Auditory learner',
  reading: 'Reading/writing', kinesthetic: 'Kinesthetic',
}
const DAY_LABELS: Record<string, string> = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun',
}

// ── Section wrapper ───────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {title}
      </h3>
      {children}
    </Card>
  )
}

// ── Tag chip ─────────────────────────────────────────────────
function Tag({ label, color = 'default' }: { label: string; color?: string }) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
      color === 'weak'
        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    )}>
      {label}
    </span>
  )
}

export default function ProfilePage() {
  const { userId: paramUserId } = useParams<{ userId: string }>()
  const { user }                = useAuth()
  const targetUserId            = paramUserId ?? user?.id ?? ''
  const isOwnProfile            = !paramUserId || paramUserId === user?.id

  const { profile, isLoading } = useProfile(targetUserId)
  const { data: courses = [], isLoading: coursesLoading } = useCourses()

  // ── Loading skeleton ──────────────────────────────────────
  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <Card>
          <div className="flex gap-5">
            <Skeleton.Circle className="h-24 w-24" />
            <div className="flex-1 space-y-3 pt-2">
              <Skeleton.Line className="w-48" />
              <Skeleton.Line className="w-32" />
              <Skeleton.Line className="w-64" />
            </div>
          </div>
        </Card>
        <div className="grid gap-6 md:grid-cols-2">
          {[1,2,3,4].map(i => <Skeleton.Block key={i} />)}
        </div>
      </div>
    )
  }

  // ── Not found ────────────────────────────────────────────
  if (!profile) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<GraduationCap className="h-8 w-8" />}
          title="Profile not found"
          description="This student profile doesn't exist or may have been removed."
          action={<Button variant="secondary" onClick={() => history.back()}>Go back</Button>}
        />
      </div>
    )
  }

  const availableDays = profile.weekly_availability
    ? Object.keys(profile.weekly_availability)
    : []

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {/* ── Header card ──────────────────────────────────────── */}
      <Card>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <Avatar
            src={profile.avatar_url}
            name={profile.full_name}
            size="xl"
            ring="sm"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-h1 font-semibold text-gray-900 dark:text-gray-100">
                  {profile.full_name || 'Student'}
                </h1>
                {(profile.degree || profile.university) && (
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-body text-gray-600 dark:text-gray-400">
                    {profile.degree && (
                      <span className="flex items-center gap-1">
                        <GraduationCap className="h-4 w-4 shrink-0" aria-hidden="true" />
                        {profile.degree}
                      </span>
                    )}
                    {profile.university && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                        {profile.university}
                      </span>
                    )}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  {profile.department && (
                    <Badge color="primary" dot>{profile.department}</Badge>
                  )}
                  {profile.semester && (
                    <Badge color="default">Semester {profile.semester}</Badge>
                  )}
                  {profile.learning_style && (
                    <Badge color="secondary">
                      <Brain className="h-3 w-3 mr-1" aria-hidden="true" />
                      {STYLE_LABELS[profile.learning_style]}
                    </Badge>
                  )}
                </div>
              </div>
              {isOwnProfile && (
                <Link to="/settings">
                  <Button variant="secondary" size="sm" leftIcon={<Edit2 className="h-3.5 w-3.5" />}>
                    Edit profile
                  </Button>
                </Link>
              )}
              {!isOwnProfile && (
                <ReportButton contentType="profile" contentId={targetUserId} />
              )}
            </div>
            {profile.bio && (
              <p className="mt-3 text-body text-gray-600 dark:text-gray-400">{profile.bio}</p>
            )}
          </div>
        </div>
      </Card>

      {/* ── Body grid ────────────────────────────────────────── */}
      <div className="grid gap-6 md:grid-cols-2">

        {/* Courses */}
        <Section title="Enrolled Courses">
          {coursesLoading
            ? <Skeleton.Text lines={4} />
            : courses.length === 0
            ? <p className="text-sm text-gray-400 dark:text-gray-600">No courses added yet.</p>
            : (
              <ul className="space-y-2" role="list">
                {courses.map(c => (
                  <li key={c.id} className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
                      <BookOpen className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
                      {c.name}
                    </span>
                    {c.code && (
                      <Badge color="default" size="sm">{c.code}</Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
        </Section>

        {/* Skills */}
        <Section title="Skills">
          {profile.skills?.length
            ? <div className="flex flex-wrap gap-2">
                {profile.skills.map(s => <Tag key={s} label={s} />)}
              </div>
            : <p className="text-sm text-gray-400 dark:text-gray-600">No skills listed yet.</p>
          }
        </Section>

        {/* Weak subjects */}
        {(isOwnProfile || (profile.weak_subjects?.length ?? 0) > 0) && (
          <Section title="Weak Subjects">
            {profile.weak_subjects?.length
              ? <div className="flex flex-wrap gap-2">
                  {profile.weak_subjects.map(s => <Tag key={s} label={s} color="weak" />)}
                </div>
              : <p className="text-sm text-gray-400 dark:text-gray-600">No weak subjects listed.</p>
            }
          </Section>
        )}

        {/* Interests */}
        <Section title="Interests">
          {profile.interests?.length
            ? <div className="flex flex-wrap gap-2">
                {profile.interests.map(i => <Tag key={i} label={i} />)}
              </div>
            : <p className="text-sm text-gray-400 dark:text-gray-600">No interests listed yet.</p>
          }
        </Section>

        {/* Academic Goals */}
        {profile.academic_goals?.length > 0 && (
          <Section title="Academic Goals">
            <ul className="space-y-1.5" role="list">
              {profile.academic_goals.map(g => (
                <li key={g} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <Target className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" aria-hidden="true" />
                  {g}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Availability */}
        <Section title="Availability">
          <div className="space-y-2">
            {profile.study_hours_per_day && (
              <p className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <Clock className="h-4 w-4 text-gray-400" aria-hidden="true" />
                {profile.study_hours_per_day}h per day
              </p>
            )}
            {availableDays.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {(['mon','tue','wed','thu','fri','sat','sun'] as const).map(day => (
                  <span
                    key={day}
                    className={cn(
                      'rounded-md px-2.5 py-1 text-xs font-medium capitalize',
                      availableDays.includes(day)
                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                        : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600',
                    )}
                  >
                    {DAY_LABELS[day]}
                  </span>
                ))}
              </div>
            )}
            {!profile.study_hours_per_day && availableDays.length === 0 && (
              <p className="text-sm text-gray-400 dark:text-gray-600">No availability set yet.</p>
            )}
          </div>
        </Section>
      </div>

      {/* Study stats strip — own profile only */}
      {isOwnProfile && (
        <Card muted>
          <div className="flex flex-wrap justify-around gap-6 py-2 text-center">
            <div>
              <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                {profile.skills?.length ?? 0}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Skills</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                {courses.length}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Courses</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                {profile.academic_goals?.length ?? 0}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Goals</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                {profile.semester ?? '—'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Semester</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
