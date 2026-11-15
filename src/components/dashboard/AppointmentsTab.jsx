import React, { useState } from 'react';
import {
  CalendarCheck,
  Plus,
  Clock,
  MapPin,
  Stethoscope,
  CheckCircle2,
  Trash2,
  Pencil,
} from 'lucide-react';
import Button from '../common/Button';

/**
 * AppointmentsTab Component:
 * Displays upcoming and past doctor visits and provides a working form to schedule or edit an appointment.
 */
export default function AppointmentsTab({
  appointments,
  onAddAppointment,
  onEditAppointment,
  onToggleAppointmentStatus,
  onDeleteAppointment,
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingAptId, setEditingAptId] = useState(null);
  const [doctorName, setDoctorName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [clinic, setClinic] = useState('');
  const [date, setDate] = useState('2026-12-02');
  const [time, setTime] = useState('10:00 AM');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const handleStartEdit = (apt) => {
    setEditingAptId(apt.id);
    setDoctorName(apt.doctorName || '');
    setSpecialty(apt.specialty || '');
    setClinic(apt.clinic || '');
    setDate(apt.date || '2026-12-02');
    setTime(apt.time || '10:00 AM');
    setNotes(apt.notes || '');
    setError('');
    setShowForm(true);
  };

  const resetForm = () => {
    setEditingAptId(null);
    setDoctorName('');
    setSpecialty('');
    setClinic('');
    setNotes('');
    setError('');
    setShowForm(false);
  };

  const handleCreateAppointment = (e) => {
    e.preventDefault();
    setError('');

    if (!doctorName.trim() || !specialty.trim() || !date) {
      setError('Please enter the Doctor Name, Specialty, and Appointment Date.');
      return;
    }

    const payload = {
      id: editingAptId || `apt-${Date.now()}`,
      doctorName: doctorName.trim(),
      specialty: specialty.trim(),
      clinic: clinic.trim() || 'Springfield Senior Medical Center',
      date,
      time: time.trim() || '10:00 AM',
      type: 'In-Person Visit',
      notes: notes.trim() || 'Bring current medication list.',
    };

    if (editingAptId && onEditAppointment) {
      onEditAppointment(payload);
    } else {
      onAddAppointment({
        ...payload,
        status: 'Upcoming',
      });
    }

    resetForm();
  };

  const upcomingList = appointments.filter((a) => a.status === 'Upcoming');
  const completedList = appointments.filter((a) => a.status === 'Completed');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-3xl border-2 border-slate-200 p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div>
          <span className="inline-block px-3.5 py-1 rounded-full bg-sky-100 text-sky-900 font-bold text-sm uppercase tracking-wider mb-2">
            Doctor Visits & Checkups
          </span>
          <h2 className="text-3xl font-extrabold text-slate-900">
            Doctor Appointments
          </h2>
          <p className="text-lg text-slate-600 mt-1">
            Keep track of upcoming clinic visits, specialists, and preparation notes.
          </p>
        </div>

        <Button
          variant="secondary"
          size="lg"
          icon={Plus}
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Close Form' : 'Schedule New Visit'}
        </Button>
      </div>

      {/* Add / Edit Appointment Form */}
      {showForm && (
        <div className="bg-sky-50/70 rounded-3xl border-2 border-sky-500 p-6 sm:p-8 shadow-lg">
          <h3 className="text-2xl font-extrabold text-slate-900 mb-2">
            {editingAptId
              ? 'Edit Doctor Appointment'
              : 'Schedule a Doctor Appointment'}
          </h3>
          <p className="text-lg text-slate-700 mb-6">
            {editingAptId
              ? 'Update the doctor, clinic, date, time, or preparation notes.'
              : 'Add an upcoming clinic or telehealth visit so you and your family receive reminders.'}
          </p>

          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-red-100 border-2 border-red-400 text-red-950 font-bold text-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleCreateAppointment} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <div>
                <label className="block text-lg font-bold text-slate-900 mb-2">
                  Doctor’s Name *
                </label>
                <input
                  type="text"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  placeholder="e.g., Dr. Eleanor Vance"
                  className="w-full px-4 py-3.5 text-lg bg-white rounded-xl border-2 border-slate-300 focus:border-sky-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-lg font-bold text-slate-900 mb-2">
                  Specialty / Reason *
                </label>
                <input
                  type="text"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  placeholder="e.g., Cardiology Checkup"
                  className="w-full px-4 py-3.5 text-lg bg-white rounded-xl border-2 border-slate-300 focus:border-sky-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-lg font-bold text-slate-900 mb-2">
                  Clinic or Hospital Location
                </label>
                <input
                  type="text"
                  value={clinic}
                  onChange={(e) => setClinic(e.target.value)}
                  placeholder="e.g., Heart Wellness Center, Suite 210"
                  className="w-full px-4 py-3.5 text-lg bg-white rounded-xl border-2 border-slate-300 focus:border-sky-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-lg font-bold text-slate-900 mb-2">
                  Appointment Date *
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-3.5 text-lg bg-white rounded-xl border-2 border-slate-300 focus:border-sky-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-lg font-bold text-slate-900 mb-2">
                  Appointment Time
                </label>
                <input
                  type="text"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  placeholder="e.g., 10:30 AM"
                  className="w-full px-4 py-3.5 text-lg bg-white rounded-xl border-2 border-slate-300 focus:border-sky-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-lg font-bold text-slate-900 mb-2">
                  Notes / Questions for Doctor
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., Ask about knee stiffness"
                  className="w-full px-4 py-3.5 text-lg bg-white rounded-xl border-2 border-slate-300 focus:border-sky-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Button type="submit" variant="secondary" size="lg" icon={CalendarCheck}>
                {editingAptId ? 'Save Changes' : 'Save Appointment'}
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

      {/* Upcoming Visits */}
      <div className="space-y-4">
        <h3 className="text-2xl font-extrabold text-slate-900">
          Upcoming Visits ({upcomingList.length})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {upcomingList.map((apt) => (
            <div
              key={apt.id}
              className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-sky-200 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-sky-100 text-sky-950 font-extrabold text-base">
                    <Clock className="w-5 h-5 text-sky-700" />
                    {apt.date} at {apt.time}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-teal-100 text-teal-900 font-bold text-sm">
                    {apt.status}
                  </span>
                </div>

                <h4 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
                  <Stethoscope className="w-6 h-6 text-teal-600 shrink-0" />
                  <span>{apt.doctorName}</span>
                </h4>

                <p className="text-lg font-bold text-teal-800 mt-1">
                  {apt.specialty}
                </p>

                <p className="text-lg text-slate-700 mt-3 flex items-start gap-2">
                  <MapPin className="w-5 h-5 text-slate-500 shrink-0 mt-1" />
                  <span>{apt.clinic}</span>
                </p>

                {apt.notes && (
                  <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-base text-slate-800">
                    <strong>Preparation Notes:</strong> {apt.notes}
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  icon={CheckCircle2}
                  onClick={() => onToggleAppointmentStatus(apt.id)}
                >
                  Mark Completed
                </Button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleStartEdit(apt)}
                    className="p-3 rounded-xl text-slate-500 hover:text-sky-700 hover:bg-sky-50 cursor-pointer"
                    title="Edit Appointment"
                  >
                    <Pencil className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteAppointment(apt.id)}
                    className="p-3 rounded-xl text-slate-500 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                    title="Delete Appointment"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {upcomingList.length === 0 && (
          <div className="bg-white rounded-3xl border-2 border-dashed border-slate-300 p-10 text-center">
            <p className="text-xl font-bold text-slate-700">
              No upcoming doctor appointments scheduled.
            </p>
            <p className="text-base text-slate-500 mt-1">
              Click &ldquo;Schedule New Visit&rdquo; above to add your next clinic checkup.
            </p>
          </div>
        )}
      </div>

      {/* Completed Visits */}
      {completedList.length > 0 && (
        <div className="space-y-4 pt-4">
          <h3 className="text-2xl font-extrabold text-slate-900">
            Past / Completed Visits ({completedList.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {completedList.map((apt) => (
              <div
                key={apt.id}
                className="bg-slate-50 rounded-3xl p-6 border-2 border-slate-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-base font-bold text-slate-600">
                    {apt.date} • {apt.time}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-slate-200 text-slate-800 font-bold text-sm">
                    Completed
                  </span>
                </div>
                <h4 className="text-xl font-extrabold text-slate-900">
                  {apt.doctorName} — {apt.specialty}
                </h4>
                <p className="text-base text-slate-700 mt-2">{apt.notes}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

