-- ============================================================================
-- CareConnect – Migration 002: Shared Patient Access, Server-Verified Roles,
-- Single-Use Expiring Invitations, Immediate Revocation & Audit Logging
-- ============================================================================

create extension if not exists "pgcrypto";

-- ============================================================================
-- 1. SERVER-SIDE USER ROLES TABLE
-- Never trust frontend role values! This table is managed by server triggers
-- and security-definer RPCs only.
-- ============================================================================
create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'patient' check (role in ('patient', 'family_member', 'caretaker')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_roles enable row level security;

drop policy if exists "Users can read own role" on public.user_roles;
create policy "Users can read own role"
  on public.user_roles for select
  using (auth.uid() = user_id);

-- Automatically provision a real patient_profile and user_role when a new user signs up
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_full_name text;
  v_preferred text;
  v_phone text;
begin
  v_full_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1));
  v_preferred := split_part(v_full_name, ' ', 1);
  v_phone := coalesce(new.raw_user_meta_data ->> 'phone', '');

  -- Every newly registered account starts with 'patient' role until they redeem a family/caretaker invite
  -- (Prevents frontend self-escalation to caretaker on signup)
  insert into public.user_roles (user_id, role)
  values (new.id, 'patient')
  on conflict (user_id) do nothing;

  insert into public.patient_profiles (
    user_id,
    full_name,
    preferred_name,
    email,
    phone
  ) values (
    new.id,
    v_full_name,
    v_preferred,
    new.email,
    v_phone
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ============================================================================
-- 2. CARE INVITATIONS TABLE (Single-Use, Expiring, SHA-256 Hashed Codes)
-- ============================================================================
create table if not exists public.care_invitations (
  id uuid primary key default gen_random_uuid(),
  patient_user_id uuid not null references auth.users(id) on delete cascade,
  invited_email text not null,
  invited_name text not null,
  relationship text not null default 'Family Member',
  assigned_role text not null check (assigned_role in ('family_member', 'caretaker')),
  code_hash text not null unique,
  code_preview text not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  used_at timestamptz,
  accepted_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.care_invitations enable row level security;

drop policy if exists "Patients manage own invitations" on public.care_invitations;
create policy "Patients manage own invitations"
  on public.care_invitations for all
  using (auth.uid() = patient_user_id)
  with check (auth.uid() = patient_user_id);

-- ============================================================================
-- 3. PATIENT ACCESS GRANTS TABLE (Active & Revocable Shared Patient Access)
-- ============================================================================
create table if not exists public.patient_access_grants (
  id uuid primary key default gen_random_uuid(),
  patient_user_id uuid not null references auth.users(id) on delete cascade,
  grantee_user_id uuid references auth.users(id) on delete cascade,
  grantee_email text not null,
  grantee_name text not null,
  relationship text not null default 'Family Member',
  granted_role text not null check (granted_role in ('family_member', 'caretaker')),
  status text not null default 'active' check (status in ('active', 'revoked')),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (patient_user_id, grantee_email)
);

alter table public.patient_access_grants enable row level security;

drop policy if exists "Patients and active grantees can view access grants" on public.patient_access_grants;
create policy "Patients and active grantees can view access grants"
  on public.patient_access_grants for select
  using (
    auth.uid() = patient_user_id
    or (auth.uid() = grantee_user_id and status = 'active' and revoked_at is null)
  );

drop policy if exists "Only patient can modify access grants" on public.patient_access_grants;
create policy "Only patient can modify access grants"
  on public.patient_access_grants for all
  using (auth.uid() = patient_user_id)
  with check (auth.uid() = patient_user_id);

-- ============================================================================
-- 4. SECURITY AUDIT LOGS TABLE (Immutable Server-Side Security Trail)
-- ============================================================================
create table if not exists public.security_audit_logs (
  id uuid primary key default gen_random_uuid(),
  patient_user_id uuid not null references auth.users(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_email text,
  actor_role text,
  event_type text not null,
  severity text not null default 'info' check (severity in ('info', 'warning', 'critical')),
  description text not null,
  created_at timestamptz not null default now()
);

alter table public.security_audit_logs enable row level security;

drop policy if exists "Patients can view own security audit logs" on public.security_audit_logs;
create policy "Patients can view own security audit logs"
  on public.security_audit_logs for select
  using (auth.uid() = patient_user_id);

drop policy if exists "Authenticated users can append audit logs" on public.security_audit_logs;
create policy "Authenticated users can append audit logs"
  on public.security_audit_logs for insert
  with check (auth.uid() = patient_user_id or auth.uid() = actor_user_id);

-- ============================================================================
-- 5. SERVER-SIDE PERMISSION VERIFICATION FUNCTIONS
-- ============================================================================
create or replace function public.has_patient_access(
  target_patient_id uuid,
  allowed_roles text[] default array['family_member', 'caretaker']
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    (auth.uid() = target_patient_id)
    or exists (
      select 1
      from public.patient_access_grants g
      where g.patient_user_id = target_patient_id
        and g.grantee_user_id = auth.uid()
        and g.status = 'active'
        and g.revoked_at is null
        and g.granted_role = any(allowed_roles)
    );
$$;

-- Returns the verified patient_user_id and server-enforced role for the logged-in user.
-- If a family_member or caretaker has an active grant, returns that patient's ID and the granted role.
create or replace function public.get_verified_patient_context(
  p_requested_patient_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_grant record;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  -- If the user requested a specific patient ID they have an active grant for:
  if p_requested_patient_id is not null and p_requested_patient_id <> auth.uid() then
    select * into v_grant
    from public.patient_access_grants
    where patient_user_id = p_requested_patient_id
      and grantee_user_id = auth.uid()
      and status = 'active'
      and revoked_at is null
    limit 1;

    if not found then
      raise exception 'ACCESS_DENIED: You do not have an active, unrevoked access grant for this patient.';
    end if;

    return jsonb_build_object(
      'patient_user_id', v_grant.patient_user_id,
      'verified_role', v_grant.granted_role,
      'is_shared_access', true,
      'grant_id', v_grant.id
    );
  end if;

  -- Otherwise check if the user holds an active grant as a family member / caretaker
  select * into v_grant
  from public.patient_access_grants
  where grantee_user_id = auth.uid()
    and status = 'active'
    and revoked_at is null
  order by granted_at desc
  limit 1;

  if found then
    return jsonb_build_object(
      'patient_user_id', v_grant.patient_user_id,
      'verified_role', v_grant.granted_role,
      'is_shared_access', true,
      'grant_id', v_grant.id
    );
  end if;

  -- Default: User is accessing their own patient record as 'patient'
  return jsonb_build_object(
    'patient_user_id', auth.uid(),
    'verified_role', 'patient',
    'is_shared_access', false,
    'grant_id', null
  );
end;
$$;

-- ============================================================================
-- 6. SHARED ACCESS ROW LEVEL SECURITY (RLS) POLICIES ACROSS ALL DATA TABLES
-- ============================================================================

-- Patient Profiles: Patient, Family Member, and Caretaker can view; ONLY Patient can update
drop policy if exists "Users can view own patient profile" on public.patient_profiles;
drop policy if exists "Authorized roles can view patient profile" on public.patient_profiles;
create policy "Authorized roles can view patient profile"
  on public.patient_profiles for select
  using (public.has_patient_access(user_id, array['family_member', 'caretaker']));

-- Medications:
-- SELECT: Patient, Family Member, Caretaker
-- INSERT: Patient, Caretaker
-- UPDATE: Patient, Family Member (status check-in), Caretaker
-- DELETE: Patient ONLY
drop policy if exists "Users can view own medications" on public.medications;
drop policy if exists "Authorized roles can view medications" on public.medications;
create policy "Authorized roles can view medications"
  on public.medications for select
  using (public.has_patient_access(user_id, array['family_member', 'caretaker']));

drop policy if exists "Users can insert own medications" on public.medications;
drop policy if exists "Patient and caretaker can insert medications" on public.medications;
create policy "Patient and caretaker can insert medications"
  on public.medications for insert
  with check (public.has_patient_access(user_id, array['caretaker']));

drop policy if exists "Users can update own medications" on public.medications;
drop policy if exists "Patient, family, and caretaker can update medication status" on public.medications;
create policy "Patient, family, and caretaker can update medication status"
  on public.medications for update
  using (public.has_patient_access(user_id, array['family_member', 'caretaker']))
  with check (public.has_patient_access(user_id, array['family_member', 'caretaker']));

drop policy if exists "Users can delete own medications" on public.medications;
drop policy if exists "Only patient can delete medications" on public.medications;
create policy "Only patient can delete medications"
  on public.medications for delete
  using (auth.uid() = user_id);

-- Medication Logs:
drop policy if exists "Users can view own medication logs" on public.medication_logs;
drop policy if exists "Authorized roles can view medication logs" on public.medication_logs;
create policy "Authorized roles can view medication logs"
  on public.medication_logs for select
  using (public.has_patient_access(user_id, array['family_member', 'caretaker']));

drop policy if exists "Users can insert own medication logs" on public.medication_logs;
drop policy if exists "Authorized roles can insert medication logs" on public.medication_logs;
create policy "Authorized roles can insert medication logs"
  on public.medication_logs for insert
  with check (public.has_patient_access(user_id, array['family_member', 'caretaker']));

-- Appointments:
drop policy if exists "Users can view own appointments" on public.appointments;
drop policy if exists "Authorized roles can view appointments" on public.appointments;
create policy "Authorized roles can view appointments"
  on public.appointments for select
  using (public.has_patient_access(user_id, array['family_member', 'caretaker']));

drop policy if exists "Users can insert own appointments" on public.appointments;
drop policy if exists "Patient and caretaker can insert appointments" on public.appointments;
create policy "Patient and caretaker can insert appointments"
  on public.appointments for insert
  with check (public.has_patient_access(user_id, array['caretaker']));

drop policy if exists "Users can update own appointments" on public.appointments;
drop policy if exists "Patient and caretaker can update appointments" on public.appointments;
create policy "Patient and caretaker can update appointments"
  on public.appointments for update
  using (public.has_patient_access(user_id, array['caretaker']))
  with check (public.has_patient_access(user_id, array['caretaker']));

drop policy if exists "Users can delete own appointments" on public.appointments;
create policy "Only patient can delete appointments"
  on public.appointments for delete
  using (auth.uid() = user_id);

-- Caregivers Directory:
drop policy if exists "Users can view own caregivers" on public.caregivers;
drop policy if exists "Authorized roles can view caregivers" on public.caregivers;
create policy "Authorized roles can view caregivers"
  on public.caregivers for select
  using (public.has_patient_access(user_id, array['family_member', 'caretaker']));

drop policy if exists "Users can insert own caregivers" on public.caregivers;
create policy "Only patient can insert caregivers"
  on public.caregivers for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own caregivers" on public.caregivers;
create policy "Only patient can update caregivers"
  on public.caregivers for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own caregivers" on public.caregivers;
create policy "Only patient can delete caregivers"
  on public.caregivers for delete
  using (auth.uid() = user_id);

-- ============================================================================
-- 7. INVITATION & REVOCATION BACKEND RPCs
-- ============================================================================
create or replace function public.create_care_invitation(
  p_invited_email text,
  p_invited_name text,
  p_relationship text,
  p_assigned_role text,
  p_expires_in_hours integer default 24
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_raw_code text;
  v_code_hash text;
  v_preview text;
  v_inv_id uuid;
  v_expires timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Authentication required to create an invitation.';
  end if;

  if p_assigned_role not in ('family_member', 'caretaker') then
    raise exception 'Invalid role. Must be family_member or caretaker.';
  end if;

  v_raw_code := 'CC-' || upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 4))
                      || '-' || upper(substr(encode(gen_random_bytes(6), 'hex'), 5, 4))
                      || '-' || upper(substr(encode(gen_random_bytes(6), 'hex'), 9, 4));

  v_code_hash := encode(digest(v_raw_code, 'sha256'), 'hex');
  v_preview := substr(v_raw_code, 1, 7) || '-****';
  v_expires := now() + make_interval(hours => greatest(1, least(p_expires_in_hours, 168)));

  insert into public.care_invitations (
    patient_user_id,
    invited_email,
    invited_name,
    relationship,
    assigned_role,
    code_hash,
    code_preview,
    status,
    expires_at
  ) values (
    auth.uid(),
    lower(trim(p_invited_email)),
    trim(p_invited_name),
    trim(p_relationship),
    p_assigned_role,
    v_code_hash,
    v_preview,
    'pending',
    v_expires
  ) returning id into v_inv_id;

  insert into public.security_audit_logs (
    patient_user_id, actor_user_id, actor_email, actor_role, event_type, severity, description
  ) values (
    auth.uid(), auth.uid(), coalesce(auth.jwt() ->> 'email', 'patient'), 'patient',
    'INVITE_CREATED', 'info',
    format('Generated single-use %s invite (%s) for %s.', p_assigned_role, v_preview, lower(trim(p_invited_email)))
  );

  return jsonb_build_object(
    'invitation_id', v_inv_id,
    'invite_code', v_raw_code,
    'code_preview', v_preview,
    'invited_email', lower(trim(p_invited_email)),
    'assigned_role', p_assigned_role,
    'expires_at', v_expires
  );
end;
$$;

create or replace function public.redeem_care_invitation(
  p_invite_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clean_code text;
  v_hash text;
  v_inv record;
  v_caller_email text;
  v_grant_id uuid;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to redeem an invitation code.';
  end if;

  v_caller_email := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
  v_clean_code := upper(trim(p_invite_code));
  v_hash := encode(digest(v_clean_code, 'sha256'), 'hex');

  select * into v_inv
  from public.care_invitations
  where code_hash = v_hash
  limit 1;

  if not found then
    raise exception 'INVALID_CODE: This invitation code does not exist.';
  end if;

  if v_inv.used_at is not null or v_inv.status = 'accepted' then
    insert into public.security_audit_logs (
      patient_user_id, actor_user_id, actor_email, actor_role, event_type, severity, description
    ) values (
      v_inv.patient_user_id, auth.uid(), v_caller_email, 'unknown',
      'INVITE_REJECTED', 'warning',
      format('Blocked reuse attempt of single-use invite %s by %s.', v_inv.code_preview, v_caller_email)
    );
    raise exception 'CODE_ALREADY_USED: This single-use invitation code has already been redeemed.';
  end if;

  if v_inv.status = 'revoked' then
    raise exception 'CODE_REVOKED: This invitation was revoked by the patient.';
  end if;

  if v_inv.expires_at <= now() then
    update public.care_invitations set status = 'expired' where id = v_inv.id;
    raise exception 'CODE_EXPIRED: This invitation code expired at %.', v_inv.expires_at;
  end if;

  if v_caller_email <> lower(v_inv.invited_email) then
    insert into public.security_audit_logs (
      patient_user_id, actor_user_id, actor_email, actor_role, event_type, severity, description
    ) values (
      v_inv.patient_user_id, auth.uid(), v_caller_email, 'unknown',
      'UNAUTHORIZED_BLOCKED', 'critical',
      format('Email mismatch on invite %s: expected %s but caller was %s.',
        v_inv.code_preview, v_inv.invited_email, v_caller_email)
    );
    raise exception 'EMAIL_MISMATCH: This invite was issued specifically for %, not %.', v_inv.invited_email, v_caller_email;
  end if;

  update public.care_invitations
  set status = 'accepted',
      used_at = now(),
      accepted_by_user_id = auth.uid()
  where id = v_inv.id;

  insert into public.patient_access_grants (
    patient_user_id,
    grantee_user_id,
    grantee_email,
    grantee_name,
    relationship,
    granted_role,
    status,
    granted_at,
    revoked_at
  ) values (
    v_inv.patient_user_id,
    auth.uid(),
    v_inv.invited_email,
    v_inv.invited_name,
    v_inv.relationship,
    v_inv.assigned_role,
    'active',
    now(),
    null
  )
  on conflict (patient_user_id, grantee_email)
  do update set
    grantee_user_id = excluded.grantee_user_id,
    granted_role = excluded.granted_role,
    status = 'active',
    granted_at = now(),
    revoked_at = null
  returning id into v_grant_id;

  insert into public.user_roles (user_id, role, updated_at)
  values (auth.uid(), v_inv.assigned_role, now())
  on conflict (user_id) do update set role = excluded.role, updated_at = now();

  -- Also add/sync into the patient's caregivers list
  insert into public.caregivers (
    user_id,
    name,
    relationship,
    role,
    phone,
    email,
    availability,
    is_emergency_contact,
    receives_missed_dose_alerts,
    access_status
  ) values (
    v_inv.patient_user_id,
    v_inv.invited_name,
    v_inv.relationship,
    case when v_inv.assigned_role = 'caretaker' then 'Professional Caretaker' else 'Family Member' end,
    '(Verified via Invite)',
    v_inv.invited_email,
    'Verified Access Grant',
    true,
    true,
    'active'
  );

  insert into public.security_audit_logs (
    patient_user_id, actor_user_id, actor_email, actor_role, event_type, severity, description
  ) values (
    v_inv.patient_user_id, auth.uid(), v_caller_email, v_inv.assigned_role,
    'INVITE_ACCEPTED', 'info',
    format('%s (%s) verified invite %s and received %s access to patient %s.',
      v_inv.invited_name, v_caller_email, v_inv.code_preview, v_inv.assigned_role, v_inv.patient_user_id)
  );

  return jsonb_build_object(
    'grant_id', v_grant_id,
    'patient_user_id', v_inv.patient_user_id,
    'granted_role', v_inv.assigned_role,
    'status', 'active'
  );
end;
$$;

create or replace function public.revoke_care_access(
  p_grantee_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_grant record;
begin
  select * into v_grant
  from public.patient_access_grants
  where patient_user_id = auth.uid()
    and lower(grantee_email) = lower(trim(p_grantee_email));

  if found then
    update public.patient_access_grants
    set status = 'revoked',
        revoked_at = now()
    where id = v_grant.id;
  end if;

  update public.caregivers
  set access_status = 'revoked'
  where user_id = auth.uid()
    and lower(email) = lower(trim(p_grantee_email));

  insert into public.security_audit_logs (
    patient_user_id, actor_user_id, actor_email, actor_role, event_type, severity, description
  ) values (
    auth.uid(), auth.uid(), coalesce(auth.jwt() ->> 'email', 'patient'), 'patient',
    'ACCESS_REVOKED', 'warning',
    format('Patient revoked access for %s. Immediate RLS block active.', p_grantee_email)
  );

  return jsonb_build_object(
    'grantee_email', p_grantee_email,
    'status', 'revoked',
    'revoked_at', now()
  );
end;
$$;
