import React from 'react';
import {
  BarChart3,
  CheckCircle2,
  XCircle,
  Award,
  TrendingUp,
  Pill,
  History,
} from 'lucide-react';
import { weeklyAdherenceHistory } from '../../data/appData';

/**
 * AdherenceReportsTab Component:
 * Visualizes 7-day medication adherence with an accessible bar chart,
 * real-time Taken / Missed history logs saved in Supabase, and per-medication supply status.
 */
export default function AdherenceReportsTab({ medications = [], medicationLogs = [] }) {
  const totalToday = medications.length;
  const takenToday = medications.filter((m) => m.status === 'Taken').length;
  const missedToday = medications.filter((m) => m.status === 'Missed').length;
  const todayPercent =
    totalToday > 0 ? Math.round((takenToday / totalToday) * 100) : 100;

  // Combine past 6 days with live Today data
  const fullWeek = [
    ...weeklyAdherenceHistory,
    {
      day: 'Today',
      date: 'Nov 15',
      taken: takenToday,
      total: totalToday,
      percentage: todayPercent,
      isToday: true,
    },
  ];

  const weeklyAverage = Math.round(
    fullWeek.reduce((acc, item) => acc + item.percentage, 0) / fullWeek.length
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-3xl border-2 border-slate-200 p-6 sm:p-8 shadow-xs">
        <span className="inline-block px-3.5 py-1 rounded-full bg-teal-100 text-teal-900 font-bold text-sm uppercase tracking-wider mb-2">
          Health Analytics & Doctor Summary
        </span>
        <h2 className="text-3xl font-extrabold text-slate-900">
          Medication Adherence Reports
        </h2>
        <p className="text-lg text-slate-600 mt-1">
          Track how consistently daily medications are taken and review Taken/Missed dose records.
        </p>
      </div>

      {/* Top 3 Highlight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-teal-600 to-teal-800 text-white rounded-3xl p-6 sm:p-8 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-teal-100">7-Day Average</span>
            <TrendingUp className="w-8 h-8 text-teal-200" />
          </div>
          <div className="text-5xl font-extrabold mt-3">{weeklyAverage}%</div>
          <p className="text-base text-teal-100 mt-2 font-medium">
            Excellent consistency! Doctors recommend staying above 85%.
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-slate-600">Today’s Score</span>
            <CheckCircle2 className="w-8 h-8 text-teal-600" />
          </div>
          <div className="text-5xl font-extrabold text-slate-900 mt-3">
            {todayPercent}%
          </div>
          <p className="text-base text-slate-600 mt-2 font-medium">
            {takenToday} Taken • {missedToday} Missed out of {totalToday} scheduled doses.
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-slate-600">Recorded Logs</span>
            <Award className="w-8 h-8 text-sky-600" />
          </div>
          <div className="text-5xl font-extrabold text-slate-900 mt-3">
            {medicationLogs.length}
          </div>
          <p className="text-base text-slate-600 mt-2 font-medium">
            Saved Taken & Missed dose history records.
          </p>
        </div>
      </div>

      {/* Visual 7-Day Adherence Bar Chart */}
      <div className="bg-white rounded-3xl border-2 border-slate-200 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h3 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-7 h-7 text-teal-600" />
              <span>Last 7 Days Adherence Chart</span>
            </h3>
            <p className="text-base text-slate-600 mt-1">
              Marking medicines as Taken or Missed automatically updates the "Today" bar!
            </p>
          </div>
          <span className="px-4 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-900 font-bold text-base">
            Target Goal: 100% Daily
          </span>
        </div>

        <div className="grid grid-cols-7 gap-3 sm:gap-6 items-end h-64 pt-8 px-2 border-b-2 border-slate-200">
          {fullWeek.map((item) => (
            <div
              key={item.day}
              className="flex flex-col items-center justify-end h-full group"
            >
              <span className="text-sm sm:text-base font-extrabold text-slate-800 mb-2">
                {item.percentage}%
              </span>
              <div className="w-full max-w-[60px] bg-slate-100 rounded-t-2xl h-44 flex items-end overflow-hidden p-1 border border-slate-200">
                <div
                  className={`w-full rounded-xl transition-all duration-500 ${
                    item.isToday
                      ? 'bg-gradient-to-t from-sky-600 to-teal-500'
                      : item.percentage === 100
                      ? 'bg-teal-600'
                      : 'bg-amber-500'
                  }`}
                  style={{ height: `${Math.max(item.percentage, 12)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* X-Axis Labels */}
        <div className="grid grid-cols-7 gap-3 sm:gap-6 pt-3 text-center">
          {fullWeek.map((item) => (
            <div key={item.day}>
              <div
                className={`text-base sm:text-lg font-extrabold ${
                  item.isToday ? 'text-teal-700' : 'text-slate-900'
                }`}
              >
                {item.day}
              </div>
              <div className="text-xs sm:text-sm font-semibold text-slate-500">
                {item.taken}/{item.total} doses
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Saved Taken / Missed Medication Records Log */}
      <div className="bg-white rounded-3xl border-2 border-slate-200 p-6 sm:p-8 shadow-xs">
        <h3 className="text-2xl font-extrabold text-slate-900 mb-2 flex items-center gap-2">
          <History className="w-6 h-6 text-teal-600" />
          <span>Saved Medication Taken / Missed Records</span>
        </h3>
        <p className="text-base text-slate-600 mb-6">
          Every time a dose is marked as Taken or Missed, a permanent log record is saved here and in Supabase (`medication_logs` table).
        </p>

        {medicationLogs.length === 0 ? (
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-lg text-slate-600 font-medium">
            No dose logs recorded yet in this session. Try clicking "Mark Taken" or "Mark Missed" on any medication!
          </div>
        ) : (
          <div className="space-y-3">
            {medicationLogs.map((log) => {
              const isTaken = log.status === 'Taken';
              return (
                <div
                  key={log.id}
                  className={`p-4 sm:p-5 rounded-2xl border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isTaken
                      ? 'bg-teal-50/50 border-teal-200'
                      : 'bg-red-50/50 border-red-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {isTaken ? (
                      <CheckCircle2 className="w-7 h-7 text-teal-700 shrink-0" />
                    ) : (
                      <XCircle className="w-7 h-7 text-red-700 shrink-0" />
                    )}
                    <div>
                      <div className="text-xl font-extrabold text-slate-900">
                        {log.medicationName}{' '}
                        {log.dosage && (
                          <span className="text-teal-700">({log.dosage})</span>
                        )}
                      </div>
                      <div className="text-base text-slate-600">
                        {log.notes || `${log.status} at ${log.loggedTime}`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-slate-500">
                      {log.logDate || 'Today'} • {log.loggedTime}
                    </span>
                    <span
                      className={`px-3.5 py-1 rounded-full font-extrabold text-sm ${
                        isTaken
                          ? 'bg-teal-100 text-teal-900 border border-teal-300'
                          : 'bg-red-100 text-red-900 border border-red-300'
                      }`}
                    >
                      {log.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Per-Medication Breakdown Table */}
      <div className="bg-white rounded-3xl border-2 border-slate-200 p-6 sm:p-8 shadow-xs">
        <h3 className="text-2xl font-extrabold text-slate-900 mb-6 flex items-center gap-2">
          <Pill className="w-6 h-6 text-teal-600" />
          <span>Medication Breakdown & Supply Status</span>
        </h3>

        <div className="space-y-4">
          {medications.map((med) => (
            <div
              key={med.id}
              className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div>
                <div className="text-xl font-extrabold text-slate-900">
                  {med.name} ({med.dosage})
                </div>
                <div className="text-base text-slate-600 font-medium">
                  {med.purpose} • {med.frequency} at {med.time}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-800 font-bold text-base">
                  {med.pillsRemaining} pills remaining
                </span>
                <span
                  className={`px-4 py-1.5 rounded-xl font-extrabold text-base ${
                    med.status === 'Taken'
                      ? 'bg-teal-100 text-teal-900 border border-teal-300'
                      : med.status === 'Missed'
                      ? 'bg-red-100 text-red-900 border border-red-300'
                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}
                >
                  Today: {med.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
