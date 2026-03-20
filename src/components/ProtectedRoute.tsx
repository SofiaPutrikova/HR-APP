import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import type { Role } from '@/types/database'

interface Props {
  role: Role
}

export function ProtectedRoute({ role }: Props) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (profile && profile.role !== role) {
    return <Navigate to={profile.role === 'manager' ? '/manager/dashboard' : '/employee/dashboard'} replace />
  }

  return <Outlet />
}
