import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Mail, RefreshCw, CheckCircle } from 'lucide-react'
import AuthLayout from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'

export default function VerifyEmailPage() {
  const { resendVerificationEmail } = useAuth()
  const [searchParams]  = useSearchParams()
  const [resending,  setResending]  = useState(false)
  const [resent,     setResent]     = useState(false)
  const [resendError, setResendError] = useState('')

  // Supabase may pass the email as a query param after redirect
  const email = searchParams.get('email') ?? ''

  const handleResend = async () => {
    if (!email) {
      setResendError('Email address not found. Please register again or contact support.')
      return
    }
    setResending(true)
    setResendError('')
    const { error } = await resendVerificationEmail(email)
    setResending(false)
    if (error) {
      setResendError(error.message)
    } else {
      setResent(true)
    }
  }

  return (
    <AuthLayout
      title="Verify your email"
      subtitle="One more step before you can start learning"
    >
      <div className="flex flex-col items-center gap-6 py-2 text-center">
        {/* Icon */}
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30">
          <Mail className="h-8 w-8 text-primary-600 dark:text-primary-400" aria-hidden="true" />
        </div>

        {/* Message */}
        <div className="space-y-2">
          <p className="text-body text-gray-700 dark:text-gray-300">
            We sent a verification link to{' '}
            {email
              ? <strong className="font-semibold">{email}</strong>
              : 'your email address'
            }.
          </p>
          <p className="text-body text-gray-500 dark:text-gray-400">
            Click the link in the email to activate your account and start using CampusMate AI.
          </p>
          <p className="text-caption text-gray-400 dark:text-gray-600">
            Don&apos;t see it? Check your spam or junk folder.
          </p>
        </div>

        {/* Resent confirmation */}
        {resent && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400">
            <CheckCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            Verification email resent successfully.
          </div>
        )}

        {/* Resend error */}
        {resendError && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {resendError}
          </p>
        )}

        {/* Resend button */}
        {!resent && (
          <Button
            variant="secondary"
            onClick={handleResend}
            loading={resending}
            leftIcon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
          >
            Resend verification email
          </Button>
        )}

        {/* Back to login */}
        <Link
          to="/login"
          className="text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          Back to sign in
        </Link>
      </div>
    </AuthLayout>
  )
}
