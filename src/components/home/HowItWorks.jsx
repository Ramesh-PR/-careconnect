import React from 'react';
import {
  ClipboardList,
  BellRing,
  CheckCircle2,
  ArrowRight,
  PhoneCall,
} from 'lucide-react';
import SectionHeading from '../common/SectionHeading';
import Button from '../common/Button';
import { howItWorksSteps } from '../../data/homeData';

const stepIconMap = {
  ClipboardList,
  BellRing,
  CheckCircle2,
};

/**
 * HowItWorks Section: Explains in 3 simple steps how CareConnect works,
 * followed by a Caregiver Callout Banner.
 */
export default function HowItWorks({ onAuthClick }) {
  return (
    <section
      id="how-it-works"
      className="py-20 lg:py-28 bg-gradient-to-b from-slate-50 to-teal-50/40 border-y border-slate-200"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          badge="Simple 3-Step Routine"
          title="How CareConnect Works"
          subtitle="No technical skills required. Set up once and enjoy daily peace of mind for both seniors and family members."
        />

        {/* 3 Steps Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {howItWorksSteps.map((step) => {
            const StepIcon = stepIconMap[step.iconName] || ClipboardList;

            return (
              <div
                key={step.stepNumber}
                className="relative bg-white rounded-3xl p-8 sm:p-10 border-2 border-teal-100 shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-md">
                      <StepIcon className="w-8 h-8" aria-hidden="true" />
                    </div>
                    <span className="text-4xl font-black text-teal-700/25 select-none">
                      STEP {step.stepNumber}
                    </span>
                  </div>

                  <h3 className="text-2xl font-extrabold text-slate-900 mb-4">
                    {step.title}
                  </h3>

                  <p className="text-lg text-slate-700 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Dedicated Caregiver & Senior CTA Banner */}
        <div
          id="caregivers"
          className="mt-16 bg-gradient-to-r from-teal-700 via-teal-800 to-sky-800 rounded-3xl p-8 sm:p-12 text-white shadow-xl"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8">
              <span className="inline-block px-4 py-1.5 rounded-full bg-white/15 text-teal-100 font-bold text-base mb-4">
                Built for Families & Care Teams
              </span>
              <h3 className="text-3xl sm:text-4xl font-extrabold leading-tight">
                Ready to Make Daily Medication Safer & Easier?
              </h3>
              <p className="mt-4 text-xl text-teal-50 leading-relaxed max-w-2xl">
                Start using CareConnect today to support your parents, grandparents,
                or patients with respectful, easy-to-read reminders.
              </p>
            </div>

            <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-4">
              <Button
                variant="outline"
                size="lg"
                icon={ArrowRight}
                iconPosition="right"
                className="w-full !bg-white !text-teal-900 !border-white hover:!bg-teal-50"
                onClick={() => onAuthClick('register')}
              >
                Create Free Account
              </Button>
              <Button
                variant="secondary"
                size="lg"
                icon={PhoneCall}
                className="w-full !bg-teal-900/60 hover:!bg-teal-900 !border-teal-400/40"
                onClick={() => onAuthClick('login')}
              >
                Caregiver Login
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

