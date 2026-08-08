import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react'
import AuthLayout from '@/components/layout/AuthLayout'
import { Button, Input } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/services/supabase'

// ── Validation schema ─────────────────────────────────────────
const schema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path:    ['confirmPassword'],
  })

type FormData = z.infer<typeof schema>

type PageState = 'loading' | 'ready' | 'success' | 'invalid'

export default function ResetPasswordPage() {
  const { updatePassword } = useAuth()
  const navigate            = useNavigate()
  const [pageState, setPageState] = useState<PageState>('loading')
  const [showPassword,  setShowPassword]  = useState(false)
  const [showConfirm,   setShowConfirm]   = useState(false)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  // Supabase sends the recovery token as a URL hash fragment.
  // The onAuthStateChange event fires with 'PASSWORD_RECOVERY' when valid.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPageState('ready')
      }
    })

    // If user landed here without a valid token, mark as invalid after a short wait
    const timer = setTimeout(() => {
      setPageState((s) => (s === 'loading' ? 'invalid' : s))
    }, 2500)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [])

  // ── Loading ───────────────────────────────────────────────
  if (pageState === 'loading') {
    return (
      <AuthLayout title="Verifying reset link…">
        <div className="flex justify-center py-8">
          <span className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
        </div>
      </AuthLayout>
    )
  }

  // ── Invalid / expired link ────────────────────────────────
  if (pageState === 'invalid') {
    return (
      <AuthLayout title="Link expired or invalid">
        <div className="flex flex-col items-center gap-5 py-2 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" aria-hidden="true" />
          </div>
          <p className="text-body text-gray-600 dark:text-gray-400">
            This password reset link has expired or is invalid. Reset links are only valid for 1 hour.
          </p>
          <Link
            to="/forgot-password"
            className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400"
          >
            Request a new reset link
          </Link>
        </div>
      </AuthLayout>
    )
  }

  // ── Success ───────────────────────────────────────────────
  if (pageState === 'success') {
    return (
      <AuthLayout title="Password updated">
        <div className="flex flex-col items-center gap-5 py-2 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
            <CheckCircle className="h-8 w-8 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          </div>
          <p className="text-body text-gray-600 dark:text-gray-400">
            Your password has been changed. You can now sign in with your new password.
          </p>
          <Button onClick={() => navigate('/login', { replace: true })}>
            Sign in
          </Button>
        </div>
      </AuthLayout>
    )
  }

  // ── Form ──────────────────────────────────────────────────
  const onSubmit = async (data: FormData) => {
    const { error } = await updatePassword(data.password)
    if (error) {
      setError('root', { message: error.message })
      return
    }
    setPageState('success')
  }

  return (
    <AuthLayout
      title="Set new password"
      subtitle="Choose a strong password for your account"
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {errors.root && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {errors.root.message}
          </div>
        )}

        <Input
          label="New password"
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
          label="Confirm new password"
          type={showConfirm ? 'text' : 'password'}
          autoComplete="new-password"
          placeholder="Re-enter your new password"
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

        <Button type="submit" fullWidth loading={isSubmitting} className="mt-2">
          Update password
        </Button>
      </form>
    </AuthLayout>
  )
}
