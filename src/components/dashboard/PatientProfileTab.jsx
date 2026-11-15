import React, { useState } from 'react';
import {
  UserCircle,
  HeartPulse,
  AlertTriangle,
  Stethoscope,
  Phone,
  MapPin,
  Edit3,
  CheckCircle2,
} from 'lucide-react';
import Button from '../common/Button';

/**
 * PatientProfileTab Component:
 * Displays and allows editing the senior patient's medical profile,
 * blood type, allergies, chronic conditions, and primary pharmacy details.
 */
export default function PatientProfileTab({ patientProfile = {}, onUpdateProfile }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(patientProfile);
  const [savedBanner, setSavedBanner] = useState(false);

  const safeFullName = patientProfile?.fullName || 'Martha Jenkins';
  const safeInitial = safeFullName.trim().charAt(0).toUpperCase() || 'M';
  const safeConditions = Array.isArray(patientProfile?.medicalConditions)
    ? patientProfile.medicalConditions
    : [];
  const safeAllergies = Array.isArray(patientProfile?.allergies)
    ? patientProfile.allergies
    : [];

  const handleSave = (e) => {
    e.preventDefault();
    if (onUpdateProfile) {
      onUpdateProfile({
        ...formData,
        fullName: formData.fullName?.trim() || 'Martha Jenkins',
        preferredName:
          formData.preferredName?.trim() ||
          formData.fullName?.trim()?.split(' ')[0] ||
          'Martha',
      });
    }
    setIsEditing(false);
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 4000);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-3xl border-2 border-slate-200 p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-18 h-18 rounded-3xl bg-gradient-to-br from-teal-600 to-sky-600 text-white font-extrabold text-3xl flex items-center justify-center shrink-0 shadow-md">
            {safeInitial}
          </div>
          <div>
            <span className="inline-block px-3 py-0.5 rounded-full bg-teal-100 text-teal-900 font-bold text-xs uppercase tracking-wider mb-1">
              Medical ID & Health Record
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900">
              {safeFullName}
            </h2>
            <p className="text-lg text-slate-600 font-medium">
              Age {patientProfile?.age || 74} • Blood Group:{' '}
              <strong>{patientProfile?.bloodGroup || 'O+'}</strong>
            </p>
          </div>
        </div>

        <Button
          variant={isEditing ? 'ghost' : 'primary'}
          size="lg"
          icon={Edit3}
          onClick={() => {
            setFormData(patientProfile);
            setIsEditing(!isEditing);
          }}
        >
          {isEditing ? 'Cancel Editing' : 'Edit Medical Profile'}
        </Button>
      </div>

      {savedBanner && (
        <div className="p-4 rounded-2xl bg-teal-100 border-2 border-teal-400 text-teal-950 font-bold text-lg flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-teal-700" />
          <span>Patient profile updated!</span>
        </div>
      )}

      {/* Edit Profile Form */}
      {isEditing ? (
        <form
          onSubmit={handleSave}
          className="bg-teal-50/70 rounded-3xl border-2 border-teal-500 p-6 sm:p-8 space-y-6 shadow-lg"
        >
          <h3 className="text-2xl font-extrabold text-slate-900">
            Update Patient Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div>
              <label className="block text-lg font-bold text-slate-900 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={formData.fullName || ''}
                onChange={(e) =>
                  setFormData({ ...formData, fullName: e.target.value })
                }
                className="w-full px-4 py-3.5 text-lg bg-white rounded-xl border-2 border-slate-300"
              />
            </div>

            <div>
              <label className="block text-lg font-bold text-slate-900 mb-2">
                Age
              </label>
              <input
                type="number"
                value={formData.age || ''}
                onChange={(e) =>
                  setFormData({ ...formData, age: Number(e.target.value) || 70 })
                }
                className="w-full px-4 py-3.5 text-lg bg-white rounded-xl border-2 border-slate-300"
              />
            </div>

            <div>
              <label className="block text-lg font-bold text-slate-900 mb-2">
                Blood Group
              </label>
              <input
                type="text"
                value={formData.bloodGroup || ''}
                onChange={(e) =>
                  setFormData({ ...formData, bloodGroup: e.target.value })
                }
                className="w-full px-4 py-3.5 text-lg bg-white rounded-xl border-2 border-slate-300"
              />
            </div>

            <div>
              <label className="block text-lg font-bold text-slate-900 mb-2">
                Phone Number
              </label>
              <input
                type="text"
                value={formData.phone || ''}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="w-full px-4 py-3.5 text-lg bg-white rounded-xl border-2 border-slate-300"
              />
            </div>

            <div>
              <label className="block text-lg font-bold text-slate-900 mb-2">
                Primary Physician
              </label>
              <input
                type="text"
                value={formData.primaryPhysician || ''}
                onChange={(e) =>
                  setFormData({ ...formData, primaryPhysician: e.target.value })
                }
                className="w-full px-4 py-3.5 text-lg bg-white rounded-xl border-2 border-slate-300"
              />
            </div>

            <div>
              <label className="block text-lg font-bold text-slate-900 mb-2">
                Preferred Pharmacy
              </label>
              <input
                type="text"
                value={formData.pharmacyName || ''}
                onChange={(e) =>
                  setFormData({ ...formData, pharmacyName: e.target.value })
                }
                className="w-full px-4 py-3.5 text-lg bg-white rounded-xl border-2 border-slate-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-lg font-bold text-slate-900 mb-2">
              Home Address
            </label>
            <input
              type="text"
              value={formData.address || ''}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              className="w-full px-4 py-3.5 text-lg bg-white rounded-xl border-2 border-slate-300"
            />
          </div>

          <div>
            <label className="block text-lg font-bold text-slate-900 mb-2">
              Emergency Medical Notes for Responders
            </label>
            <textarea
              rows={3}
              value={formData.emergencyNotes || ''}
              onChange={(e) =>
                setFormData({ ...formData, emergencyNotes: e.target.value })
              }
              className="w-full px-4 py-3.5 text-lg bg-white rounded-xl border-2 border-slate-300"
            />
          </div>

          <Button type="submit" variant="primary" size="lg" icon={CheckCircle2}>
            Save Profile Changes
          </Button>
        </form>
      ) : (
        /* Profile Display Cards */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Personal & Vitals Card */}
          <div className="bg-white rounded-3xl border-2 border-slate-200 p-6 sm:p-8 space-y-5 shadow-xs">
            <h3 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2.5 pb-4 border-b border-slate-200">
              <UserCircle className="w-7 h-7 text-teal-600" />
              <span>Personal & Vital Details</span>
            </h3>

            <div className="grid grid-cols-2 gap-4 text-lg">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="text-sm font-bold text-slate-500">Date of Birth</div>
                <div className="font-extrabold text-slate-900 mt-1">
                  {patientProfile?.dateOfBirth || '1952-04-18'}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="text-sm font-bold text-slate-500">Blood Group</div>
                <div className="font-extrabold text-teal-700 mt-1">
                  {patientProfile?.bloodGroup || 'O+'}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="text-sm font-bold text-slate-500">Height</div>
                <div className="font-extrabold text-slate-900 mt-1">
                  {patientProfile?.height || '5 ft 4 in'}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="text-sm font-bold text-slate-500">Weight</div>
                <div className="font-extrabold text-slate-900 mt-1">
                  {patientProfile?.weight || '148 lbs'}
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-2 text-lg text-slate-800">
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-teal-600 shrink-0" />
                <span>
                  <strong>Phone:</strong> {patientProfile?.phone || '(555) 234-8910'}
                </span>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-teal-600 shrink-0 mt-1" />
                <span>
                  <strong>Home Address:</strong> {patientProfile?.address || 'Springfield'}
                </span>
              </div>
            </div>
          </div>

          {/* Medical Conditions, Allergies & Doctor Card */}
          <div className="bg-white rounded-3xl border-2 border-slate-200 p-6 sm:p-8 space-y-6 shadow-xs">
            <h3 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2.5 pb-4 border-b border-slate-200">
              <HeartPulse className="w-7 h-7 text-teal-600" />
              <span>Conditions, Allergies & Pharmacy</span>
            </h3>

            <div>
              <div className="text-base font-bold text-slate-600 mb-2">
                Active Medical Conditions
              </div>
              <div className="flex flex-wrap gap-2.5">
                {safeConditions.map((cond) => (
                  <span
                    key={cond}
                    className="px-4 py-2 rounded-xl bg-teal-50 border border-teal-200 text-teal-950 font-bold text-base"
                  >
                    {cond}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <div className="text-base font-bold text-red-700 mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-5 h-5" />
                <span>Known Medication Allergies</span>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {safeAllergies.map((allergy) => (
                  <span
                    key={allergy}
                    className="px-4 py-2 rounded-xl bg-red-50 border-2 border-red-200 text-red-900 font-extrabold text-base"
                  >
                    ⚠️ {allergy}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 space-y-2 text-lg">
              <div className="flex items-center gap-2 font-extrabold text-slate-900">
                <Stethoscope className="w-5 h-5 text-sky-700" />
                <span>Primary Doctor: {patientProfile?.primaryPhysician}</span>
              </div>
              <div className="text-base text-slate-700">
                <strong>Pharmacy:</strong> {patientProfile?.pharmacyName} (
                {patientProfile?.pharmacyPhone})
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-base text-amber-950">
              <strong>Emergency Responder Notes:</strong>{' '}
              {patientProfile?.emergencyNotes}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
