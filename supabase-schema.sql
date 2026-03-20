-- =============================================
-- HR APP — SUPABASE SCHEMA
-- Run this in Supabase SQL Editor
-- =============================================

-- Enums
create type public.user_role as enum ('manager', 'employee');
create type public.leave_type as enum ('sick', 'vacation');
create type public.leave_status as enum ('pending', 'approved', 'rejected');

-- =============================================
-- PROFILES
-- =============================================
create table public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  full_name   text not null,
  email       text not null,
  role        public.user_role not null default 'employee',
  created_at  timestamptz not null default now()
);

-- =============================================
-- SCHEDULES
-- =============================================
create table public.schedules (
  id           uuid primary key default gen_random_uuid(),
  employee_id  uuid not null references public.profiles on delete cascade,
  date         date not null,
  start_time   time not null,
  end_time     time not null,
  created_by   uuid not null references public.profiles,
  unique (employee_id, date)
);

-- =============================================
-- TIME ENTRIES (clock in/out)
-- =============================================
create table public.time_entries (
  id           uuid primary key default gen_random_uuid(),
  employee_id  uuid not null references public.profiles on delete cascade,
  date         date not null,
  clock_in     timestamptz not null,
  clock_out    timestamptz,
  adjusted_by  uuid references public.profiles,
  note         text,
  unique (employee_id, date)
);

-- =============================================
-- TASKS (manager comments per employee per day)
-- =============================================
create table public.tasks (
  id           uuid primary key default gen_random_uuid(),
  employee_id  uuid not null references public.profiles on delete cascade,
  manager_id   uuid not null references public.profiles,
  date         date not null,
  content      text not null,
  created_at   timestamptz not null default now()
);

-- =============================================
-- LEAVE REQUESTS
-- =============================================
create table public.leave_requests (
  id           uuid primary key default gen_random_uuid(),
  employee_id  uuid not null references public.profiles on delete cascade,
  type         public.leave_type not null,
  start_date   date not null,
  end_date     date not null,
  reason       text,
  status       public.leave_status not null default 'pending',
  reviewed_by  uuid references public.profiles,
  reviewed_at  timestamptz,
  created_at   timestamptz not null default now()
);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

alter table public.profiles      enable row level security;
alter table public.schedules     enable row level security;
alter table public.time_entries  enable row level security;
alter table public.tasks         enable row level security;
alter table public.leave_requests enable row level security;

-- Helper: check if current user is manager
create or replace function public.is_manager()
returns boolean language sql security definer
as $$ select exists (
  select 1 from public.profiles where id = auth.uid() and role = 'manager'
) $$;

-- PROFILES
create policy "Users can view all profiles"       on public.profiles for select to authenticated using (true);
create policy "Users can update own profile"      on public.profiles for update to authenticated using (id = auth.uid());
create policy "Users can insert own profile"      on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "Manager can update any profile"    on public.profiles for update to authenticated using (public.is_manager());

-- SCHEDULES
create policy "Authenticated users can view schedules"  on public.schedules for select to authenticated using (true);
create policy "Manager can insert schedules"            on public.schedules for insert to authenticated with check (public.is_manager());
create policy "Manager can update schedules"            on public.schedules for update to authenticated using (public.is_manager());
create policy "Manager can delete schedules"            on public.schedules for delete to authenticated using (public.is_manager());

-- TIME ENTRIES
create policy "Employee can view own entries"     on public.time_entries for select to authenticated using (employee_id = auth.uid() or public.is_manager());
create policy "Employee can insert own entry"     on public.time_entries for insert to authenticated with check (employee_id = auth.uid());
create policy "Employee can update own entry"     on public.time_entries for update to authenticated using (employee_id = auth.uid());
create policy "Manager can update any entry"      on public.time_entries for update to authenticated using (public.is_manager());

-- TASKS
create policy "Employee can view own tasks"       on public.tasks for select to authenticated using (employee_id = auth.uid() or public.is_manager());
create policy "Manager can insert tasks"          on public.tasks for insert to authenticated with check (public.is_manager());
create policy "Manager can update tasks"          on public.tasks for update to authenticated using (public.is_manager());
create policy "Manager can delete tasks"          on public.tasks for delete to authenticated using (public.is_manager());

-- LEAVE REQUESTS
create policy "Employee can view own requests"    on public.leave_requests for select to authenticated using (employee_id = auth.uid() or public.is_manager());
create policy "Employee can insert own request"   on public.leave_requests for insert to authenticated with check (employee_id = auth.uid());
create policy "Manager can update requests"       on public.leave_requests for update to authenticated using (public.is_manager());
