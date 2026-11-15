import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js';

/**
 * Generates a cryptographically secure, random single-use invite code
 * using the Web Crypto API (`crypto.getRandomValues`) formatted as `CC-XXXX-XXXX-XXXX`.
 */
export function generateSecureRandomCode() {
  const bytes = new Uint8Array(6);
  globalThis.crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
    .join('');
  return `CC-${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`;
}

/**
 * Computes the SHA-256 hash of an invitation code so we never store plain-text codes in tables.
 */
export async function sha256Hex(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text.trim().toUpperCase());
  const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export const initialInvitations = [
  {
    id: 'inv-sample-1',
    invitedEmail: 'david.jenkins@example.com',
    invitedName: 'David Jenkins',
    relationship: 'Son (Primary Family Caregiver)',
    assignedRole: 'family_member',
    codePreview: 'CC-8F2A-****',
    codeHash: 'sample-hash-accepted-1',
    status: 'accepted',
    expiresAt: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
    usedAt: '2026-11-14T09:15:00Z',
  },
  {
    id: 'inv-sample-2',
    invitedEmail: 'clara.higgins@homecare.org',
    invitedName: 'Nurse Clara Higgins, RN',
    relationship: 'Visiting Home Care Nurse',
    assignedRole: 'caretaker',
    codePreview: 'CC-4B9E-****',
    codeHash: 'sample-hash-accepted-2',
    status: 'accepted',
    expiresAt: new Date(Date.now() + 20 * 3600 * 1000).toISOString(),
    usedAt: '2026-11-14T11:30:00Z',
  },
];

export const initialAuditLogs = [
  {
    id: 'audit-1',
    eventType: 'RLS_POLICY_ACTIVE',
    severity: 'info',
    actorEmail: 'system@supabase.security',
    actorRole: 'system',
    description:
      'Supabase Row Level Security (RLS) verified active on patient_profiles, medications, medication_logs, appointments, and caregivers.',
    createdAt: 'Today, 08:00 AM',
  },
  {
    id: 'audit-2',
    eventType: 'INVITE_ACCEPTED',
    severity: 'info',
    actorEmail: 'clara.higgins@homecare.org',
    actorRole: 'caretaker',
    description:
      'Nurse Clara Higgins, RN verified single-use invite CC-4B9E-**** and received caretaker access.',
    createdAt: 'Yesterday, 11:30 AM',
  },
  {
    id: 'audit-3',
    eventType: 'INVITE_ACCEPTED',
    severity: 'info',
    actorEmail: 'david.jenkins@example.com',
    actorRole: 'family_member',
    description:
      'David Jenkins verified single-use invite CC-8F2A-**** and received family_member access.',
    createdAt: 'Yesterday, 09:15 AM',
  },
];

/**
 * Role Permissions Matrix enforced by the backend & RLS policies.
 * Used to explain and verify server-side permissions.
 */
export const ROLE_PERMISSIONS_MATRIX = {
  patient: {
    label: 'Patient (Data Owner)',
    badgeColor: 'bg-teal-100 text-teal-900 border-teal-300',
    canViewRecords: true,
    canLogMedicationDose: true,
    canAddOrEditMedications: true,
    canDeleteMedications: true,
    canInviteOrRevokeUsers: true,
  },
  caretaker: {
    label: 'Caretaker (Professional Nurse/Aide)',
    badgeColor: 'bg-sky-100 text-sky-900 border-sky-300',
    canViewRecords: true,
    canLogMedicationDose: true,
    canAddOrEditMedications: true,
    canDeleteMedications: false,
    canInviteOrRevokeUsers: false,
  },
  family_member: {
    label: 'Family Member (Read + Check-In)',
    badgeColor: 'bg-indigo-100 text-indigo-900 border-indigo-300',
    canViewRecords: true,
    canLogMedicationDose: true,
    canAddOrEditMedications: false,
    canDeleteMedications: false,
    canInviteOrRevokeUsers: false,
  },
  unauthorized: {
    label: 'Unauthorized / Revoked User',
    badgeColor: 'bg-red-100 text-red-900 border-red-300',
    canViewRecords: false,
    canLogMedicationDose: false,
    canAddOrEditMedications: false,
    canDeleteMedications: false,
    canInviteOrRevokeUsers: false,
  },
};

/**
 * Calls the Supabase backend RPC `create_care_invitation` if connected,
 * or creates a cryptographically hashed single-use invite locally in Demo Mode.
 */
export async function issueSecureInvitation({
  isCloudConnected,
  invitedEmail,
  invitedName,
  relationship,
  assignedRole,
  expiresInHours = 24,
}) {
  if (isCloudConnected && isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.rpc('create_care_invitation', {
      p_invited_email: invitedEmail,
      p_invited_name: invitedName,
      p_relationship: relationship,
      p_assigned_role: assignedRole,
      p_expires_in_hours: Number(expiresInHours) || 24,
    });
    if (error) throw error;
    return {
      id: data.invitation_id,
      rawCode: data.invite_code,
      codePreview: data.code_preview,
      invitedEmail: data.invited_email,
      invitedName,
      relationship,
      assignedRole: data.assigned_role,
      status: 'pending',
      expiresAt: data.expires_at,
      usedAt: null,
    };
  }

  // Cryptographic generation using Web Crypto API
  const rawCode = generateSecureRandomCode();
  const codeHash = await sha256Hex(rawCode);
  const codePreview = `${rawCode.slice(0, 7)}-****`;
  const expiresAt = new Date(
    Date.now() + Number(expiresInHours) * 3600 * 1000
  ).toISOString();

  return {
    id: `inv-${Date.now()}`,
    rawCode,
    codeHash,
    codePreview,
    invitedEmail: invitedEmail.trim().toLowerCase(),
    invitedName: invitedName.trim(),
    relationship: relationship.trim() || 'Family Member',
    assignedRole,
    status: 'pending',
    expiresAt,
    usedAt: null,
  };
}

/**
 * Verifies a single-use, expiring invitation code against the backend RPC (or cryptographic hash store).
 */
export async function verifyAndRedeemInviteCode({
  isCloudConnected,
  inviteCodeInput,
  callerEmail,
  invitations,
}) {
  const cleanCode = inviteCodeInput.trim().toUpperCase();

  if (isCloudConnected && isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.rpc('redeem_care_invitation', {
      p_invite_code: cleanCode,
    });
    if (error) throw error;
    return data;
  }

  // Backend-equivalent verification logic checking SHA-256 hash, single-use, expiry, revocations, and email binding
  const inputHash = await sha256Hex(cleanCode);
  const matchedInvite = invitations.find((inv) => inv.codeHash === inputHash);

  if (!matchedInvite) {
    throw new Error(
      'INVALID_CODE: Backend verification failed — no invitation matches this cryptographic token.'
    );
  }

  if (matchedInvite.status === 'accepted' || matchedInvite.usedAt) {
    throw new Error(
      `CODE_ALREADY_USED: Single-use token ${matchedInvite.codePreview} was already redeemed at ${matchedInvite.usedAt}. Replay attack blocked!`
    );
  }

  if (matchedInvite.status === 'revoked') {
    throw new Error(
      `CODE_REVOKED: Invitation ${matchedInvite.codePreview} was revoked by the patient. Access denied!`
    );
  }

  if (new Date(matchedInvite.expiresAt).getTime() <= Date.now()) {
    throw new Error(
      `CODE_EXPIRED: Invitation ${matchedInvite.codePreview} expired at ${new Date(
        matchedInvite.expiresAt
      ).toLocaleTimeString()}. Access denied!`
    );
  }

  if (
    callerEmail &&
    callerEmail.trim().toLowerCase() !== matchedInvite.invitedEmail.toLowerCase()
  ) {
    throw new Error(
      `EMAIL_MISMATCH: Token ${matchedInvite.codePreview} is bound to ${matchedInvite.invitedEmail}, not ${callerEmail.trim().toLowerCase()}. Unauthorized user blocked!`
    );
  }

  return matchedInvite;
}

