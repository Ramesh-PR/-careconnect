import React, { useState, useEffect } from 'react';
import HomePage from './pages/HomePage';
import AuthPage from './pages/AuthPage';
import DashboardApp from './pages/DashboardApp';
import { supabase, isSupabaseConfigured } from './lib/supabaseClient';
import { loadActiveSession, clearActiveSession } from './services/authService';

/**
 * Root App Component:
 * Enforces strict route protection:
 * - DashboardApp can ONLY be rendered when `currentUser` holds a verified session token.
 * - Unauthenticated users attempting to access the dashboard are redirected to `AuthPage`.
 */
export default function App() {
  const [currentUser, setCurrentUser] = useState(() => loadActiveSession());
  const [currentScreen, setCurrentScreen] = useState(() =>
    loadActiveSession() ? 'dashboard' : 'home'
  ); // 'home' | 'auth' | 'dashboard'
  const [authInitialMode, setAuthInitialMode] = useState('login'); // 'login' | 'register'

  // Restore Supabase Auth session if configured
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setCurrentUser({
          id: session.user.id,
          name: session.user.user_metadata?.full_name || session.user.email,
          email: session.user.email,
          role: session.user.user_metadata?.role || 'patient',
          isSupabaseUser: true,
          sessionToken: session.access_token,
        });
        setCurrentScreen('dashboard');
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setCurrentUser({
          id: session.user.id,
          name: session.user.user_metadata?.full_name || session.user.email,
          email: session.user.email,
          role: session.user.user_metadata?.role || 'patient',
          isSupabaseUser: true,
          sessionToken: session.access_token,
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleOpenAuth = (mode = 'login') => {
    setAuthInitialMode(mode);
    setCurrentScreen('auth');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoginSuccess = (verifiedUser) => {
    if (!verifiedUser || !verifiedUser.id || !verifiedUser.sessionToken) {
      return;
    }
    setCurrentUser(verifiedUser);
    setCurrentScreen('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = async () => {
    clearActiveSession();
    if (isSupabaseConfigured && supabase && currentUser?.isSupabaseUser) {
      await supabase.auth.signOut();
    }
    setCurrentUser(null);
    setCurrentScreen('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Route Guard: Never render DashboardApp unless currentUser has a verified sessionToken
  if (currentScreen === 'dashboard') {
    if (!currentUser || !currentUser.id || !currentUser.sessionToken) {
      return (
        <AuthPage
          initialMode="login"
          onLoginSuccess={handleLoginSuccess}
          onBackToHome={() => setCurrentScreen('home')}
        />
      );
    }
    return <DashboardApp currentUser={currentUser} onLogout={handleLogout} />;
  }

  if (currentScreen === 'auth') {
    return (
      <AuthPage
        initialMode={authInitialMode}
        onLoginSuccess={handleLoginSuccess}
        onBackToHome={() => setCurrentScreen('home')}
      />
    );
  }

  return <HomePage onNavigateAuth={handleOpenAuth} />;
}
