import React, { useState } from 'react';
import {
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  AlertCircle,
  RotateCcw,
  Pencil,
} from 'lucide-react';
import Button from '../common/Button';

/**
 * MedicationsTab Component:
 * Allows viewing all daily medications, filtering by status (All, Pending, Taken, Missed),
 * marking doses as Taken or Missed (saving records to Supabase), and adding/editing medicines.
 */
export default function MedicationsTab({
  medications,
  onRecordMedicationDose,
  onAddMedication,
  onEditMedication,
  onDeleteMedication,
}) {
  const [filter, setFilter] = useState('all'); // 'all' | 'pending' | 'taken' | 'missed'
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMedId, setEditingMedId] = useState(null);

  // Form state for adding or editing a medication
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [purpose, setPurpose] = useState('');
  const [time, setTime] = useState('09:00 AM');
  const [period, setPeriod] = useState('Morning');
  const [frequency, setFrequency] = useState('Once Daily');
  const [instructions, setInstructions] = useState('');
  const [prescribedBy, setPrescribedBy] = useState('');
  const [pillsRemaining, setPillsRemaining] = useState('30');
  const [formError, setFormError] = useState('');

  const filteredMedications = medications.filter((med) => {
    if (filter === 'pending')
      return (
        med.status === 'Upcoming' ||
        med.status === 'Pending' ||
        med.status === 'Due Now'
      );
    if (filter === 'unconfirmed') return med.status === 'Unconfirmed';
    if (filter === 'taken') return med.status === 'Taken';
    if (filter === 'missed') return med.status === 'Missed';
    return true;
  });

  const handleStartEdit = (med) => {
    setEditingMedId(med.id);
    setName(med.name || '');
    setDosage(med.dosage || '');
    setPurpose(med.purpose || '');
    setTime(med.time || '09:00 AM');
    setPeriod(med.period || 'Morning');
    setFrequency(med.frequency || 'Once Daily');
    setInstructions(med.instructions || '');
    setPrescribedBy(med.prescribedBy || '');
    setPillsRemaining(String(med.pillsRemaining ?? 30));
    setFormError('');
    setShowAddForm(true);
  };

  const resetForm = () => {
    setEditingMedId(null);
    setName('');
    setDosage('');
    setPurpose('');
    setTime('09:00 AM');
    setPeriod('Morning');
    setFrequency('Once Daily');
    setInstructions('');
    setPrescribedBy('');
    setPillsRemaining('30');
    setFormError('');
    setShowAddForm(false);
  };

  const handleCreateMedication = (e) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim() || !dosage.trim()) {
      setFormError('Please enter both the medicine name and dosage (for example: Aspirin, 81 mg).');
      return;
    }

    const payload = {
      id: editingMedId || `med-${Date.now()}`,
      name: name.trim(),
      dosage: dosage.trim(),
      purpose: purpose.trim() || 'Daily Health Support',
      time: time.trim() || '09:00 AM',
      period,
      frequency,
      instructions:
        instructions.trim() || 'Take 1 dose with water as directed by your doctor.',
      prescribedBy: prescribedBy.trim() || 'Primary Physician',
      pillsRemaining: Number(pillsRemaining) || 30,
    };

    if (editingMedId && onEditMedication) {
      onEditMedication(payload);
    } else {
      onAddMedication({
        ...payload,
        status: 'Upcoming',
        takenAt: null,
      });
    }

    resetForm();
  };

  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div className="bg-white rounded-3xl border-2 border-slate-200 p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div>
          <span className="inline-block px-3.5 py-1 rounded-full bg-teal-100 text-teal-900 font-bold text-sm uppercase tracking-wider mb-2">
            Medication Organizer
          </span>
          <h2 className="text-3xl font-extrabold text-slate-900">
            My Daily Medications
          </h2>
          <p className="text-lg text-slate-600 mt-1">
            Review your pill schedule, mark doses as Taken or Missed, or add a new prescription.
          </p>
        </div>

        <Button
          variant="primary"
          size="lg"
          icon={Plus}
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? 'Close Medicine Form' : 'Add New Medicine'}
        </Button>
      </div>

      {/* Working Add / Edit Medication Form */}
      {showAddForm && (
        <div className="bg-teal-50/70 rounded-3xl border-2 border-teal-500 p-6 sm:p-8 shadow-lg">
          <h3 className="text-2xl font-extrabold text-slate-900 mb-2">
            {editingMedId
              ? 'Edit Prescription Details'
              : 'Add a New Medication to Schedule'}
          </h3>
          <p className="text-lg text-slate-700 mb-6">
            {editingMedId
              ? 'Update the dosage, schedule, or instructions below.'
              : 'Fill in the details from the prescription bottle below.'}
          </p>

          {formError && (
            <div className="mb-6 p-4 rounded-2xl bg-red-100 border-2 border-red-400 text-red-950 font-bold text-lg">
              {formError}
            </div>
          )}

          <form onSubmit={handleCreateMedication} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <div>
                <label className="block text-lg font-bold text-slate-900 mb-2">
                  Medicine Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Amlodipine"
                  className="w-full px-4 py-3.5 text-lg bg-white rounded-xl border-2 border-slate-300 focus:border-teal-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-lg font-bold text-slate-900 mb-2">
                  Dosage Strength *
                </label>
                <input
                  type="text"
                  value={dosage}
                  onChange={(e) => setDosage(e.target.value)}
                  placeholder="e.g., 5 mg or 1 Tablet"
                  className="w-full px-4 py-3.5 text-lg bg-white rounded-xl border-2 border-slate-300 focus:border-teal-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-lg font-bold text-slate-900 mb-2">
                  What is it for? (Purpose)
                </label>
                <input
                  type="text"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g., Blood Pressure"
                  className="w-full px-4 py-3.5 text-lg bg-white rounded-xl border-2 border-slate-300 focus:border-teal-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-lg font-bold text-slate-900 mb-2">
                  Time of Day
                </label>
                <input
                  type="text"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  placeholder="e.g., 09:00 AM"
                  className="w-full px-4 py-3.5 text-lg bg-white rounded-xl border-2 border-slate-300 focus:border-teal-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-lg font-bold text-slate-900 mb-2">
                  Daily Period
                </label>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="w-full px-4 py-3.5 text-lg bg-white rounded-xl border-2 border-slate-300 focus:border-teal-600 focus:outline-none"
                >
                  <option value="Morning">Morning</option>
                  <option value="Afternoon">Afternoon</option>
                  <option value="Evening">Evening</option>
                  <option value="Night">Bedtime / Night</option>
                </select>
              </div>

              <div>
                <label className="block text-lg font-bold text-slate-900 mb-2">
                  Frequency
                </label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  className="w-full px-4 py-3.5 text-lg bg-white rounded-xl border-2 border-slate-300 focus:border-teal-600 focus:outline-none"
                >
                  <option value="Once Daily">Once Daily</option>
                  <option value="Twice Daily">Twice Daily</option>
                  <option value="Every Morning">Every Morning</option>
                  <option value="As Needed">As Needed</option>
                </select>
              </div>

              <div>
                <label className="block text-lg font-bold text-slate-900 mb-2">
                  Prescribing Doctor
                </label>
                <input
                  type="text"
                  value={prescribedBy}
                  onChange={(e) => setPrescribedBy(e.target.value)}
                  placeholder="e.g., Dr. Eleanor Vance"
                  className="w-full px-4 py-3.5 text-lg bg-white rounded-xl border-2 border-slate-300 focus:border-teal-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-lg font-bold text-slate-900 mb-2">
                  Pills Remaining in Bottle
                </label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={pillsRemaining}
                  onChange={(e) => setPillsRemaining(e.target.value)}
                  className="w-full px-4 py-3.5 text-lg bg-white rounded-xl border-2 border-slate-300 focus:border-teal-600 focus:outline-none"
                />
              </div>

              <div className="md:col-span-2 lg:col-span-1">
                <label className="block text-lg font-bold text-slate-900 mb-2">
                  Special Instructions
                </label>
                <input
                  type="text"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="e.g., Take with food and water"
                  className="w-full px-4 py-3.5 text-lg bg-white rounded-xl border-2 border-slate-300 focus:border-teal-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Button type="submit" variant="primary" size="lg" icon={CheckCircle2}>
                {editingMedId ? 'Save Changes' : 'Save Medication to Schedule'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="lg"
                onClick={resetForm}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-3">
        {[
          { id: 'all', label: `All Medications (${medications.length})` },
          {
            id: 'pending',
            label: `Pending / Upcoming (${
              medications.filter(
                (m) =>
                  m.status === 'Upcoming' ||
                  m.status === 'Pending' ||
                  m.status === 'Due Now'
              ).length
            })`,
          },
          {
            id: 'unconfirmed',
            label: `Unconfirmed / Overdue (${
              medications.filter((m) => m.status === 'Unconfirmed').length
            })`,
          },
          {
            id: 'taken',
            label: `Taken Today (${
              medications.filter((m) => m.status === 'Taken').length
            })`,
          },
          {
            id: 'missed',
            label: `Confirmed Missed (${
              medications.filter((m) => m.status === 'Missed').length
            })`,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            className={`px-6 py-3.5 rounded-2xl text-lg font-extrabold border-2 cursor-pointer transition-all ${
              filter === tab.id
                ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Medications List */}
      <div className="space-y-5">
        {filteredMedications.map((med) => {
          const isTaken = med.status === 'Taken';
          const isMissed = med.status === 'Missed';
          const isUnconfirmed = med.status === 'Unconfirmed';
          const isDueNow = med.status === 'Due Now' || med.status === 'Pending';

          return (
            <div
              key={med.id}
              className={`bg-white rounded-3xl p-6 sm:p-8 border-2 transition-all shadow-xs ${
                isUnconfirmed
                  ? 'border-orange-500 bg-orange-50/50'
                  : isDueNow
                  ? 'border-amber-400 bg-amber-50/40'
                  : isTaken
                  ? 'border-teal-200 bg-slate-50/80'
                  : isMissed
                  ? 'border-red-300 bg-red-50/40'
                  : 'border-slate-200'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-100 text-teal-950 font-extrabold text-base">
                      <Clock className="w-5 h-5 text-teal-700" />
                      {med.time} • {med.period}
                    </span>

                    <span
                      className={`px-3.5 py-1.5 rounded-xl font-extrabold text-base ${
                        isTaken
                          ? 'bg-teal-100 text-teal-900 border border-teal-300'
                          : isMissed
                          ? 'bg-red-100 text-red-900 border border-red-300'
                          : isUnconfirmed
                          ? 'bg-orange-100 text-orange-950 border border-orange-400'
                          : isDueNow
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-sky-100 text-sky-900 border border-sky-200'
                      }`}
                    >
                      {isUnconfirmed ? 'Unconfirmed (Overdue)' : med.status}
                    </span>

                    <span className="text-base font-bold text-slate-600">
                      {med.frequency}
                    </span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 pt-1">
                    {med.name}{' '}
                    <span className="text-teal-700">({med.dosage})</span>
                  </h3>

                  <p className="text-lg text-slate-800 font-medium">
                    <strong>Instructions:</strong> {med.instructions}
                  </p>

                  <div className="flex flex-wrap items-center gap-6 pt-2 text-base text-slate-600 font-semibold">
                    <span>Purpose: {med.purpose}</span>
                    <span>Prescribed by: {med.prescribedBy}</span>
                    <span
                      className={
                        med.pillsRemaining <= 7
                          ? 'text-amber-800 font-extrabold inline-flex items-center gap-1'
                          : ''
                      }
                    >
                      {med.pillsRemaining <= 7 && <AlertCircle className="w-5 h-5" />}
                      Pills Left: {med.pillsRemaining}
                    </span>
                  </div>
                </div>

                {/* Action Buttons: Mark Taken, Mark Missed, or Reset */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                  {!isTaken && !isMissed ? (
                    <>
                      <Button
                        variant="primary"
                        size="lg"
                        icon={CheckCircle2}
                        onClick={() => onRecordMedicationDose(med.id, 'Taken')}
                      >
                        Mark Taken
                      </Button>
                      <button
                        type="button"
                        onClick={() => onRecordMedicationDose(med.id, 'Missed')}
                        className="px-5 py-3.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-800 border-2 border-red-300 font-bold text-lg inline-flex items-center justify-center gap-2 cursor-pointer transition-colors"
                      >
                        <XCircle className="w-6 h-6" />
                        <span>Mark Missed</span>
                      </button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="md"
                      icon={RotateCcw}
                      onClick={() => onRecordMedicationDose(med.id, 'Due Now')}
                    >
                      Reset Status
                    </Button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleStartEdit(med)}
                    className="p-4 rounded-2xl bg-slate-100 hover:bg-teal-50 text-slate-600 hover:text-teal-800 border-2 border-slate-200 hover:border-teal-300 flex items-center justify-center gap-2 font-bold text-base cursor-pointer transition-colors"
                    title="Edit Medication"
                  >
                    <Pencil className="w-5 h-5" />
                    <span className="sm:hidden">Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeleteMedication(med.id)}
                    className="p-4 rounded-2xl bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700 border-2 border-slate-200 hover:border-red-300 flex items-center justify-center gap-2 font-bold text-base cursor-pointer transition-colors"
                    title="Remove Medication"
                  >
                    <Trash2 className="w-5 h-5" />
                    <span className="sm:hidden">Remove</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredMedications.length === 0 && (
          <div className="bg-white rounded-3xl border-2 border-dashed border-slate-300 p-10 text-center">
            <p className="text-xl font-bold text-slate-700">
              No medications found in this filter view.
            </p>
            <p className="text-base text-slate-500 mt-1">
              Click &ldquo;Add New Medicine&rdquo; above to add a prescription to your schedule.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
