import { useState } from 'react'
import { UserCog, Shield, User } from 'lucide-react'
import { useEmployees, useUpdateRole } from '@/hooks/useEmployees'
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

  const managers = employees.filter(e => e.role === 'manager')
  const workers  = employees.filter(e => e.role === 'employee')

  return (
    <div className="p-8 space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Сотрудники</h2>
        <p className="text-muted-foreground mt-1">Управление учётными записями и ролями</p>
      </div>

      {managers.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" /> Менеджеры
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <EmployeeTable employees={managers} currentUserId={currentUser?.id} onEdit={openDialog} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" /> Сотрудники
          </CardTitle>
          <CardDescription>{workers.length} чел.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-12 animate-pulse rounded bg-muted" />)}
            </div>
          ) : workers.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Нет зарегистрированных сотрудников</p>
          ) : (
            <EmployeeTable employees={workers} currentUserId={currentUser?.id} onEdit={openDialog} />
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={v => !v && setSelected(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-4 w-4" /> Изменить роль
            </DialogTitle>
            <DialogDescription>{selected?.full_name} · {selected?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Select value={newRole} onValueChange={v => setNewRole(v as Role)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="employee">Сотрудник</SelectItem>
                <SelectItem value="manager">Менеджер</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSelected(null)}>Отмена</Button>
            <Button onClick={handleSave} disabled={updateRole.isPending || newRole === selected?.role}>
              {updateRole.isPending ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function EmployeeTable({ employees, currentUserId, onEdit }: {
  employees: Profile[]
  currentUserId?: string
  onEdit: (emp: Profile) => void
}) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b bg-muted/30">
          <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Имя</th>
          <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Email</th>
          <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Роль</th>
          <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Регистрация</th>
          <th className="px-4 py-2.5" />
        </tr>
      </thead>
      <tbody>
        {employees.map(emp => (
          <tr key={emp.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
            <td className="px-4 py-3 font-medium">
              {emp.full_name}
              {emp.id === currentUserId && <span className="ml-2 text-xs text-muted-foreground">(вы)</span>}
            </td>
            <td className="px-4 py-3 text-muted-foreground">{emp.email}</td>
            <td className="px-4 py-3">
              <Badge variant={emp.role === 'manager' ? 'default' : 'secondary'}>
                {emp.role === 'manager' ? 'Менеджер' : 'Сотрудник'}
              </Badge>
            </td>
            <td className="px-4 py-3 text-muted-foreground">
              {new Date(emp.created_at).toLocaleDateString('ru-RU')}
            </td>
            <td className="px-4 py-3 text-right">
              <Button variant="ghost" size="sm" onClick={() => onEdit(emp)} disabled={emp.id === currentUserId}>
                Изменить роль
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
