import React from 'react';
import Link from 'next/link';
import { FileText, ArrowLeft, BookOpen } from 'lucide-react';
import { Card } from '@/components/ui/Card';

export const metadata = {
  title: 'Terms of Service | FretFlow',
  description: 'Review the terms and conditions governing the use of the FretFlow Guitar Learning Platform.',
};

export default function TermsOfServicePage() {
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

        {/* Header */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
            <FileText className="w-3.5 h-3.5" />
            <span>Platform Agreement</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Terms of Service
          </h1>
          <p className="text-sm text-slate-400 font-mono">
            Last Updated: October 1, 2026 • Platform Version: v2.0.0
          </p>
        </div>

        {/* Introduction */}
        <Card className="p-6 border-slate-800 bg-slate-900/60 backdrop-blur-md space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-400" />
            <span>Acceptance of Terms</span>
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            By creating an account or accessing the FretFlow platform, you agree to comply with and be bound by these Terms of Service. If you disagree with any portion of these terms, please discontinue use of the service.
          </p>
        </Card>

        {/* Terms Content */}
        <div className="space-y-6">
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">1. User Accounts & Security</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized access or security breach. FretFlow provides device session inspection and instant revocation tools in your security settings.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">2. Educational Content & Intellectual Property</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              All curriculum modules, lessons, audio exercises, chords, diagrams, tab notation, and proprietary learning methodologies are the intellectual property of FretFlow or its content licensors. You are granted a personal, non-exclusive, non-transferable license to access the learning materials for individual, non-commercial education.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">3. Fair Usage & Platform Integrity</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              You agree not to disrupt or attempt to circumvent platform rate limits, scrape curriculum data, reverse engineer server APIs, or submit abusive content through the support desk. Accounts found violating security boundaries or attempting unauthorized data access are subject to immediate suspension or termination.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">4. Interactive Audio & Audio Tools</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              The Interactive Guitar Tuner and Pitch Detection tools rely on real-time client-side analysis. Audio results may vary depending on ambient acoustics, microphone hardware, and instrument calibration. FretFlow does not guarantee perfect acoustic pitch accuracy under all external conditions.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">5. Limitation of Liability</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              FretFlow is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis without warranties of any kind, whether express or implied. In no event shall FretFlow or its contributors be liable for any indirect, incidental, or consequential damages resulting from the use or inability to use the platform.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="pt-8 border-t border-slate-800/80 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 FretFlow Guitar Learning Platform. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-amber-400 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/help" className="hover:text-amber-400 transition-colors">
              Help Center
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
