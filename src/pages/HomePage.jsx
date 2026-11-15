import React from 'react';
import Navbar from '../components/layout/Navbar';
import Hero from '../components/home/Hero';
import Features from '../components/home/Features';
import HowItWorks from '../components/home/HowItWorks';
import Footer from '../components/layout/Footer';

/**
 * HomePage component: Assembles the Navbar, Hero, Features, HowItWorks, and Footer.
 * Clicking "Login" or "Get Started" navigates directly to the AuthPage.
 */
export default function HomePage({ onNavigateAuth }) {
  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900">
      {/* Top Navigation */}
      <Navbar onAuthClick={(mode) => onNavigateAuth(mode)} />

      {/* Main Content */}
      <main className="flex-grow">
        <Hero onAuthClick={(mode) => onNavigateAuth(mode)} />
        <Features />
        <HowItWorks onAuthClick={(mode) => onNavigateAuth(mode)} />
      </main>

      {/* Bottom Footer */}
      <Footer />
    </div>
  );
}
