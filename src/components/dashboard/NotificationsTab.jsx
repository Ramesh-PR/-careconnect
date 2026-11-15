import React, { useState } from 'react';
import {
  Bell,
  CheckCheck,
  Pill,
  AlertTriangle,
  Users,
  Calendar,
  Trash2,
  Clock,
  Globe,
  ShieldAlert,
  MailCheck,
  Send,
  CopyCheck,
  CheckCircle2,
  Sliders,
} from 'lucide-react';
import Button from '../common/Button';
import {
  MEDICAL_SAFETY_DISCLAIMER,
  SUPPORTED_TIMEZONES,
  formatTimeInTimezone,
  getLocalDateKey,
} from '../../services/smartNotificationService';

/**
 * NotificationsTab Component:
 * Full Smart Notification Center for CareConnect:
 * 1. Configurable Reminder Lead Time, Unconfirmed Grace Period, Appointment Notice, and IANA Timezone.
 * 2. Interactive Supabase Cron + Edge Function + Resend Email Simulator (with Duplicate-Email Prevention).
 * 3. Separate tracking of 'Pending', 'Taken', and 'Unconfirmed (Overdue)' states (never auto-marks 'Missed'!).
 * 4. Strict Medical Safety Disclaimer (never recommends changing or doubling a medicine dose).
 * 5. Complete Notification Dispatch History & In-App Alerts Feed.
 */
export default function NotificationsTab({
  notifications = [],
  medications = [],
  appointments = [],
  caregivers = [],
  patientProfile = {},
  notificationPrefs,
  onUpdateNotificationPrefs,
  dispatchHistory = [],
  onTriggerSmartReminderEmail,
  onTriggerUnconfirmedCaregiverAlert,
  onTriggerAppointmentReminderEmail,
  onMarkAllRead,
  onToggleRead,
  onDeleteNotification,
}) {
  const [selectedMedId, setSelectedMedId] = useState(
    medications.find((m) => m.status !== 'Taken')?.id || medications[0]?.id || ''
  );
  const [selectedAptId, setSelectedAptId] = useState(
    appointments.find((a) => a.status === 'Upcoming')?.id || appointments[0]?.id || ''
  );
  const [engineFeedback, setEngineFeedback] = useState(null);
  const [prefsSavedBanner, setPrefsSavedBanner] = useState(false);

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const activeCaregivers = caregivers.filter((c) => c.accessStatus !== 'revoked');
  const revokedCaregivers = caregivers.filter((c) => c.accessStatus === 'revoked');

  const localNowFormatted = formatTimeInTimezone(notificationPrefs?.timezone);
  const localDateKey = getLocalDateKey(notificationPrefs?.timezone);

  const handleSavePrefs = (e) => {
    e.preventDefault();
    setPrefsSavedBanner(true);
    setTimeout(() => setPrefsSavedBanner(false), 3500);
  };

  // Run Smart Notification Test 1: Patient Medication Reminder Email
  const handleRunMedReminder = async () => {
    const med = medications.find((m) => m.id === selectedMedId) || medications[0];
    if (!med) return;
    const res = await onTriggerSmartReminderEmail(med, localDateKey);
    setEngineFeedback(res);
  };

  // Run Smart Notification Test 2: Authorized Family Unconfirmed/Overdue Dose Alert
  const handleRunCaregiverOverdueAlert = async () => {
    const med = medications.find((m) => m.id === selectedMedId) || medications[0];
    if (!med) return;
    const res = await onTriggerUnconfirmedCaregiverAlert(med, localDateKey);
    setEngineFeedback(res);
  };

  // Run Smart Notification Test 3: Upcoming Doctor Appointment Email
  const handleRunAppointmentEmail = async () => {
    const apt = appointments.find((a) => a.id === selectedAptId) || appointments[0];
    if (!apt) return;
    const res = await onTriggerAppointmentReminderEmail(apt, localDateKey);
    setEngineFeedback(res);
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'reminder':
        return <Pill className="w-6 h-6 text-teal-700" />;
      case 'refill':
        return <AlertTriangle className="w-6 h-6 text-amber-700" />;
      case 'family':
        return <Users className="w-6 h-6 text-sky-700" />;
      case 'appointment':
        return <Calendar className="w-6 h-6 text-teal-700" />;
      default:
        return <Bell className="w-6 h-6 text-teal-700" />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="bg-white rounded-3xl border-2 border-slate-200 p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xs">
        <div>
          <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-teal-100 text-teal-900 font-bold text-sm uppercase tracking-wider mb-2">
            <MailCheck className="w-4 h-4 text-teal-700" />
            Supabase Edge Functions + Cron + Resend Email Engine
          </span>
          <h2 className="text-3xl font-extrabold text-slate-900">
            Smart Notification Center ({unreadCount} Unread)
          </h2>
          <p className="text-lg text-slate-600 mt-1">
            Configure reminder lead times, grace periods, timezones, and duplicate-proof email alerts for patients and authorized family members.
          </p>
        </div>

        <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 shrink-0">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-teal-800">
            <Globe className="w-4 h-4" />
            <span>Patient Local Time ({notificationPrefs?.timezone})</span>
          </div>
          <div className="text-xl font-extrabold text-slate-900 mt-1">
            {localNowFormatted}
          </div>
        </div>
      </div>

      {/* Mandatory Medical Safety Notice Banner */}
      <div className="bg-amber-50 border-2 border-amber-400 rounded-3xl p-5 sm:p-6 flex items-start gap-4 text-amber-950 shadow-xs">
        <ShieldAlert className="w-8 h-8 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <h3 className="text-lg font-extrabold">
            Strict Medical Safety Rule (Enforced on All Emails & Alerts)
          </h3>
          <p className="text-base font-medium mt-1 leading-relaxed">
            1. Sending a reminder email or a caregiver grace-period alert{' '}
            <strong>never automatically marks a dose as Missed</strong>. Doses are tracked separately as{' '}
            <code className="px-2 py-0.5 bg-white rounded border border-amber-300 font-bold">
              Pending
            </code>
            ,{' '}
            <code className="px-2 py-0.5 bg-white rounded border border-amber-300 font-bold">
              Taken
            </code>
            , or{' '}
            <code className="px-2 py-0.5 bg-white rounded border border-amber-300 font-bold">
              Unconfirmed (Overdue)
            </code>
            .
            <br />
            2. <strong>{MEDICAL_SAFETY_DISCLAIMER}</strong>
          </p>
        </div>
      </div>

      {/* Two-Column Grid: 1. Notification Preferences + 2. Interactive Smart Notification Engine Tester */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (6 cols): Configurable Timing, Timezone & Channel Preferences */}
        <form
          onSubmit={handleSavePrefs}
          className="lg:col-span-6 bg-white rounded-3xl border-2 border-slate-200 p-6 sm:p-8 shadow-xs space-y-5"
        >
          <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
            <div className="w-11 h-11 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-2xl font-extrabold text-slate-900">
                1. Notification & Timezone Settings
              </h3>
              <p className="text-base text-slate-600">
                Customize when reminders and family grace-period alerts are sent.
              </p>
            </div>
          </div>

          {prefsSavedBanner && (
            <div className="p-3.5 rounded-2xl bg-teal-100 border border-teal-400 text-teal-950 font-bold text-base flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-teal-700" />
              <span>Notification preferences saved!</span>
            </div>
          )}

          <div>
            <label className="block text-base font-bold text-slate-900 mb-1.5">
              Patient Timezone (IANA Standard)
            </label>
            <select
              value={notificationPrefs.timezone}
              onChange={(e) =>
                onUpdateNotificationPrefs({
                  ...notificationPrefs,
                  timezone: e.target.value,
                })
              }
              className="w-full px-4 py-3 text-lg bg-white rounded-xl border-2 border-slate-300 focus:border-teal-600 focus:outline-none"
            >
              {SUPPORTED_TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-1.5">
                Reminder Lead Time
              </label>
              <select
                value={notificationPrefs.reminderLeadMinutes}
                onChange={(e) =>
                  onUpdateNotificationPrefs({
                    ...notificationPrefs,
                    reminderLeadMinutes: Number(e.target.value),
                  })
                }
                className="w-full px-3 py-3 text-base bg-white rounded-xl border-2 border-slate-300 focus:border-teal-600"
              >
                <option value={10}>10 mins before</option>
                <option value={15}>15 mins before</option>
                <option value={30}>30 mins before</option>
                <option value={60}>60 mins before</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-900 mb-1.5">
                Family Grace Period
              </label>
              <select
                value={notificationPrefs.unconfirmedGraceMinutes}
                onChange={(e) =>
                  onUpdateNotificationPrefs({
                    ...notificationPrefs,
                    unconfirmedGraceMinutes: Number(e.target.value),
                  })
                }
                className="w-full px-3 py-3 text-base bg-white rounded-xl border-2 border-slate-300 focus:border-teal-600"
              >
                <option value={15}>15 mins overdue</option>
                <option value={30}>30 mins overdue</option>
                <option value={45}>45 mins overdue</option>
                <option value={60}>60 mins overdue</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-900 mb-1.5">
                Appointment Notice
              </label>
              <select
                value={notificationPrefs.appointmentLeadHours}
                onChange={(e) =>
                  onUpdateNotificationPrefs({
                    ...notificationPrefs,
                    appointmentLeadHours: Number(e.target.value),
                  })
                }
                className="w-full px-3 py-3 text-base bg-white rounded-xl border-2 border-slate-300 focus:border-teal-600"
              >
                <option value={2}>2 hours before</option>
                <option value={12}>12 hours before</option>
                <option value={24}>24 hours before</option>
                <option value={48}>48 hours before</option>
              </select>
            </div>
          </div>

          {/* Email Toggles */}
          <div className="space-y-3 pt-2">
            <label className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={notificationPrefs.enableMedicationEmails}
                onChange={(e) =>
                  onUpdateNotificationPrefs({
                    ...notificationPrefs,
                    enableMedicationEmails: e.target.checked,
                  })
                }
                className="w-5 h-5 accent-teal-600"
              />
              <span className="text-base font-bold text-slate-900">
                Send Medication Reminder Emails to Patient ({patientProfile.email})
              </span>
            </label>

            <label className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={notificationPrefs.enableCaregiverOverdueAlerts}
                onChange={(e) =>
                  onUpdateNotificationPrefs({
                    ...notificationPrefs,
                    enableCaregiverOverdueAlerts: e.target.checked,
                  })
                }
                className="w-5 h-5 accent-teal-600"
              />
              <span className="text-base font-bold text-slate-900">
                Alert Authorized Family/Caretakers ({activeCaregivers.length} active) After {notificationPrefs.unconfirmedGraceMinutes}-Min Grace Period
              </span>
            </label>

            <label className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={notificationPrefs.enableAppointmentEmails}
                onChange={(e) =>
                  onUpdateNotificationPrefs({
                    ...notificationPrefs,
                    enableAppointmentEmails: e.target.checked,
                  })
                }
                className="w-5 h-5 accent-teal-600"
              />
              <span className="text-base font-bold text-slate-900">
                Send Upcoming Doctor Appointment Emails ({notificationPrefs.appointmentLeadHours}h advance notice)
              </span>
            </label>
          </div>

          <Button type="submit" variant="primary" size="md" className="w-full">
            Save Notification Preferences
          </Button>
        </form>

        {/* Right Column (6 cols): Interactive Smart Notification & Duplicate-Prevention Tester */}
        <div className="lg:col-span-6 bg-white rounded-3xl border-2 border-teal-200 p-6 sm:p-8 shadow-xs flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
              <div className="w-11 h-11 rounded-2xl bg-sky-100 text-sky-800 flex items-center justify-center">
                <Send className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl font-extrabold text-slate-900">
                  2. Test Smart Notification Engine
                </h3>
                <p className="text-base text-slate-600">
                  Simulate the Supabase Cron + Resend Edge Function and test duplicate-email prevention!
                </p>
              </div>
            </div>

            {/* Select Target Medication */}
            <div>
              <label className="block text-base font-bold text-slate-900 mb-1.5">
                Select Medication to Test:
              </label>
              <select
                value={selectedMedId}
                onChange={(e) => setSelectedMedId(e.target.value)}
                className="w-full px-4 py-3 text-base bg-white rounded-xl border-2 border-slate-300 focus:border-teal-600"
              >
                {medications.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.dosage}) — Scheduled: {m.time} [Current State: {m.status}]
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleRunMedReminder}
                className="p-4 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-base text-left cursor-pointer transition-colors shadow-xs"
              >
                <div className="flex items-center gap-2">
                  <Pill className="w-5 h-5 shrink-0" />
                  <span>Send Patient Reminder</span>
                </div>
                <p className="text-xs text-teal-100 font-medium mt-1">
                  Sets state to `Pending` (not `Missed`) & sends Resend email.
                </p>
              </button>

              <button
                type="button"
                onClick={handleRunCaregiverOverdueAlert}
                className="p-4 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-base text-left cursor-pointer transition-colors shadow-xs"
              >
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 shrink-0" />
                  <span>Send Grace-Period Alert</span>
                </div>
                <p className="text-xs text-amber-100 font-medium mt-1">
                  Sets state to `Unconfirmed` & emails {activeCaregivers.length} authorized caregivers.
                </p>
              </button>
            </div>

            {/* Select Target Appointment */}
            <div className="pt-2 border-t border-slate-200">
              <label className="block text-base font-bold text-slate-900 mb-1.5">
                Select Upcoming Appointment to Test:
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  value={selectedAptId}
                  onChange={(e) => setSelectedAptId(e.target.value)}
                  className="flex-1 px-4 py-3 text-base bg-white rounded-xl border-2 border-slate-300 focus:border-sky-600"
                >
                  {appointments.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.doctorName} ({a.specialty}) on {a.date} at {a.time}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleRunAppointmentEmail}
                  className="px-5 py-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-base shrink-0 cursor-pointer transition-colors"
                >
                  Send Visit Email
                </button>
              </div>
            </div>

            {/* Engine Result Feedback Box */}
            {engineFeedback && (
              <div
                className={`p-4 rounded-2xl border-2 text-base font-semibold ${
                  engineFeedback.status === 'sent'
                    ? 'bg-teal-50 border-teal-400 text-teal-950'
                    : 'bg-amber-50 border-amber-400 text-amber-950'
                }`}
              >
                <div className="font-extrabold flex items-center gap-2">
                  <CopyCheck className="w-5 h-5" />
                  <span>{engineFeedback.title}</span>
                </div>
                <p className="text-sm mt-1">{engineFeedback.detail}</p>
                {engineFeedback.idempotencyKey && (
                  <div className="mt-2 text-xs font-mono bg-white/90 px-2.5 py-1 rounded border border-slate-300">
                    idempotency_key: {engineFeedback.idempotencyKey}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="text-sm text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <strong>Test Duplicate Prevention:</strong> Click{' '}
            <strong>"Send Patient Reminder"</strong> or{' '}
            <strong>"Send Grace-Period Alert"</strong> twice on the same medicine! The second click is automatically blocked by the `idempotency_key` so users never get spammed.
            {revokedCaregivers.length > 0 && (
              <span className="block mt-1 text-red-700 font-bold">
                Note: {revokedCaregivers.length} revoked caregiver(s) were automatically excluded from alerts!
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Section 3: Sent Email & Notification Dispatch History Table */}
      <div className="bg-white rounded-3xl border-2 border-slate-200 p-6 sm:p-8 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
              <Clock className="w-6 h-6 text-teal-600" />
              <span>3. Outbound Email & Dispatch History ({dispatchHistory.length})</span>
            </h3>
            <p className="text-base text-slate-600 mt-1">
              Records every Resend email dispatch, unique `idempotency_key`, recipient role, and dose state at send time.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {dispatchHistory.map((d) => (
            <div
              key={d.id}
              className={`p-5 rounded-2xl border-2 ${
                d.deliveryStatus === 'skipped_duplicate'
                  ? 'bg-amber-50/60 border-amber-300'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase ${
                      d.deliveryStatus === 'skipped_duplicate'
                        ? 'bg-amber-200 text-amber-950'
                        : d.deliveryStatus === 'simulated_local'
                        ? 'bg-sky-200 text-sky-950'
                        : d.notificationType === 'UNCONFIRMED_DOSE_CAREGIVER_ALERT'
                        ? 'bg-red-100 text-red-900'
                        : 'bg-teal-100 text-teal-900'
                    }`}
                  >
                    {d.deliveryStatus === 'skipped_duplicate'
                      ? 'DUPLICATE BLOCKED'
                      : d.deliveryStatus === 'simulated_local'
                      ? `SIMULATED (NO RESEND KEY): ${d.notificationType}`
                      : `SENT VIA RESEND: ${d.notificationType}`}
                  </span>

                  <span className="px-2.5 py-0.5 rounded-lg bg-white border border-slate-300 text-xs font-bold text-slate-700">
                    To: {d.recipientName} &lt;{d.recipientEmail}&gt; ({d.recipientRole})
                  </span>

                  {d.doseStateAtSend && (
                    <span className="px-2.5 py-0.5 rounded-lg bg-sky-100 text-sky-900 text-xs font-extrabold">
                      Dose State: {d.doseStateAtSend}
                    </span>
                  )}
                </div>

                <span className="text-xs font-bold text-slate-500">
                  {d.createdAt} • Timezone: {d.timezoneUsed}
                </span>
              </div>

              <h4 className="text-lg font-extrabold text-slate-900">
                Subject: {d.subject}
              </h4>
              <p className="text-base text-slate-700 mt-1">{d.bodyPreview}</p>

              <div className="mt-3 pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                <span className="font-mono">
                  idempotency_key: {d.idempotencyKey}
                </span>
                <span className="font-semibold text-teal-800">
                  ✓ Includes No-Dose-Doubling Medical Safety Disclaimer
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 4: In-App Alerts Feed */}
      <div className="bg-white rounded-3xl border-2 border-slate-200 p-6 sm:p-8 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h3 className="text-2xl font-extrabold text-slate-900">
            4. In-App Activity & Care Alerts ({notifications.length})
          </h3>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              icon={CheckCheck}
              onClick={onMarkAllRead}
            >
              Mark All as Read
            </Button>
          )}
        </div>

        <div className="space-y-4">
          {notifications.map((item) => (
            <div
              key={item.id}
              className={`rounded-3xl p-5 border-2 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                !item.isRead
                  ? 'bg-teal-50/60 border-teal-400 shadow-xs'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
                  {getTypeIcon(item.type)}
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h4 className="text-xl font-extrabold text-slate-900">
                      {item.title}
                    </h4>
                    {!item.isRead && (
                      <span className="px-2.5 py-0.5 rounded-full bg-teal-600 text-white text-xs font-extrabold uppercase">
                        New
                      </span>
                    )}
                  </div>
                  <p className="text-lg text-slate-700 mt-1">{item.message}</p>
                  <span className="block text-sm font-bold text-slate-500 mt-1.5">
                    {item.time}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => onToggleRead(item.id)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-base cursor-pointer"
                >
                  {item.isRead ? 'Mark Unread' : 'Mark Read'}
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteNotification(item.id)}
                  className="p-3 rounded-xl text-slate-500 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                  title="Delete Alert"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
