import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useWeekSchedules } from '@/hooks/useSchedules'
import { useApprovedLeavesForWeek } from '@/hooks/useLeaves'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Profile } from '@/types/database'

function getWeekDays(weekOffset: number): Date[] {
  const now = new Date()
  const day = now.getDay() === 0 ? 6 : now.getDay() - 1 // Mon=0 ... Sun=6
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

const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']

export function EmployeeSchedulePage() {
  const [weekOffset, setWeekOffset] = useState(0)
  const days = getWeekDays(weekOffset)
  const startDate = toDateStr(days[0])
  const endDate = toDateStr(days[6])

  const { data: schedules = [], isLoading } = useWeekSchedules(startDate, endDate)

  // Load all employees
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('role', 'employee')
        .eq('status', 'active')
        .order('full_name')
      if (error) throw error
      return data as Pick<Profile, 'id' | 'full_name' | 'role'>[]
    },
  })

  const { data: approvedLeaves = [] } = useApprovedLeavesForWeek(startDate, endDate)

  const weekLabel = (() => {
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
    return `${days[0].toLocaleDateString('uk-UA', opts)} – ${days[6].toLocaleDateString('uk-UA', opts)}`
  })()

  const today = toDateStr(new Date())

  function getSchedule(employeeId: string, dateStr: string) {
    return schedules.find(s => s.employee_id === employeeId && s.date === dateStr)
  }

  function getLeave(employeeId: string, dateStr: string) {
    return approvedLeaves.find(l => l.employee_id === employeeId && l.start_date <= dateStr && l.end_date >= dateStr)
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Розклад</h2>
        <p className="text-muted-foreground mt-1">Робочі графіки на тиждень</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">{weekLabel}</CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWeekOffset(w => w - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs px-3"
                onClick={() => setWeekOffset(0)}
                disabled={weekOffset === 0}
              >
                Сьогодні
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWeekOffset(w => w + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-10 animate-pulse rounded bg-muted" />)}
            </div>
          ) : employees.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Співробітників не знайдено</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground w-44 sticky left-0 bg-muted/40">
                      Співробітник
                    </th>
                    {days.map((day, i) => {
                      const dateStr = toDateStr(day)
                      const isToday = dateStr === today
                      const isWeekend = i >= 5
                      return (
                        <th
                          key={dateStr}
                          className={`text-center px-2 py-3 font-medium min-w-[110px] ${isToday ? 'text-primary' : isWeekend ? 'text-muted-foreground/60' : 'text-muted-foreground'}`}
                        >
                          <div>{DAY_NAMES[i]}</div>
                          <div className={`text-xs font-normal mt-0.5 ${isToday ? 'bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center mx-auto' : ''}`}>
                            {day.getDate()}
                          </div>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp, rowIdx) => (
                    <tr key={emp.id} className={`border-b last:border-0 ${rowIdx % 2 === 0 ? '' : 'bg-muted/20'}`}>
                      <td className={`px-4 py-3 font-medium sticky left-0 ${rowIdx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}`}>
                        {emp.full_name}
                      </td>
                      {days.map((day, i) => {
                        const dateStr = toDateStr(day)
                        const schedule = getSchedule(emp.id, dateStr)
                        const leave    = getLeave(emp.id, dateStr)
                        const isToday  = dateStr === today
                        const isWeekend = i >= 5

                        return (
                          <td key={dateStr} className={`px-2 py-3 text-center ${isToday ? 'bg-primary/5' : ''}`}>
                            {leave ? (
                              <Badge
                                variant={leave.type === 'sick' ? 'destructive' : 'secondary'}
                                className="text-xs font-normal px-2 py-0.5 whitespace-nowrap opacity-80"
                              >
                                {leave.type === 'sick' ? 'Лікарняний' : 'Відпустка'}
                              </Badge>
                            ) : schedule ? (
                              <Badge variant="secondary" className="text-xs font-normal px-2 py-0.5 whitespace-nowrap">
                                {schedule.start_time.slice(0, 5)}–{schedule.end_time.slice(0, 5)}
                              </Badge>
                            ) : (
                              <span className={`text-xs ${isWeekend ? 'text-muted-foreground/40' : 'text-muted-foreground/60'}`}>
                                {isWeekend ? 'вих' : '—'}
                              </span>
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
