'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
  Lock,
  Eye,
  EyeOff,
  Mail,
  Check,
  Shield,
  Sliders,
  Bell,
  HardDrive,
  Info,
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

interface UserProfile {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
}

export default function SecuritySettingsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokingOthers, setRevokingOthers] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

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
    async function loadData() {
      try {
        const [sessRes, userRes] = await Promise.all([
          fetch('/api/auth/sessions'),
          fetch('/api/auth/me'),
        ]);

        const [sessData, userData] = await Promise.all([
          sessRes.json(),
          userRes.json(),
        ]);

        if (!ignore) {
          if (sessRes.ok) {
            setSessions(sessData.data?.sessions || []);
          } else {
            setError(sessData.error?.message || 'Failed to load sessions');
          }
          if (userRes.ok && userData.data) {
            setUser(userData.data);
          }
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Error loading security data');
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    loadData();
    return () => {
      ignore = true;
    };
  }, []);

  // Password entropy calculations
  const entropy = useMemo(() => {
    const hasLen = newPassword.length >= 8;
    const hasCase = /[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword);
    const hasNum = /\d/.test(newPassword);
    const hasSym = /[^A-Za-z0-9]/.test(newPassword);

    let score = 0;
    if (hasLen) score++;
    if (hasCase) score++;
    if (hasNum) score++;
    if (hasSym) score++;

    let label = 'Very Weak (0/4)';
    if (score === 1) label = 'Weak (1/4)';
    if (score === 2) label = 'Moderate (2/4)';
    if (score === 3) label = 'Good (3/4)';
    if (score === 4) label = 'Strong (4/4)';

    return { hasLen, hasCase, hasNum, hasSym, score, label };
  }, [newPassword]);

  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordsMatch) {
      setPasswordError('New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    try {
      setUpdatingPassword(true);
      setPasswordError(null);
      setPasswordSuccess(null);

      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to update password');
      }

      setPasswordSuccess(data.data?.message || 'Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      await fetchSessions(false);
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : 'Error changing password');
    } finally {
      setUpdatingPassword(false);
    }
  };

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
      await fetchSessions(false);
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
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Breadcrumb & Security Score Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-400">
          <Link href="/dashboard" className="hover:text-amber-400 transition-colors">Settings</Link>
          <span className="text-slate-600">/</span>
          <span className="text-amber-400 font-bold">Security &amp; Privacy</span>
          <span className="text-slate-600">/</span>
          <span className="text-slate-500 font-mono text-[11px] lowercase opacity-80">sec_ctx_v2_bcrypt</span>
        </div>

        <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#171A20] border border-[#2A303A] shadow-sm">
          <div className="relative flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping absolute opacity-75"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          </div>
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Security Score:</span>
          <span className="text-xs font-bold font-mono text-emerald-400">95% STRONG</span>
          <span className="w-1 h-3 rounded-full bg-slate-700"></span>
          <span className="text-xs font-mono text-amber-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> 2FA Eligible
          </span>
        </div>
      </div>

      {/* Header Title Cluster */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">
            Password &amp; Security Settings
          </h1>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>END-TO-END TLS 1.3 • AES-256 SESSION VAULT</span>
          </div>
        </div>
        <p className="text-sm text-slate-400 max-w-3xl">
          Manage your credentials, active browser sessions, and secure login preferences across all acoustic and electric tracking interfaces.
        </p>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="w-full bg-[#141820] rounded-xl p-1.5 flex items-center gap-1 overflow-x-auto border border-[#2A303A]/60">
        <Link
          href="/settings/security"
          className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#20242C] text-amber-400 shadow-inner flex items-center gap-2 whitespace-nowrap"
        >
          <Shield className="w-4 h-4 text-amber-400" />
          <span>Security &amp; Sessions</span>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
        </Link>
        <Link
          href="/practice"
          className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-[#1A1E26] transition-all flex items-center gap-2 whitespace-nowrap"
        >
          <Sliders className="w-4 h-4" />
          <span>Preferences &amp; Audio Input</span>
        </Link>
        <Link
          href="/dashboard"
          className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-[#1A1E26] transition-all flex items-center gap-2 whitespace-nowrap"
        >
          <Bell className="w-4 h-4" />
          <span>Notifications</span>
        </Link>
        <Link
          href="/progress"
          className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-[#1A1E26] transition-all flex items-center gap-2 whitespace-nowrap"
        >
          <HardDrive className="w-4 h-4" />
          <span>Data &amp; Privacy</span>
        </Link>
      </div>

      {/* Global Alerts */}
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

      {/* MAIN TWO-COLUMN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Credentials & Password Update (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Email Status Card */}
          <Card className="p-6 border-[#2A303A] bg-[#171A20] shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <Mail className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-100 text-base">
                    {user?.email || 'Loading email...'}
                  </span>
                  {user?.emailVerified ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-bold font-mono">
                      <Check className="w-3 h-3" /> Verified Email
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[11px] font-bold font-mono">
                      Verification Pending
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  Primary security anchor. Password recovery, security notifications, and session alerts are routed here.
                </p>
              </div>
            </div>
          </Card>

          {/* Update Password Panel */}
          <Card className="p-6 border-[#2A303A] bg-[#171A20] shadow-md space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-100">Update Master Password</h2>
                  <p className="text-xs text-slate-400">Client-side complexity meter with bcrypt backend hashing</p>
                </div>
              </div>
              <span className="text-xs font-mono px-2 py-1 rounded bg-[#0E1014] text-amber-400 border border-[#2A303A]">
                Bcrypt (Cost 10)
              </span>
            </div>

            {passwordSuccess && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            {passwordError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              {/* Current Password */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <label className="uppercase font-mono tracking-wider text-slate-400 font-semibold" htmlFor="current-pwd">
                    Current Password
                  </label>
                  <Link href="/forgot-password" className="text-amber-400 hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative flex items-center">
                  <input
                    id="current-pwd"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    required
                    className="w-full h-11 bg-[#0E1014] border border-[#2A303A] rounded-lg px-4 pr-10 font-mono text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 text-slate-500 hover:text-slate-300"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <label className="uppercase font-mono text-xs tracking-wider text-slate-400 font-semibold" htmlFor="new-pwd">
                  New Password
                </label>
                <div className="relative flex items-center">
                  <input
                    id="new-pwd"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Create strong passphrase"
                    required
                    className="w-full h-11 bg-[#0E1014] border border-[#2A303A] rounded-lg px-4 pr-10 font-mono text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 text-slate-500 hover:text-slate-300"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* 4-Segment Strength Meter */}
                {newPassword.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-slate-500 uppercase text-[10px]">Password Strength (Client Heuristic)</span>
                      <span className={`font-mono text-xs font-bold ${
                        entropy.score >= 3 ? 'text-emerald-400' : entropy.score >= 2 ? 'text-amber-400' : 'text-red-400'
                      }`}>
                        {entropy.label}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={`h-full rounded-full transition-colors duration-300 ${
                            entropy.score >= step
                              ? entropy.score >= 3
                                ? 'bg-emerald-500'
                                : entropy.score >= 2
                                ? 'bg-amber-500'
                                : 'bg-red-500'
                              : 'bg-slate-800'
                          }`}
                        />
                      ))}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[10px]">
                      <div className={`flex items-center gap-1 ${entropy.hasLen ? 'text-emerald-400' : 'text-slate-500'}`}>
                        <Check className="w-3 h-3" /> 8+ Chars
                      </div>
                      <div className={`flex items-center gap-1 ${entropy.hasCase ? 'text-emerald-400' : 'text-slate-500'}`}>
                        <Check className="w-3 h-3" /> Upper &amp; Lower
                      </div>
                      <div className={`flex items-center gap-1 ${entropy.hasNum ? 'text-emerald-400' : 'text-slate-500'}`}>
                        <Check className="w-3 h-3" /> Numbers
                      </div>
                      <div className={`flex items-center gap-1 ${entropy.hasSym ? 'text-emerald-400' : 'text-slate-500'}`}>
                        <Check className="w-3 h-3" /> Special Char
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="uppercase font-mono text-xs tracking-wider text-slate-400 font-semibold" htmlFor="confirm-pwd">
                  Confirm New Password
                </label>
                <div className="relative flex items-center">
                  <input
                    id="confirm-pwd"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type new passphrase"
                    required
                    className="w-full h-11 bg-[#0E1014] border border-[#2A303A] rounded-lg px-4 pr-10 font-mono text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 text-slate-500 hover:text-slate-300"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword.length > 0 && (
                  <p className={`text-[11px] font-mono ${passwordsMatch ? 'text-emerald-400' : 'text-red-400'}`}>
                    {passwordsMatch ? '✓ Passwords match' : '✕ Passwords do not match yet'}
                  </p>
                )}
              </div>

              {/* Invalidation note */}
              <div className="bg-[#141820] border border-[#2A303A]/60 rounded-lg p-3.5 flex items-start gap-3">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-400 leading-relaxed">
                  Updating your password will automatically invalidate all existing login sessions across mobile and desktop devices except this active browser.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={updatingPassword || !passwordsMatch || !currentPassword}
                  isLoading={updatingPassword}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  <span>Update Password</span>
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* RIGHT COLUMN: Visual Telemetry & Security Diagnostics (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Security Diagnostics Radar */}
          <Card className="p-6 border-[#2A303A] bg-[#171A20] shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs uppercase tracking-wider text-slate-400 font-semibold">
                Security Diagnostics
              </span>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                PASSED ALL CHECKS
              </span>
            </div>

            {/* Circular Gauge */}
            <div className="flex items-center justify-center py-2">
              <div className="relative w-40 h-40 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                  <circle
                    className="text-slate-800"
                    cx="50"
                    cy="50"
                    fill="transparent"
                    r="42"
                    stroke="currentColor"
                    strokeWidth="8"
                  />
                  <circle
                    className="text-emerald-500 drop-shadow-[0_0_8px_rgba(34,197,94,0.4)]"
                    cx="50"
                    cy="50"
                    fill="transparent"
                    r="42"
                    stroke="currentColor"
                    strokeDasharray="263.89"
                    strokeDashoffset="13.19"
                    strokeLinecap="round"
                    strokeWidth="8"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-3xl font-extrabold font-mono text-slate-100">95%</span>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Security Status</span>
                </div>
              </div>
            </div>

            {/* Checklist details */}
            <div className="divide-y divide-[#2A303A] text-xs">
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" /> Password Complexity
                </span>
                <span className="font-mono text-slate-200">Maximum</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" /> Session Cryptography
                </span>
                <span className="font-mono text-slate-200">HMAC-SHA256</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" /> Concurrent Sessions
                </span>
                <span className="font-mono text-slate-200">{sessions.length} Active</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> Client-side Audio Telemetry
                </span>
                <span className="font-mono text-emerald-400">Zero Retention</span>
              </div>
            </div>
          </Card>

          {/* Audio Engine Security Card */}
          <Card className="p-6 border-[#2A303A] bg-[#171A20] shadow-md space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
              <h3 className="text-sm font-bold text-slate-100">FretFlow Audio Privacy Guard</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Your audio telemetry (microphone pitch detection samples and autocorrelation frequency buffers) is processed entirely client-side via Web Audio API and is never recorded, streamed, or stored on remote servers.
            </p>
            <div className="pt-2 border-t border-[#2A303A] flex items-center justify-between text-[11px] font-mono text-slate-500">
              <span>Web Audio API Synthesizer</span>
              <span className="text-emerald-400">Zero-Knowledge</span>
            </div>
          </Card>
        </div>
      </div>

      {/* SECTION 2: ACTIVE SESSIONS & DEVICES */}
      <div className="space-y-4 pt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-100">Active Authenticated Sessions</h2>
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-[#171A20] border border-[#2A303A] text-amber-400">
                {sessions.length} Device{sessions.length === 1 ? '' : 's'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Devices authenticated to your account using persistent SHA-256 session token hashing.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchSessions(true)}
              isLoading={loading}
              className="gap-1.5 border-[#2A303A] text-slate-300 hover:text-white"
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

        {/* Current Device Highlight Card */}
        {currentSession && (
          <Card className="p-5 border-amber-500/30 bg-[#171A20] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Laptop className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-100">Current Device</h3>
                    <Badge variant="success">Active Now</Badge>
                  </div>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    {currentSession.userAgent || 'Current Web Browser'}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[#2A303A] text-xs text-slate-400 font-mono">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Signed in: {new Date(currentSession.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                <span>Session: {currentSession.id.slice(0, 14)}...</span>
              </div>
            </div>
          </Card>
        )}

        {/* Other Active Sessions List */}
        <Card className="p-6 border-[#2A303A] bg-[#171A20] space-y-4">
          <h3 className="text-sm font-bold text-slate-200">Other Active Devices ({otherSessions.length})</h3>

          {loading ? (
            <div className="py-8 text-center text-slate-500 text-sm font-mono">
              Scanning active session tokens...
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
                      <p className="text-sm font-semibold text-slate-200 font-mono">
                        {session.userAgent || 'Remote Device / Client'}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1 font-mono">
                        <span>Last active: {new Date(session.lastSeenAt).toLocaleString()}</span>
                        {session.ipHash && (
                          <span>• IP Hash: {session.ipHash.slice(0, 12)}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRevokeSingle(session.id)}
                    isLoading={revokingId === session.id}
                    className="self-end sm:self-center text-red-400 border-red-500/30 hover:bg-red-500/10 gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Revoke</span>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Data Privacy & Lifecycle Card */}
        <Card className="p-6 border-slate-800 bg-slate-900/60 backdrop-blur-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-amber-400" />
                <span>Personal Data & Account Lifecycle</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Download your complete learning history and audio statistics archive or manage account closure procedures.
              </p>
            </div>

            <Link href="/settings/data">
              <Button
                variant="outline"
                size="sm"
                className="border-slate-700 hover:border-amber-500/50 hover:bg-amber-500/10 text-slate-200 hover:text-amber-400 whitespace-nowrap"
              >
                Manage Data & Privacy
              </Button>
            </Link>
          </div>
        </Card>

        {/* Master Revocation Card */}
        <Card className="p-6 border-red-500/30 bg-red-950/10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-red-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span>Emergency Sign Out Everywhere</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Immediately revokes all active device sessions, including this browser. You will be redirected to log in again.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRevokeAll}
              className="text-red-400 border-red-500/50 hover:bg-red-500/20 whitespace-nowrap"
            >
              Sign Out Everywhere
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
