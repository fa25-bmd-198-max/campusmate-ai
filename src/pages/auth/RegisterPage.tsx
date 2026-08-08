import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, Lock, User, Eye, EyeOff, CheckCircle } from 'lucide-react'
import AuthLayout from '@/components/layout/AuthLayout'
import { Button, Input } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'

// ── Validation schema ─────────────────────────────────────────
const schema = z
  .object({
    full_name:       z.string().min(2, 'Name must be at least 2 characters'),
    email:           z.string().email('Enter a valid email address'),
    password:        z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/,  'Must contain at least one uppercase letter')
      .regex(/[0-9]/,  'Must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path:    ['confirmPassword'],
  })

type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const { signUp, isAuthenticated } = useAuth()
  const navigate                     = useNavigate()
  const [showPassword,  setShowPassword]  = useState(false)
  const [showConfirm,   setShowConfirm]   = useState(false)
  const [submitted,     setSubmitted]     = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState('')

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  // Already authenticated → go to dashboard
  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  // ── Success state ─────────────────────────────────────────
  if (submitted) {
    return (
      <AuthLayout
        title="Check your inbox"
        subtitle={`We sent a verification link to ${submittedEmail}`}
      >
        <div className="flex flex-col items-center gap-5 py-2 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
            <CheckCircle className="h-8 w-8 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <p className="text-body text-gray-600 dark:text-gray-400">
              Click the link in the email to activate your account. Check your spam folder if it doesn&apos;t arrive within a minute.
            </p>
          </div>
          <Link
            to="/login"
            className="mt-2 text-sm font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400"
          >
            Back to sign in
          </Link>
        </div>
      </AuthLayout>
    )
  }

  // ── Form ──────────────────────────────────────────────────
  const onSubmit = async (data: FormData) => {
    const { error, session } = await signUp({
      email:     data.email,
      password:  data.password,
      full_name: data.full_name,
    })

    if (error) {
      if (error.message.toLowerCase().includes('already registered')) {
        setError('email', { message: 'An account with this email already exists.' })
      } else {
        setError('root', { message: error.message })
      }
      return
    }

    // If Supabase returned a session immediately (email confirmation disabled),
    // navigate straight to the app — no need to check the inbox.
    if (session) {
      navigate('/dashboard', { replace: true })
      return
    }

    // Email confirmation is enabled — ask the user to check their inbox.
    setSubmittedEmail(data.email)
    setSubmitted(true)
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start learning smarter with AI-powered tools"
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {/* Root error */}
        {errors.root && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {errors.root.message}
          </div>
        )}

        <Input
          label="Full name"
          type="text"
          autoComplete="name"
          placeholder="Alex Johnson"
          leftIcon={<User className="h-4 w-4" aria-hidden="true" />}
          error={errors.full_name?.message}
          required
          {...register('full_name')}
        />

        <Input
          label="Email address"
          type="email"
          autoComplete="email"
          placeholder="you@university.edu"
          leftIcon={<Mail className="h-4 w-4" aria-hidden="true" />}
          error={errors.email?.message}
          required
          {...register('email')}
        />

        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          placeholder="Min. 8 chars, uppercase, number, symbol"
          leftIcon={<Lock className="h-4 w-4" aria-hidden="true" />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="pointer-events-auto"
            >
              {showPassword
                ? <EyeOff className="h-4 w-4" aria-hidden="true" />
                : <Eye    className="h-4 w-4" aria-hidden="true" />}
            </button>
          }
          error={errors.password?.message}
          required
          {...register('password')}
        />

        <Input
          label="Confirm password"
          type={showConfirm ? 'text' : 'password'}
          autoComplete="new-password"
          placeholder="Re-enter your password"
          leftIcon={<Lock className="h-4 w-4" aria-hidden="true" />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowConfirm((p) => !p)}
              aria-label={showConfirm ? 'Hide password' : 'Show password'}
              className="pointer-events-auto"
            >
              {showConfirm
                ? <EyeOff className="h-4 w-4" aria-hidden="true" />
                : <Eye    className="h-4 w-4" aria-hidden="true" />}
            </button>
          }
          error={errors.confirmPassword?.message}
          required
          {...register('confirmPassword')}
        />

        <Button
          type="submit"
          fullWidth
          loading={isSubmitting}
          className="mt-2"
        >
          Create account
        </Button>
      </form>

      {/* Sign in link */}
      <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
        Already have an account?{' '}
        <Link
          to="/login"
          className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400"
        >
          Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
