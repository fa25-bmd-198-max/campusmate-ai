import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react'
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
      .regex(/[A-Z]/,        'Must contain at least one uppercase letter')
      .regex(/[0-9]/,        'Must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path:    ['confirmPassword'],
  })

type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const { signUp } = useAuth()
  const navigate   = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm,  setShowConfirm]  = useState(false)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    const { error } = await signUp({
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

    // authService.signUp() has already signed the user out internally.
    // Navigate to login with a success banner — no session exists at this point.
    navigate('/login', {
      replace: true,
      state:   { successMessage: 'Account created successfully! Please sign in.' },
    })
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
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
          >
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

        <Button type="submit" fullWidth loading={isSubmitting} className="mt-2">
          Create account
        </Button>
      </form>

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
