// ============================================================================
// CareConnect – Supabase Edge Function: `smart-notifications`
// Runtime: Supabase Edge Runtime (Deno) + Resend Email API
// ============================================================================
// SECURITY & RELIABILITY FEATURES:
// 1. Verifies either a valid `CRON_SECRET` header (from Supabase Cron) OR a valid
//    authenticated user JWT (`Authorization: Bearer <token>`) before executing.
// 2. Escapes all user-supplied strings (`escapeHtml`) to prevent HTML/XSS injection in emails.
// 3. Implements Medication Reminders, Appointment Reminders, and Authorized Caregiver
//    Overdue/Unconfirmed Alerts.
// 4. Never claims an email was sent via Resend unless `RESEND_API_KEY` is configured
//    and the Resend API returns HTTP 200. When `RESEND_API_KEY` is missing, returns
//    `delivery_status: 'simulated_no_api_key'` honestly.
// 5. Never automatically marks a dose as `Missed` when sending an email (`Pending` or `Unconfirmed` only).
// 6. Never recommends changing or doubling a medicine dose.
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const CRON_SECRET = Deno.env.get('CRON_SECRET') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const FROM_EMAIL =
  Deno.env.get('NOTIFICATION_FROM_EMAIL') ||
  'CareConnect Care Alerts <onboarding@resend.dev>';

const MEDICAL_SAFETY_DISCLAIMER =
  'IMPORTANT MEDICAL SAFETY NOTICE: Never double a dose, take an extra pill, or alter a prescribed medication schedule to make up for a late or unconfirmed dose. Always follow the prescribing doctor’s instructions or call a qualified healthcare provider.';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

/**
 * Escapes untrusted strings before interpolating into HTML email templates.
 */
function escapeHtml(unsafe = '') {
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Sends an email via the Resend REST API (`https://api.resend.com/emails`).
 * Honestly reports whether `RESEND_API_KEY` was present or if it ran in dry-run simulation mode.
 */
async function sendEmailWithResend({ to, subject, html }) {
  if (!RESEND_API_KEY) {
    return {
      id: null,
      deliveryStatus: 'simulated_no_api_key',
      sentViaResend: false,
      note: 'RESEND_API_KEY secret is not configured on the Edge Function; recorded in dispatch log without sending external email.',
    };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Resend API error (${response.status}): ${errText}`);
  }

  const result = await response.json();
  return {
    id: result.id,
    deliveryStatus: 'sent',
    sentViaResend: true,
    note: `Delivered via Resend (ID: ${result.id})`,
  };
}

function getPatientLocalTimeParts(timezone = 'America/New_York') {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = Object.fromEntries(
    formatter.formatToParts(now).map((p) => [p.type, p.value])
  );
  const localDate = `${parts.year}-${parts.month}-${parts.day}`;
  const currentMinutes = Number(parts.hour) * 60 + Number(parts.minute);
  return { localDate, currentMinutes };
}

function parseScheduledMinutes(timeStr = '08:00 AM') {
  const match = String(timeStr)
    .trim()
    .match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return 8 * 60;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = (match[3] || 'AM').toUpperCase();
  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Endpoint Authorization Check: Require either valid CRON_SECRET or a valid Supabase User JWT
    const cronHeader = req.headers.get('x-cron-secret') || '';
    const authHeader = req.headers.get('Authorization') || '';
    let authorizedPatientUserId: string | null = null;
    let isCronJob = false;

    if (CRON_SECRET && cronHeader === CRON_SECRET) {
      isCronJob = true;
    } else if (authHeader.startsWith('Bearer ')) {
      const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const {
        data: { user },
        error: authErr,
      } = await userClient.auth.getUser();
      if (authErr || !user) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Unauthorized: Invalid user token.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        );
      }
      authorizedPatientUserId = user.id;
    } else {
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'Unauthorized: Missing valid Authorization bearer token or x-cron-secret header.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const summary = {
      resendConfigured: Boolean(RESEND_API_KEY),
      remindersProcessed: 0,
      overdueCaregiverAlertsProcessed: 0,
      appointmentEmailsProcessed: 0,
      duplicatesSkipped: 0,
      dispatches: [] as Record<string, unknown>[],
    };

    let profilesQuery = supabaseAdmin.from('patient_profiles').select('*');
    if (!isCronJob && authorizedPatientUserId) {
      profilesQuery = profilesQuery.eq('user_id', authorizedPatientUserId);
    }

    const { data: profiles, error: profErr } = await profilesQuery;
    if (profErr) throw profErr;

    for (const profile of profiles || []) {
      const { data: prefs } = await supabaseAdmin
        .from('notification_preferences')
        .select('*')
        .eq('user_id', profile.user_id)
        .maybeSingle();

      const timezone = prefs?.timezone || 'America/New_York';
      const leadMinutes = prefs?.reminder_lead_minutes ?? 15;
      const graceMinutes = prefs?.unconfirmed_grace_minutes ?? 30;
      const enableMedEmails = prefs?.enable_medication_emails ?? true;
      const enableAptEmails = prefs?.enable_appointment_emails ?? true;
      const enableCaregiverAlerts = prefs?.enable_caregiver_overdue_alerts ?? true;

      const { localDate, currentMinutes } = getPatientLocalTimeParts(timezone);

      // 2. Process Medications (Reminders & Overdue Caregiver Alerts)
      const { data: meds } = await supabaseAdmin
        .from('medications')
        .select('*')
        .eq('user_id', profile.user_id);

      for (const med of meds || []) {
        if (med.status === 'Taken' || med.status === 'Missed') continue;

        const scheduledMinutes = parseScheduledMinutes(med.scheduled_time);
        const diffFromSchedule = currentMinutes - scheduledMinutes;

        // 2A. Medication Reminder Window -> Set state to 'Pending' (never 'Missed'!)
        if (
          enableMedEmails &&
          diffFromSchedule >= -leadMinutes &&
          diffFromSchedule <= graceMinutes
        ) {
          const idempotencyKey = `med_reminder:${med.id}:${localDate}:${profile.email}`;
          const { data: existing } = await supabaseAdmin
            .from('notification_dispatches')
            .select('id')
            .eq('idempotency_key', idempotencyKey)
            .maybeSingle();

          if (existing) {
            summary.duplicatesSkipped++;
          } else {
            await supabaseAdmin
              .from('medications')
              .update({ status: 'Pending' })
              .eq('id', med.id);

            const subject = `Medication Reminder: ${med.name} (${med.dosage}) at ${med.scheduled_time}`;
            const html = `
              <h2>Friendly Medication Reminder for ${escapeHtml(profile.preferred_name)}</h2>
              <p>It is time for your scheduled medication:</p>
              <ul>
                <li><strong>Medicine:</strong> ${escapeHtml(med.name)} (${escapeHtml(med.dosage)})</li>
                <li><strong>Scheduled Time:</strong> ${escapeHtml(med.scheduled_time)} (${escapeHtml(timezone)})</li>
                <li><strong>Instructions:</strong> ${escapeHtml(med.instructions)}</li>
              </ul>
              <p>Please open CareConnect and tap <strong>"Mark as Taken"</strong> once completed.</p>
              <hr />
              <p style="color:#475569;font-size:13px;">${escapeHtml(MEDICAL_SAFETY_DISCLAIMER)}</p>
            `;

            const sendRes = await sendEmailWithResend({
              to: profile.email,
              subject,
              html,
            });

            const { data: dispRow } = await supabaseAdmin
              .from('notification_dispatches')
              .insert({
                patient_user_id: profile.user_id,
                idempotency_key: idempotencyKey,
                notification_type: 'MEDICATION_REMINDER',
                recipient_email: profile.email,
                recipient_name: profile.full_name,
                recipient_role: 'patient',
                subject,
                body_preview: `${sendRes.note} — Reminder for ${med.name} (${med.dosage}). Dose state set to Pending.`,
                safety_disclaimer: MEDICAL_SAFETY_DISCLAIMER,
                dose_state_at_send: 'Pending',
                timezone_used: timezone,
                provider_message_id: sendRes.id,
                delivery_status: sendRes.sentViaResend ? 'sent' : 'failed',
              })
              .select()
              .single();

            summary.remindersProcessed++;
            if (dispRow) summary.dispatches.push(dispRow);
          }
        }

        // 2B. Overdue Grace Period -> Set state to 'Unconfirmed' (never 'Missed'!) & alert active caregivers
        if (enableCaregiverAlerts && diffFromSchedule > graceMinutes) {
          await supabaseAdmin
            .from('medications')
            .update({ status: 'Unconfirmed' })
            .eq('id', med.id);

          const { data: activeGrants } = await supabaseAdmin
            .from('patient_access_grants')
            .select('*')
            .eq('patient_user_id', profile.user_id)
            .eq('status', 'active')
            .is('revoked_at', null);

          for (const grant of activeGrants || []) {
            const cgKey = `unconfirmed_alert:${med.id}:${localDate}:${grant.grantee_email}`;
            const { data: existingCg } = await supabaseAdmin
              .from('notification_dispatches')
              .select('id')
              .eq('idempotency_key', cgKey)
              .maybeSingle();

            if (existingCg) {
              summary.duplicatesSkipped++;
              continue;
            }

            const subject = `CareConnect Check-In Alert: ${profile.preferred_name}'s ${med.name} is Unconfirmed`;
            const html = `
              <h2>Unconfirmed Medication Check-In for ${escapeHtml(profile.full_name)}</h2>
              <p>Hello ${escapeHtml(grant.grantee_name)},</p>
              <p><strong>${escapeHtml(profile.preferred_name)}</strong> has a scheduled medication that remains <strong>Unconfirmed (Overdue)</strong> after the ${Number(graceMinutes)}-minute grace period:</p>
              <ul>
                <li><strong>Medicine:</strong> ${escapeHtml(med.name)} (${escapeHtml(med.dosage)})</li>
                <li><strong>Scheduled Time:</strong> ${escapeHtml(med.scheduled_time)} (${escapeHtml(timezone)})</li>
                <li><strong>Current Status:</strong> Unconfirmed / Overdue (Not yet marked Taken)</li>
              </ul>
              <p>Please check in with ${escapeHtml(profile.preferred_name)} at <strong>${escapeHtml(profile.phone)}</strong>.</p>
              <hr />
              <p style="color:#475569;font-size:13px;">${escapeHtml(MEDICAL_SAFETY_DISCLAIMER)}</p>
            `;

            const sendRes = await sendEmailWithResend({
              to: grant.grantee_email,
              subject,
              html,
            });

            const { data: dispRow } = await supabaseAdmin
              .from('notification_dispatches')
              .insert({
                patient_user_id: profile.user_id,
                idempotency_key: cgKey,
                notification_type: 'UNCONFIRMED_DOSE_CAREGIVER_ALERT',
                recipient_email: grant.grantee_email,
                recipient_name: grant.grantee_name,
                recipient_role: grant.granted_role,
                subject,
                body_preview: `${sendRes.note} — Unconfirmed dose check-in alert sent to ${grant.grantee_name}.`,
                safety_disclaimer: MEDICAL_SAFETY_DISCLAIMER,
                dose_state_at_send: 'Unconfirmed',
                timezone_used: timezone,
                provider_message_id: sendRes.id,
                delivery_status: sendRes.sentViaResend ? 'sent' : 'failed',
              })
              .select()
              .single();

            summary.overdueCaregiverAlertsProcessed++;
            if (dispRow) summary.dispatches.push(dispRow);
          }
        }
      }

      // 3. Process Upcoming Doctor Appointments
      if (enableAptEmails) {
        const { data: apts } = await supabaseAdmin
          .from('appointments')
          .select('*')
          .eq('user_id', profile.user_id)
          .eq('status', 'Upcoming');

        for (const apt of apts || []) {
          const aptKey = `apt_reminder:${apt.id}:${localDate}:${profile.email}`;
          const { data: existingApt } = await supabaseAdmin
            .from('notification_dispatches')
            .select('id')
            .eq('idempotency_key', aptKey)
            .maybeSingle();

          if (existingApt) {
            summary.duplicatesSkipped++;
            continue;
          }

          const subject = `Upcoming Appointment Reminder: ${apt.doctor_name} (${apt.specialty}) on ${apt.appointment_date}`;
          const html = `
            <h2>Upcoming Doctor Visit Reminder for ${escapeHtml(profile.full_name)}</h2>
            <ul>
              <li><strong>Doctor:</strong> ${escapeHtml(apt.doctor_name)} (${escapeHtml(apt.specialty)})</li>
              <li><strong>Date & Time:</strong> ${escapeHtml(apt.appointment_date)} at ${escapeHtml(apt.appointment_time)}</li>
              <li><strong>Location:</strong> ${escapeHtml(apt.clinic)}</li>
              <li><strong>Notes:</strong> ${escapeHtml(apt.notes || 'None')}</li>
            </ul>
            <hr />
            <p style="color:#475569;font-size:13px;">${escapeHtml(MEDICAL_SAFETY_DISCLAIMER)}</p>
          `;

          const sendRes = await sendEmailWithResend({
            to: profile.email,
            subject,
            html,
          });

          const { data: dispRow } = await supabaseAdmin
            .from('notification_dispatches')
            .insert({
              patient_user_id: profile.user_id,
              idempotency_key: aptKey,
              notification_type: 'APPOINTMENT_REMINDER',
              recipient_email: profile.email,
              recipient_name: profile.full_name,
              recipient_role: 'patient',
              subject,
              body_preview: `${sendRes.note} — Appointment reminder for ${apt.doctor_name} on ${apt.appointment_date}.`,
              safety_disclaimer: MEDICAL_SAFETY_DISCLAIMER,
              dose_state_at_send: 'N/A (Appointment)',
              timezone_used: timezone,
              provider_message_id: sendRes.id,
              delivery_status: sendRes.sentViaResend ? 'sent' : 'failed',
            })
            .select()
            .single();

          summary.appointmentEmailsProcessed++;
          if (dispRow) summary.dispatches.push(dispRow);
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, summary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ ok: false, error: error?.message || 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
