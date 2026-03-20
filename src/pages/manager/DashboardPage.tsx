import { useQuery } from '@tanstack/react-query'
import { Users, Clock, AlertTriangle, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

function toLocalDateString(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

export function ManagerDashboardPage() {
  const today = toLocalDateString()

  // Who clocked in today
  const { data: todayEntries = [] } = useQuery({
    queryKey: ['dashboard', 'entries', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*, employee:profiles!employee_id(full_name)')
        .eq('date', today)
      if (error) throw error
      return data as Array<{ id: string; clock_in: string; clock_out: string | null; employee: { full_name: string } }>
    },
    refetchInterval: 60_000,
  })

  // Pending leave requests
  const { data: pendingLeaves = [] } = useQuery({
    queryKey: ['dashboard', 'leaves'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*, employee:profiles!employee_id(full_name)')
        .eq('status', 'pending')
        .order('created_at')
      if (error) throw error
      return data as Array<{ id: string; type: string; start_date: string; end_date: string; employee: { full_name: string } }>
    },
  })

  // Today's schedules (to detect absences)
  const { data: todaySchedules = [] } = useQuery({
    queryKey: ['dashboard', 'schedules', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schedules')
        .select('employee_id, employee:profiles!employee_id(full_name)')
        .eq('date', today)
      if (error) throw error
      return (data ?? []) as unknown as Array<{ employee_id: string; employee: { full_name: string } }>
    },
  })

  // Total employees
  const { data: totalEmployees = 0 } = useQuery({
    queryKey: ['dashboard', 'total'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'employee')
      if (error) throw error
      return count ?? 0
    },
  })

  const workingNow = todayEntries.filter(e => !e.clock_out)

  // Absences: scheduled today but no time entry (only show after 10am)
  const absentIds = new Date().getHours() >= 10
    ? todaySchedules.filter(s => !todayEntries.find(e => e.employee?.full_name === s.employee?.full_name))
    : []

  const dayStr = new Date().toLocaleDateString('uk-UA', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="p-8 space-y-8">
      <div>
        <p className="text-sm text-muted-foreground capitalize">{dayStr}</p>
        <h2 className="text-2xl font-bold mt-0.5 tracking-tight">Огляд</h2>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="Всього співробітників"
          value={totalEmployees}
          color="blue"
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          label="Зараз на роботі"
          value={workingNow.length}
          color="green"
        />
        <StatCard
          icon={<AlertTriangle className="h-5 w-5" />}
          label="Відсутні сьогодні"
          value={absentIds.length}
          color="amber"
        />
        <StatCard
          icon={<FileText className="h-5 w-5" />}
          label="Очікують заявок"
          value={pendingLeaves.length}
          color="violet"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Working now */}
        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              Зараз на роботі
            </CardTitle>
          </CardHeader>
          <CardContent>
            {workingNow.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ніхто не працює</p>
            ) : (
              <ul className="space-y-3">
                {workingNow.map(e => {
                  const initials = e.employee?.full_name?.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase()
                  return (
                    <li key={e.id} className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700 text-xs font-bold">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{e.employee?.full_name}</p>
                        <p className="text-xs text-muted-foreground">з {formatTime(e.clock_in)}</p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Pending leaves */}
        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Заявки на розгляді
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingLeaves.length === 0 ? (
              <p className="text-sm text-muted-foreground">Немає нових заявок</p>
            ) : (
              <ul className="space-y-3">
                {pendingLeaves.slice(0, 5).map(l => (
                  <li key={l.id} className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium truncate">{l.employee?.full_name}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={l.type === 'sick' ? 'destructive' : 'secondary'} className="text-xs">
                        {l.type === 'sick' ? 'Лікарняний' : 'Відпустка'}
                      </Badge>
                      <span className="text-muted-foreground text-xs">
                        {new Date(l.start_date).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  </li>
                ))}
                {pendingLeaves.length > 5 && (
                  <p className="text-xs text-muted-foreground pt-1">+{pendingLeaves.length - 5} ещё</p>
                )}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Today finished */}
        {todayEntries.filter(e => e.clock_out).length > 0 && (
          <Card className="lg:col-span-2 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Завершили роботу сьогодні
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {todayEntries.filter(e => e.clock_out).map(e => (
                  <div key={e.id} className="flex items-center justify-between rounded-xl border bg-muted/30 px-3 py-2.5 text-sm">
                    <span className="font-medium truncate">{e.employee?.full_name}</span>
                    <span className="text-muted-foreground shrink-0 ml-2 text-xs">
                      {formatTime(e.clock_in)}–{formatTime(e.clock_out!)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

const colorMap = {
  blue:   { bg: 'bg-blue-50',   text: 'text-blue-600',   num: 'text-blue-700' },
  green:  { bg: 'bg-green-50',  text: 'text-green-600',  num: 'text-green-700' },
  amber:  { bg: 'bg-amber-50',  text: 'text-amber-600',  num: 'text-amber-700' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-600', num: 'text-violet-700' },
}

function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode
  label: string
  value: number
  color: keyof typeof colorMap
}) {
  const c = colorMap[color]
  return (
    <Card className="shadow-sm">
      <CardContent className="pt-5 pb-5">
        <div className="flex items-start justify-between">
          <div>
            <p className={`text-3xl font-bold tracking-tight ${c.num}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-1 leading-tight">{label}</p>
          </div>
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${c.bg} ${c.text} shrink-0`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
