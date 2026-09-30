'use client';

import React from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Database,
  ArrowRight,
  AlertCircle,
  LifeBuoy,
} from 'lucide-react';

import { Logo } from '@/components/ui/Logo';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-[#0E1014] text-slate-100 flex flex-col justify-between selection:bg-amber-500 selection:text-slate-950">
      {/* Top Header */}
      <header className="h-16 px-4 sm:px-8 border-b border-[#2A303A] bg-[#121418]/90 backdrop-blur-xl flex items-center justify-between sticky top-0 z-50">
        <Logo size="sm" subtitle="CORE PLATFORM" href="/" />
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="uppercase font-bold">Maintenance Mode Active</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8 w-full">
        {/* Ambient Amber Glow */}
        <div className="relative">
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />
        </div>

        {/* Hero Cluster */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#171A20] border border-[#2A303A] text-xs font-mono text-amber-400">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Platform Maintenance in Progress</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-slate-100 tracking-tight">
            System Maintenance &amp; Updates
          </h1>
          <p className="text-sm sm:text-base text-slate-400 max-w-2xl leading-relaxed">
            FretFlow is temporarily undergoing maintenance or administrative configuration updates. 
            All learning progress, practice streaks, and account profiles remain safely stored and preserved.
          </p>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <Card className="md:col-span-8 p-6 bg-[#171A20] border-[#2A303A] shadow-xl space-y-6">
            <div className="space-y-2">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Service Status &amp; Data Integrity</span>
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                During maintenance windows, write operations on curriculum and practice records are paused to ensure full ACID compliance and prevent data desynchronization.
              </p>
            </div>

            <div className="space-y-3 pt-2 text-xs">
              <div className="p-3.5 rounded-xl bg-[#0E1014] border border-[#2A303A] flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-semibold text-slate-200">Account &amp; Security Vault</div>
                  <div className="text-[11px] text-slate-500">Authentication sessions and user credentials protected</div>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold">
                  Protected
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0E1014] border border-[#2A303A] flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-semibold text-slate-200">Help &amp; Support Operations</div>
                  <div className="text-[11px] text-slate-500">Support desk and knowledge base remain accessible for assistance</div>
                </div>
                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-mono text-[10px] font-bold">
                  Accessible
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#0E1014] border border-[#2A303A] flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-400">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-amber-400" /> Services will resume immediately once maintenance completes
              </span>
            </div>
          </Card>

          {/* Right Invariant Guarantee Card */}
          <Card className="md:col-span-4 p-6 bg-[#171A20] border-[#2A303A] shadow-xl flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-amber-400">
                <Database className="w-4 h-4" />
                <span className="text-xs font-mono uppercase font-bold tracking-wider">Zero Data Loss</span>
              </div>
              <h2 className="text-base font-bold text-slate-100">Guaranteed Protections</h2>
              <ul className="space-y-3 text-xs text-slate-400">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Daily streaks are preserved during maintenance.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Course completion records are durably persisted in PostgreSQL.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Client-side audio tuner and practice tools remain usable offline.</span>
                </li>
              </ul>
            </div>

            <div className="pt-4 border-t border-[#2A303A]">
              <Link href="/help" className="w-full">
                <Button variant="outline" className="w-full text-xs font-mono border-[#2A303A] gap-2">
                  <LifeBuoy className="w-3.5 h-3.5 text-amber-400" />
                  <span>Help &amp; Support Portal</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 ml-auto" />
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="h-14 border-t border-[#2A303A] bg-[#0E1014] px-4 sm:px-8 flex items-center justify-between text-xs text-slate-500 font-mono">
        <span>FretFlow Platform</span>
        <span className="text-amber-400 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Maintenance Mode
        </span>
      </footer>
    </div>
  );
}
