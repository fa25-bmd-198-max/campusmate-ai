import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import AuthLayout from '@/components/layout/AuthLayout'
import { Button, Input } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
})

type FormData = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const { sendPasswordResetEmail } = useAuth()
  const [sent, setSent] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (_data: FormData) => {
    // Always call the service — but always show the same success message
    // regardless of whether the email exists (prevents enumeration).
    await sendPasswordResetEmail(_data.email)
    setSent(true)
  }

  // ── Success state ─────────────────────────────────────────
  if (sent) {
    return (
      <AuthLayout
        title="Check your email"
        subtitle="If an account exists, a reset link is on its way"
      >
        <div className="flex flex-col items-center gap-5 py-2 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30">
            <CheckCircle className="h-8 w-8 text-primary-600 dark:text-primary-400" aria-hidden="true" />
          </div>
          <p className="text-body text-gray-600 dark:text-gray-400">
            The link expires in 1 hour. Check your spam folder if it doesn&apos;t arrive soon.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to sign in
          </Link>
        </div>
      </AuthLayout>
    )
  }

  // ── Form ──────────────────────────────────────────────────
  return (
    <AuthLayout
      title="Forgot password?"
      subtitle="Enter your email and we'll send you a reset link"
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
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

        <Button type="submit" fullWidth loading={isSubmitting}>
          Send reset link
        </Button>
      </form>

      <div className="mt-6 text-center">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to sign in
        </Link>
      </div>
    </AuthLayout>
  )
}
