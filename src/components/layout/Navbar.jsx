import React, { useState } from 'react';
import { HeartHandshake, Menu, X, LogIn, ArrowRight, PhoneCall } from 'lucide-react';
import Button from '../common/Button';
import { navLinks } from '../../data/homeData';

/**
 * Responsive Navigation Bar with Logo, Navigation Links, Login, and Get Started buttons.
 * Includes a mobile & tablet drawer with extra-large touch targets.
 */
export default function Navbar({ onAuthClick }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      {/* Top Accessibility & Helpline Strip */}
      <div className="bg-teal-900 text-white py-2 px-4 text-sm sm:text-base">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <p className="font-medium flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-teal-300 animate-pulse" />
            Designed for Seniors & Family Caregivers — Simple, Clear & Safe
          </p>
          <a
            href="#support"
            className="inline-flex items-center gap-1.5 font-semibold text-teal-100 hover:text-white underline underline-offset-4"
          >
            <PhoneCall className="w-4 h-4" />
            <span>24/7 Care Support: 1-800-CARE-NOW</span>
          </a>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <nav
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-22 flex items-center justify-between"
        aria-label="Main Navigation"
      >
        {/* Brand Logo */}
        <a
          href="#home"
          className="flex items-center gap-3 group focus:outline-none"
        >
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-teal-600 to-sky-600 flex items-center justify-center text-white shadow-md shadow-teal-600/20 group-hover:scale-105 transition-transform">
            <HeartHandshake className="w-8 h-8" aria-hidden="true" />
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Care<span className="text-teal-600">Connect</span>
            </span>
            <span className="block text-xs sm:text-sm font-semibold text-slate-600 -mt-1">
              Elderly Care & Medication
            </span>
          </div>
        </a>

        {/* Desktop Navigation Links */}
        <div className="hidden lg:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="text-lg font-semibold text-slate-700 hover:text-teal-700 py-2 px-1 transition-colors"
            >
              {link.name}
            </a>
          ))}
        </div>

        {/* Desktop Login & Get Started Buttons */}
        <div className="hidden lg:flex items-center gap-4">
          <Button
            variant="outline"
            size="md"
            icon={LogIn}
            onClick={() => onAuthClick('login')}
          >
            Login
          </Button>
          <Button
            variant="primary"
            size="md"
            icon={ArrowRight}
            iconPosition="right"
            onClick={() => onAuthClick('register')}
          >
            Get Started
          </Button>
        </div>

        {/* Mobile Menu Button (Extra Large for Accessibility) */}
        <div className="lg:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="inline-flex items-center justify-center p-3 rounded-xl text-slate-800 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 border-2 border-slate-300"
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            {mobileMenuOpen ? (
              <X className="w-8 h-8" aria-hidden="true" />
            ) : (
              <Menu className="w-8 h-8" aria-hidden="true" />
            )}
            <span className="ml-2 text-lg font-bold">Menu</span>
          </button>
        </div>
      </nav>

      {/* Mobile & Tablet Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b-2 border-teal-600 px-4 pt-3 pb-6 shadow-xl">
          <div className="flex flex-col space-y-2">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-3.5 rounded-xl text-xl font-bold text-slate-800 hover:bg-teal-50 hover:text-teal-700 transition-colors"
              >
                {link.name}
              </a>
            ))}
          </div>
          <div className="mt-6 pt-6 border-t border-slate-200 flex flex-col sm:flex-row gap-4">
            <Button
              variant="outline"
              size="lg"
              icon={LogIn}
              className="w-full"
              onClick={() => {
                setMobileMenuOpen(false);
                onAuthClick('login');
              }}
            >
              Login to Account
            </Button>
            <Button
              variant="primary"
              size="lg"
              icon={ArrowRight}
              iconPosition="right"
              className="w-full"
              onClick={() => {
                setMobileMenuOpen(false);
                onAuthClick('register');
              }}
            >
              Get Started Free
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}

