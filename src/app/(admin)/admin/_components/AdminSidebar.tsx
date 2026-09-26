'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  ShieldAlert,
  BookOpen,
  Image as ImageIcon,
  LifeBuoy,
  Menu,
  X,
  Shield,
} from 'lucide-react';
import clsx from 'clsx';
import { UserRole } from '@/lib/permissions';

interface AdminSidebarProps {
  currentRole: UserRole;
}

export function AdminSidebar({ currentRole }: AdminSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    {
      name: 'Overview',
      href: '/admin',
      icon: LayoutDashboard,
      active: pathname === '/admin',
      available: true,
    },
    {
      name: 'Users',
      href: '/admin/users',
      icon: Users,
      active: pathname.startsWith('/admin/users'),
      available: true,
    },
    {
      name: 'Audit Log',
      href: '/admin/audit',
      icon: ShieldAlert,
      active: pathname.startsWith('/admin/audit'),
      available: ['ADMIN', 'OWNER'].includes(currentRole),
    },
    {
      name: 'Content CMS',
      href: '#',
      icon: BookOpen,
      active: false,
      available: false,
      badge: 'Phase C',
    },
    {
      name: 'Media Library',
      href: '#',
      icon: ImageIcon,
      active: false,
      available: false,
      badge: 'Phase D',
    },
    {
      name: 'Support Tickets',
      href: '#',
      icon: LifeBuoy,
      active: false,
      available: false,
      badge: 'Phase F',
    },
  ];

  return (
    <>
      {/* Mobile Top Bar with Hamburger */}
      <div className="md:hidden flex items-center justify-between p-4 bg-[#12161F] border-b border-[#222938]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-base">
            🎸
          </div>
          <div>
            <span className="font-bold text-slate-100 text-sm tracking-tight">GLP Operations</span>
            <span className="text-[10px] block text-amber-400/80 font-semibold tracking-wider uppercase">
              {currentRole}
            </span>
          </div>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
          aria-label="Toggle Navigation"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Shell */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-64 bg-[#10141D] border-r border-[#1F2636] flex flex-col transition-transform duration-200 ease-in-out md:static md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-[#1F2636] flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20">
            🎸
          </div>
          <div>
            <h1 className="font-bold text-slate-100 text-sm tracking-tight leading-tight">
              Operations Hub
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">Guitar Learning Platform</p>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Platform Management
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            if (!item.available) {
              return (
                <div
                  key={item.name}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium text-slate-500 cursor-not-allowed select-none opacity-60"
                  title={`${item.name} - Coming in future phase`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 text-slate-600" />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-semibold">
                      {item.badge}
                    </span>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={clsx(
                  'flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150',
                  item.active
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm'
                    : 'text-slate-300 hover:text-slate-100 hover:bg-slate-800/60'
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={clsx(
                      'w-4 h-4',
                      item.active ? 'text-amber-400' : 'text-slate-400 group-hover:text-slate-200'
                    )}
                  />
                  <span>{item.name}</span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Footer Role Badge */}
        <div className="p-4 border-t border-[#1F2636] bg-[#0C0F16]">
          <div className="flex items-center gap-2 text-xs">
            <Shield className="w-4 h-4 text-amber-400" />
            <div className="flex-1 min-w-0">
              <span className="text-[10px] text-slate-500 block leading-tight">ACTIVE ROLE</span>
              <span className="font-bold text-slate-200 tracking-wide">{currentRole}</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
