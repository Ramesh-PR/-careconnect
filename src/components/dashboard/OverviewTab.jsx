import React from 'react';
import {
  Pill,
  CheckCircle2,
  XCircle,
  Clock,
  CalendarCheck,
  Users,
  BarChart3,
  ArrowRight,
  HeartPulse,
  AlertCircle,
} from 'lucide-react';
import Button from '../common/Button';

/**
 * OverviewTab Component:
 * Displays Today's Medication Progress, Upcoming/Due Medications with 1-tap "Mark as Taken" or "Mark Missed",
 * Next Doctor Appointment preview, and Primary Caregiver quick-contact card.
 */
export default function OverviewTab({
  medications,
  appointments,
  caregivers,
  onRecordMedicationDose,
  onNavigateTab,
}) {
  const totalMeds = medications.length;
  const takenMeds = medications.filter((m) => m.status === 'Taken').length;
  const pendingMeds = medications.filter(
    (m) =>
      m.status === 'Upcoming' ||
      m.status === 'Pending' ||
      m.status === 'Due Now' ||
      m.status === 'Unconfirmed'
  );
  const adherencePercent =
    totalMeds > 0 ? Math.round((takenMeds / totalMeds) * 100) : 100;

  const upcomingAppointments = appointments.filter((a) => a.status === 'Upcoming');
  const nextAppointment = upcomingAppointments[0] || null;
  const primaryCaregiver = caregivers[0] || null;

  return (
    <div className="space-y-8">
      {/* Top Summary Banner */}
      <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-sky-800 rounded-3xl p-6 sm:p-8 text-white shadow-lg">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-8">
            <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/15 text-teal-100 font-bold text-sm uppercase tracking-wider mb-3">
              <HeartPulse className="w-4 h-4" />
              Daily Care Snapshot
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold leading-tight">
              {pendingMeds.length === 0
                ? 'All Scheduled Medications Reviewed Today!'
                : `You Have ${pendingMeds.length} Medication${
                    pendingMeds.length > 1 ? 's' : ''
                  } Remaining Today`}
            </h2>
            <p className="mt-2 text-lg sm:text-xl text-teal-100">
              {takenMeds} of {totalMeds} daily doses marked as taken ({adherencePercent}% adherence today).
            </p>

            {/* Large Progress Bar */}
            <div className="mt-5 w-full bg-teal-950/60 rounded-full h-5 p-1 overflow-hidden border border-teal-400/30">
              <div
                className="bg-gradient-to-r from-teal-300 to-sky-300 h-full rounded-full transition-all duration-500"
                style={{ width: `${adherencePercent}%` }}
              />
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-3">
            <Button
              variant="outline"
              size="lg"
              icon={Pill}
              className="w-full !bg-white !text-teal-900 !border-white hover:!bg-teal-50"
              onClick={() => onNavigateTab('medications')}
            >
              Manage All Medicines
            </Button>
            <Button
              variant="secondary"
              size="md"
              icon={BarChart3}
              className="w-full !bg-teal-950/50 hover:!bg-teal-950 !border-teal-400/40"
              onClick={() => onNavigateTab('reports')}
            >
              View Adherence Report
            </Button>
          </div>
        </div>
      </div>

      {/* 4 Quick Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-3xl border-2 border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-slate-600">Doses Taken</span>
            <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-3">
            {takenMeds} / {totalMeds}
          </div>
          <div className="text-base font-semibold text-teal-700 mt-1">
            {adherencePercent}% Completed Today
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border-2 border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-slate-600">Remaining Today</span>
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-3">
            {pendingMeds.length} {pendingMeds.length === 1 ? 'Dose' : 'Doses'}
          </div>
          <div className="text-base font-semibold text-amber-800 mt-1">
            {pendingMeds[0] ? `Next at ${pendingMeds[0].time}` : 'All done for today!'}
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border-2 border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-slate-600">Doctor Visits</span>
            <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-800 flex items-center justify-center">
              <CalendarCheck className="w-6 h-6" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-3">
            {upcomingAppointments.length} Upcoming
          </div>
          <div className="text-base font-semibold text-sky-800 mt-1">
            {nextAppointment ? `Next: ${nextAppointment.date}` : 'No upcoming visits'}
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border-2 border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-slate-600">Care Network</span>
            <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-3">
            {caregivers.length} Caretakers
          </div>
          <div className="text-base font-semibold text-teal-700 mt-1">
            Auto-alerts enabled
          </div>
        </div>
      </div>

      {/* Main Two-Column Grid: Today's Medications + Upcoming Appointments & Caretakers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (7 cols): Today's Medication Checklist */}
        <div className="lg:col-span-7 bg-white rounded-3xl border-2 border-slate-200 p-6 sm:p-8 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-5 mb-6 border-b border-slate-200">
            <div>
              <h3 className="text-2xl font-extrabold text-slate-900">
                Today’s Medication Schedule
              </h3>
              <p className="text-base text-slate-600 font-medium">
                Tap "Mark as Taken" or "Missed" to save your daily record.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('medications')}
              className="inline-flex items-center gap-1.5 text-lg font-bold text-teal-700 hover:text-teal-900 cursor-pointer"
            >
              <span>View All / Add New</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {medications.map((med) => {
              const isTaken = med.status === 'Taken';
              const isMissed = med.status === 'Missed';
              const isUnconfirmed = med.status === 'Unconfirmed';
              const isDueNow = med.status === 'Due Now' || med.status === 'Pending';

              return (
                <div
                  key={med.id}
                  className={`p-5 rounded-2xl border-2 transition-all ${
                    isUnconfirmed
                      ? 'bg-orange-50/70 border-orange-500 shadow-sm'
                      : isDueNow
                      ? 'bg-amber-50/70 border-amber-400 shadow-sm'
                      : isTaken
                      ? 'bg-slate-50 border-slate-200'
                      : isMissed
                      ? 'bg-red-50/50 border-red-300'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-base font-bold">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-teal-100 text-teal-900">
                          <Clock className="w-4 h-4" />
                          {med.time} ({med.period})
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-lg text-xs font-extrabold uppercase ${
                            isUnconfirmed
                              ? 'bg-orange-200 text-orange-950'
                              : isDueNow
                              ? 'bg-amber-200 text-amber-950'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {isUnconfirmed ? 'Unconfirmed (Overdue)' : med.status}
                        </span>
                        <span className="text-slate-600">• {med.purpose}</span>
                      </div>

                      <h4 className="text-2xl font-extrabold text-slate-900 mt-2">
                        {med.name}{' '}
                        <span className="text-teal-700 font-bold">({med.dosage})</span>
                      </h4>

                      <p className="text-lg text-slate-700 mt-1">
                        {med.instructions}
                      </p>

                      {med.pillsRemaining <= 7 && (
                        <div className="mt-2 inline-flex items-center gap-1.5 text-sm font-bold text-amber-900 bg-amber-100 px-3 py-1 rounded-lg">
                          <AlertCircle className="w-4 h-4" />
                          <span>Only {med.pillsRemaining} pills left — Refill soon</span>
                        </div>
                      )}
                    </div>

                    <div className="shrink-0">
                      {!isTaken && !isMissed ? (
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onRecordMedicationDose(med.id, 'Taken')}
                            className="px-5 py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-lg flex items-center justify-center gap-2 shadow-md cursor-pointer transition-colors"
                          >
                            <CheckCircle2 className="w-6 h-6" />
                            <span>Mark Taken</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onRecordMedicationDose(med.id, 'Missed')}
                            className="px-4 py-3.5 rounded-2xl bg-red-50 hover:bg-red-100 text-red-800 border-2 border-red-200 font-bold text-base flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                            title="Mark as Missed"
                          >
                            <XCircle className="w-5 h-5" />
                            <span>Missed</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:items-end gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-extrabold text-base border ${
                              isTaken
                                ? 'bg-teal-100 text-teal-900 border-teal-300'
                                : 'bg-red-100 text-red-900 border-red-300'
                            }`}
                          >
                            {isTaken ? (
                              <CheckCircle2 className="w-5 h-5 text-teal-700" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-700" />
                            )}
                            {med.status} {med.takenAt ? `at ${med.takenAt}` : ''}
                          </span>
                          <button
                            type="button"
                            onClick={() => onRecordMedicationDose(med.id, 'Due Now')}
                            className="text-sm font-bold text-slate-500 hover:text-slate-800 underline cursor-pointer"
                          >
                            Undo / Reset
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column (5 cols): Upcoming Doctor Visits & Primary Caretaker */}
        <div className="lg:col-span-5 space-y-8">
          {/* Next Doctor Visits Card */}
          <div className="bg-white rounded-3xl border-2 border-slate-200 p-6 sm:p-8 shadow-xs">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-200">
              <h3 className="text-2xl font-extrabold text-slate-900">
                Upcoming Appointments
              </h3>
              <button
                type="button"
                onClick={() => onNavigateTab('appointments')}
                className="text-base font-bold text-sky-700 hover:text-sky-900 underline cursor-pointer"
              >
                Manage All
              </button>
            </div>

            {upcomingAppointments.length === 0 ? (
              <p className="text-lg text-slate-600">
                No upcoming appointments scheduled.
              </p>
            ) : (
              <div className="space-y-4">
                {upcomingAppointments.slice(0, 2).map((apt) => (
                  <div
                    key={apt.id}
                    className="p-5 rounded-2xl bg-sky-50/70 border-2 border-sky-200"
                  >
                    <div className="text-sm font-extrabold uppercase tracking-wider text-sky-800">
                      {apt.date} at {apt.time}
                    </div>
                    <div className="text-xl font-extrabold text-slate-900 mt-1">
                      {apt.doctorName}
                    </div>
                    <div className="text-base font-bold text-teal-800">
                      {apt.specialty}
                    </div>
                    <div className="text-base text-slate-700 mt-2">
                      📍 {apt.clinic}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5">
              <Button
                variant="outline"
                size="md"
                className="w-full"
                icon={CalendarCheck}
                onClick={() => onNavigateTab('appointments')}
              >
                Schedule Doctor Visit
              </Button>
            </div>
          </div>

          {/* Primary Family Caregiver Card */}
          {primaryCaregiver && (
            <div className="bg-white rounded-3xl border-2 border-slate-200 p-6 sm:p-8 shadow-xs">
              <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-200">
                <h3 className="text-2xl font-extrabold text-slate-900">
                  Primary Caregiver
                </h3>
                <button
                  type="button"
                  onClick={() => onNavigateTab('caregivers')}
                  className="text-base font-bold text-teal-700 hover:text-teal-900 underline cursor-pointer"
                >
                  View All ({caregivers.length})
                </button>
              </div>

              <div className="p-5 rounded-2xl bg-teal-50/70 border-2 border-teal-200">
                <div className="text-xl font-extrabold text-slate-900">
                  {primaryCaregiver.name}
                </div>
                <div className="text-base font-bold text-teal-800">
                  {primaryCaregiver.relationship}
                </div>
                <div className="text-base text-slate-700 mt-2">
                  📞 <strong>{primaryCaregiver.phone}</strong>
                </div>
                <div className="text-sm text-slate-600 mt-1">
                  {primaryCaregiver.availability}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
