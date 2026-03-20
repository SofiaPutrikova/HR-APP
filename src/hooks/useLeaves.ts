import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { LeaveRequest, LeaveType } from '@/types/database'

export type LeaveRequestWithEmployee = LeaveRequest & {
  employee: { full_name: string }
}

// Approved leaves overlapping a date range (used in schedule views)
export function useApprovedLeavesForWeek(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['leaves', 'approved', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('status', 'approved')
        .lte('start_date', endDate)
        .gte('end_date', startDate)
      if (error) throw error
      return data as LeaveRequest[]
    },
  })
}

// Employee: own leave history
export function useMyLeaves() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['leaves', 'mine', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('employee_id', user!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as LeaveRequest[]
    },
    enabled: !!user,
  })
}

// Manager: all leave requests with employee info
export function useAllLeaves(status?: string) {
  return useQuery({
    queryKey: ['leaves', 'all', status],
    queryFn: async () => {
      let query = supabase
        .from('leave_requests')
        .select('*, employee:profiles!employee_id(full_name)')
        .order('created_at', { ascending: false })
      if (status) query = query.eq('status', status)
      const { data, error } = await query
      if (error) throw error
      return data as LeaveRequestWithEmployee[]
    },
  })
}

// Employee: submit leave request
export function useSubmitLeave() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: {
      type: LeaveType
      start_date: string
      end_date: string
      reason: string
    }) => {
      const { data, error } = await supabase
        .from('leave_requests')
        .insert([{
          employee_id: user!.id,
          ...values,
        }])
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves', 'mine'] })
    },
  })
}

// Manager: review leave request
export function useReviewLeave() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => {
      const { data, error } = await supabase
        .from('leave_requests')
        .update({
          status,
          reviewed_by: user!.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves', 'all'] })
    },
  })
}
