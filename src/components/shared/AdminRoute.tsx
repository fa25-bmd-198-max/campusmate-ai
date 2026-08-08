import { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useProfile } from '@/hooks/useProfile'
import toast from 'react-hot-toast'
import PageLoader from './PageLoader'

/**
 * Wraps admin-only routes.
 * Redirects non-admin users to /dashboard with an access-denied toast.
 */
export default function AdminRoute() {
  const { profile, isLoading } = useProfile()

  const isAdmin = profile?.is_admin ?? false

  // Fire toast once we know the user is not an admin
  useEffect(() => {
    if (!isLoading && profile && !isAdmin) {
      toast.error('Access denied. Admin privileges required.')
    }
  }, [isLoading, profile, isAdmin])

  if (isLoading) return <PageLoader />

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
