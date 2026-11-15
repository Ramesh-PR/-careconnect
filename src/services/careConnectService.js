import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

/**
 * Maps a database snake_case patient_profiles row to our React camelCase state object.
 */
function mapProfileFromDb(row) {
  return {
    id: row.id,
    userId: row.user_id,
    fullName: row.full_name || '',
    preferredName: row.preferred_name || row.full_name?.split(' ')[0] || 'Patient',
    age: row.age ?? 70,
    dateOfBirth: row.date_of_birth || '',
    gender: row.gender || 'Not Specified',
    bloodGroup: row.blood_group || 'Unknown',
    height: row.height || '',
    weight: row.weight || '',
    phone: row.phone || '',
    email: row.email || '',
    address: row.address || '',
    primaryPhysician: row.primary_physician || '',
    pharmacyName: row.pharmacy_name || '',
    pharmacyPhone: row.pharmacy_phone || '',
    medicalConditions: Array.isArray(row.medical_conditions)
      ? row.medical_conditions
      : [],
    allergies: Array.isArray(row.allergies) ? row.allergies : [],
    emergencyNotes: row.emergency_notes || '',
  };
}

/**
 * Maps a database medications row to our React camelCase state object.
 */
function mapMedicationFromDb(row) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    dosage: row.dosage,
    purpose: row.purpose || 'Daily Health Support',
    time: row.scheduled_time || '08:00 AM',
    period: row.period || 'Morning',
    frequency: row.frequency || 'Once Daily',
    instructions: row.instructions || '',
    prescribedBy: row.prescribed_by || 'Primary Physician',
    pillsRemaining: row.pills_remaining ?? 30,
    status: row.status || 'Upcoming',
    takenAt: row.taken_at || null,
    lastLoggedDate: row.last_logged_date || null,
  };
}

/**
 * Maps a database medication_logs row to our React camelCase state object.
 */
function mapLogFromDb(row) {
  return {
    id: row.id,
    medicationId: row.medication_id,
    medicationName: row.medication_name,
    dosage: row.dosage || '',
    status: row.status, // 'Taken' | 'Missed'
    loggedTime: row.logged_time,
    logDate: row.log_date,
    doseIdempotencyKey: row.dose_idempotency_key || null,
    notes: row.notes || '',
  };
}

/**
 * Maps a database appointments row to our React camelCase state object.
 */
function mapAppointmentFromDb(row) {
  return {
    id: row.id,
    doctorName: row.doctor_name,
    specialty: row.specialty,
    clinic: row.clinic || '',
    date: row.appointment_date,
    time: row.appointment_time || '10:00 AM',
    type: row.visit_type || 'In-Person Visit',
    notes: row.notes || '',
    status: row.status || 'Upcoming',
  };
}

/**
 * Maps a database caregivers row to our React camelCase state object.
 */
function mapCaregiverFromDb(row) {
  return {
    id: row.id,
    name: row.name,
    relationship: row.relationship,
    role: row.role || 'Family Member',
    phone: row.phone,
    email: row.email || '',
    availability: row.availability || 'Available Anytime',
    isEmergencyContact: Boolean(row.is_emergency_contact),
    receivesMissedDoseAlerts: Boolean(row.receives_missed_dose_alerts),
    accessStatus: row.access_status || 'active',
  };
}

/**
 * Resolves the verified patient_user_id and server-enforced role for the logged-in user
 * using the backend RPC `get_verified_patient_context`.
 * - If the logged-in user redeemed an invitation as a `family_member` or `caretaker`,
 *   this returns the shared patient's `patient_user_id` and the server-verified `granted_role`!
 * - If their grant was revoked, it immediately falls back or rejects unauthorized access.
 */
export async function resolveVerifiedPatientContext(
  currentUser,
  requestedPatientId = null
) {
  if (!isSupabaseConfigured || !supabase || !currentUser?.id) {
    return {
      patientUserId: currentUser?.sharedPatientId || currentUser?.id || 'local',
      verifiedRole: currentUser?.role || 'patient',
      isSharedAccess: Boolean(currentUser?.sharedPatientId),
    };
  }

  try {
    const { data, error } = await supabase.rpc('get_verified_patient_context', {
      p_requested_patient_id: requestedPatientId,
    });
    if (error) throw error;
    return {
      patientUserId: data.patient_user_id,
      verifiedRole: data.verified_role,
      isSharedAccess: Boolean(data.is_shared_access),
      grantId: data.grant_id,
    };
  } catch {
    return {
      patientUserId: currentUser.id,
      verifiedRole: 'patient',
      isSharedAccess: false,
      grantId: null,
    };
  }
}

/**
 * Fetches all CareConnect data for the verified `patientUserId`.
 * Creates a clean real profile from the user's registration info if none exists yet.
 * Never overwrites real registered users with fictional "Martha Jenkins" demo data!
 */
export async function fetchAllUserDataFromSupabase(
  currentUser,
  requestedPatientId = null
) {
  if (!isSupabaseConfigured || !supabase || !currentUser?.id) {
    return null;
  }

  // 1. Resolve verified patientUserId and server role
  const context = await resolveVerifiedPatientContext(
    currentUser,
    requestedPatientId
  );
  const targetPatientId = context.patientUserId;

  // 2. Fetch Patient Profile
  let { data: profileRow, error: profileErr } = await supabase
    .from('patient_profiles')
    .select('*')
    .eq('user_id', targetPatientId)
    .maybeSingle();

  if (profileErr) throw profileErr;

  // If the patient is accessing their own account for the first time and has no profile row yet,
  // create a real profile from their registration information (NOT fictional demo data!)
  if (!profileRow && targetPatientId === currentUser.id) {
    const fullName = currentUser.name || currentUser.email?.split('@')[0] || 'Patient';
    const preferredName = fullName.split(' ')[0];
    const { data: createdProfile, error: createErr } = await supabase
      .from('patient_profiles')
      .upsert(
        {
          user_id: currentUser.id,
          full_name: fullName,
          preferred_name: preferredName,
          email: currentUser.email || '',
          phone: currentUser.phone || '',
          age: 70,
          blood_group: 'Unknown',
          medical_conditions: [],
          allergies: [],
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (createErr) throw createErr;
    profileRow = createdProfile;
  }

  // 3. Fetch Medications, Logs, Appointments, and Caregivers for `targetPatientId`
  const [medsRes, logsRes, aptsRes, cgRes] = await Promise.all([
    supabase
      .from('medications')
      .select('*')
      .eq('user_id', targetPatientId)
      .order('created_at', { ascending: true }),
    supabase
      .from('medication_logs')
      .select('*')
      .eq('user_id', targetPatientId)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('appointments')
      .select('*')
      .eq('user_id', targetPatientId)
      .order('appointment_date', { ascending: true }),
    supabase
      .from('caregivers')
      .select('*')
      .eq('user_id', targetPatientId)
      .order('created_at', { ascending: true }),
  ]);

  if (medsRes.error) throw medsRes.error;
  if (logsRes.error) throw logsRes.error;
  if (aptsRes.error) throw aptsRes.error;
  if (cgRes.error) throw cgRes.error;

  return {
    verifiedContext: context,
    profile: profileRow
      ? mapProfileFromDb(profileRow)
      : {
          fullName: currentUser.name || 'Patient',
          preferredName: currentUser.name?.split(' ')[0] || 'Patient',
          email: currentUser.email || '',
          phone: currentUser.phone || '',
          age: 70,
          bloodGroup: 'Unknown',
          medicalConditions: [],
          allergies: [],
        },
    medications: (medsRes.data || []).map(mapMedicationFromDb),
    medicationLogs: (logsRes.data || []).map(mapLogFromDb),
    appointments: (aptsRes.data || []).map(mapAppointmentFromDb),
    caregivers: (cgRes.data || []).map(mapCaregiverFromDb),
  };
}

/**
 * Updates the patient profile in Supabase.
 */
export async function upsertPatientProfileInDb(patientUserId, profile) {
  if (!supabase || !patientUserId) return null;
  const { data, error } = await supabase
    .from('patient_profiles')
    .upsert(
      {
        user_id: patientUserId,
        full_name: profile.fullName,
        preferred_name: profile.preferredName,
        age: Number(profile.age) || 70,
        date_of_birth: profile.dateOfBirth || '',
        gender: profile.gender || 'Not Specified',
        blood_group: profile.bloodGroup || 'Unknown',
        height: profile.height || '',
        weight: profile.weight || '',
        phone: profile.phone || '',
        email: profile.email || '',
        address: profile.address || '',
        primary_physician: profile.primaryPhysician || '',
        pharmacy_name: profile.pharmacyName || '',
        pharmacy_phone: profile.pharmacyPhone || '',
        medical_conditions: Array.isArray(profile.medicalConditions)
          ? profile.medicalConditions
          : [],
        allergies: Array.isArray(profile.allergies) ? profile.allergies : [],
        emergency_notes: profile.emergencyNotes || '',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single();

  if (error) throw error;
  return mapProfileFromDb(data);
}

/**
 * Inserts a new medication into Supabase for `patientUserId`.
 */
export async function createMedicationInDb(patientUserId, med) {
  if (!supabase || !patientUserId) return null;
  const { data, error } = await supabase
    .from('medications')
    .insert({
      user_id: patientUserId,
      name: med.name,
      dosage: med.dosage,
      purpose: med.purpose,
      scheduled_time: med.time,
      period: med.period,
      frequency: med.frequency,
      instructions: med.instructions,
      prescribed_by: med.prescribedBy,
      pills_remaining: Number(med.pillsRemaining) || 30,
      status: med.status || 'Upcoming',
      taken_at: med.takenAt || null,
    })
    .select()
    .single();

  if (error) throw error;
  return mapMedicationFromDb(data);
}

/**
 * Updates a medication's status (Taken / Missed / Due Now) and records a log entry in `medication_logs`
 * with `dose_idempotency_key` (`medication_id:YYYY-MM-DD`) to prevent duplicate dose logs on the same day.
 */
export async function recordMedicationStatusInDb(
  patientUserId,
  actorUserId,
  actorRole,
  med,
  newStatus,
  loggedTime,
  newPillsRemaining,
  todayDateStr
) {
  if (!supabase || !patientUserId) return null;

  const { data: updatedMed, error: medErr } = await supabase
    .from('medications')
    .update({
      status: newStatus,
      taken_at: newStatus === 'Taken' || newStatus === 'Missed' ? loggedTime : null,
      last_logged_date:
        newStatus === 'Taken' || newStatus === 'Missed' ? todayDateStr : null,
      pills_remaining: newPillsRemaining,
    })
    .eq('id', med.id)
    .eq('user_id', patientUserId)
    .select()
    .single();

  if (medErr) throw medErr;

  let createdLog = null;
  if (newStatus === 'Taken' || newStatus === 'Missed') {
    const doseIdempotencyKey = `${med.id}:${todayDateStr}`;
    const { data: logRow, error: logErr } = await supabase
      .from('medication_logs')
      .upsert(
        {
          user_id: patientUserId,
          logged_by_user_id: actorUserId,
          logged_by_role: actorRole,
          medication_id: med.id,
          medication_name: med.name,
          dosage: med.dosage,
          status: newStatus,
          logged_time: loggedTime,
          log_date: todayDateStr,
          dose_idempotency_key: doseIdempotencyKey,
          notes:
            newStatus === 'Taken'
              ? `Confirmed taken at ${loggedTime} (${actorRole})`
              : `Marked as missed dose at ${loggedTime} (${actorRole})`,
        },
        { onConflict: 'dose_idempotency_key' }
      )
      .select()
      .single();

    if (logErr) throw logErr;
    createdLog = mapLogFromDb(logRow);
  }

  return {
    medication: mapMedicationFromDb(updatedMed),
    log: createdLog,
  };
}

/**
 * Deletes a medication from Supabase (RLS restricts this to the Patient owner only).
 */
export async function deleteMedicationFromDb(patientUserId, medId) {
  if (!supabase || !patientUserId) return;
  const { error } = await supabase
    .from('medications')
    .delete()
    .eq('id', medId)
    .eq('user_id', patientUserId);
  if (error) throw error;
}

/**
 * Updates medication details (name, dosage, purpose, time, instructions, etc.) in Supabase.
 */
export async function updateMedicationDetailsInDb(patientUserId, med) {
  if (!supabase || !patientUserId || !med?.id) return null;
  const { data, error } = await supabase
    .from('medications')
    .update({
      name: med.name,
      dosage: med.dosage,
      purpose: med.purpose,
      scheduled_time: med.time,
      period: med.period,
      frequency: med.frequency,
      instructions: med.instructions,
      prescribed_by: med.prescribedBy,
      pills_remaining: Number(med.pillsRemaining) || 0,
    })
    .eq('id', med.id)
    .eq('user_id', patientUserId)
    .select()
    .single();

  if (error) throw error;
  return mapMedicationFromDb(data);
}

/**
 * Inserts a new doctor appointment into Supabase.
 */
export async function createAppointmentInDb(patientUserId, apt) {
  if (!supabase || !patientUserId) return null;
  const { data, error } = await supabase
    .from('appointments')
    .insert({
      user_id: patientUserId,
      doctor_name: apt.doctorName,
      specialty: apt.specialty,
      clinic: apt.clinic,
      appointment_date: apt.date,
      appointment_time: apt.time,
      visit_type: apt.type || 'In-Person Visit',
      notes: apt.notes,
      status: apt.status || 'Upcoming',
    })
    .select()
    .single();

  if (error) throw error;
  return mapAppointmentFromDb(data);
}

/**
 * Updates an appointment status in Supabase.
 */
export async function updateAppointmentStatusInDb(
  patientUserId,
  aptId,
  newStatus
) {
  if (!supabase || !patientUserId) return null;
  const { data, error } = await supabase
    .from('appointments')
    .update({ status: newStatus })
    .eq('id', aptId)
    .eq('user_id', patientUserId)
    .select()
    .single();

  if (error) throw error;
  return mapAppointmentFromDb(data);
}

/**
 * Updates full appointment details (doctor, specialty, clinic, date, time, notes) in Supabase.
 */
export async function updateAppointmentDetailsInDb(patientUserId, apt) {
  if (!supabase || !patientUserId || !apt?.id) return null;
  const { data, error } = await supabase
    .from('appointments')
    .update({
      doctor_name: apt.doctorName,
      specialty: apt.specialty,
      clinic: apt.clinic,
      appointment_date: apt.date,
      appointment_time: apt.time,
      visit_type: apt.type || 'In-Person Visit',
      notes: apt.notes,
    })
    .eq('id', apt.id)
    .eq('user_id', patientUserId)
    .select()
    .single();

  if (error) throw error;
  return mapAppointmentFromDb(data);
}

/**
 * Deletes an appointment from Supabase.
 */
export async function deleteAppointmentFromDb(patientUserId, aptId) {
  if (!supabase || !patientUserId) return;
  const { error } = await supabase
    .from('appointments')
    .delete()
    .eq('id', aptId)
    .eq('user_id', patientUserId);
  if (error) throw error;
}

/**
 * Revokes a caregiver/family member's access in Supabase via the server RPC `revoke_care_access`.
 */
export async function revokeCaregiverAccessInDb(granteeEmail) {
  if (!supabase || !granteeEmail) return null;
  const { data, error } = await supabase.rpc('revoke_care_access', {
    p_grantee_email: granteeEmail,
  });
  if (error) throw error;
  return data;
}

/**
 * Invokes the deployed Supabase Edge Function `smart-notifications` (`supabase.functions.invoke`).
 * Returns the real server response (including whether `RESEND_API_KEY` was configured on the server).
 */
export async function invokeSmartNotificationsEdgeFunction(payload = {}) {
  if (!isSupabaseConfigured || !supabase) {
    return {
      invokedCloudFunction: false,
      resendConfigured: false,
      reason: 'Supabase environment variables (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) are not configured.',
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke(
      'smart-notifications',
      {
        body: payload,
      }
    );
    if (error) throw error;
    return {
      invokedCloudFunction: true,
      resendConfigured: Boolean(data?.summary?.resendConfigured),
      summary: data?.summary || null,
    };
  } catch (err) {
    return {
      invokedCloudFunction: false,
      resendConfigured: false,
      reason: err?.message || 'Edge function smart-notifications is not deployed yet.',
    };
  }
}
