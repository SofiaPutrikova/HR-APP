import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export function useUpsertSchedule() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: {
      employee_id: string
      date: string
      start_time: string
      end_time: string
    }) => {
      const { error } = await supabase
        .from('schedules')
        .upsert([{ ...values, created_by: user!.id }], { onConflict: 'employee_id,date' })
      if (error) throw error
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] })
      queryClient.invalidateQueries({ queryKey: ['schedules', vars.employee_id] })
    },
  })
}

export function useDeleteSchedule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ employee_id, date }: { employee_id: string; date: string }) => {
      const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('employee_id', employee_id)
        .eq('date', date)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['schedules'] }),
  })
}
