/**
 * Smart Notification Service for CareConnect
 *
 * Handles:
 * 1. Configurable Reminder Lead Time, Unconfirmed Dose Grace Period, Appointment Notice, and IANA Timezone.
 * 2. Separate Dose States: 'Upcoming', 'Pending' (Reminder Sent), 'Unconfirmed' (Overdue after grace period),
 *    'Taken', and 'Missed'.
 * 3. CRITICAL MEDICAL SAFETY RULE:
 *    - Sending an email NEVER automatically marks a dose as 'Missed'.
 *    - Every email/notification includes the strict medical safety disclaimer:
 *      "Never change or double a medicine dose to make up for a late or unconfirmed dose."
 * 4. Duplicate-Email Prevention via deterministic `idempotencyKey`.
 */

export const MEDICAL_SAFETY_DISCLAIMER =
  'Medical Safety Notice: Never change or double a medicine dose to make up for a late or unconfirmed dose. Always follow the prescribing doctor’s instructions or consult a pharmacist.';

export const SUPPORTED_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (US & Canada) — America/New_York' },
  { value: 'America/Chicago', label: 'Central Time (US & Canada) — America/Chicago' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada) — America/Los_Angeles' },
  { value: 'Asia/Kolkata', label: 'India Standard Time (IST) — Asia/Kolkata' },
  { value: 'Europe/London', label: 'United Kingdom (GMT/BST) — Europe/London' },
];

export const initialNotificationPreferences = {
  timezone: 'Asia/Kolkata',
  reminderLeadMinutes: 15,
  unconfirmedGraceMinutes: 30,
  appointmentLeadHours: 24,
  enableMedicationEmails: true,
  enableAppointmentEmails: true,
  enableCaregiverOverdueAlerts: true,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
};

export const initialDispatchHistory = [
  {
    id: 'disp-1',
    idempotencyKey: 'med_reminder:med-3:2026-11-15:martha.jenkins@example.com',
    notificationType: 'MEDICATION_REMINDER',
    recipientEmail: 'martha.jenkins@example.com',
    recipientName: 'Martha Jenkins',
    recipientRole: 'patient',
    subject: 'Medication Reminder: Vitamin D3 + Calcium (2000 IU) at 01:00 PM',
    bodyPreview:
      'Friendly reminder to take Vitamin D3 + Calcium (2000 IU) — Take 1 softgel right after lunch. Dose status set to Pending (not Missed).',
    safetyDisclaimer: MEDICAL_SAFETY_DISCLAIMER,
    doseStateAtSend: 'Pending',
    timezoneUsed: 'Asia/Kolkata',
    deliveryStatus: 'sent',
    createdAt: 'Today, 12:45 PM',
  },
  {
    id: 'disp-2',
    idempotencyKey: 'apt_reminder:apt-1:2026-11-18:24h:martha.jenkins@example.com',
    notificationType: 'APPOINTMENT_REMINDER',
    recipientEmail: 'martha.jenkins@example.com',
    recipientName: 'Martha Jenkins',
    recipientRole: 'patient',
    subject: 'Upcoming Appointment: Dr. Eleanor Vance on 2026-11-18 at 10:30 AM',
    bodyPreview:
      'Reminder for your Cardiology & Blood Pressure Check at Springfield Heart & Wellness Center, Suite 210. Note: Bring home blood pressure log.',
    safetyDisclaimer: MEDICAL_SAFETY_DISCLAIMER,
    doseStateAtSend: 'N/A (Appointment)',
    timezoneUsed: 'Asia/Kolkata',
    deliveryStatus: 'sent',
    createdAt: 'Today, 09:00 AM',
  },
];

/**
 * Formats the current time in the patient's selected IANA timezone.
 */
export function formatTimeInTimezone(timezone = 'Asia/Kolkata') {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date());
  } catch {
    return new Date().toLocaleString();
  }
}

/**
 * Returns today's date string (`YYYY-MM-DD`) in the patient's configured timezone.
 */
export function getLocalDateKey(timezone = 'Asia/Kolkata') {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    return parts;
  } catch {
    return '2026-11-15';
  }
}

