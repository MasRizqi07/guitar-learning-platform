import React from 'react';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { normalizeRole } from '@/lib/permissions';
import { OwnerSidebar } from './_components/OwnerSidebar';
import { OwnerTopbar } from './_components/OwnerTopbar';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  // If not logged in, redirect to login with callback
  if (!user) {
    redirect('/login?callbackUrl=/owner');
  }

  // Strict Server Authorization: Only OWNER allowed
  const role = normalizeRole(user.role);
  if (role !== 'OWNER') {
    return (
      <div className="min-h-screen bg-[#07090E] text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-2xl bg-[#0D121F] border border-red-500/30 text-center shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-6 text-red-400">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="inline-block px-3 py-1 rounded-full text-xs font-mono font-semibold bg-red-500/10 text-red-400 border border-red-500/20 mb-3">
            HTTP 403 · OWNER_ACCESS_REQUIRED
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-sm text-slate-400 mb-6">
            The Owner Console is strictly restricted to platform OWNER accounts. Your current role (<span className="font-mono text-amber-400">{user.role}</span>) does not have executive clearance.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {['ADMIN', 'CONTENT_EDITOR', 'SUPPORT'].includes(role) ? (
              <Link
                href="/admin"
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors inline-flex items-center justify-center gap-2"
              >
                Go to Admin Console
              </Link>
            ) : null}
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold transition-colors inline-flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Return to App
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 flex flex-col md:flex-row antialiased">
      {/* Executive Sidebar */}
      <OwnerSidebar />

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        <OwnerTopbar user={user} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
