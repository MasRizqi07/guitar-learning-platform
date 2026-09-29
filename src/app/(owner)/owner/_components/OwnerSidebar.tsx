'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  TrendingUp,
  GraduationCap,
  FileText,
  Flag,
  Settings,
  ShieldCheck,
  BarChart3,
  Menu,
  X,
  Crown,
  ExternalLink,
} from 'lucide-react';
import clsx from 'clsx';

export function OwnerSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-[#0B0F17] border-b border-slate-800 text-white z-30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Crown className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm tracking-wide bg-gradient-to-r from-amber-400 to-amber-200 bg-clip-text text-transparent">
            OWNER CONSOLE
          </span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300"
          aria-label="Toggle navigation menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar Desktop & Mobile drawer */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-40 w-64 bg-[#080B11] border-r border-slate-800/80 flex flex-col transition-transform duration-200 ease-in-out md:static md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <Link href="/owner" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 p-0.5 shadow-lg shadow-amber-500/20">
              <div className="w-full h-full bg-[#080B11] rounded-[10px] flex items-center justify-center">
                <Crown className="w-4 h-4 text-amber-400" />
              </div>
            </div>
            <div>
              <div className="font-bold text-sm text-slate-100 tracking-wider">STRUM OWNER</div>
              <div className="text-[10px] font-semibold text-amber-400/90 tracking-widest uppercase">
                Executive Console
              </div>
            </div>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden text-slate-400 hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 py-4 px-3 overflow-y-auto space-y-6">
          <div>
            <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Executive
            </div>
            <nav className="space-y-1">
              <Link
                href="/owner"
                onClick={() => setMobileOpen(false)}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors',
                  pathname === '/owner'
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                )}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Executive Overview</span>
              </Link>
            </nav>
          </div>

          <div>
            <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Product Analytics
            </div>
            <nav className="space-y-1">
              <Link
                href="/owner/analytics/users"
                onClick={() => setMobileOpen(false)}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors',
                  pathname.startsWith('/owner/analytics/users')
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                )}
              >
                <TrendingUp className="w-4 h-4" />
                <span>Growth & Retention</span>
              </Link>

              <Link
                href="/owner/analytics/learning"
                onClick={() => setMobileOpen(false)}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors',
                  pathname.startsWith('/owner/analytics/learning')
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                )}
              >
                <GraduationCap className="w-4 h-4" />
                <span>Learning & Practice</span>
              </Link>

              <Link
                href="/owner/analytics/content"
                onClick={() => setMobileOpen(false)}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors',
                  pathname.startsWith('/owner/analytics/content')
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                )}
              >
                <FileText className="w-4 h-4" />
                <span>Content Performance</span>
              </Link>
            </nav>
          </div>

          <div>
            <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Governance
            </div>
            <nav className="space-y-1">
              <Link
                href="/owner/features"
                onClick={() => setMobileOpen(false)}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors',
                  pathname.startsWith('/owner/features')
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                )}
              >
                <Flag className="w-4 h-4" />
                <span>Feature Flags</span>
              </Link>

              <Link
                href="/owner/system"
                onClick={() => setMobileOpen(false)}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors',
                  pathname.startsWith('/owner/system')
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                )}
              >
                <Settings className="w-4 h-4" />
                <span>Platform Settings</span>
              </Link>

              <Link
                href="/owner/audit"
                onClick={() => setMobileOpen(false)}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors',
                  pathname.startsWith('/owner/audit')
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                )}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Privileged Audit</span>
              </Link>
            </nav>
          </div>
        </div>

        {/* Navigation jump to Admin & App */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-900/30 space-y-1">
          <Link
            href="/admin"
            className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors"
          >
            <span className="flex items-center gap-2">
              <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Admin Console</span>
            </span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors"
          >
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
              <span>Learner App</span>
            </span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </Link>
        </div>
      </aside>
    </>
  );
}
