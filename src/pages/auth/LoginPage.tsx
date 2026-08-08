import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import AuthLayout from '@/components/layout/AuthLayout'
import { Button, Input } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'

// ── Validation schema ─────────────────────────────────────────
const schema = z.object({
  email:    z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const { signIn, isAuthenticated } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  const [showPassword, setShowPassword] = useState(false)

  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/dashboard'

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  // Already authenticated → redirect to intended page
  if (isAuthenticated) return <Navigate to={from} replace />

  const onSubmit = async (data: FormData) => {
    const { error } = await signIn(data.email, data.password)

    if (error) {
      // Generic message — do not reveal whether email or password is wrong
      setError('root', {
        message: 'Invalid email or password. Please try again.',
      })
      return
    }

    navigate(from, { replace: true })
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to continue to CampusMate AI"
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {/* Root error */}
        {errors.root && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {errors.root.message}
          </div>
        )}

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

        <div className="space-y-1">
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="Your password"
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
          {/* Forgot password link — placed inside the form for natural tab order */}
          <div className="flex justify-end">
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <Button
          type="submit"
          fullWidth
          loading={isSubmitting}
          className="mt-2"
        >
          Sign in
        </Button>
      </form>

      {/* Register link */}
      <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
        Don&apos;t have an account?{' '}
        <Link
          to="/register"
          className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400"
        >
          Sign up for free
        </Link>
      </p>
    </AuthLayout>
  )
}
