'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  BookOpen,
  Music,
  Bookmark,
  TrendingUp,
  User,
  LogOut,
  Radio,
} from 'lucide-react';

const NAV_ITEMS = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Learn', href: '/learn', icon: BookOpen },
  { name: 'Practice', href: '/practice', icon: Music },
  { name: 'Tuner', href: '/tuner', icon: Radio },
  { name: 'Library', href: '/library', icon: Bookmark },
  { name: 'Progress', href: '/progress', icon: TrendingUp },
  { name: 'Profile', href: '/profile', icon: User },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState<string>('Learner');
  const [userXP, setUserXP] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);

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

  return (
    <div className="min-h-screen bg-[#0E1014] text-slate-100 flex flex-col md:flex-row">
      {/* Desktop Sidebar (Left) */}
      <aside className="hidden md:flex flex-col w-64 border-r border-[#2A303A] bg-[#121418] p-5 justify-between shrink-0 fixed inset-y-0 left-0 z-30">
        <div className="space-y-8">
          {/* Brand Header */}
          <Link href="/dashboard" className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-xl">
              🎸
            </div>
            <div>
              <div className="font-bold text-sm text-slate-100 tracking-tight">Guitar Learning</div>
              <div className="text-[11px] text-amber-400 font-medium">Beginner Platform</div>
            </div>
          </Link>

          {/* User Quick Stats Widget */}
          <div className="p-3.5 rounded-xl bg-[#171A20] border border-[#2A303A] flex items-center justify-around text-center">
            <div>
              <div className="text-xs text-slate-400 font-medium flex items-center justify-center gap-1">
                <span>🔥</span> Streak
              </div>
              <div className="font-bold text-base text-amber-400 mt-0.5">{streak}d</div>
            </div>
            <div className="h-8 w-px bg-[#2A303A]" />
            <div>
              <div className="text-xs text-slate-400 font-medium flex items-center justify-center gap-1">
                <span>⚡</span> Total XP
              </div>
              <div className="font-bold text-base text-slate-100 mt-0.5">{userXP}</div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5" aria-label="Main Navigation">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 font-semibold shadow-md shadow-amber-500/20'
                      : 'text-slate-300 hover:text-white hover:bg-[#1C2028]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Footer */}
        <div className="pt-4 border-t border-[#2A303A] flex items-center justify-between px-2">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold flex items-center justify-center text-xs shrink-0">
              {userName.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs font-semibold text-slate-200 truncate">{userName}</span>
          </div>

          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 pb-20 md:pb-8 min-h-screen">
        <div className="max-w-6xl mx-auto p-4 sm:p-6 md:p-8">{children}</div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#121418]/95 backdrop-blur-lg border-t border-[#2A303A] flex items-center justify-around z-40 px-2"
      >
        {NAV_ITEMS.filter((item) => item.name !== 'Library').map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-colors ${
                isActive ? 'text-amber-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
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
