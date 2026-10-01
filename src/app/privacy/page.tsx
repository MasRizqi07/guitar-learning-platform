import React from 'react';
import Link from 'next/link';
import { Shield, ArrowLeft, Lock, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';

export const metadata = {
  title: 'Privacy Policy | FretFlow',
  description: 'Understand how FretFlow collects, protects, and handles your learning data and account information.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navigation */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-amber-400 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to FretFlow</span>
        </Link>

        {/* Title */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
            <Shield className="w-3.5 h-3.5" />
            <span>Privacy & Data Transparency</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            FretFlow Privacy Policy
          </h1>
          <p className="text-sm text-slate-400 font-mono">
            Effective Date: October 1, 2026 • Platform Version: v2.0.0
          </p>
        </div>

        {/* Core Principles */}
        <Card className="p-6 border-slate-800 bg-slate-900/60 backdrop-blur-md space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Lock className="w-5 h-5 text-amber-400" />
            <span>Our Commitment to Privacy</span>
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            At FretFlow, we believe technology should empower musicians without compromising privacy. We do not sell, rent, or monetize your personal data. This policy transparently outlines exactly what data we collect, how it is secured, and how you can exercise full control over your records.
          </p>
        </Card>

        {/* Section 1: Data We Collect */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">1. Information We Collect</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="p-5 border-slate-800 bg-slate-900/40 space-y-2">
              <h3 className="text-sm font-semibold text-amber-400">Account Credentials</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Your name, email address, and an irreversibly hashed password (using industry-standard bcrypt with salt). We never store or transmit plain text passwords.
              </p>
            </Card>

            <Card className="p-5 border-slate-800 bg-slate-900/40 space-y-2">
              <h3 className="text-sm font-semibold text-amber-400">Curriculum & Practice Activity</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Lessons completed, practice session timestamps and durations, quiz attempts, streak counters, and earned XP. This data powers your personalized roadmap.
              </p>
            </Card>

            <Card className="p-5 border-slate-800 bg-slate-900/40 space-y-2">
              <h3 className="text-sm font-semibold text-amber-400">Audio Signal Processing</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Microphone audio streams used by the Interactive Tuner and Fretboard are processed entirely in-memory within your local web browser. Audio recordings are never uploaded or stored on our servers.
              </p>
            </Card>

            <Card className="p-5 border-slate-800 bg-slate-900/40 space-y-2">
              <h3 className="text-sm font-semibold text-amber-400">Support Interactions</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tickets, subject lines, and messages you exchange with our support desk. Operational internal notes written by staff are isolated in secure database tables and excluded from exports.
              </p>
            </Card>
          </div>
        </div>

        {/* Section 2: Technical Telemetry & Security */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">2. Technical Telemetry & Secret Scrubbing</h2>
          <Card className="p-6 border-slate-800 bg-slate-900/40 space-y-3">
            <p className="text-sm text-slate-300 leading-relaxed">
              When interacting with FretFlow APIs, we record standard diagnostic telemetry: HTTP method, route, response status, anonymized client IP hashes, and device user-agent strings.
            </p>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-400 space-y-1">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Automated Telemetry Scrubber Active</span>
              </div>
              <p>
                Our structured logging pipeline automatically detects and scrubs sensitive keys (passwords, session cookies, database connection strings, bearer tokens) before any telemetry is retained.
              </p>
            </div>
          </Card>
        </div>

        {/* Section 3: User Rights & GDPR / CCPA Compliance */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">3. Your Rights & Data Portability</h2>
          <Card className="p-6 border-slate-800 bg-slate-900/40 space-y-4">
            <p className="text-sm text-slate-300 leading-relaxed">
              Under applicable privacy regulations (including GDPR and CCPA), you maintain complete sovereignty over your data:
            </p>
            <ul className="list-disc list-inside space-y-2 text-xs text-slate-400">
              <li>
                <strong className="text-slate-200">Right to Portability:</strong> You may download a machine-readable JSON archive of all your learning records at any time from{' '}
                <Link href="/settings/data" className="text-amber-400 hover:underline">
                  Settings &gt; Data Privacy
                </Link>.
              </li>
              <li>
                <strong className="text-slate-200">Right to Erasure:</strong> You can initiate account deletion at any time, placing your account into deletion pending and revoking all device sessions.
              </li>
              <li>
                <strong className="text-slate-200">Session Controls:</strong> Inspect active device sessions, remote user agents, and invoke emergency revocation from{' '}
                <Link href="/settings/security" className="text-amber-400 hover:underline">
                  Security Settings
                </Link>.
              </li>
            </ul>
          </Card>
        </div>

        {/* Footer */}
        <div className="pt-8 border-t border-slate-800/80 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 FretFlow Guitar Learning Platform. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-amber-400 transition-colors">
              Terms of Service
            </Link>
            <Link href="/help" className="hover:text-amber-400 transition-colors">
              Support & Help Desk
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
