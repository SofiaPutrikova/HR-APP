import { Navigate, Outlet, useNavigate } from 'react-router-dom'
import { Clock, ShieldOff, Briefcase } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import type { Role } from '@/types/database'

interface Props {
  role: Role
}

export function ProtectedRoute({ role }: Props) {
  const { user, profile, loading } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (profile?.status === 'pending') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm text-center space-y-6">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100">
              <Clock className="h-8 w-8 text-amber-600" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-foreground">Акаунт на розгляді</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Ваш акаунт ще не активовано. Зверніться до менеджера — він має схвалити вашу реєстрацію.
            </p>
          </div>
          <div className="rounded-xl border bg-muted/30 px-4 py-3 text-left space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Зареєстровано як</p>
            <p className="text-sm font-semibold">{profile.full_name}</p>
            <p className="text-xs text-muted-foreground">{profile.email}</p>
          </div>
          <Button variant="outline" className="w-full" onClick={handleLogout}>
            Вийти
          </Button>
        </div>
        <div className="absolute bottom-6 flex items-center gap-2 text-xs text-muted-foreground">
          <Briefcase className="h-3.5 w-3.5" />
          WorkHR
        </div>
      </div>
    )
  }

  if (profile?.status === 'blocked') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm text-center space-y-6">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
              <ShieldOff className="h-8 w-8 text-destructive" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-foreground">Акаунт заблоковано</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Доступ до системи заборонено. Зверніться до менеджера для отримання додаткової інформації.
            </p>
          </div>
          <Button variant="outline" className="w-full" onClick={handleLogout}>
            Вийти
          </Button>
        </div>
        <div className="absolute bottom-6 flex items-center gap-2 text-xs text-muted-foreground">
          <Briefcase className="h-3.5 w-3.5" />
          WorkHR
        </div>
      </div>
    )
  }

  if (profile && profile.role !== role) {
    return <Navigate to={profile.role === 'manager' ? '/manager/dashboard' : '/employee/dashboard'} replace />
  }

  return <Outlet />
}
