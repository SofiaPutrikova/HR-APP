export type Role = 'manager' | 'employee'
export type LeaveType = 'sick' | 'vacation'
export type LeaveStatus = 'pending' | 'approved' | 'rejected'
export type UserStatus = 'pending' | 'active' | 'blocked'

export interface Profile {
  id: string
  full_name: string
  email: string
  role: Role
  status: UserStatus
  created_at: string
}

export interface Schedule {
  id: string
  employee_id: string
  date: string
  start_time: string
  end_time: string
  created_by: string
}

export interface TimeEntry {
  id: string
  employee_id: string
  date: string
  clock_in: string
  clock_out: string | null
  adjusted_by: string | null
  note: string | null
}

export interface Task {
  id: string
  employee_id: string
  manager_id: string
  date: string
  content: string
  created_at: string
}

export interface LeaveRequest {
  id: string
  employee_id: string
  type: LeaveType
  start_date: string
  end_date: string
  reason: string | null
  status: LeaveStatus
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>
      }
      schedules: {
        Row: Schedule
        Insert: Omit<Schedule, 'id'>
        Update: Partial<Omit<Schedule, 'id'>>
      }
      time_entries: {
        Row: TimeEntry
        Insert: Omit<TimeEntry, 'id'>
        Update: Partial<Omit<TimeEntry, 'id'>>
      }
      tasks: {
        Row: Task
        Insert: Omit<Task, 'id' | 'created_at'>
        Update: Partial<Omit<Task, 'id' | 'created_at'>>
      }
      leave_requests: {
        Row: LeaveRequest
        Insert: Omit<LeaveRequest, 'id' | 'created_at' | 'reviewed_by' | 'reviewed_at' | 'status'>
        Update: Partial<Omit<LeaveRequest, 'id' | 'created_at'>>
      }
    }
  }
}
