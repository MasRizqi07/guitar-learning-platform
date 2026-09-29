'use client';

import React from 'react';
import Link from 'next/link';
import {
  Clock,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Database,
  ArrowRight,
} from 'lucide-react';

import { Logo } from '@/components/ui/Logo';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-[#0E1014] text-slate-100 flex flex-col justify-between selection:bg-amber-500 selection:text-slate-950">
      {/* Top Header */}
      <header className="h-16 px-4 sm:px-8 border-b border-[#2A303A] bg-[#121418]/90 backdrop-blur-xl flex items-center justify-between sticky top-0 z-50">
        <Link href="/" className="flex items-center">
          <Logo size="sm" subtitle="CORE PLATFORM" />
        </Link>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="uppercase font-bold">Scheduled Maintenance Active</span>
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
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>Infrastructure Upgrade in Progress • Migration Window v2.4</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-slate-100 tracking-tight">
            Platform Upgrades &amp; Database Tuning
          </h1>
          <p className="text-sm sm:text-base text-slate-400 max-w-2xl leading-relaxed">
            FretFlow is undergoing scheduled multi-region database migration. Your practice streaks, lesson progress, and XP ledgers are safely persisted in cold storage.
          </p>
        </div>

        {/* Progress & Migration Steps Card */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <Card className="md:col-span-8 p-6 bg-[#171A20] border-[#2A303A] shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-slate-200">
                <Clock className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-bold">Estimated Completion: ~25 minutes</span>
              </div>
              <span className="font-mono text-sm font-bold text-amber-400">65% Complete</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-[#0E1014] h-2.5 rounded-full overflow-hidden p-0.5 border border-[#2A303A]">
              <div className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full rounded-full w-[65%] transition-all duration-700 shadow-[0_0_12px_rgba(245,158,11,0.4)]" />
            </div>

            {/* Steps Checklist */}
            <div className="space-y-2.5 pt-1 text-xs">
              <div className="p-3 rounded-xl bg-[#0E1014] border border-[#2A303A] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-200">1. Database Snapshot &amp; Cold Storage Backup</div>
                    <div className="text-[10px] font-mono text-slate-500 uppercase">ACID-compliant state lock</div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold">
                  Completed
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#1A1E26] border border-amber-500/30 flex items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-100">2. Prisma Schema V2.4 Zero-Downtime Apply</div>
                    <div className="text-[10px] font-mono text-amber-400/90 uppercase">Partitioning practice sessions table</div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono text-[10px] font-bold">
                  In Progress
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#0E1014]/60 border border-[#2A303A]/60 flex items-center justify-between gap-3 opacity-60">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full border border-slate-600 shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-400">3. Web Audio Edge CDN &amp; Asset Cache Warmup</div>
                    <div className="text-[10px] font-mono text-slate-600 uppercase">Acoustic tone synthesizer buffers</div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-[#171A20] text-slate-500 font-mono text-[10px]">
                  Queued
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#0E1014] border border-[#2A303A] flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-400">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <ShieldCheck className="w-4 h-4" /> Target Service Restoration: 19:30 UTC
              </span>
              <span className="text-slate-500">Monitored by Platform SRE Duty Engine</span>
            </div>
          </Card>

          {/* Right Invariant Guarantee Card */}
          <Card className="md:col-span-4 p-6 bg-[#171A20] border-[#2A303A] shadow-xl flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-amber-400">
                <Database className="w-4 h-4" />
                <span className="text-xs font-mono uppercase font-bold tracking-wider">Zero Data Loss</span>
              </div>
              <h2 className="text-base font-bold text-slate-100">Telemetry Invariant Protection</h2>
              <ul className="space-y-3 text-xs text-slate-400">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Daily streaks are automatically frozen and protected against expiration.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Completed lesson progress is cryptographically retained.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Web Audio API client synthesis engine runs 100% locally.</span>
                </li>
              </ul>
            </div>

            <div className="pt-4 border-t border-[#2A303A]">
              <Link href="/help" className="w-full">
                <Button variant="outline" className="w-full text-xs font-mono border-[#2A303A] gap-2">
                  <span>Student Support Desk</span>
                  <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="h-14 border-t border-[#2A303A] bg-[#0E1014] px-4 sm:px-8 flex items-center justify-between text-xs text-slate-500 font-mono">
        <span>FretFlow Platform Engine 2.4.0</span>
        <span className="text-emerald-400 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> All systems nominal
        </span>
      </footer>
    </div>
  );
}
