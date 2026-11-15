import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Pill,
  ShieldCheck,
  Bell,
  Heart,
  Sparkles,
} from 'lucide-react';
import Button from '../common/Button';
import { sampleMedications } from '../../data/homeData';

/**
 * Hero Section: Welcomes seniors & families, provides prominent Get Started / Login actions,
 * and shows an interactive Daily Medication Schedule card so users immediately understand the platform.
 */
export default function Hero({ onAuthClick }) {
  const [meds, setMeds] = useState(sampleMedications);

  // Allows the user to test clicking "Mark as Taken" right on the homepage preview!
  const handleMarkTaken = (id) => {
    setMeds((prevMeds) =>
      prevMeds.map((med) =>
        med.id === id ? { ...med, status: 'Taken' } : med
      )
    );
  };

  return (
    <section
      id="home"
      className="relative overflow-hidden bg-gradient-to-b from-teal-50/70 via-sky-50/40 to-white pt-10 pb-20 lg:pt-16 lg:pb-28"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center">
          {/* Left Column: Clear Headline & Action Buttons */}
          <div className="lg:col-span-7 text-left">
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-teal-100/90 border border-teal-300 text-teal-900 font-bold text-base mb-6">
              <ShieldCheck className="w-5 h-5 text-teal-700 shrink-0" />
              <span>Trusted Elderly Care & Medication Companion</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
              Never Miss a Dose.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-sky-600">
                Care with Confidence.
              </span>
            </h1>

            <p className="mt-6 text-xl sm:text-2xl text-slate-700 leading-relaxed max-w-2xl font-normal">
              CareConnect makes daily medication tracking effortless for older adults
              while keeping family members and caregivers connected in real time.
            </p>

            {/* Primary CTA Buttons */}
            <div className="mt-9 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <Button
                variant="primary"
                size="lg"
                icon={ArrowRight}
                iconPosition="right"
                onClick={() => onAuthClick('register')}
              >
                Get Started for Free
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  const el = document.getElementById('how-it-works');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                See How It Works
              </Button>
            </div>

            {/* Elderly-Friendly Reassurance Badges */}
            <div className="mt-10 pt-8 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <span className="text-lg font-bold text-slate-800">
                  Large, Easy Text
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                  <Bell className="w-6 h-6" />
                </div>
                <span className="text-lg font-bold text-slate-800">
                  Instant Family Alerts
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                  <Heart className="w-6 h-6" />
                </div>
                <span className="text-lg font-bold text-slate-800">
                  100% Senior Friendly
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Sample Medication Card */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-3xl border-2 border-teal-100 shadow-2xl shadow-teal-900/10 p-6 sm:p-8">
              {/* Card Header */}
              <div className="flex items-center justify-between pb-5 mb-6 border-b border-slate-200">
                <div>
                  <span className="text-sm font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
                    Interactive Preview
                  </span>
                  <h2 className="text-2xl font-extrabold text-slate-900 mt-2">
                    Martha’s Today Schedule
                  </h2>
                </div>
                <div className="w-13 h-13 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700">
                  <Pill className="w-7 h-7" />
                </div>
              </div>

              {/* Medication Items */}
              <div className="space-y-4">
                {meds.map((med) => {
                  const isTaken = med.status === 'Taken';
                  const isDueNow = med.status === 'Due Now';

                  return (
                    <div
                      key={med.id}
                      className={`p-4 sm:p-5 rounded-2xl border-2 transition-all ${
                        isDueNow
                          ? 'bg-sky-50/70 border-sky-500 shadow-md'
                          : isTaken
                          ? 'bg-slate-50 border-slate-200'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 text-base font-bold text-slate-600">
                            <Clock className="w-5 h-5 text-teal-600" />
                            <span>{med.time}</span>
                            <span>•</span>
                            <span className="text-teal-800">{med.purpose}</span>
                          </div>
                          <h3 className="text-xl font-extrabold text-slate-900 mt-1">
                            {med.name}
                          </h3>
                          <p className="text-base text-slate-700 mt-1">
                            {med.instruction}
                          </p>
                        </div>

                        {/* Status Badge */}
                        <span
                          className={`px-3.5 py-1.5 rounded-full text-base font-bold inline-flex items-center gap-1.5 ${
                            isTaken
                              ? 'bg-teal-100 text-teal-900 border border-teal-300'
                              : isDueNow
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-slate-100 text-slate-700 border border-slate-300'
                          }`}
                        >
                          {isTaken && <CheckCircle2 className="w-5 h-5 text-teal-700" />}
                          {med.status}
                        </span>
                      </div>

                      {/* Interactive "Mark as Taken" Button for Demo */}
                      {!isTaken && (
                        <div className="mt-4 pt-3 border-t border-slate-200/80">
                          <button
                            type="button"
                            onClick={() => handleMarkTaken(med.id)}
                            className="w-full py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-lg flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-colors"
                          >
                            <CheckCircle2 className="w-6 h-6" />
                            <span>Tap to Mark as Taken</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Caregiver Status Footer */}
              <div className="mt-6 p-4 rounded-2xl bg-teal-50 border border-teal-200 flex items-center gap-3 text-teal-950">
                <Sparkles className="w-6 h-6 text-teal-700 shrink-0" />
                <p className="text-base font-semibold">
                  Try clicking <span className="underline">“Tap to Mark as Taken”</span> above to see how simple it is for seniors!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

