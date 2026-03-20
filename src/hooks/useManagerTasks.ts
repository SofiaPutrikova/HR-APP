import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Task } from '@/types/database'

export function useTasksByDate(employeeId: string, date: string) {
  return useQuery({
    queryKey: ['tasks', 'manager', employeeId, date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('date', date)
        .order('created_at')
      if (error) throw error
      return data as Task[]
    },
    enabled: !!employeeId && !!date,
  })
}

export function useAddTask() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: { employee_id: string; date: string; content: string }) => {
      const { error } = await supabase.from('tasks').insert([{
        ...values,
        manager_id: user!.id,
      }])
      if (error) throw error
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', 'manager', vars.employee_id, vars.date] })
      queryClient.invalidateQueries({ queryKey: ['tasks', vars.employee_id] })
    },
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })
}
