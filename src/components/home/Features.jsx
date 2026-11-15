import React from 'react';
import {
  Pill,
  Users,
  HeartPulse,
  ShieldAlert,
  CalendarCheck,
  Volume2,
} from 'lucide-react';
import SectionHeading from '../common/SectionHeading';
import { featuresList } from '../../data/homeData';

const iconMap = {
  Pill,
  Users,
  HeartPulse,
  ShieldAlert,
  CalendarCheck,
  Volume2,
};

/**
 * Features Section: Displays the 6 core healthcare features in an accessible, responsive grid.
 */
export default function Features() {
  return (
    <section id="features" className="py-20 lg:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          badge="Why Families Choose CareConnect"
          title="Thoughtfully Built for Seniors & Caregivers"
          subtitle="Every button, reminder, and screen is designed with clear medical typography, calming colors, and zero complicated menus."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {featuresList.map((feature) => {
            const IconComponent = iconMap[feature.iconName] || Pill;
            const isTeal = feature.accent === 'teal';

            return (
              <div
                key={feature.id}
                className="bg-slate-50/70 hover:bg-white rounded-3xl p-8 border-2 border-slate-200 hover:border-teal-500 transition-all duration-200 shadow-xs hover:shadow-xl flex flex-col justify-between"
              >
                <div>
                  <div
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 border ${
                      isTeal
                        ? 'bg-teal-100 text-teal-800 border-teal-200'
                        : 'bg-sky-100 text-sky-800 border-sky-200'
                    }`}
                  >
                    <IconComponent className="w-8 h-8" aria-hidden="true" />
                  </div>

                  <h3 className="text-2xl font-extrabold text-slate-900 mb-3">
                    {feature.title}
                  </h3>

                  <p className="text-lg text-slate-700 leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-200/80 flex items-center gap-2 text-base font-bold text-teal-700">
                  <span>Senior-Accessible Design</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

