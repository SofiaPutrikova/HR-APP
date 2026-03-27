import { useState, useEffect } from 'react'
import { Clock, LogIn, LogOut, CalendarDays, ClipboardList, AlertCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTodayTimeEntry, useClockIn, useClockOut } from '@/hooks/useTimeEntry'
import { useTodayTasks } from '@/hooks/useTasks'
import { useWeekSchedules } from '@/hooks/useSchedules'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

function toLocalDateString(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

function calcDuration(clockIn: string, clockOut: string | null): string {
  const end = clockOut ? new Date(clockOut) : new Date()
  const diffMs = end.getTime() - new Date(clockIn).getTime()
  const hours = Math.floor(diffMs / 3_600_000)
  const minutes = Math.floor((diffMs % 3_600_000) / 60_000)
  return `${hours}ч ${minutes}м`
}

function formatLate(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} хв`
  if (m === 0) return `${h} год`
  return `${h} год ${m} хв`
}

export function EmployeeDashboardPage() {
  const { profile } = useAuth()
  const today = toLocalDateString(new Date())
  const [now, setNow] = useState(new Date())

  // Tick every minute for live duration
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const { data: entry, isLoading: entryLoading } = useTodayTimeEntry()
  const { data: tasks = [], isLoading: tasksLoading } = useTodayTasks(today)
  const { data: schedules = [] } = useWeekSchedules(today, today)

  const clockIn = useClockIn()
  const clockOut = useClockOut()

  const todaySchedule = schedules.find(s => s.employee_id === profile?.id)

  // Latenees detection
  const isLate = (() => {
    if (!todaySchedule || !entry) return false
    const [sh, sm] = todaySchedule.start_time.split(':').map(Number)
    const scheduled = new Date(entry.clock_in)
    scheduled.setHours(sh, sm, 0, 0)
    return new Date(entry.clock_in) > scheduled
  })()

  const lateMinutes = (() => {
    if (!todaySchedule || !entry || !isLate) return 0
    const [sh, sm] = todaySchedule.start_time.split(':').map(Number)
    const scheduled = new Date()
    scheduled.setHours(sh, sm, 0, 0)
    return Math.floor((new Date(entry.clock_in).getTime() - scheduled.getTime()) / 60_000)
  })()

  const dayOfWeek = new Date().toLocaleDateString('uk-UA', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="p-8 max-w-4xl space-y-8">
      {/* Header */}
      <div>
        <p className="text-sm text-muted-foreground capitalize">{dayOfWeek}</p>
        <h2 className="text-2xl font-bold mt-0.5 tracking-tight">
          Ласкаво просимо, {profile?.full_name?.split(' ')[0]}
        </h2>
      </div>

      {/* Clock In/Out card */}
      <Card className="overflow-hidden shadow-sm">
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-6 py-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Поточний час</p>
              <p className="text-5xl font-bold tracking-tight mt-2 tabular-nums">
                {now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <Clock className="h-14 w-14 text-indigo-400 opacity-40" />
          </div>
        </div>

        <CardContent className="pt-5 pb-5">
          {entryLoading ? (
            <div className="h-10 animate-pulse rounded-xl bg-muted" />
          ) : !entry ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground">Робочий день не розпочато</p>
                {todaySchedule && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    За графіком: {todaySchedule.start_time.slice(0, 5)} – {todaySchedule.end_time.slice(0, 5)}
                  </p>
                )}
              </div>
              <Button
                size="lg"
                className="gap-2 font-semibold"
                onClick={() => clockIn.mutate()}
                disabled={clockIn.isPending}
              >
                <LogIn className="h-4 w-4" />
                {clockIn.isPending ? 'Фіксація...' : 'Розпочати роботу'}
              </Button>
            </div>
          ) : !entry.clock_out ? (
            <div className="flex items-center justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <p className="font-semibold text-green-700">На роботі</p>
                  {isLate && (
                    <Badge variant="warning" className="text-xs">
                      Запізнення {formatLate(lateMinutes)}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Початок: {formatTime(entry.clock_in)} · Тривалість: {calcDuration(entry.clock_in, null)}
                </p>
              </div>
              <Button
                size="lg"
                variant="outline"
                className="gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 font-semibold"
                onClick={() => clockOut.mutate(entry.id)}
                disabled={clockOut.isPending}
              >
                <LogOut className="h-4 w-4" />
                {clockOut.isPending ? 'Фіксація...' : 'Завершити роботу'}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-slate-600">Робочий день завершено</p>
                  {isLate && (
                    <Badge variant="warning" className="text-xs">
                      Запізнення {formatLate(lateMinutes)}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatTime(entry.clock_in)} – {formatTime(entry.clock_out)} · Разом: {calcDuration(entry.clock_in, entry.clock_out)}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Today's schedule */}
        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Графік на сьогодні
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!todaySchedule ? (
              <p className="text-sm text-muted-foreground">Вихідний день — зміни немає</p>
            ) : (
              <div className="space-y-3">
                {[
                  { label: 'Початок', value: todaySchedule.start_time.slice(0, 5) },
                  { label: 'Кінець', value: todaySchedule.end_time.slice(0, 5) },
                  { label: 'Разом', value: (() => {
                      const [sh, sm] = todaySchedule.start_time.split(':').map(Number)
                      const [eh, em] = todaySchedule.end_time.split(':').map(Number)
                      const diff = (eh * 60 + em) - (sh * 60 + sm)
                      return `${Math.floor(diff / 60)}ч ${diff % 60 > 0 ? ` ${diff % 60}м` : ''}`
                    })()
                  },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{label}</span>
                    <span className="text-sm font-semibold tabular-nums">{value}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tasks */}
        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Завдання на сьогодні
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tasksLoading ? (
              <div className="space-y-2">
                {[1, 2].map(i => <div key={i} className="h-4 animate-pulse rounded bg-muted" />)}
              </div>
            ) : tasks.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                Завдань на сьогодні немає
              </div>
            ) : (
              <ul className="space-y-3">
                {tasks.map((task, i) => (
                  <li key={task.id} className="flex gap-3 text-sm">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold">
                      {i + 1}
                    </span>
                    <span className="text-foreground leading-5">{task.content}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
