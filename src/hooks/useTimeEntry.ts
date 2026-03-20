import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { TimeEntry } from '@/types/database'

function toLocalDateString(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function useTodayTimeEntry() {
  const { user } = useAuth()
  const today = toLocalDateString(new Date())

  return useQuery({
    queryKey: ['time_entry', user?.id, today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('employee_id', user!.id)
        .eq('date', today)
        .maybeSingle()
      if (error) throw error
      return data as TimeEntry | null
    },
    enabled: !!user,
  })
}

export function useClockIn() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const today = toLocalDateString(new Date())

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('time_entries')
        .insert([{
          employee_id: user!.id,
          date: today,
          clock_in: new Date().toISOString(),
        }])
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time_entry', user?.id, today] })
    },
  })
}

export function useClockOut() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const today = toLocalDateString(new Date())

  return useMutation({
    mutationFn: async (entryId: string) => {
      const { data, error } = await supabase
        .from('time_entries')
        .update({ clock_out: new Date().toISOString() })
        .eq('id', entryId)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time_entry', user?.id, today] })
    },
  })
}
