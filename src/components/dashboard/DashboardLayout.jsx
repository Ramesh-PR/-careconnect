import React, { useState } from 'react';
import {
  HeartHandshake,
  LayoutDashboard,
  Pill,
  CalendarCheck,
  Users,
  BarChart3,
  UserCircle,
  Bell,
  ShieldAlert,
  LogOut,
  Menu,
  X,
  PhoneCall,
  CheckCircle2,
  RotateCcw,
  Database,
} from 'lucide-react';
import Button from '../common/Button';

const navItems = [
  { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'medications', label: 'My Medications', icon: Pill },
  { id: 'appointments', label: 'Appointments', icon: CalendarCheck },
  { id: 'caregivers', label: 'Family & Caretakers', icon: Users },
  { id: 'reports', label: 'Adherence Reports', icon: BarChart3 },
  { id: 'profile', label: 'Patient Profile', icon: UserCircle },
  { id: 'notifications', label: 'Notifications', icon: Bell },
];

/**
 * DashboardLayout Component:
 * Provides the accessible left sidebar navigation, top header bar,
 * unread notification badges, and a 1-tap Emergency SOS modal.
 */
export default function DashboardLayout({
  activeTab,
  setActiveTab,
  currentUser,
  patientProfile,
  dbSyncStatus = 'Local Demo Mode',
  unreadNotificationsCount = 0,
  pendingMedsCount = 0,
  caregivers = [],
  onTriggerSOS,
  onResetDemoData,
  onLogout,
  children,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sosModalOpen, setSosModalOpen] = useState(false);
  const [sosSent, setSosSent] = useState(false);

  const safeFullName = patientProfile?.fullName || 'Martha Jenkins';
  const safePreferredName = patientProfile?.preferredName || 'Martha';
  const safeInitial = safeFullName.trim().charAt(0).toUpperCase() || 'M';
  const safeCaregivers = Array.isArray(caregivers) ? caregivers : [];

  const handleSendSOS = () => {
    setSosSent(true);
    if (onTriggerSOS) {
      onTriggerSOS();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col lg:flex-row">
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-80 lg:fixed lg:inset-y-0 bg-white border-r-2 border-slate-200 z-30 justify-between">
        <div>
          {/* Brand Logo Header */}
          <div className="h-22 px-6 flex items-center gap-3 border-b border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-600 to-sky-600 flex items-center justify-center text-white shadow-md">
              <HeartHandshake className="w-7 h-7" />
            </div>
            <div>
              <span className="text-2xl font-extrabold tracking-tight text-slate-900">
                Care<span className="text-teal-600">Connect</span>
              </span>
              <span className="block text-xs font-bold uppercase tracking-wider text-teal-700">
                {currentUser?.role === 'caregiver' ? 'Caregiver Portal' : 'Senior Companion'}
              </span>
            </div>
          </div>

          {/* Patient Quick Card */}
          <div className="mx-4 mt-5 p-4 rounded-2xl bg-teal-50/80 border border-teal-200">
            <div className="text-sm font-bold uppercase tracking-wider text-teal-800">
              Active Care Profile
            </div>
            <div className="text-xl font-extrabold text-slate-900 mt-0.5">
              {safeFullName}
            </div>
            <div className="text-base text-slate-700 font-medium mt-0.5">
              Age {patientProfile?.age || 74} • Blood Group {patientProfile?.bloodGroup || 'O+'}
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="mt-5 px-4 space-y-2" aria-label="Dashboard Sidebar Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-lg font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <Icon className="w-6 h-6 shrink-0" />
                    <span>{item.label}</span>
                  </div>

                  {/* Badges for Medications & Notifications */}
                  {item.id === 'medications' && pendingMedsCount > 0 && (
                    <span
                      className={`px-2.5 py-0.5 text-sm font-extrabold rounded-full ${
                        isActive ? 'bg-white text-teal-800' : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {pendingMedsCount} due
                    </span>
                  )}

                  {item.id === 'notifications' && unreadNotificationsCount > 0 && (
                    <span
                      className={`px-2.5 py-0.5 text-sm font-extrabold rounded-full ${
                        isActive ? 'bg-white text-teal-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {unreadNotificationsCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Emergency SOS, Reset Demo & Logout */}
        <div className="p-4 border-t border-slate-200 space-y-2.5 bg-slate-50/60">
          <button
            type="button"
            onClick={() => {
              setSosSent(false);
              setSosModalOpen(true);
            }}
            className="w-full py-3.5 px-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-lg flex items-center justify-center gap-2.5 shadow-md cursor-pointer transition-colors"
          >
            <ShieldAlert className="w-6 h-6" />
            <span>Emergency SOS Alert</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            {onResetDemoData && (
              <button
                type="button"
                onClick={onResetDemoData}
                className="py-2.5 px-3 rounded-xl bg-white hover:bg-teal-50 text-slate-700 hover:text-teal-800 border-2 border-slate-300 font-bold text-sm flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                title="Restore default sample data"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset Demo</span>
              </button>
            )}

            <button
              type="button"
              onClick={onLogout}
              className="py-2.5 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border-2 border-slate-300 font-bold text-sm flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 lg:pl-80 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b-2 border-slate-200 px-4 sm:px-6 lg:px-8 h-22 flex items-center justify-between gap-4">
          {/* Mobile Brand & Menu Trigger */}
          <div className="flex items-center gap-3 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-3 rounded-xl bg-slate-100 text-slate-800 border-2 border-slate-300 font-bold flex items-center gap-2"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
              <span className="text-base font-extrabold">Menu</span>
            </button>
            <span className="text-xl sm:text-2xl font-extrabold text-slate-900">
              Care<span className="text-teal-600">Connect</span>
            </span>
          </div>

          {/* Desktop Greeting */}
          <div className="hidden lg:block">
            <h1 className="text-2xl font-extrabold text-slate-900">
              Good Day, {currentUser?.name || safePreferredName}!
            </h1>
            <p className="text-base text-slate-600 font-medium">
              Here is today’s health & medication care summary.
            </p>
          </div>

          {/* Right Quick Actions */}
          <div className="flex items-center gap-3">
            {/* Supabase / Database Sync Status Badge */}
            <span
              className={`hidden md:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-extrabold border ${
                dbSyncStatus.includes('Supabase Cloud')
                  ? 'bg-teal-100 text-teal-900 border-teal-300'
                  : 'bg-slate-100 text-slate-700 border-slate-300'
              }`}
            >
              <Database className="w-4 h-4 text-teal-700" />
              <span>{dbSyncStatus}</span>
            </span>

            {/* Notification Bell Button */}
            <button
              type="button"
              onClick={() => setActiveTab('notifications')}
              className="relative p-3.5 rounded-2xl bg-slate-100 hover:bg-teal-50 text-slate-800 hover:text-teal-800 border-2 border-slate-200 cursor-pointer transition-colors"
              aria-label="View Notifications"
            >
              <Bell className="w-6 h-6" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-red-600 text-white text-xs font-extrabold flex items-center justify-center">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>

            {/* Mobile SOS Button */}
            <button
              type="button"
              onClick={() => {
                setSosSent(false);
                setSosModalOpen(true);
              }}
              className="lg:hidden py-3 px-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-base flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <ShieldAlert className="w-5 h-5" />
              <span>SOS</span>
            </button>

            {/* Profile Pill */}
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className="hidden sm:flex items-center gap-3 py-2 px-3.5 rounded-2xl bg-teal-50 hover:bg-teal-100 border border-teal-200 cursor-pointer transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-teal-600 text-white font-extrabold text-lg flex items-center justify-center">
                {safeInitial}
              </div>
              <div className="text-left">
                <div className="text-base font-extrabold text-slate-900 leading-tight">
                  {safePreferredName}
                </div>
                <div className="text-xs font-bold text-teal-800">View Profile</div>
              </div>
            </button>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-b-4 border-teal-600 p-4 shadow-xl space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-xl font-bold ${
                    isActive
                      ? 'bg-teal-600 text-white'
                      : 'text-slate-800 hover:bg-teal-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-6 h-6" />
                    <span>{item.label}</span>
                  </div>
                  {item.id === 'medications' && pendingMedsCount > 0 && (
                    <span className="px-3 py-0.5 text-sm rounded-full bg-amber-100 text-amber-900 font-extrabold">
                      {pendingMedsCount} due
                    </span>
                  )}
                </button>
              );
            })}
            <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row gap-2">
              {onResetDemoData && (
                <button
                  type="button"
                  onClick={() => {
                    onResetDemoData();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-3.5 px-4 rounded-xl bg-teal-50 text-teal-900 font-bold text-lg flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-5 h-5" />
                  <span>Reset Demo Data</span>
                </button>
              )}
              <button
                type="button"
                onClick={onLogout}
                className="w-full py-3.5 px-4 rounded-xl bg-slate-100 text-slate-800 font-bold text-lg flex items-center justify-center gap-2"
              >
                <LogOut className="w-5 h-5" />
                <span>Sign Out / Back to Home</span>
              </button>
            </div>
          </div>
        )}

        {/* Active Tab Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Emergency SOS Modal */}
      {sosModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 border-4 border-red-600 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3 text-red-700">
                <ShieldAlert className="w-9 h-9" />
                <h2 className="text-2xl sm:text-3xl font-extrabold">
                  Emergency SOS Assistance
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSosModalOpen(false)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {!sosSent ? (
              <div className="py-6 space-y-5">
                <p className="text-xl text-slate-800 font-medium leading-relaxed">
                  Pressing the red button below will immediately send an{' '}
                  <strong>Emergency Alert & Location</strong> to your primary family caregivers:
                </p>

                <div className="space-y-3">
                  {safeCaregivers
                    .filter((c) => c.isEmergencyContact)
                    .map((contact) => (
                      <div
                        key={contact.id}
                        className="p-4 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-between"
                      >
                        <div>
                          <div className="text-lg font-extrabold text-slate-900">
                            {contact.name}
                          </div>
                          <div className="text-base text-slate-700">
                            {contact.relationship} • {contact.phone}
                          </div>
                        </div>
                        <PhoneCall className="w-6 h-6 text-red-700" />
                      </div>
                    ))}
                </div>

                <button
                  type="button"
                  onClick={handleSendSOS}
                  className="w-full py-5 px-6 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-2xl flex items-center justify-center gap-3 shadow-lg cursor-pointer"
                >
                  <ShieldAlert className="w-8 h-8" />
                  <span>SEND EMERGENCY ALERT NOW</span>
                </button>
              </div>
            ) : (
              <div className="py-6 space-y-4 text-center">
                <div className="w-16 h-16 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-extrabold text-slate-900">
                  SOS Alert Sent to Caregivers!
                </h3>
                <p className="text-lg text-slate-700">
                  Your emergency contacts have been notified with your current status and medical profile.
                </p>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <Button
                variant="ghost"
                size="md"
                onClick={() => setSosModalOpen(false)}
                className="w-full"
              >
                Close Window
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
