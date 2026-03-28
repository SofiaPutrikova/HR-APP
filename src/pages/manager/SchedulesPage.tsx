import { useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useWeekSchedules } from '@/hooks/useSchedules'
import { useUpsertSchedule, useDeleteSchedule } from '@/hooks/useManagerSchedules'
import { useApprovedLeavesForWeek } from '@/hooks/useLeaves'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import type { Profile } from '@/types/database'

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

const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']
const PRESETS = [
  { label: '9–18', start: '09:00', end: '18:00' },
  { label: '8–17', start: '08:00', end: '17:00' },
  { label: '12–21', start: '12:00', end: '21:00' },
]

interface SlotDialog {
  employee: Profile
  date: string
  existing?: { start_time: string; end_time: string }
}

export function ManagerSchedulesPage() {
  const [weekOffset, setWeekOffset] = useState(0)
  const days = getWeekDays(weekOffset)
  const startDate = toDateStr(days[0])
  const endDate   = toDateStr(days[6])
  const today     = toDateStr(new Date())

  const { data: workers = [] } = useQuery({
    queryKey: ['employees', 'active', 'schedule'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'employee')
        .eq('status', 'active')
        .order('full_name')
      if (error) throw error
      return data as Profile[]
    },
  })
  const { data: schedules = [], isLoading } = useWeekSchedules(startDate, endDate)
  const { data: approvedLeaves = [] } = useApprovedLeavesForWeek(startDate, endDate)
  const upsert = useUpsertSchedule()
  const remove = useDeleteSchedule()

  function getLeave(employeeId: string, dateStr: string) {
    return approvedLeaves.find(l => l.employee_id === employeeId && l.start_date <= dateStr && l.end_date >= dateStr)
  }

  const [dialog, setDialog]         = useState<SlotDialog | null>(null)
  const [startTime, setStartTime]   = useState('09:00')
  const [endTime, setEndTime]       = useState('18:00')
  const [formError, setFormError]   = useState<string | null>(null)

  function openDialog(emp: Profile, date: string) {
    if (getLeave(emp.id, date)) return // blocked: employee is on leave
    const existing = schedules.find(s => s.employee_id === emp.id && s.date === date)
    setDialog({ employee: emp, date, existing })
    setStartTime(existing?.start_time.slice(0, 5) ?? '09:00')
    setEndTime(existing?.end_time.slice(0, 5) ?? '18:00')
    setFormError(null)
  }

  async function handleSave() {
    if (!dialog) return
    if (endTime <= startTime) { setFormError('Кінець зміни має бути пізніше початку'); return }
    await upsert.mutateAsync({
      employee_id: dialog.employee.id,
      date: dialog.date,
      start_time: startTime,
      end_time: endTime,
    })
    setDialog(null)
  }

  async function handleDelete() {
    if (!dialog) return
    await remove.mutateAsync({ employee_id: dialog.employee.id, date: dialog.date })
    setDialog(null)
  }

  const weekLabel = `${days[0].toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })} – ${days[6].toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })}`

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Робочі графіки</h2>
        <p className="text-muted-foreground mt-1">Натисніть на комірку, щоб додати або змінити зміну</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{weekLabel}</CardTitle>
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
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-10 animate-pulse rounded bg-muted" />)}
            </div>
          ) : workers.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Немає співробітників</p>
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
                      return (
                        <th
                          key={dateStr}
                          className={`text-center px-2 py-3 font-medium min-w-[120px] ${isToday ? 'text-primary' : i >= 5 ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}
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
                  {workers.map((emp, rowIdx) => (
                    <tr key={emp.id} className={`border-b last:border-0 ${rowIdx % 2 !== 0 ? 'bg-muted/20' : ''}`}>
                      <td className={`px-4 py-2 font-medium sticky left-0 ${rowIdx % 2 !== 0 ? 'bg-muted/20' : 'bg-background'}`}>
                        {emp.full_name}
                      </td>
                      {days.map((day, i) => {
                        const dateStr = toDateStr(day)
                        const sched = schedules.find(s => s.employee_id === emp.id && s.date === dateStr)
                        const leave = getLeave(emp.id, dateStr)
                        const isToday = dateStr === today
                        return (
                          <td key={dateStr} className={`px-1.5 py-2 text-center ${isToday ? 'bg-primary/5' : ''}`}>
                            {leave ? (
                              <Badge
                                variant={leave.type === 'sick' ? 'destructive' : 'secondary'}
                                className="text-xs font-normal px-2 py-0.5 w-full justify-center opacity-80"
                              >
                                {leave.type === 'sick' ? 'Лікарняний' : 'Відпустка'}
                              </Badge>
                            ) : sched ? (
                              <button onClick={() => openDialog(emp, dateStr)} className="inline-flex w-full group">
                                <Badge
                                  variant="secondary"
                                  className="text-xs font-normal px-2 py-0.5 w-full justify-center group-hover:bg-primary/10 transition-colors"
                                >
                                  {sched.start_time.slice(0, 5)}–{sched.end_time.slice(0, 5)}
                                </Badge>
                              </button>
                            ) : (
                              <button
                                onClick={() => openDialog(emp, dateStr)}
                                className={`flex items-center justify-center w-full h-7 rounded border border-dashed text-muted-foreground/40 hover:border-primary/40 hover:text-primary/60 transition-colors ${i >= 5 ? 'border-muted/30' : 'border-muted-foreground/20'}`}
                              >
                                <Plus className="h-3 w-3" />
                              </button>
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

      <Dialog open={!!dialog} onOpenChange={v => !v && setDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{dialog?.existing ? 'Змінити зміну' : 'Додати зміну'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{dialog?.employee.full_name}</span>
              {' · '}
              {dialog?.date && new Date(dialog.date + 'T00:00:00').toLocaleDateString('uk-UA', {
                weekday: 'long', day: 'numeric', month: 'long',
              })}
            </p>
            {formError && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive border border-destructive/20">
                {formError}
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Швидкий вибір</Label>
              <div className="flex gap-2">
                {PRESETS.map(p => (
                  <Button
                    key={p.label}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => { setStartTime(p.start); setEndTime(p.end) }}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="st">Початок</Label>
                <Input id="st" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="et">Кінець</Label>
                <Input id="et" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            {dialog?.existing && (
              <Button variant="destructive" size="sm" onClick={handleDelete} disabled={remove.isPending} className="mr-auto">
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Видалити
              </Button>
            )}
            <Button variant="outline" onClick={() => setDialog(null)}>Скасувати</Button>
            <Button onClick={handleSave} disabled={upsert.isPending}>
              {upsert.isPending ? 'Збереження...' : 'Зберегти'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
