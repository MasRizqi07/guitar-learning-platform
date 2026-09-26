import React from 'react';
import Link from 'next/link';
import {
  Users,
  UserCheck,
  UserX,
  ShieldAlert,
  ArrowRight,
  Clock,
  KeyRound,
  FileText,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { requireAuthUser } from '@/lib/auth';
import { AdminUserService } from '@/services/admin-user.service';

export default async function AdminOverviewPage() {
  const actor = await requireAuthUser();
  const overview = await AdminUserService.getOverview(actor);
  const { metrics, recentRegistrations, recentSecurityEvents, recentAdminActions } = overview;

  return (
    <div className="space-y-8">
      {/* Header & Quick Action Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-2">
            <span>Operational Console</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
            System Overview
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time platform directory health, security events, and administrative audit trail.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/users"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shadow-md shadow-amber-500/10"
          >
            <Users className="w-4 h-4" />
            <span>Manage Users</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <Card className="p-4 bg-[#121620] border-[#222938]">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Accounts</span>
            <Users className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-black text-slate-100 mt-2">
            {metrics.totalUsers.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-500 block mt-1">All registered accounts</span>
        </Card>

        <Card className="p-4 bg-[#121620] border-[#222938]">
          <div className="flex items-center justify-between text-emerald-400 text-xs font-medium">
            <span>Active Learners</span>
            <UserCheck className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-2">
            {metrics.activeUsers.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-500 block mt-1">Normal platform access</span>
        </Card>

        <Card className="p-4 bg-[#121620] border-[#222938]">
          <div className="flex items-center justify-between text-blue-400 text-xs font-medium">
            <span>Verified Emails</span>
            <KeyRound className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-blue-400 mt-2">
            {metrics.verifiedUsers.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-500 block mt-1">Email tokens confirmed</span>
        </Card>

        <Card className="p-4 bg-[#121620] border-[#222938]">
          <div className="flex items-center justify-between text-amber-400 text-xs font-medium">
            <span>Suspended</span>
            <UserX className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-amber-400 mt-2">
            {metrics.suspendedUsers.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-500 block mt-1">Access revoked by staff</span>
        </Card>

        <Card className="p-4 bg-[#121620] border-[#222938]">
          <div className="flex items-center justify-between text-red-400 text-xs font-medium">
            <span>Banned</span>
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-red-400 mt-2">
            {metrics.bannedUsers.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-500 block mt-1">Permanent violations</span>
        </Card>
      </div>

      {/* Activity Streams Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Registrations */}
        <Card className="p-5 bg-[#121620] border-[#222938] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#222938]">
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              <span>Recent Registrations</span>
            </h2>
            <Link href="/admin/users" className="text-xs text-amber-400 hover:underline">
              View All
            </Link>
          </div>

          <div className="space-y-3">
            {recentRegistrations.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No registrations recorded</p>
            ) : (
              recentRegistrations.map((u) => (
                <Link
                  key={u.id}
                  href={`/admin/users/${u.id}`}
                  className="block p-2.5 rounded-lg hover:bg-slate-850/60 transition-colors border border-transparent hover:border-slate-800"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200 truncate max-w-[150px]">
                      {u.name}
                    </span>
                    <Badge variant={u.status === 'ACTIVE' ? 'success' : 'error'}>
                      {u.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                    <span className="truncate max-w-[180px]">{u.email}</span>
                    <span>{new Date(u.createdAt).toLocaleDateString()}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </Card>

        {/* Recent Security Events */}
        <Card className="p-5 bg-[#121620] border-[#222938] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#222938]">
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-blue-400" />
              <span>Recent Security Events</span>
            </h2>
          </div>

          <div className="space-y-3">
            {recentSecurityEvents.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No recent security events</p>
            ) : (
              recentSecurityEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="p-2.5 rounded-lg bg-slate-900/40 border border-[#1F2636] space-y-1"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300">{evt.type}</span>
                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(evt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">
                    {evt.user?.email || 'Unauthenticated request'}
                  </p>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Recent Privileged Actions */}
        <Card className="p-5 bg-[#121620] border-[#222938] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#222938]">
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>Audit Activity</span>
            </h2>
            <Link href="/admin/audit" className="text-xs text-amber-400 hover:underline">
              View Log
            </Link>
          </div>

          <div className="space-y-3">
            {recentAdminActions.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No administrative actions logged yet</p>
            ) : (
              recentAdminActions.map((audit) => (
                <div
                  key={audit.id}
                  className="p-2.5 rounded-lg bg-slate-900/40 border border-[#1F2636] space-y-1"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-amber-400">{audit.action}</span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(audit.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>By: {audit.actor.name}</span>
                    <span className="text-slate-500">{audit.entityType}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
