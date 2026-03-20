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

  const dayStr = new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="p-8 space-y-6">
      <div>
        <p className="text-sm text-muted-foreground capitalize">{dayStr}</p>
        <h2 className="text-2xl font-bold mt-0.5">Обзор</h2>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="h-5 w-5 text-blue-500" />}
          label="Всего сотрудников"
          value={totalEmployees}
          bg="bg-blue-50"
        />
        <StatCard
          icon={<Clock className="h-5 w-5 text-green-500" />}
          label="На работе сейчас"
          value={workingNow.length}
          bg="bg-green-50"
        />
        <StatCard
          icon={<AlertTriangle className="h-5 w-5 text-amber-500" />}
          label="Отсутствуют сегодня"
          value={absentIds.length}
          bg="bg-amber-50"
        />
        <StatCard
          icon={<FileText className="h-5 w-5 text-purple-500" />}
          label="Ожидают заявок"
          value={pendingLeaves.length}
          bg="bg-purple-50"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Working now */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              На работе сейчас
            </CardTitle>
          </CardHeader>
          <CardContent>
            {workingNow.length === 0 ? (
              <p className="text-sm text-muted-foreground">Никто не работает</p>
            ) : (
              <ul className="space-y-2">
                {workingNow.map(e => (
                  <li key={e.id} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{e.employee?.full_name}</span>
                    <span className="text-muted-foreground">с {formatTime(e.clock_in)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Pending leaves */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Заявки на рассмотрении</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingLeaves.length === 0 ? (
              <p className="text-sm text-muted-foreground">Нет новых заявок</p>
            ) : (
              <ul className="space-y-2">
                {pendingLeaves.slice(0, 5).map(l => (
                  <li key={l.id} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{l.employee?.full_name}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant={l.type === 'sick' ? 'destructive' : 'secondary'} className="text-xs">
                        {l.type === 'sick' ? 'Больничный' : 'Отпуск'}
                      </Badge>
                      <span className="text-muted-foreground text-xs">
                        {new Date(l.start_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  </li>
                ))}
                {pendingLeaves.length > 5 && (
                  <p className="text-xs text-muted-foreground pt-1">Ещё {pendingLeaves.length - 5}...</p>
                )}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Today finished */}
        {todayEntries.filter(e => e.clock_out).length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Завершили работу сегодня</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {todayEntries.filter(e => e.clock_out).map(e => (
                  <div key={e.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                    <span className="font-medium truncate">{e.employee?.full_name}</span>
                    <span className="text-muted-foreground shrink-0 ml-2">
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

function StatCard({ icon, label, value, bg }: { icon: React.ReactNode; label: string; value: number; bg: string }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-5">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bg} shrink-0`}>
            {icon}
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground leading-tight">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
