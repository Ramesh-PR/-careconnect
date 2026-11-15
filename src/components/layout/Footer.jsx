import React from 'react';
import { HeartHandshake, Phone, Mail, MapPin, ShieldCheck } from 'lucide-react';

/**
 * Accessible Footer with clear navigation, helpline contacts, and medical disclaimer.
 */
export default function Footer() {
  return (
    <footer id="support" className="bg-slate-900 text-slate-200 pt-16 pb-12 border-t-4 border-teal-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-slate-800">
          {/* Column 1: Brand Info */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-teal-500 flex items-center justify-center text-slate-950 font-bold">
                <HeartHandshake className="w-7 h-7" />
              </div>
              <span className="text-2xl font-extrabold text-white">
                Care<span className="text-teal-400">Connect</span>
              </span>
            </div>
            <p className="text-lg text-slate-300 leading-relaxed">
              Empowering older adults to live independently while keeping families
              connected through simple medication and health management.
            </p>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h3 className="text-xl font-bold text-white mb-4">Quick Navigation</h3>
            <ul className="space-y-3 text-lg">
              <li>
                <a href="#home" className="hover:text-teal-400 transition-colors">
                  Home
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-teal-400 transition-colors">
                  Platform Features
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-teal-400 transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#caregivers" className="hover:text-teal-400 transition-colors">
                  For Family Caregivers
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Resources for Seniors */}
          <div>
            <h3 className="text-xl font-bold text-white mb-4">Senior Accessibility</h3>
            <ul className="space-y-3 text-lg text-slate-300">
              <li className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-teal-400 shrink-0" />
                <span>High-Contrast Medical Theme</span>
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-teal-400 shrink-0" />
                <span>Extra-Large Touch Buttons</span>
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-teal-400 shrink-0" />
                <span>Screen-Reader Friendly Labels</span>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact & Emergency Info */}
          <div>
            <h3 className="text-xl font-bold text-white mb-4">Need Assistance?</h3>
            <ul className="space-y-3 text-lg text-slate-300">
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-teal-400 shrink-0" />
                <span>1-800-CARE-NOW (24/7)</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-teal-400 shrink-0" />
                <span>support@careconnect.health</span>
              </li>
              <li className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-teal-400 shrink-0" />
                <span>Healthcare Innovation Hub</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright & Hackathon Note */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-base text-slate-400">
          <p>© {new Date().getFullYear()} CareConnect Platform. All rights reserved.</p>
          <p className="text-slate-300 font-medium">
            In case of a medical emergency, always dial your local emergency number immediately.
          </p>
        </div>
      </div>
    </footer>
  );
}

