import { useState } from 'react'
import { Check, X, CalendarDays, Clock } from 'lucide-react'
import { useAllLeaves, useReviewLeave } from '@/hooks/useLeaves'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { LeaveRequestWithEmployee } from '@/hooks/useLeaves'

const TYPE_LABEL: Record<string, string> = { sick: 'Лікарняний', vacation: 'Відпустка' }
const TYPE_VARIANT: Record<string, 'destructive' | 'secondary'> = { sick: 'destructive', vacation: 'secondary' }

function formatDate(date: string) {
  return new Date(date + 'T00:00:00').toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' })
}

function daysBetween(start: string, end: string) {
  return Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 86_400_000) + 1
}

export function ManagerLeavesPage() {
  const [filter, setFilter] = useState<string>('pending')
  const { data: leaves = [], isLoading } = useAllLeaves(filter === 'all' ? undefined : filter)
  const review = useReviewLeave()

  const pending  = leaves.filter(l => l.status === 'pending')
  const resolved = leaves.filter(l => l.status !== 'pending')

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">Заявки на відпустку / лікарняний</h2>
          <p className="text-muted-foreground mt-1">Розглядайте та затверджуйте заявки співробітників</p>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">На розгляді</SelectItem>
            <SelectItem value="approved">Затверджені</SelectItem>
            <SelectItem value="rejected">Відхилені</SelectItem>
            <SelectItem value="all">Всі</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />)}
        </div>
      ) : leaves.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <CalendarDays className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">Немає заявок у цій категорії</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pending — with action buttons */}
          {filter !== 'rejected' && filter !== 'approved' && pending.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  На розгляді
                  <Badge variant="warning">{pending.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {pending.map(leave => (
                  <LeaveCard key={leave.id} leave={leave} onReview={review.mutate} isPending={review.isPending} />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Resolved history */}
          {(filter === 'all' || filter === 'approved' || filter === 'rejected') && resolved.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Історія</CardTitle>
                <CardDescription>{resolved.length} заявок</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {resolved.map(leave => (
                  <LeaveCard key={leave.id} leave={leave} readonly />
                ))}
              </CardContent>
            </Card>
          )}

          {/* When filter=approved/rejected show all */}
          {(filter === 'approved' || filter === 'rejected') && (
            <div className="space-y-3">
              {leaves.map(leave => (
                <LeaveCard key={leave.id} leave={leave} readonly />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function LeaveCard({
  leave,
  onReview,
  isPending,
  readonly,
}: {
  leave: LeaveRequestWithEmployee
  onReview?: (args: { id: string; status: 'approved' | 'rejected' }) => void
  isPending?: boolean
  readonly?: boolean
}) {
  const statusConfig = {
    pending:  { label: 'На розгляді',  variant: 'warning' as const },
    approved: { label: 'Затверджено', variant: 'success' as const },
    rejected: { label: 'Відхилено',   variant: 'destructive' as const },
  }

  const sc = statusConfig[leave.status]

  return (
    <div className="flex items-center justify-between rounded-lg border px-4 py-3 gap-4">
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{leave.employee?.full_name}</span>
          <Badge variant={TYPE_VARIANT[leave.type]}>{TYPE_LABEL[leave.type]}</Badge>
          {readonly && <Badge variant={sc.variant}>{sc.label}</Badge>}
        </div>
        <p className="text-xs text-muted-foreground">
          {formatDate(leave.start_date)} – {formatDate(leave.end_date)}
          {' · '}
          {daysBetween(leave.start_date, leave.end_date)} дн.
        </p>
        {leave.reason && (
          <p className="text-xs text-muted-foreground italic">«{leave.reason}»</p>
        )}
      </div>

      {!readonly && onReview && (
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            disabled={isPending}
            onClick={() => onReview({ id: leave.id, status: 'rejected' })}
          >
            <X className="h-3.5 w-3.5" /> Відхилити
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-green-600 hover:bg-green-700"
            disabled={isPending}
            onClick={() => onReview({ id: leave.id, status: 'approved' })}
          >
            <Check className="h-3.5 w-3.5" /> Затвердити
          </Button>
        </div>
      )}
    </div>
  )
}
