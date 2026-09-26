'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Laptop,
  Smartphone,
  LogOut,
  AlertTriangle,
  Clock,
  KeyRound,
  CheckCircle2,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface SessionItem {
  id: string;
  userAgent: string | null;
  ipHash: string | null;
  createdAt: string;
  lastSeenAt: string;
  isCurrent: boolean;
}

export default function SecuritySettingsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokingOthers, setRevokingOthers] = useState(false);

  const fetchSessions = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);
      const res = await fetch('/api/auth/sessions');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to fetch active sessions');
      }
      setSessions(data.data?.sessions || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function init() {
      try {
        const res = await fetch('/api/auth/sessions');
        const data = await res.json();
        if (!ignore) {
          if (res.ok) {
            setSessions(data.data?.sessions || []);
          } else {
            setError(data.error?.message || 'Failed to fetch active sessions');
          }
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Error fetching sessions');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    init();
    return () => {
      ignore = true;
    };
  }, []);


  const handleRevokeSingle = async (sessionId: string) => {
    try {
      setRevokingId(sessionId);
      setError(null);
      const res = await fetch(`/api/auth/sessions/${sessionId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to revoke session');
      }
      setActionSuccess('Session revoked successfully.');
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error revoking session');
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeOthers = async () => {
    if (!confirm('Are you sure you want to sign out all other devices?')) return;
    try {
      setRevokingOthers(true);
      setError(null);
      const res = await fetch('/api/auth/sessions/revoke-others', {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to revoke other sessions');
      }
      setActionSuccess(data.data?.message || 'Signed out from all other devices.');
      await fetchSessions();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error signing out other devices');
    } finally {
      setRevokingOthers(false);
    }
  };

  const handleRevokeAll = async () => {
    if (!confirm('Are you sure you want to log out of ALL devices, including this one?')) return;
    try {
      setError(null);
      await fetch('/api/auth/sessions/revoke-all', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error logging out');
    }
  };

  const currentSession = sessions.find((s) => s.isCurrent);
  const otherSessions = sessions.filter((s) => !s.isCurrent);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Account Security & Devices</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">
          Session & Device Management
        </h1>
        <p className="text-slate-400 text-sm">
          Review devices where your account is currently signed in. Revoke sessions to protect your account.
        </p>
      </div>

      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button
            onClick={() => setActionSuccess(null)}
            className="text-xs text-emerald-300 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Current Device Card */}
      <Card className="p-6 border-[#2A303A] bg-[#141820] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">Current Device</h2>
                <Badge variant="success">Active Now</Badge>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {currentSession?.userAgent || 'Current Web Browser'}
              </p>
            </div>
          </div>
        </div>

        {currentSession && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[#2A303A] text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Signed in: {new Date(currentSession.createdAt).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-slate-500" />
              <span>Session ID: {currentSession.id.slice(0, 12)}...</span>
            </div>
          </div>
        )}
      </Card>

      {/* Other Active Sessions Card */}
      <Card className="p-6 border-[#2A303A] bg-[#141820] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-100">Other Active Devices</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {otherSessions.length} other session(s) detected
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchSessions(true)}
              isLoading={loading}
              className="gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </Button>

            {otherSessions.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRevokeOthers}
                isLoading={revokingOthers}
                className="gap-1.5 text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out Other Devices</span>
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-slate-500 text-sm">
            Loading session status...
          </div>
        ) : otherSessions.length === 0 ? (
          <div className="py-8 text-center border border-dashed border-[#2A303A] rounded-xl text-slate-400 text-sm">
            <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-emerald-400/80" />
            <p className="font-semibold text-slate-300">No other active devices</p>
            <p className="text-xs text-slate-500 mt-1">
              You are only logged in on this current device.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#2A303A]">
            {otherSessions.map((session) => (
              <div
                key={session.id}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 mt-0.5">
                    {session.userAgent?.toLowerCase().includes('mobile') ? (
                      <Smartphone className="w-4 h-4" />
                    ) : (
                      <Laptop className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">
                      {session.userAgent || 'Unknown Device / Browser'}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                      <span>Last active: {new Date(session.lastSeenAt).toLocaleString()}</span>
                      {session.ipHash && (
                        <span>• IP Hash: {session.ipHash.slice(0, 10)}</span>
                      )}
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRevokeSingle(session.id)}
                  isLoading={revokingId === session.id}
                  className="self-end sm:self-center text-red-400 border-red-500/30 hover:bg-red-500/10 gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Revoke</span>
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Danger Zone: Log Out Everywhere */}
      <Card className="p-6 border-red-500/30 bg-red-950/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-red-400 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              <span>Sign Out of All Sessions</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Immediately revokes all active device sessions, including this browser. You will need to log in again.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRevokeAll}
            className="text-red-400 border-red-500/50 hover:bg-red-500/20"
          >
            Sign Out Everywhere
          </Button>
        </div>
      </Card>
    </div>
  );
}
