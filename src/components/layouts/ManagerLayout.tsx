import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Users, Calendar, ClipboardList,
  FileText, BarChart3, LogOut, Briefcase,
} from 'lucide-react'

const navItems = [
  { to: '/manager/dashboard', label: 'Огляд',         icon: LayoutDashboard },
  { to: '/manager/employees', label: 'Співробітники', icon: Users },
  { to: '/manager/schedules', label: 'Графіки',       icon: Calendar },
  { to: '/manager/tasks',     label: 'Завдання',      icon: ClipboardList },
  { to: '/manager/leaves',    label: 'Заявки',        icon: FileText },
  { to: '/manager/reports',   label: 'Звіти',         icon: BarChart3 },
]

export function ManagerLayout() {
  const { profile } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const initials = profile?.full_name
    ?.split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase() ?? '?'

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col bg-slate-950 text-white shrink-0">
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500 shrink-0">
            <Briefcase className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-bold tracking-tight">WorkHR</span>
        </div>

        <div className="mx-4 border-t border-slate-800" />

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 px-3 py-4">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-indigo-500/15 text-indigo-300 ring-1 ring-inset ring-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="mx-4 border-t border-slate-800" />
        <div className="p-4">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-xs font-bold text-white">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-200">{profile?.full_name}</p>
              <p className="text-xs text-slate-500">Менеджер</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-slate-500 hover:text-slate-300 transition-colors"
              title="Выйти"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
