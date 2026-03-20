import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Schedule, Profile } from '@/types/database'

export type ScheduleWithEmployee = Schedule & { employee: Pick<Profile, 'id' | 'full_name'> }

export function useWeekSchedules(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['schedules', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schedules')
        .select('*, employee:profiles!employee_id(id, full_name)')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date')
      if (error) throw error
      return data as ScheduleWithEmployee[]
    },
  })
}

export function useEmployeeSchedule(employeeId: string, startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['schedules', employeeId, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .eq('employee_id', employeeId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date')
      if (error) throw error
      return data as Schedule[]
    },
    enabled: !!employeeId,
  })
}
