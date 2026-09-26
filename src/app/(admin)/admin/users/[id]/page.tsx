'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Flame,
  BookOpen,
  Calendar,
  Lock,
  RefreshCw,
  Edit3,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface UserDetailData {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  emailVerified: string | null;
  suspendedAt: string | null;
  suspensionReason: string | null;
  createdAt: string;
  updatedAt: string;
  profile: {
    currentLevel: number;
    totalXP: number;
    currentStreak: number;
    longestStreak: number;
    timezone: string;
    lastActiveDate: string | null;
  } | null;
  onboardingProfile: {
    experienceLevel: string;
    guitarType: string;
    dailyGoalMinutes: number;
    completed: boolean;
    completedAt: string | null;
  } | null;
  _count: {
    sessions: number;
    lessonProgress: number;
    practiceSessions: number;
    quizAttempts: number;
    userAchievements: number;
  };
  securityEvents: Array<{
    id: string;
    type: string;
    ipHash: string | null;
    userAgent: string | null;
    metadata: Record<string, unknown> | null;
    createdAt: string;
  }>;
  auditHistory: Array<{
    id: string;
    action: string;
    before: Record<string, unknown> | null;
    after: Record<string, unknown> | null;
    createdAt: string;
    actor: {
      id: string;
      name: string;
      email: string;
      role: string;
    };
  }>;
}

export default function AdminUserDetailPage() {
  const params = useParams();
  const userId = params.id as string;

  const [data, setData] = useState<UserDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

  // Modal States
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [submittingSuspend, setSubmittingSuspend] = useState(false);

  const [unsuspendModalOpen, setUnsuspendModalOpen] = useState(false);
  const [submittingUnsuspend, setSubmittingUnsuspend] = useState(false);

  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const [submittingRole, setSubmittingRole] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch(`/api/admin/users/${userId}`);
        const json = await res.json();
        if (ignore) return;
        if (!res.ok) {
          throw new Error(json.error?.message || 'Failed to load user details');
        }
        setData(json.data);
        setSelectedRole(json.data?.role || 'LEARNER');
        setError(null);
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Error fetching user');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [userId, refreshIndex]);

  const handleRefresh = () => {
    setLoading(true);
    setRefreshIndex((prev) => prev + 1);
  };

  const handleSuspend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suspensionReason.trim()) return;
    try {
      setSubmittingSuspend(true);
      setError(null);
      const res = await fetch(`/api/admin/users/${userId}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: suspensionReason }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to suspend user');
      }
      setActionSuccess('Account suspended successfully. All active sessions revoked.');
      setSuspendModalOpen(false);
      setSuspensionReason('');
      setRefreshIndex((prev) => prev + 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error suspending user');
    } finally {
      setSubmittingSuspend(false);
    }
  };

  const handleUnsuspend = async () => {
    try {
      setSubmittingUnsuspend(true);
      setError(null);
      const res = await fetch(`/api/admin/users/${userId}/unsuspend`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to unsuspend user');
      }
      setActionSuccess('Account unsuspended successfully.');
      setUnsuspendModalOpen(false);
      setRefreshIndex((prev) => prev + 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error unsuspending user');
    } finally {
      setSubmittingUnsuspend(false);
    }
  };

  const handleRoleChange = async () => {
    try {
      setSubmittingRole(true);
      setError(null);
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: selectedRole }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to update role');
      }
      setActionSuccess(`Role successfully updated to ${selectedRole}.`);
      setRoleModalOpen(false);
      setRefreshIndex((prev) => prev + 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error updating role');
    } finally {
      setSubmittingRole(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-500 text-xs">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-600" />
        <span>Loading account record...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <Link href="/admin/users" className="inline-flex items-center gap-1.5 text-xs text-amber-400">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Users</span>
        </Link>
        <Card className="p-8 text-center text-slate-400">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-amber-400" />
          <p className="font-bold text-slate-200">User Not Found</p>
          <p className="text-xs mt-1 text-slate-500">{error || 'Requested user does not exist.'}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to User Directory</span>
        </Link>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          className="gap-1.5 text-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </Button>
      </div>

      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Header Profile Card */}
      <Card className="p-6 bg-[#121620] border-[#222938]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-200 text-xl">
              {data.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-slate-100">{data.name}</h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-200 border border-slate-700">
                  {data.role}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                    data.status === 'ACTIVE'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-red-500/10 text-red-400 border-red-500/30'
                  }`}
                >
                  {data.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">{data.email}</p>
              <div className="flex items-center gap-4 text-xs text-slate-500 mt-2">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Joined {new Date(data.createdAt).toLocaleDateString()}
                </span>
                <span>•</span>
                <span>
                  {data.emailVerified ? (
                    <strong className="text-emerald-400">Verified Email</strong>
                  ) : (
                    <strong className="text-slate-500">Unverified</strong>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRoleModalOpen(true)}
              className="gap-1.5 text-xs text-slate-200 border-slate-700 hover:bg-slate-800"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Change Role</span>
            </Button>

            {data.status === 'ACTIVE' ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSuspendModalOpen(true)}
                className="gap-1.5 text-xs text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Suspend Account</span>
              </Button>
            ) : data.status === 'SUSPENDED' ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUnsuspendModalOpen(true)}
                className="gap-1.5 text-xs text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Unsuspend Account</span>
              </Button>
            ) : null}
          </div>
        </div>

        {data.status === 'SUSPENDED' && (
          <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300">
            <strong>Suspension Notice:</strong> Suspended on{' '}
            {data.suspendedAt ? new Date(data.suspendedAt).toLocaleString() : 'N/A'}. Reason:{' '}
            <em>{data.suspensionReason || 'No reason specified'}</em>
          </div>
        )}
      </Card>

      {/* Two Column Layout: Learning Diagnostics & Security Diagnostics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Learning Overview Panel (Support Diagnostics) */}
        <Card className="p-5 bg-[#121620] border-[#222938] space-y-4">
          <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2 pb-3 border-b border-[#222938]">
            <BookOpen className="w-4 h-4 text-amber-400" />
            <span>Learning Progression Diagnostic</span>
          </h2>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-[#0E121A] border border-[#1F2636]">
              <span className="text-[10px] text-slate-500 block uppercase">Level / XP</span>
              <span className="font-bold text-slate-200 text-sm">
                Level {data.profile?.currentLevel || 1} • {data.profile?.totalXP || 0} XP
              </span>
            </div>

            <div className="p-3 rounded-lg bg-[#0E121A] border border-[#1F2636]">
              <span className="text-[10px] text-slate-500 block uppercase">Streak</span>
              <span className="font-bold text-amber-400 text-sm flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 fill-amber-500" />
                {data.profile?.currentStreak || 0} days (Record: {data.profile?.longestStreak || 0}d)
              </span>
            </div>

            <div className="p-3 rounded-lg bg-[#0E121A] border border-[#1F2636]">
              <span className="text-[10px] text-slate-500 block uppercase">Lessons Completed</span>
              <span className="font-bold text-slate-200 text-sm">
                {data._count.lessonProgress}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-[#0E121A] border border-[#1F2636]">
              <span className="text-[10px] text-slate-500 block uppercase">Practice Sessions</span>
              <span className="font-bold text-slate-200 text-sm">
                {data._count.practiceSessions} sessions
              </span>
            </div>
          </div>

          <div className="text-xs text-slate-400 pt-2 border-t border-[#1F2636] space-y-1">
            <p>
              Onboarding:{' '}
              {data.onboardingProfile?.completed ? (
                <strong className="text-emerald-400">Completed</strong>
              ) : (
                <strong className="text-slate-500">Not Completed</strong>
              )}
            </p>
            {data.onboardingProfile && (
              <p className="text-[11px] text-slate-500">
                Experience: {data.onboardingProfile.experienceLevel} • Guitar:{' '}
                {data.onboardingProfile.guitarType}
              </p>
            )}
          </div>
        </Card>

        {/* Security Diagnostics Panel */}
        <Card className="p-5 bg-[#121620] border-[#222938] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#222938]">
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-blue-400" />
              <span>Security & Sessions Diagnostic</span>
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">
              {data._count.sessions} Active Session(s)
            </span>
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Recent Security Events
            </span>
            {data.securityEvents.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center">No security events logged</p>
            ) : (
              data.securityEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="p-2.5 rounded-lg bg-[#0E121A] border border-[#1F2636] text-xs flex items-center justify-between"
                >
                  <div>
                    <p className="font-semibold text-slate-300">{evt.type}</p>
                    <p className="text-[10px] text-slate-500">
                      IP Hash: {evt.ipHash ? `${evt.ipHash.slice(0, 10)}...` : 'N/A'}
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {new Date(evt.createdAt).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Audit Trail for this Entity */}
      <Card className="p-5 bg-[#121620] border-[#222938] space-y-4">
        <h2 className="text-sm font-bold text-slate-200 pb-3 border-b border-[#222938]">
          Administrative Mutation Audit History
        </h2>

        {data.auditHistory.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">
            No administrative mutations recorded for this account.
          </p>
        ) : (
          <div className="divide-y divide-[#1F2636]">
            {data.auditHistory.map((log) => (
              <div key={log.id} className="py-3 flex items-start justify-between gap-4 text-xs">
                <div>
                  <span className="font-bold text-amber-400 mr-2">{log.action}</span>
                  <span className="text-slate-400">by {log.actor.name} ({log.actor.role})</span>
                  {log.after && (
                    <pre className="text-[10px] text-slate-400 bg-slate-900/60 p-2 rounded mt-1 font-mono">
                      {JSON.stringify(log.after, null, 2)}
                    </pre>
                  )}
                </div>
                <span className="text-[10px] text-slate-500 whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Suspend Confirmation Modal */}
      {suspendModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6 bg-[#141822] border-amber-500/30 space-y-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <span>Confirm Account Suspension</span>
            </h3>
            <p className="text-xs text-slate-300">
              Suspending <strong>{data.name}</strong> will immediately revoke all active sessions and block login.
            </p>
            <form onSubmit={handleSuspend} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Suspension Reason (Required)
                </label>
                <textarea
                  required
                  rows={3}
                  value={suspensionReason}
                  onChange={(e) => setSuspensionReason(e.target.value)}
                  placeholder="e.g. Terms violation, abusive behavior..."
                  className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSuspendModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  isLoading={submittingSuspend}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                >
                  Confirm Suspension
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Unsuspend Confirmation Modal */}
      {unsuspendModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6 bg-[#141822] border-emerald-500/30 space-y-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>Confirm Unsuspension</span>
            </h3>
            <p className="text-xs text-slate-300">
              Restore active access for <strong>{data.name}</strong>? The user will be able to log in again.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUnsuspendModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleUnsuspend}
                isLoading={submittingUnsuspend}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              >
                Unsuspend Account
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Change Role Modal */}
      {roleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6 bg-[#141822] border-slate-700 space-y-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-amber-400" />
              <span>Change User Role</span>
            </h3>
            <p className="text-xs text-slate-300">
              Modify operational role for <strong>{data.name}</strong>. Invariants prevent non-owners from managing OWNER status.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Select Role
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="LEARNER">LEARNER (Standard platform student)</option>
                  <option value="CONTENT_EDITOR">CONTENT_EDITOR (Curriculum author)</option>
                  <option value="SUPPORT">SUPPORT (User support staff)</option>
                  <option value="ADMIN">ADMIN (Full platform administrator)</option>
                  <option value="OWNER">OWNER (Executive authority)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRoleModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleRoleChange}
                  isLoading={submittingRole}
                  disabled={selectedRole === data.role}
                >
                  Update Role
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
