import { useState } from 'react'
import { CalendarDays, Plus, X } from 'lucide-react'
import { useMyLeaves, useSubmitLeave } from '@/hooks/useLeaves'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import type { LeaveType } from '@/types/database'

const STATUS_LABEL: Record<string, { label: string; variant: 'default' | 'success' | 'destructive' | 'warning' }> = {
  pending:  { label: 'На рассмотрении', variant: 'warning' },
  approved: { label: 'Одобрено',         variant: 'success' },
  rejected: { label: 'Отклонено',        variant: 'destructive' },
}

const TYPE_LABEL: Record<string, string> = {
  sick:     'Больничный',
  vacation: 'Отпуск',
}

function formatDateRange(start: string, end: string) {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }
  const s = new Date(start).toLocaleDateString('ru-RU', opts)
  const e = new Date(end).toLocaleDateString('ru-RU', opts)
  return start === end ? s : `${s} – ${e}`
}

function daysBetween(start: string, end: string) {
  const diff = new Date(end).getTime() - new Date(start).getTime()
  return Math.floor(diff / 86_400_000) + 1
}

export function EmployeeLeavesPage() {
  const { data: leaves = [], isLoading } = useMyLeaves()
  const submitLeave = useSubmitLeave()

  const [open, setOpen] = useState(false)
  const [type, setType] = useState<LeaveType>('vacation')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    if (!startDate || !endDate) {
      setFormError('Укажите даты')
      return
    }
    if (endDate < startDate) {
      setFormError('Дата окончания не может быть раньше даты начала')
      return
    }

    await submitLeave.mutateAsync({ type, start_date: startDate, end_date: endDate, reason })
    setOpen(false)
    setStartDate('')
    setEndDate('')
    setReason('')
  }

  const pending  = leaves.filter(l => l.status === 'pending')
  const resolved = leaves.filter(l => l.status !== 'pending')

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">Мои заявки</h2>
          <p className="text-muted-foreground mt-1">Больничные и отпуска</p>
        </div>
        <Button className="gap-2" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          Новая заявка
        </Button>
      </div>

      {/* Pending */}
      {pending.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">На рассмотрении</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pending.map(leave => (
              <LeaveRow key={leave.id} leave={leave} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">История заявок</CardTitle>
          <CardDescription>Все рассмотренные заявки</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <div key={i} className="h-14 animate-pulse rounded bg-muted" />)}
            </div>
          ) : resolved.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <CalendarDays className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">История заявок пуста</p>
            </div>
          ) : (
            <div className="space-y-3">
              {resolved.map(leave => (
                <LeaveRow key={leave.id} leave={leave} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Новая заявка</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            {formError && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive border border-destructive/20">
                {formError}
              </div>
            )}

            <div className="space-y-2">
              <Label>Тип</Label>
              <Select value={type} onValueChange={(v) => setType(v as LeaveType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vacation">Отпуск</SelectItem>
                  <SelectItem value="sick">Больничный</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="startDate">Дата начала</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Дата окончания</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={e => setEndDate(e.target.value)}
                  required
                />
              </div>
            </div>

            {startDate && endDate && endDate >= startDate && (
              <p className="text-sm text-muted-foreground">
                Продолжительность: <span className="font-medium text-foreground">{daysBetween(startDate, endDate)} дн.</span>
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor="reason">Причина <span className="text-muted-foreground font-normal">(необязательно)</span></Label>
              <Textarea
                id="reason"
                placeholder="Укажите причину..."
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={3}
              />
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Отмена
              </Button>
              <Button type="submit" disabled={submitLeave.isPending}>
                {submitLeave.isPending ? 'Отправка...' : 'Отправить заявку'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function LeaveRow({ leave }: { leave: import('@/types/database').LeaveRequest }) {
  const status = STATUS_LABEL[leave.status]
  return (
    <div className="flex items-center justify-between rounded-lg border px-4 py-3">
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{TYPE_LABEL[leave.type]}</span>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {formatDateRange(leave.start_date, leave.end_date)} · {daysBetween(leave.start_date, leave.end_date)} дн.
        </p>
        {leave.reason && (
          <p className="text-xs text-muted-foreground italic">«{leave.reason}»</p>
        )}
      </div>
      {leave.status === 'rejected' && (
        <X className="h-4 w-4 text-destructive shrink-0" />
      )}
    </div>
  )
}
