import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { TimeEntry } from '@/types/database'

export type TimeEntryWithEmployee = TimeEntry & { employee: { full_name: string } }

export function useTimeEntriesForWeek(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['time_entries', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*, employee:profiles!employee_id(full_name)')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date')
      if (error) throw error
      return data as TimeEntryWithEmployee[]
    },
  })
}

export function useAdjustTimeEntry() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: {
      id: string
      clock_in: string
      clock_out: string | null
      note: string
    }) => {
      const { error } = await supabase
        .from('time_entries')
        .update({
          clock_in: values.clock_in,
          clock_out: values.clock_out,
          note: values.note,
          adjusted_by: user!.id,
        })
        .eq('id', values.id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['time_entries'] }),
  })
}
