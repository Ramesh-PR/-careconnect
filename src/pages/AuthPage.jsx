import React, { useState, useEffect } from 'react';
import {
  HeartHandshake,
  ArrowLeft,
  LogIn,
  UserPlus,
  ShieldCheck,
  User,
  Users,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
} from 'lucide-react';
import Button from '../components/common/Button';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import {
  registerSecureAccount,
  loginSecureAccount,
} from '../services/authService';

/**
 * AuthPage Component:
 * Enforces real authentication security:
 * - No unverified bypasses or "accept any password" logins.
 * - Passwords are required to be at least 8 characters with letters + numbers and are hashed with salted SHA-256 (or Supabase Auth).
 * - Includes brute-force lockout protection (locks for 30 seconds after 5 failed login attempts).
 */
export default function AuthPage({
  initialMode = 'login',
  onLoginSuccess,
  onBackToHome,
}) {
  const [mode, setMode] = useState(
    initialMode === 'register' ? 'register' : 'login'
  );
  const [role, setRole] = useState('patient'); // 'patient' | 'family_member' | 'caretaker'
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Brute-force protection state
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutSecondsLeft, setLockoutSecondsLeft] = useState(0);

  useEffect(() => {
    if (lockoutSecondsLeft <= 0) return;
    const timer = setInterval(() => {
      setLockoutSecondsLeft((prev) => {
        if (prev <= 1) {
          setFailedAttempts(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSecondsLeft]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setInfoMessage('');

    if (lockoutSecondsLeft > 0) {
      setErrorMessage(
        `Too many failed login attempts. Please wait ${lockoutSecondsLeft} seconds before trying again.`
      );
      return;
    }

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both your email address and password.');
      return;
    }

    try {
      setIsLoading(true);

      if (mode === 'register') {
        if (!fullName.trim()) {
          setErrorMessage('Please enter your full name to register.');
          setIsLoading(false);
          return;
        }

        if (password !== confirmPassword) {
          setErrorMessage('Passwords do not match. Please re-enter your password.');
          setIsLoading(false);
          return;
        }

        const result = await registerSecureAccount({
          fullName,
          email,
          password,
          phone,
          role,
        });

        if (result.requiresEmailConfirmation) {
          setInfoMessage(
            'Account created! Please check your email inbox to confirm your email address before signing in.'
          );
          setMode('login');
          return;
        }

        if (result.user) {
          onLoginSuccess(result.user);
        }
      } else {
        // Sign In Mode — Verifies email & password hash!
        const verifiedUser = await loginSecureAccount({
          email,
          password,
        });
        setFailedAttempts(0);
        onLoginSuccess(verifiedUser);
      }
    } catch (err) {
      if (mode === 'login') {
        const nextFailed = failedAttempts + 1;
        setFailedAttempts(nextFailed);
        if (nextFailed >= 5) {
          setLockoutSecondsLeft(30);
          setErrorMessage(
            'Account temporarily locked for 30 seconds due to 5 failed password attempts.'
          );
        } else {
          setErrorMessage(
            `${err.message} (${5 - nextFailed} attempt${
              5 - nextFailed === 1 ? '' : 's'
            } remaining before temporary lockout)`
          );
        }
      } else {
        setErrorMessage(err.message || 'Could not complete registration.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50/80 via-sky-50/40 to-white flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8">
      {/* Top Bar */}
      <div className="max-w-6xl w-full mx-auto flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBackToHome}
          className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl bg-white border-2 border-slate-300 hover:border-teal-600 text-slate-800 font-bold text-lg shadow-xs cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-teal-700" />
          <span>Back to Homepage</span>
        </button>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-extrabold bg-teal-100 text-teal-900 border border-teal-300">
            <Lock className="w-4 h-4 text-teal-700" />
            {isSupabaseConfigured
              ? 'Supabase Cloud Auth + RLS Protected'
              : 'SHA-256 Encrypted Password Authentication'}
          </span>
        </div>
      </div>

      {/* Main Auth Card */}
      <div className="max-w-5xl w-full mx-auto my-8 grid grid-cols-1 lg:grid-cols-12 bg-white rounded-3xl border-2 border-teal-200 shadow-2xl overflow-hidden">
        {/* Left Security Info Panel */}
        <div className="lg:col-span-5 bg-gradient-to-br from-teal-700 via-teal-800 to-sky-900 text-white p-8 sm:p-10 flex flex-col justify-between">
          <div>
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 text-teal-100 font-bold text-sm uppercase tracking-wider mb-6">
              <ShieldCheck className="w-5 h-5" />
              Protected Healthcare Portal
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight">
              {mode === 'login'
                ? 'Secure Sign In to CareConnect'
                : 'Create Your Protected Account'}
            </h1>
            <p className="mt-4 text-lg text-teal-100 leading-relaxed">
              Your medical profile, medications, and family alerts are strictly protected. Unregistered users and unverified passwords cannot access patient records.
            </p>

            <ul className="mt-8 space-y-4 text-base font-medium text-teal-50">
              <li className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-teal-300 shrink-0" />
                <span>Salted SHA-256 / Supabase JWT verification</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-teal-300 shrink-0" />
                <span>Brute-force password lockout protection</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-teal-300 shrink-0" />
                <span>Isolated per-user medical records</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-teal-300 shrink-0" />
                <span>Single-use expiring family invite codes</span>
              </li>
            </ul>
          </div>

          <div className="mt-10 pt-6 border-t border-white/20 text-sm text-teal-100 space-y-2">
            <div className="font-extrabold text-white text-base">
              First Time Using CareConnect?
            </div>
            <p>
              Click the <strong>"Register New Account"</strong> tab to create your secure account with your email and password, then sign in anytime!
            </p>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="lg:col-span-7 p-8 sm:p-10">
          {/* Mode Switch Tabs */}
          <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100 rounded-2xl mb-8">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMessage('');
                setInfoMessage('');
              }}
              className={`py-3.5 px-4 rounded-xl font-extrabold text-lg flex items-center justify-center gap-2 cursor-pointer transition-all ${
                mode === 'login'
                  ? 'bg-white text-teal-800 shadow-sm border border-teal-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LogIn className="w-5 h-5" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMessage('');
                setInfoMessage('');
              }}
              className={`py-3.5 px-4 rounded-xl font-extrabold text-lg flex items-center justify-center gap-2 cursor-pointer transition-all ${
                mode === 'register'
                  ? 'bg-white text-teal-800 shadow-sm border border-teal-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserPlus className="w-5 h-5" />
              <span>Register New Account</span>
            </button>
          </div>

          {/* Role Selection (Shown when Registering) */}
          {mode === 'register' && (
            <div className="mb-6">
              <label className="block text-lg font-bold text-slate-900 mb-2.5">
                Select Your Account Role:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    id: 'patient',
                    title: 'Patient / Senior',
                    desc: 'Full owner access',
                    icon: User,
                  },
                  {
                    id: 'family_member',
                    title: 'Family Member',
                    desc: 'View & dose check-in',
                    icon: Users,
                  },
                  {
                    id: 'caretaker',
                    title: 'Caretaker / Nurse',
                    desc: 'Manage care & visits',
                    icon: HeartHandshake,
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  const active = role === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setRole(item.id)}
                      className={`p-3.5 rounded-2xl border-2 text-left flex flex-col justify-between cursor-pointer transition-all ${
                        active
                          ? 'border-teal-600 bg-teal-50/70 text-teal-950'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <Icon
                        className={`w-6 h-6 mb-2 ${
                          active ? 'text-teal-700' : 'text-slate-500'
                        }`}
                      />
                      <div>
                        <div className="text-base font-extrabold">
                          {item.title}
                        </div>
                        <div className="text-xs text-slate-600">{item.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="mb-6 p-4 rounded-2xl bg-red-50 border-2 border-red-300 text-red-900 font-bold text-base flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-700 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {infoMessage && (
            <div className="mb-6 p-4 rounded-2xl bg-teal-50 border-2 border-teal-400 text-teal-950 font-bold text-base">
              {infoMessage}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'register' && (
              <div>
                <label
                  htmlFor="fullName"
                  className="block text-lg font-bold text-slate-800 mb-2"
                >
                  Your Full Name *
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g., Martha Jenkins"
                  className="w-full px-4 py-3.5 text-lg rounded-xl border-2 border-slate-300 focus:border-teal-600 focus:outline-none"
                />
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-lg font-bold text-slate-800 mb-2"
              >
                Email Address *
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3.5 text-lg rounded-xl border-2 border-slate-300 focus:border-teal-600 focus:outline-none"
              />
            </div>

            {mode === 'register' && (
              <div>
                <label
                  htmlFor="phone"
                  className="block text-lg font-bold text-slate-800 mb-2"
                >
                  Phone Number
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 234-8910"
                  className="w-full px-4 py-3.5 text-lg rounded-xl border-2 border-slate-300 focus:border-teal-600 focus:outline-none"
                />
              </div>
            )}

            <div>
              <label
                htmlFor="password"
                className="block text-lg font-bold text-slate-800 mb-2"
              >
                {mode === 'register'
                  ? 'Create Strong Password (Min 8 chars, letters + numbers) *'
                  : 'Password *'}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3.5 pr-12 text-lg rounded-xl border-2 border-slate-300 focus:border-teal-600 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-slate-800 cursor-pointer"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-lg font-bold text-slate-800 mb-2"
                >
                  Confirm Password *
                </label>
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  className="w-full px-4 py-3.5 text-lg rounded-xl border-2 border-slate-300 focus:border-teal-600 focus:outline-none"
                />
              </div>
            )}

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                icon={mode === 'login' ? LogIn : UserPlus}
                disabled={isLoading || lockoutSecondsLeft > 0}
              >
                {lockoutSecondsLeft > 0
                  ? `Locked (${lockoutSecondsLeft}s)`
                  : isLoading
                  ? 'Verifying Credentials...'
                  : mode === 'login'
                  ? 'Verify & Sign In'
                  : 'Register My Secure Account'}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Bottom Help Note */}
      <div className="max-w-4xl mx-auto text-center text-base text-slate-600">
        Protected by CareConnect Authentication & Row Level Security. Need assistance? Call{' '}
        <strong className="text-teal-800">1-800-CARE-NOW</strong>.
      </div>
    </div>
  );
}
