import React from 'react';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { normalizeRole } from '@/lib/permissions';
import { AdminSidebar } from './_components/AdminSidebar';
import { AdminTopbar } from './_components/AdminTopbar';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  // If not logged in, redirect to login
  if (!user) {
    redirect('/login?callbackUrl=/admin');
  }

  // Authorize server-side: Only staff roles (SUPPORT, CONTENT_EDITOR, ADMIN, OWNER) can access /admin
  const role = normalizeRole(user.role);
  if (!['SUPPORT', 'CONTENT_EDITOR', 'ADMIN', 'OWNER'].includes(role)) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-[#0A0D12] text-slate-100 flex flex-col md:flex-row antialiased">
      {/* Sidebar Navigation */}
      <AdminSidebar currentRole={role} />

      {/* Main Administrative Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        <AdminTopbar user={user} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
