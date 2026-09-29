'use client';

import React from 'react';
import { Crown, Clock } from 'lucide-react';

interface OwnerTopbarProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export function OwnerTopbar({ user }: OwnerTopbarProps) {
  const utcDate = new Date().toUTCString().slice(0, 22) + ' UTC';

  return (
    <header className="h-16 px-4 sm:px-6 lg:px-8 border-b border-slate-800/80 bg-[#080B11]/90 backdrop-blur flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-300">
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span>EXECUTIVE OWNER PRIVILEGE</span>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* UTC Clock pill */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-300 font-mono">
          <Clock className="w-3 h-3 text-slate-400" />
          <span>{utcDate}</span>
        </div>

        {/* User profile capsule */}
        <div className="flex items-center gap-3 pl-2 sm:border-l sm:border-slate-800">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-semibold text-slate-100">{user.name}</div>
            <div className="text-[10px] text-amber-400 font-mono">{user.email}</div>
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-xs font-bold text-slate-950 shadow-md shadow-amber-500/10">
            {user.name.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
}
