-- ============================================================================
-- CareConnect – Phase 5: Smart Notification System, Preferences,
-- Duplicate-Email Prevention (Idempotency), Timezones & Supabase Cron
-- ============================================================================
-- HOW TO RUN THIS FILE:
-- 1. Ensure `001_careconnect_schema.sql` and `002_secure_access_and_rls.sql` are run.
-- 2. Open Supabase Dashboard -> SQL Editor -> paste this script -> click "Run".
-- ============================================================================

create extension if not exists "pgcrypto";

-- ============================================================================
-- 1. UPDATE MEDICATIONS STATUS CHECK CONSTRAINT
-- Tracks Pending, Taken, Unconfirmed (Overdue), and Missed separately!
-- CRITICAL MEDICAL RULE: Sending an email NEVER automatically marks a dose 'Missed'.
-- ============================================================================
alter table public.medications
  drop constraint if exists medications_status_check;

alter table public.medications
  add constraint medications_status_check
  check (status in ('Upcoming', 'Pending', 'Due Now', 'Unconfirmed', 'Taken', 'Missed'));

-- ============================================================================
-- 2. NOTIFICATION PREFERENCES TABLE
-- Stores configurable reminder lead times, grace periods before alerting family,
-- IANA timezone (e.g. 'Asia/Kolkata', 'America/New_York'), and email toggles.
-- ============================================================================
create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  timezone text not null default 'America/New_York',
  reminder_lead_minutes integer not null default 15 check (reminder_lead_minutes between 5 and 120),
  unconfirmed_grace_minutes integer not null default 30 check (unconfirmed_grace_minutes between 10 and 180),
  appointment_lead_hours integer not null default 24 check (appointment_lead_hours between 1 and 72),
  enable_medication_emails boolean not null default true,
  enable_appointment_emails boolean not null default true,
  enable_caregiver_overdue_alerts boolean not null default true,
  quiet_hours_start text default '22:00',
  quiet_hours_end text default '07:00',
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

drop policy if exists "Users manage own notification preferences" on public.notification_preferences;
create policy "Users manage own notification preferences"
  on public.notification_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================================
-- 3. NOTIFICATION DISPATCHES TABLE (History & Duplicate-Email Prevention)
-- `idempotency_key` has a UNIQUE constraint so the exact same reminder or
-- overdue alert can NEVER be emailed twice for the same dose/date/recipient!
-- ============================================================================
create table if not exists public.notification_dispatches (
  id uuid primary key default gen_random_uuid(),
  patient_user_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key text not null unique,
  notification_type text not null check (
    notification_type in (
      'MEDICATION_REMINDER',
      'UNCONFIRMED_DOSE_CAREGIVER_ALERT',
      'APPOINTMENT_REMINDER'
    )
  ),
  recipient_email text not null,
  recipient_name text not null,
  recipient_role text not null check (recipient_role in ('patient', 'family_member', 'caretaker')),
  subject text not null,
  body_preview text not null,
  safety_disclaimer text not null default 'Medical Safety Notice: Never double a dose or change a medication schedule to make up for a late or unconfirmed dose. Always consult the prescribing physician.',
  dose_state_at_send text, -- 'Pending' or 'Unconfirmed' (never auto-marked 'Missed'!)
  timezone_used text not null default 'America/New_York',
  delivery_provider text not null default 'resend',
  provider_message_id text,
  delivery_status text not null default 'sent' check (delivery_status in ('sent', 'skipped_duplicate', 'blocked_revoked', 'failed')),
  created_at timestamptz not null default now()
);

alter table public.notification_dispatches enable row level security;

drop policy if exists "Authorized users can view notification history" on public.notification_dispatches;
create policy "Authorized users can view notification history"
  on public.notification_dispatches for select
  using (public.has_patient_access(patient_user_id, array['family_member', 'caretaker']));

drop policy if exists "Patient can insert notification dispatches" on public.notification_dispatches;
create policy "Patient can insert notification dispatches"
  on public.notification_dispatches for insert
  with check (auth.uid() = patient_user_id);

-- ============================================================================
-- 4. SUPABASE CRON SCHEDULE (`pg_cron` + `pg_net`)
-- Automatically triggers the `smart-notifications` Edge Function every 5 minutes.
-- Note: Replace <YOUR_PROJECT_REF> and <YOUR_SERVICE_ROLE_KEY_IN_VAULT> when
-- enabling in your live Supabase project dashboard.
-- ============================================================================
-- Uncomment the block below in Supabase SQL Editor after enabling `pg_cron` and `pg_net` extensions:
/*
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'careconnect-smart-notifications-every-5m',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/smart-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object('source', 'supabase_cron', 'triggered_at', now())
  );
  $$
);
*/

-- Verification query
select tablename, rowsecurity as rls_enabled
from pg_tables
where schemaname = 'public'
  and tablename in ('notification_preferences', 'notification_dispatches');

