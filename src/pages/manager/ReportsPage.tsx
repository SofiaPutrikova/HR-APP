import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Profile, Schedule, TimeEntry, LeaveRequest } from '@/types/database'

function getWeekDays(weekOffset: number): Date[] {
  const now = new Date()
  const day = now.getDay() === 0 ? 6 : now.getDay() - 1
  const monday = new Date(now)
  monday.setDate(now.getDate() - day + weekOffset * 7)
  monday.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function calcHours(clockIn: string, clockOut: string | null): number {
  if (!clockOut) return 0
  return (new Date(clockOut).getTime() - new Date(clockIn).getTime()) / 3_600_000
}

function formatHours(h: number): string {
  const hours = Math.floor(h)
  const mins  = Math.round((h - hours) * 60)
  return `${hours}год ${mins}хв`
}

function calcLateMinutes(clockIn: string, startTime: string): number {
  const [sh, sm] = startTime.split(':').map(Number)
  const scheduled = new Date(clockIn)
  scheduled.setHours(sh, sm, 0, 0)
  const diff = new Date(clockIn).getTime() - scheduled.getTime()
  return diff > 0 ? Math.floor(diff / 60_000) : 0
}

function formatLate(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} хв`
  if (m === 0) return `${h} год`
  return `${h} год ${m} хв`
}

interface EmployeeWeekRow {
  employee: Profile
  workedHours: number
  lateMinutes: number
  absences: number
  leaves: LeaveRequest[]
}

const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']

export function ManagerReportsPage() {
  const [weekOffset, setWeekOffset] = useState(0)
  const days = getWeekDays(weekOffset)
  const startDate = toDateStr(days[0])
  const endDate   = toDateStr(days[6])

  // Load everything in parallel
  const { data: employees = [] } = useQuery<Profile[]>({
    queryKey: ['employees', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('role', 'employee').eq('status', 'active').order('full_name')
      if (error) throw error
      return data
    },
  })

  const { data: schedules = [], isLoading: loadingSchedules } = useQuery<Schedule[]>({
    queryKey: ['schedules', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase.from('schedules').select('*').gte('date', startDate).lte('date', endDate)
      if (error) throw error
      return data
    },
  })

  const { data: entries = [], isLoading: loadingEntries } = useQuery<TimeEntry[]>({
    queryKey: ['time_entries', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase.from('time_entries').select('*').gte('date', startDate).lte('date', endDate)
      if (error) throw error
      return data
    },
  })

  const { data: leaveRequests = [] } = useQuery<LeaveRequest[]>({
    queryKey: ['leaves_report', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('status', 'approved')
        .or(`start_date.lte.${endDate},end_date.gte.${startDate}`)
      if (error) throw error
      return data
    },
  })

  const isLoading = loadingSchedules || loadingEntries

  // Build per-employee summary
  const rows: EmployeeWeekRow[] = employees.map(emp => {
    const empSchedules = schedules.filter(s => s.employee_id === emp.id)
    const empEntries   = entries.filter(e => e.employee_id === emp.id)
    const empLeaves    = leaveRequests.filter(l => l.employee_id === emp.id)

    let workedHours = 0
    let lateMinutes = 0
    let absences    = 0

    empSchedules.forEach(sched => {
      const entry   = empEntries.find(e => e.date === sched.date)
      const onLeave = empLeaves.some(l => l.start_date <= sched.date && l.end_date >= sched.date)

      if (onLeave) return

      if (!entry) {
        // Only count as absence if the day has already passed
        if (sched.date < toDateStr(new Date())) absences++
        return
      }

      workedHours += calcHours(entry.clock_in, entry.clock_out)
      lateMinutes += calcLateMinutes(entry.clock_in, sched.start_time)
    })

    return { employee: emp, workedHours, lateMinutes, absences, leaves: empLeaves }
  })

  // Week detail: per employee × per day
  const weekLabel = `${days[0].toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' })} – ${days[6].toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })}`

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">Тижневий звіт</h2>
          <p className="text-muted-foreground mt-1">{weekLabel}</p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWeekOffset(w => w - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8 px-3 text-xs" onClick={() => setWeekOffset(0)} disabled={weekOffset === 0}>
            Поточний
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWeekOffset(w => w + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Зведення по співробітниках</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{[1,2,3].map(i => <div key={i} className="h-10 animate-pulse rounded bg-muted" />)}</div>
          ) : employees.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Немає співробітників</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Співробітник</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Відпрацьовано</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Запізнень</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Прогулів</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Відпустка / Лікарняний</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const leaveDaysThisWeek = row.leaves.reduce((acc, l) => {
                    let count = 0
                    days.forEach(d => {
                      const ds = toDateStr(d)
                      if (ds >= l.start_date && ds <= l.end_date) count++
                    })
                    return acc + count
                  }, 0)

                  return (
                    <tr key={row.employee.id} className={`border-b last:border-0 ${i % 2 !== 0 ? 'bg-muted/20' : ''}`}>
                      <td className="px-4 py-3 font-medium">{row.employee.full_name}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={row.workedHours === 0 ? 'text-muted-foreground' : 'font-medium'}>
                          {row.workedHours > 0 ? formatHours(row.workedHours) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {row.lateMinutes > 0 ? (
                          <Badge variant="warning">{formatLate(row.lateMinutes)}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {row.absences > 0 ? (
                          <Badge variant="destructive">{row.absences} дн.</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {leaveDaysThisWeek > 0 ? (
                          <Badge variant="secondary">{leaveDaysThisWeek} дн.</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Detail table: employee × day */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Деталізація по днях</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{[1,2,3].map(i => <div key={i} className="h-10 animate-pulse rounded bg-muted" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground w-44 sticky left-0 bg-muted/40">Співробітник</th>
                    {days.map((day, i) => (
                      <th key={i} className="text-center px-2 py-3 font-medium text-muted-foreground min-w-[100px]">
                        <div>{DAY_NAMES[i]}</div>
                        <div className="text-xs font-normal mt-0.5">{day.getDate()}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp, rowIdx) => (
                    <tr key={emp.id} className={`border-b last:border-0 ${rowIdx % 2 !== 0 ? 'bg-muted/20' : ''}`}>
                      <td className={`px-4 py-2 font-medium sticky left-0 ${rowIdx % 2 !== 0 ? 'bg-muted/20' : 'bg-background'}`}>
                        {emp.full_name}
                      </td>
                      {days.map((day, i) => {
                        const dateStr  = toDateStr(day)
                        const entry    = entries.find(e => e.employee_id === emp.id && e.date === dateStr)
                        const sched    = schedules.find(s => s.employee_id === emp.id && s.date === dateStr)
                        const onLeave  = leaveRequests.find(l => l.employee_id === emp.id && l.start_date <= dateStr && l.end_date >= dateStr)
                        const isPast   = dateStr < toDateStr(new Date())

                        if (onLeave) {
                          return (
                            <td key={i} className="px-1 py-2 text-center">
                              <Badge variant="secondary" className="text-xs font-normal">
                                {onLeave.type === 'sick' ? 'Лікарняний' : 'Відпустка'}
                              </Badge>
                            </td>
                          )
                        }

                        if (!sched) {
                          return <td key={i} className="px-1 py-2 text-center"><span className="text-xs text-muted-foreground/40">{i >= 5 ? 'вых' : '—'}</span></td>
                        }

                        if (entry) {
                          const late = calcLateMinutes(entry.clock_in, sched.start_time)
                          const hrs  = calcHours(entry.clock_in, entry.clock_out)
                          return (
                            <td key={i} className="px-1 py-2 text-center">
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="text-xs font-medium text-green-700">
                                  {hrs > 0 ? formatHours(hrs) : 'працює'}
                                </span>
                                {late > 0 && (
                                  <span className="text-xs text-amber-600">+{formatLate(late)}</span>
                                )}
                              </div>
                            </td>
                          )
                        }

                        return (
                          <td key={i} className="px-1 py-2 text-center">
                            {isPast ? (
                              <Badge variant="destructive" className="text-xs font-normal">прогул</Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">{sched.start_time.slice(0, 5)}</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
