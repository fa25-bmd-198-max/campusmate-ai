import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthContext } from '@/context/AuthContext'
import AppLayout from '@/components/layout/AppLayout'
import ProtectedRoute from '@/components/shared/ProtectedRoute'
import AdminRoute from '@/components/shared/AdminRoute'
import PageLoader from '@/components/shared/PageLoader'

// ── Auth pages (no shell) ─────────────────────────────────────
const LoginPage          = lazy(() => import('@/pages/auth/LoginPage'))
const RegisterPage       = lazy(() => import('@/pages/auth/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'))
const ResetPasswordPage  = lazy(() => import('@/pages/auth/ResetPasswordPage'))

// ── App pages (inside AppLayout shell) ───────────────────────
const OnboardingPage          = lazy(() => import('@/pages/onboarding/OnboardingPage'))
const DashboardPage           = lazy(() => import('@/pages/dashboard/DashboardPage'))
const ProfilePage             = lazy(() => import('@/pages/profile/ProfilePage'))
const AssistantPage           = lazy(() => import('@/pages/assistant/AssistantPage'))
const StudyPlannerPage        = lazy(() => import('@/pages/planner/StudyPlannerPage'))
const NotesPage               = lazy(() => import('@/pages/notes/NotesPage'))
const NoteDetailPage          = lazy(() => import('@/pages/notes/NoteDetailPage'))
const FlashcardsPage          = lazy(() => import('@/pages/flashcards/FlashcardsPage'))
const FlashcardReviewPage     = lazy(() => import('@/pages/flashcards/FlashcardReviewPage'))
const QuizPage                = lazy(() => import('@/pages/quiz/QuizPage'))
const QuizAttemptPage         = lazy(() => import('@/pages/quiz/QuizAttemptPage'))
const QuizResultPage          = lazy(() => import('@/pages/quiz/QuizResultPage'))
const PartnerMatchingPage     = lazy(() => import('@/pages/matching/PartnerMatchingPage'))
const GroupsPage              = lazy(() => import('@/pages/groups/GroupsPage'))
const GroupDetailPage         = lazy(() => import('@/pages/groups/GroupDetailPage'))
const TeamsPage               = lazy(() => import('@/pages/teams/TeamsPage'))
const AssignmentAssistantPage = lazy(() => import('@/pages/assignments/AssignmentAssistantPage'))
const CalendarPage            = lazy(() => import('@/pages/calendar/CalendarPage'))
const AnalyticsPage           = lazy(() => import('@/pages/analytics/AnalyticsPage'))
const SearchPage              = lazy(() => import('@/pages/search/SearchPage'))
const SettingsPage            = lazy(() => import('@/pages/settings/SettingsPage'))
const AdminDashboardPage      = lazy(() => import('@/pages/admin/AdminDashboardPage'))

export default function AppRouter() {
  const { loading } = useAuthContext()

  // Hold on full-screen loader until auth state is known
  if (loading) return <PageLoader />

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>

          {/* ── Public / auth routes (no app shell) ────────────── */}
          <Route path="/login"           element={<LoginPage />} />
          <Route path="/register"        element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password"  element={<ResetPasswordPage />} />
          {/* /verify-email is unused (email confirmation disabled) — redirect to login */}
          <Route path="/verify-email"    element={<Navigate to="/login" replace />} />

          {/* ── Protected routes — auth check ──────────────────── */}
          <Route element={<ProtectedRoute />}>

            {/* Onboarding uses its own full-page layout */}
            <Route path="/onboarding" element={<OnboardingPage />} />

            {/* All remaining app routes share the AppLayout shell */}
            <Route element={<AppLayout />}>
              <Route path="/dashboard"  element={<DashboardPage />} />

              <Route path="/profile"         element={<ProfilePage />} />
              <Route path="/profile/:userId" element={<ProfilePage />} />

              <Route path="/assistant" element={<AssistantPage />} />
              <Route path="/planner"   element={<StudyPlannerPage />} />

              <Route path="/notes"         element={<NotesPage />} />
              <Route path="/notes/:noteId" element={<NoteDetailPage />} />

              <Route path="/flashcards"               element={<FlashcardsPage />} />
              <Route path="/flashcards/:setId/review" element={<FlashcardReviewPage />} />

              <Route path="/quiz"                     element={<QuizPage />} />
              <Route path="/quiz/:quizId/attempt"     element={<QuizAttemptPage />} />
              <Route path="/quiz/:attemptId/result"   element={<QuizResultPage />} />

              <Route path="/matching"        element={<PartnerMatchingPage />} />
              <Route path="/groups"          element={<GroupsPage />} />
              <Route path="/groups/:groupId" element={<GroupDetailPage />} />
              <Route path="/teams"           element={<TeamsPage />} />
              <Route path="/assignments"     element={<AssignmentAssistantPage />} />
              <Route path="/calendar"        element={<CalendarPage />} />
              <Route path="/analytics"       element={<AnalyticsPage />} />
              <Route path="/search"          element={<SearchPage />} />
              <Route path="/settings"        element={<SettingsPage />} />

              {/* Admin — additional role check */}
              <Route element={<AdminRoute />}>
                <Route path="/admin" element={<AdminDashboardPage />} />
              </Route>
            </Route>
          </Route>

          {/* ── Fallback ───────────────────────────────────────── */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />

        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
