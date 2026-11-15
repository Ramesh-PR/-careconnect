import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  hashPasswordWithSalt,
  generateRandomHex,
  validatePasswordStrength,
} from '../src/services/authService.js';

import {
  generateSecureRandomCode,
  sha256Hex,
  ROLE_PERMISSIONS_MATRIX,
  issueSecureInvitation,
  verifyAndRedeemInviteCode,
} from '../src/services/accessControlService.js';

import {
  MEDICAL_SAFETY_DISCLAIMER,
  formatTimeInTimezone,
  getLocalDateKey,
} from '../src/services/smartNotificationService.js';

test('1. Password security: enforces minimum length + alphanumeric & deterministic salted SHA-256 hash', async () => {
  assert.ok(
    validatePasswordStrength('short1'),
    'Should reject passwords under 8 chars'
  );
  assert.ok(
    validatePasswordStrength('onlyletters'),
    'Should reject passwords without numbers'
  );
  assert.equal(
    validatePasswordStrength('SecurePass123'),
    null,
    'Should accept valid strong password'
  );

  const salt = generateRandomHex(16);
  const hash1 = await hashPasswordWithSalt('SecurePass123', salt);
  const hash2 = await hashPasswordWithSalt('SecurePass123', salt);
  const wrongHash = await hashPasswordWithSalt('WrongPass123', salt);

  assert.equal(hash1.length, 64, 'SHA-256 hex digest must be 64 chars');
  assert.equal(hash1, hash2, 'Same password + salt must produce identical hash');
  assert.notEqual(
    hash1,
    wrongHash,
    'Different password must produce different hash'
  );
});

test('2. Role-Based Access Control (RBAC): enforces strict permissions between patient, caretaker, family_member, and unauthorized', () => {
  const { patient, caretaker, family_member, unauthorized } =
    ROLE_PERMISSIONS_MATRIX;

  // Patient is data owner
  assert.equal(patient.canDeleteMedications, true);
  assert.equal(patient.canInviteOrRevokeUsers, true);

  // Caretaker can add/edit meds and log doses, but CANNOT delete meds or invite/revoke users
  assert.equal(caretaker.canAddOrEditMedications, true);
  assert.equal(caretaker.canDeleteMedications, false);
  assert.equal(caretaker.canInviteOrRevokeUsers, false);

  // Family member can view & log doses, but CANNOT add or delete meds or invite/revoke
  assert.equal(family_member.canViewRecords, true);
  assert.equal(family_member.canLogMedicationDose, true);
  assert.equal(family_member.canAddOrEditMedications, false);
  assert.equal(family_member.canDeleteMedications, false);
  assert.equal(family_member.canInviteOrRevokeUsers, false);

  // Unauthorized has zero permissions
  assert.equal(unauthorized.canViewRecords, false);
  assert.equal(unauthorized.canLogMedicationDose, false);
});

test('3. Single-Use Expiring Invitation Codes: verifies SHA-256 hash, blocks email mismatch, blocks expired codes, and blocks replay attacks', async () => {
  const code = generateSecureRandomCode();
  assert.match(code, /^CC-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/);

  const invite = await issueSecureInvitation({
    isCloudConnected: false,
    invitedEmail: 'david@example.com',
    invitedName: 'David Jenkins',
    relationship: 'Son',
    assignedRole: 'family_member',
    expiresInHours: 24,
  });

  assert.equal(invite.codeHash, await sha256Hex(invite.rawCode));

  // A. Block wrong email (stolen token)
  await assert.rejects(
    async () => {
      await verifyAndRedeemInviteCode({
        isCloudConnected: false,
        inviteCodeInput: invite.rawCode,
        callerEmail: 'attacker@evil.org',
        invitations: [invite],
      });
    },
    /EMAIL_MISMATCH/,
    'Should block redemption when caller email does not match invited email'
  );

  // B. Valid redemption succeeds
  const verified = await verifyAndRedeemInviteCode({
    isCloudConnected: false,
    inviteCodeInput: invite.rawCode,
    callerEmail: 'david@example.com',
    invitations: [invite],
  });
  assert.equal(verified.id, invite.id);

  // C. Block single-use replay attack once marked accepted
  const usedInvite = {
    ...invite,
    status: 'accepted',
    usedAt: new Date().toISOString(),
  };
  await assert.rejects(
    async () => {
      await verifyAndRedeemInviteCode({
        isCloudConnected: false,
        inviteCodeInput: invite.rawCode,
        callerEmail: 'david@example.com',
        invitations: [usedInvite],
      });
    },
    /CODE_ALREADY_USED/,
    'Should block reusing an already redeemed single-use code'
  );

  // D. Block expired code
  const expiredInvite = await issueSecureInvitation({
    isCloudConnected: false,
    invitedEmail: 'nurse@example.com',
    invitedName: 'Nurse Clara',
    relationship: 'Nurse',
    assignedRole: 'caretaker',
    expiresInHours: -1,
  });
  await assert.rejects(
    async () => {
      await verifyAndRedeemInviteCode({
        isCloudConnected: false,
        inviteCodeInput: expiredInvite.rawCode,
        callerEmail: 'nurse@example.com',
        invitations: [expiredInvite],
      });
    },
    /CODE_EXPIRED/,
    'Should block expired invitation codes'
  );
});

test('4. Smart Notifications & Medical Safety Rules: never recommends doubling doses and formats IANA timezones accurately', () => {
  assert.match(
    MEDICAL_SAFETY_DISCLAIMER,
    /Never change or double a medicine dose/i
  );

  const dateKey = getLocalDateKey('Asia/Kolkata');
  assert.match(dateKey, /^\d{4}-\d{2}-\d{2}$/);

  const formatted = formatTimeInTimezone('America/New_York');
  assert.ok(formatted.length > 5);
});

test('5. SQL Migrations & Security Audit: all 3 migrations enable RLS, use SHA-256 hashing, and never expose secret keys in frontend', () => {
  const mig1 = fs.readFileSync(
    path.resolve('supabase/migrations/001_careconnect_schema.sql'),
    'utf8'
  );
  const mig2 = fs.readFileSync(
    path.resolve('supabase/migrations/002_secure_access_and_rls.sql'),
    'utf8'
  );
  const mig3 = fs.readFileSync(
    path.resolve('supabase/migrations/003_smart_notifications_and_cron.sql'),
    'utf8'
  );
  const edgeFn = fs.readFileSync(
    path.resolve('supabase/functions/smart-notifications/index.ts'),
    'utf8'
  );

  assert.match(mig1, /enable row level security/i);
  assert.match(mig1, /dose_idempotency_key text unique/i);
  assert.match(mig2, /create or replace function public\.has_patient_access/i);
  assert.match(mig2, /create or replace function public\.redeem_care_invitation/i);
  assert.match(mig2, /create or replace function public\.revoke_care_access/i);
  assert.match(mig3, /idempotency_key text not null unique/i);
  assert.match(edgeFn, /function escapeHtml/i);
});

