-- ============================================================================
-- CareConnect – Elderly Care & Medication Management Platform
-- Migration 001: Core Schema, Relationships & Baseline Row Level Security (RLS)
-- ============================================================================
-- HOW TO RUN THIS FILE:
-- 1. Open your Supabase Dashboard -> SQL Editor -> click "+ New query"
-- 2. Copy and paste this entire file into the editor and click "Run".
-- ============================================================================

create extension if not exists "pgcrypto";

-- ============================================================================
-- 1. PATIENT PROFILES TABLE
-- Stores one medical profile per authenticated patient user (auth.users.id)
-- Real accounts use the user's registration metadata (no hardcoded fake names).
-- ============================================================================
create table if not exists public.patient_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  full_name text not null,
  preferred_name text not null,
  age integer not null default 70 check (age between 1 and 130),
  date_of_birth text default '',
  gender text default 'Not Specified',
  blood_group text default 'Unknown',
  height text default '',
  weight text default '',
  phone text default '',
  email text not null,
  address text default '',
  primary_physician text default '',
  pharmacy_name text default '',
  pharmacy_phone text default '',
  medical_conditions text[] default array[]::text[],
  allergies text[] default array[]::text[],
  emergency_notes text default '',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 2. MEDICATIONS TABLE
-- Stores the patient's daily prescribed medications
-- ============================================================================
create table if not exists public.medications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  dosage text not null,
  purpose text default 'Daily Health Support',
  scheduled_time text not null default '08:00 AM',
  period text not null default 'Morning',
  frequency text not null default 'Once Daily',
  instructions text default 'Take 1 dose with water as directed.',
  prescribed_by text default 'Primary Physician',
  pills_remaining integer not null default 30 check (pills_remaining >= 0),
  status text not null default 'Upcoming' check (
    status in ('Upcoming', 'Pending', 'Due Now', 'Unconfirmed', 'Taken', 'Missed')
  ),
  taken_at text,
  last_logged_date date,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 3. MEDICATION LOGS TABLE (Taken / Missed History + Duplicate Dose Prevention)
-- `dose_idempotency_key` prevents logging duplicate Taken/Missed records for
-- the same medication on the same calendar day (`medication_id:log_date`).
-- ============================================================================
create table if not exists public.medication_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  logged_by_user_id uuid references auth.users(id) on delete set null,
  logged_by_role text default 'patient',
  medication_id uuid references public.medications(id) on delete cascade,
  medication_name text not null,
  dosage text,
  status text not null check (status in ('Taken', 'Missed')),
  logged_time text not null,
  log_date date not null default current_date,
  dose_idempotency_key text unique,
  notes text,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 4. DOCTOR APPOINTMENTS TABLE
-- ============================================================================
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  doctor_name text not null,
  specialty text not null,
  clinic text default '',
  appointment_date text not null,
  appointment_time text not null default '10:00 AM',
  visit_type text default 'In-Person Visit',
  notes text default '',
  status text not null default 'Upcoming' check (status in ('Upcoming', 'Completed', 'Cancelled')),
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 5. FAMILY & CARETAKERS DIRECTORY TABLE
-- ============================================================================
create table if not exists public.caregivers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  relationship text not null,
  role text not null default 'Family Member',
  phone text not null,
  email text,
  availability text default 'Available Anytime',
  is_emergency_contact boolean not null default true,
  receives_missed_dose_alerts boolean not null default true,
  access_status text not null default 'active' check (access_status in ('active', 'revoked')),
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 6. ENABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES
-- ============================================================================
alter table public.patient_profiles enable row level security;
alter table public.medications enable row level security;
alter table public.medication_logs enable row level security;
alter table public.appointments enable row level security;
alter table public.caregivers enable row level security;

-- Baseline owner policies (upgraded to shared RBAC in Migration 002)
drop policy if exists "Users can view own patient profile" on public.patient_profiles;
create policy "Users can view own patient profile"
  on public.patient_profiles for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own patient profile" on public.patient_profiles;
create policy "Users can insert own patient profile"
  on public.patient_profiles for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own patient profile" on public.patient_profiles;
create policy "Users can update own patient profile"
  on public.patient_profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can view own medications" on public.medications;
create policy "Users can view own medications"
  on public.medications for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own medications" on public.medications;
create policy "Users can insert own medications"
  on public.medications for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own medications" on public.medications;
create policy "Users can update own medications"
  on public.medications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own medications" on public.medications;
create policy "Users can delete own medications"
  on public.medications for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can view own medication logs" on public.medication_logs;
create policy "Users can view own medication logs"
  on public.medication_logs for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own medication logs" on public.medication_logs;
create policy "Users can insert own medication logs"
  on public.medication_logs for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own medication logs" on public.medication_logs;
create policy "Users can delete own medication logs"
  on public.medication_logs for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can view own appointments" on public.appointments;
create policy "Users can view own appointments"
  on public.appointments for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own appointments" on public.appointments;
create policy "Users can insert own appointments"
  on public.appointments for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own appointments" on public.appointments;
create policy "Users can update own appointments"
  on public.appointments for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own appointments" on public.appointments;
create policy "Users can delete own appointments"
  on public.appointments for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can view own caregivers" on public.caregivers;
create policy "Users can view own caregivers"
  on public.caregivers for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own caregivers" on public.caregivers;
create policy "Users can insert own caregivers"
  on public.caregivers for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own caregivers" on public.caregivers;
create policy "Users can update own caregivers"
  on public.caregivers for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own caregivers" on public.caregivers;
create policy "Users can delete own caregivers"
  on public.caregivers for delete
  using (auth.uid() = user_id);
