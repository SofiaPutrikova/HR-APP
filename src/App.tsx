import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { ManagerLayout } from '@/components/layouts/ManagerLayout'
import { EmployeeLayout } from '@/components/layouts/EmployeeLayout'

// Auth pages
import { LoginPage } from '@/pages/auth/LoginPage'
import { SignupPage } from '@/pages/auth/SignupPage'

// Manager pages
import { ManagerDashboardPage } from '@/pages/manager/DashboardPage'
import { ManagerEmployeesPage } from '@/pages/manager/EmployeesPage'
import { ManagerSchedulesPage } from '@/pages/manager/SchedulesPage'
import { ManagerTasksPage } from '@/pages/manager/TasksPage'
import { ManagerLeavesPage } from '@/pages/manager/LeavesPage'
import { ManagerReportsPage } from '@/pages/manager/ReportsPage'

// Employee pages
import { EmployeeDashboardPage } from '@/pages/employee/DashboardPage'
import { EmployeeSchedulePage } from '@/pages/employee/SchedulePage'
import { EmployeeLeavesPage } from '@/pages/employee/LeavesPage'

const queryClient = new QueryClient()

function RoleRedirect() {
  const { profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!profile) return <Navigate to="/login" replace />
  return <Navigate to={profile.role === 'manager' ? '/manager/dashboard' : '/employee/dashboard'} replace />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            {/* Manager routes */}
            <Route element={<ProtectedRoute role="manager" />}>
              <Route element={<ManagerLayout />}>
                <Route path="/manager/dashboard" element={<ManagerDashboardPage />} />
                <Route path="/manager/employees" element={<ManagerEmployeesPage />} />
                <Route path="/manager/schedules" element={<ManagerSchedulesPage />} />
                <Route path="/manager/tasks" element={<ManagerTasksPage />} />
                <Route path="/manager/leaves" element={<ManagerLeavesPage />} />
                <Route path="/manager/reports" element={<ManagerReportsPage />} />
              </Route>
            </Route>

            {/* Employee routes */}
            <Route element={<ProtectedRoute role="employee" />}>
              <Route element={<EmployeeLayout />}>
                <Route path="/employee/dashboard" element={<EmployeeDashboardPage />} />
                <Route path="/employee/schedule" element={<EmployeeSchedulePage />} />
                <Route path="/employee/leaves" element={<EmployeeLeavesPage />} />
              </Route>
            </Route>

            {/* Root redirect */}
            <Route path="/" element={<RoleRedirect />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
