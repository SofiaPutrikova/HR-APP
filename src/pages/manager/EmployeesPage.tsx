import { useState } from 'react'
import { UserCog, Shield, User, Clock, Ban } from 'lucide-react'
import { useEmployees, useUpdateRole, useUpdateStatus } from '@/hooks/useEmployees'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Profile, Role } from '@/types/database'

export function ManagerEmployeesPage() {
  const { profile: currentUser } = useAuth()
  const { data: employees = [], isLoading } = useEmployees()
  const updateRole = useUpdateRole()
  const updateStatus = useUpdateStatus()

  const [selected, setSelected] = useState<Profile | null>(null)
  const [newRole, setNewRole] = useState<Role>('employee')

  function openDialog(emp: Profile) {
    setSelected(emp)
    setNewRole(emp.role)
  }

  async function handleSave() {
    if (!selected) return
    await updateRole.mutateAsync({ id: selected.id, role: newRole })
    setSelected(null)
  }

  const pending  = employees.filter(e => e.status === 'pending')
  const managers = employees.filter(e => e.role === 'manager' && e.status !== 'pending')
  const workers  = employees.filter(e => e.role === 'employee' && e.status !== 'pending')

  return (
    <div className="p-8 space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Співробітники</h2>
        <p className="text-muted-foreground mt-1">Управління обліковими записами та ролями</p>
      </div>

      {pending.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              <span className="text-amber-700 dark:text-amber-500">Очікують підтвердження</span>
              <Badge variant="warning" className="ml-1">{pending.length}</Badge>
            </CardTitle>
            <CardDescription>Нові користувачі, що зареєструвалися та очікують схвалення</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-amber-100/50 dark:bg-amber-950/30">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Ім'я</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Email</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Реєстрація</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {pending.map(emp => (
                  <tr key={emp.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{emp.full_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{emp.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(emp.created_at).toLocaleDateString('uk-UA')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          onClick={() => updateStatus.mutate({ id: emp.id, status: 'active' })}
                          disabled={updateStatus.isPending}
                        >
                          Підтвердити
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                          onClick={() => updateStatus.mutate({ id: emp.id, status: 'blocked' })}
                          disabled={updateStatus.isPending}
                        >
                          <Ban className="h-3.5 w-3.5 mr-1" />
                          Відхилити
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {managers.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" /> Менеджери
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <EmployeeTable employees={managers} currentUserId={currentUser?.id} onEdit={openDialog} onStatusChange={(id, status) => updateStatus.mutate({ id, status })} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" /> Співробітники
          </CardTitle>
          <CardDescription>{workers.length} ос.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-12 animate-pulse rounded bg-muted" />)}
            </div>
          ) : workers.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Немає зареєстрованих співробітників</p>
          ) : (
            <EmployeeTable employees={workers} currentUserId={currentUser?.id} onEdit={openDialog} onStatusChange={(id, status) => updateStatus.mutate({ id, status })} />
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={v => !v && setSelected(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-4 w-4" /> Змінити роль
            </DialogTitle>
            <DialogDescription>{selected?.full_name} · {selected?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Select value={newRole} onValueChange={v => setNewRole(v as Role)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="employee">Співробітник</SelectItem>
                <SelectItem value="manager">Менеджер</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSelected(null)}>Скасувати</Button>
            <Button onClick={handleSave} disabled={updateRole.isPending || newRole === selected?.role}>
              {updateRole.isPending ? 'Збереження...' : 'Зберегти'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}

function EmployeeTable({ employees, currentUserId, onEdit, onStatusChange }: {
  employees: Profile[]
  currentUserId?: string
  onEdit: (emp: Profile) => void
  onStatusChange: (id: string, status: 'active' | 'blocked') => void
}) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b bg-muted/30">
          <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Ім'я</th>
          <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Email</th>
          <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Роль</th>
          <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Статус</th>
          <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Реєстрація</th>
          <th className="px-4 py-2.5" />
        </tr>
      </thead>
      <tbody>
        {employees.map(emp => (
          <tr key={emp.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
            <td className="px-4 py-3 font-medium">
              {emp.full_name}
              {emp.id === currentUserId && <span className="ml-2 text-xs text-muted-foreground">(ви)</span>}
            </td>
            <td className="px-4 py-3 text-muted-foreground">{emp.email}</td>
            <td className="px-4 py-3">
              <Badge variant={emp.role === 'manager' ? 'default' : 'secondary'}>
                {emp.role === 'manager' ? 'Менеджер' : 'Співробітник'}
              </Badge>
            </td>
            <td className="px-4 py-3">
              {emp.status === 'blocked' ? (
                <Badge variant="destructive">Заблоковано</Badge>
              ) : (
                <Badge variant="success">Активний</Badge>
              )}
            </td>
            <td className="px-4 py-3 text-muted-foreground">
              {new Date(emp.created_at).toLocaleDateString('uk-UA')}
            </td>
            <td className="px-4 py-3 text-right">
              <div className="flex items-center justify-end gap-1">
                <Button variant="ghost" size="sm" onClick={() => onEdit(emp)} disabled={emp.id === currentUserId}>
                  Змінити роль
                </Button>
                {emp.id !== currentUserId && (
                  emp.status === 'blocked' ? (
                    <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700" onClick={() => onStatusChange(emp.id, 'active')}>
                      Розблокувати
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => onStatusChange(emp.id, 'blocked')}>
                      Заблокувати
                    </Button>
                  )
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
