import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthContext } from '@/context/AuthContext'

/**
 * Wraps all authenticated routes. Redirects unauthenticated users to /login
 * and saves the attempted path so we can redirect back after login.
 */
export default function ProtectedRoute() {
  const { session, loading } = useAuthContext()
  const location = useLocation()

  if (loading) return null

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}
