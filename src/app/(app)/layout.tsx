'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  GitBranch,
  Timer,
  Radio,
  Bookmark,
  TrendingUp,
  User,
  LogOut,
  Shield,
  Flame,
} from 'lucide-react';
import { Logo } from '@/components/ui/Logo';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Learning Path', href: '/learn', icon: GitBranch },
  { name: 'Practice Room', href: '/practice', icon: Timer },
  { name: 'Tuner & Audio', href: '/tuner', icon: Radio },
  { name: 'Chord Vault', href: '/library', icon: Bookmark },
  { name: 'Progress Ledger', href: '/progress', icon: TrendingUp },
  { name: 'Security & Sessions', href: '/settings/security', icon: Shield },
  { name: 'Profile', href: '/profile', icon: User },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState<string>('Learner');
  const [userXP, setUserXP] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const practiceMinutes = 10;
  const dailyTargetMinutes = 15;



  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => {
        if (res.status === 401) {
          router.push('/login');
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.data) {
          setUserName(data.data.name || 'Learner');
          setUserXP(data.data.profile?.totalXP || 0);
          setStreak(data.data.profile?.currentStreak || 0);

          if (!data.data.onboardingCompleted && pathname !== '/onboarding') {
            router.push('/onboarding');
          }
        }
      })
      .catch(() => null);
  }, [pathname, router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const progressPercent = Math.min(100, Math.round((practiceMinutes / dailyTargetMinutes) * 100));

  return (
    <div className="min-h-screen bg-[#0E1014] text-slate-100 flex flex-col md:flex-row">
      {/* Desktop Sidebar (Left) */}
      <aside className="hidden md:flex flex-col w-64 border-r border-[#2A303A] bg-[#121418] p-5 justify-between shrink-0 fixed inset-y-0 left-0 z-30">
        <div className="space-y-6">
          {/* Brand Header */}
          <Link href="/dashboard" className="flex items-center px-1">
            <Logo size="md" subtitle="Acoustic & Electric" />
          </Link>

          {/* Navigation Engine Header */}
          <div className="px-1 pt-1">
            <span className="font-mono text-[10px] uppercase text-slate-500 tracking-wider font-semibold">
              Navigation Engine
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1" aria-label="Main Navigation">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 group ${
                    isActive
                      ? 'bg-[#1E222A] text-amber-400 border-l-2 border-amber-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_16px_rgba(245,158,11,0.12)]'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-[#171A20]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                    <span className="truncate">{item.name}</span>
                  </div>

                  {item.href === '/dashboard' && streak > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-mono border border-amber-500/20">
                      🔥 {streak}d
                    </span>
                  )}
                  {item.href === '/practice' && (
                    <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-mono border border-emerald-500/20">
                      {dailyTargetMinutes}m
                    </span>
                  )}
                  {item.href === '/progress' && userXP > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-mono">
                      +{userXP}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Daily Target Mini Card & User Footer */}
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-[#171A20] border border-[#2A303A] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-[10px] uppercase text-slate-400 font-semibold">Daily Target</span>
              <span className="font-mono text-xs text-emerald-400 font-bold">{progressPercent}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[#0E1014] overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.5)] transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono pt-0.5">
              <span>{practiceMinutes} of {dailyTargetMinutes}m goal</span>
              <span className="text-amber-400 flex items-center gap-0.5">
                <Flame className="w-3 h-3" /> {streak}d
              </span>
            </div>
          </div>

          {/* User Signout footer */}
          <div className="pt-3 border-t border-[#2A303A] flex items-center justify-between px-1">
            <Link href="/profile" className="flex items-center gap-2.5 overflow-hidden group">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold flex items-center justify-center text-xs shrink-0 group-hover:border-amber-400">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col truncate">
                <span className="text-xs font-semibold text-slate-200 truncate group-hover:text-amber-400 transition-colors">
                  {userName}
                </span>
                <span className="text-[10px] font-mono text-slate-500">Learner</span>
              </div>
            </Link>

            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 pb-20 md:pb-8 min-h-screen">
        <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">{children}</div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#121418]/95 backdrop-blur-lg border-t border-[#2A303A] flex items-center justify-around z-40 px-2"
      >
        {[
          { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
          { name: 'Learn', href: '/learn', icon: GitBranch },
          { name: 'Practice', href: '/practice', icon: Timer },
          { name: 'Tuner', href: '/tuner', icon: Radio },
          { name: 'Chords', href: '/library', icon: Bookmark },
          { name: 'Security', href: '/settings/security', icon: Shield },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-lg transition-colors ${
                isActive ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-[10px]">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
