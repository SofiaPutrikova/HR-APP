import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Task } from '@/types/database'

export function useTodayTasks(date: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['tasks', user?.id, date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('employee_id', user!.id)
        .eq('date', date)
        .order('created_at')
      if (error) throw error
      return data as Task[]
    },
    enabled: !!user,
  })
}
