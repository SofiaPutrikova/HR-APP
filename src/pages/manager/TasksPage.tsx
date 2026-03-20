import { useState } from 'react'
import { Plus, Trash2, Send } from 'lucide-react'
import { useEmployees } from '@/hooks/useEmployees'
import { useTasksByDate, useAddTask, useDeleteTask } from '@/hooks/useManagerTasks'
import { useApprovedLeavesForWeek } from '@/hooks/useLeaves'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

function toDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function ManagerTasksPage() {
  const { data: employees = [] } = useEmployees()
  const workers = employees.filter(e => e.role === 'employee')

  const [selectedEmployee, setSelectedEmployee] = useState<string>('')
  const [selectedDate, setSelectedDate]         = useState(toDateStr())
  const [content, setContent]                   = useState('')

  const { data: tasks = [], isLoading } = useTasksByDate(selectedEmployee, selectedDate)
  const { data: approvedLeaves = [] }   = useApprovedLeavesForWeek(selectedDate, selectedDate)
  const addTask    = useAddTask()
  const deleteTask = useDeleteTask()

  const onLeave = selectedEmployee
    ? approvedLeaves.find(l => l.employee_id === selectedEmployee && l.start_date <= selectedDate && l.end_date >= selectedDate)
    : undefined

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedEmployee || !content.trim() || onLeave) return
    await addTask.mutateAsync({ employee_id: selectedEmployee, date: selectedDate, content: content.trim() })
    setContent('')
  }

  const selectedName = workers.find(w => w.id === selectedEmployee)?.full_name

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Завдання співробітникам</h2>
        <p className="text-muted-foreground mt-1">Додавайте коментарі та завдання на конкретний день</p>
      </div>

      {/* Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Вибір співробітника та дати</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Співробітник</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="Оберіть співробітника..." />
                </SelectTrigger>
                <SelectContent>
                  {workers.map(w => (
                    <SelectItem key={w.id} value={w.id}>{w.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="taskDate">Дата</Label>
              <Input
                id="taskDate"
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tasks list + add form */}
      {selectedEmployee && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Завдання — {selectedName}
              </CardTitle>
              <Badge variant="secondary">
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' })}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {onLeave && (
              <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-700">
                {onLeave.type === 'sick' ? 'Співробітник у цей день на лікарняному.' : 'Співробітник у цей день у відпустці.'}
              </div>
            )}
            {/* Tasks */}
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2].map(i => <div key={i} className="h-10 animate-pulse rounded bg-muted" />)}
              </div>
            ) : tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">Завдань на цей день немає</p>
            ) : (
              <ul className="space-y-2">
                {tasks.map((task, i) => (
                  <li key={task.id} className="flex items-start gap-3 rounded-lg border px-4 py-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold mt-0.5">
                      {i + 1}
                    </span>
                    <p className="flex-1 text-sm leading-5">{task.content}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteTask.mutate(task.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            {/* Add form */}
            <form onSubmit={handleAdd} className="flex gap-2 pt-2 border-t">
              <Textarea
                placeholder={onLeave ? 'Недоступно — співробітник у відпустці/на лікарняному' : 'Введіть завдання або коментар...'}
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={2}
                disabled={!!onLeave}
                className="flex-1 min-h-0 resize-none"
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAdd(e) }
                }}
              />
              <Button type="submit" size="icon" className="h-full aspect-square self-end" disabled={!content.trim() || addTask.isPending || !!onLeave}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
            <p className="text-xs text-muted-foreground">Enter — надіслати · Shift+Enter — новий рядок</p>
          </CardContent>
        </Card>
      )}

      {!selectedEmployee && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Plus className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">Оберіть співробітника та дату, щоб керувати завданнями</p>
        </div>
      )}
    </div>
  )
}
