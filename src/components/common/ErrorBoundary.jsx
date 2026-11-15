import React from 'react';
import { HeartHandshake, RefreshCw, AlertTriangle } from 'lucide-react';

/**
 * ErrorBoundary Component:
 * A safety net for production/deployment. If any unexpected JavaScript error occurs,
 * instead of showing a blank white screen, it catches the error and lets the user
 * safely reset or reload the application.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error?.message || 'An unexpected application error occurred.',
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error('CareConnect ErrorBoundary caught an error:', error, errorInfo);
  }

  handleResetAndReload = () => {
    try {
      localStorage.removeItem('cc_profile');
      localStorage.removeItem('cc_medications');
      localStorage.removeItem('cc_appointments');
      localStorage.removeItem('cc_caregivers');
      localStorage.removeItem('cc_notifications');
    } catch {
      // Ignore storage errors if private browsing is enabled
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-slate-900">
          <div className="max-w-lg w-full bg-white rounded-3xl border-2 border-teal-500 p-8 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 text-teal-700 font-extrabold text-lg">
                <HeartHandshake className="w-6 h-6" />
                <span>CareConnect Safe Recovery</span>
              </div>
              <h1 className="text-3xl font-extrabold text-slate-900">
                Let’s Refresh Your Screen
              </h1>
              <p className="text-lg text-slate-600 leading-relaxed">
                We encountered a small hiccup loading your view. Click the button below to safely restore your CareConnect dashboard.
              </p>
            </div>

            <button
              type="button"
              onClick={this.handleResetAndReload}
              className="w-full py-4 px-6 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xl flex items-center justify-center gap-3 shadow-md cursor-pointer transition-colors"
            >
              <RefreshCw className="w-6 h-6" />
              <span>Restore & Reload CareConnect</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

