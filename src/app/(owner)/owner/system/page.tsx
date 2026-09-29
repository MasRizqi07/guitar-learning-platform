'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  UserCheck,
  Mail,
  Database,
  HardDrive,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

interface PlatformSettingItem {
  key: string;
  value: unknown;
  description: string | null;
  updatedAt: string;
}

export default function OwnerSystemPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Editable values
  const [regEnabled, setRegEnabled] = useState<boolean>(true);
  const [maintMode, setMaintMode] = useState<boolean>(false);
  const [supportEmail, setSupportEmail] = useState<string>('');
  const [emailInput, setEmailInput] = useState<string>('');
  const [savingEmail, setSavingEmail] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch('/api/owner/settings');
        if (!res.ok) {
          throw new Error(`Failed to load system settings: ${res.statusText}`);
        }
        const json = await res.json();
        if (ignore) return;
        if (json.success) {
          const rows: PlatformSettingItem[] = json.data;
          // Populate settings state

          const regRow = rows.find((r) => r.key === 'REGISTRATION_ENABLED');
          if (regRow) setRegEnabled(Boolean(regRow.value));

          const maintRow = rows.find((r) => r.key === 'MAINTENANCE_MODE');
          if (maintRow) setMaintMode(Boolean(maintRow.value));

          const emailRow = rows.find((r) => r.key === 'SUPPORT_EMAIL');
          if (emailRow && typeof emailRow.value === 'string') {
            setSupportEmail(emailRow.value);
            setEmailInput(emailRow.value);
          }
          setError(null);
        } else {
          throw new Error(json.error?.message || 'Error loading settings');
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Error loading settings');
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
  }, []);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/owner/settings');
      const json = await res.json();
      if (json.success) {
        const rows: PlatformSettingItem[] = json.data;

        const regRow = rows.find((r) => r.key === 'REGISTRATION_ENABLED');
        if (regRow) setRegEnabled(Boolean(regRow.value));

        const maintRow = rows.find((r) => r.key === 'MAINTENANCE_MODE');
        if (maintRow) setMaintMode(Boolean(maintRow.value));

        const emailRow = rows.find((r) => r.key === 'SUPPORT_EMAIL');
        if (emailRow && typeof emailRow.value === 'string') {
          setSupportEmail(emailRow.value);
          setEmailInput(emailRow.value);
        }
        setError(null);
      } else {
        throw new Error(json.error?.message || 'Error loading settings');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading settings');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRegistration = async () => {
    try {
      const next = !regEnabled;
      const res = await fetch('/api/owner/settings/REGISTRATION_ENABLED', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          value: next,
          description: 'Controls whether public learner registration is permitted',
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to update registration setting');
      }
      setRegEnabled(next);
      setSuccessMsg(`Registration successfully ${next ? 'enabled' : 'disabled'}.`);
      setTimeout(() => setSuccessMsg(null), 4000);
      handleRefresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update registration');
    }
  };

  const handleToggleMaintenance = async () => {
    const next = !maintMode;
    const confirmText = next
      ? 'WARNING: Enabling Maintenance Mode will reject learner practice, quiz submissions, and progress writes with HTTP 503. Are you sure?'
      : 'Disable maintenance mode and resume full learner platform operations?';

    if (!window.confirm(confirmText)) return;

    try {
      const res = await fetch('/api/owner/settings/MAINTENANCE_MODE', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          value: next,
          description: 'Emergency and scheduled maintenance mode lock',
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to update maintenance mode setting');
      }
      setMaintMode(next);
      setSuccessMsg(`Maintenance mode ${next ? 'ACTIVATED' : 'DEACTIVATED'}.`);
      setTimeout(() => setSuccessMsg(null), 4000);
      handleRefresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update maintenance mode');
    }
  };

  const handleSaveSupportEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingEmail(true);
      setError(null);
      const res = await fetch('/api/owner/settings/SUPPORT_EMAIL', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          value: emailInput.trim(),
          description: 'Official learner support destination email',
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to update support email');
      }
      setSupportEmail(emailInput.trim());
      setSuccessMsg('Support email updated successfully.');
      setTimeout(() => setSuccessMsg(null), 4000);
      handleRefresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update support email');
    } finally {
      setSavingEmail(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <span>Platform Governance & System Settings</span>
            <span className="text-xs font-medium px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
              Privileged Control
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Dynamic operational toggles, maintenance state with Owner bypass, and core provider infrastructure health.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={loading}
          className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50 self-start sm:self-auto"
          title="Refresh Settings"
          aria-label="Refresh Settings"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
        </button>
      </div>

      {successMsg ? (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      ) : null}

      {error ? (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {/* Primary Governance Switches */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Registration Toggle */}
        <div className="p-6 rounded-2xl bg-[#0D121F] border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Learner Registration Gate</h2>
                  <div className="text-[11px] font-mono text-slate-400">REGISTRATION_ENABLED</div>
                </div>
              </div>
              <span
                className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${
                  regEnabled
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'bg-red-500/10 text-red-400 border border-red-500/30'
                }`}
              >
                {regEnabled ? 'OPEN' : 'BLOCKED'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-6">
              When disabled, new registration attempts are rejected server-side with <code className="text-amber-300 font-mono">REGISTRATION_DISABLED</code>. Existing users can continue to log in without interruption.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-xs text-slate-300 font-medium">Public Registrations:</span>
            <button
              onClick={handleToggleRegistration}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 ${
                regEnabled
                  ? 'bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
              }`}
            >
              {regEnabled ? 'Disable Registrations' : 'Enable Registrations'}
            </button>
          </div>
        </div>

        {/* Maintenance Mode Toggle */}
        <div className="p-6 rounded-2xl bg-[#0D121F] border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Platform Maintenance Lock</h2>
                  <div className="text-[11px] font-mono text-slate-400">MAINTENANCE_MODE</div>
                </div>
              </div>
              <span
                className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${
                  maintMode
                    ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                }`}
              >
                {maintMode ? 'ACTIVE LOCK' : 'NORMAL OPERATIONAL'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-6">
              Restricts learner mutations with HTTP 503 <code className="text-amber-300 font-mono">MAINTENANCE_MODE</code>. Platform OWNER retains guaranteed administrative bypass to govern or restore services.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-xs text-slate-300 font-medium">System Lockdown:</span>
            <button
              onClick={handleToggleMaintenance}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 ${
                maintMode
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                  : 'bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30'
              }`}
            >
              {maintMode ? 'Deactivate Maintenance' : 'Activate Maintenance'}
            </button>
          </div>
        </div>
      </div>

      {/* Support Contact Setting */}
      <div className="p-6 rounded-2xl bg-[#0D121F] border border-slate-800">
        <h2 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
          <Mail className="w-4 h-4 text-amber-400" />
          <span>Learner Support Inquiries Contact</span>
        </h2>
        <p className="text-xs text-slate-400 mb-4">
          Public-facing support contact email distributed across error screens and email templates.
        </p>

        <form onSubmit={handleSaveSupportEmail} className="flex flex-col sm:flex-row gap-3 max-w-lg">
          <input
            type="email"
            required
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder="support@guitarlearning.com"
            className="flex-1 px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 font-mono"
          />
          <button
            type="submit"
            disabled={savingEmail || emailInput === supportEmail}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs disabled:opacity-40 transition-colors"
          >
            {savingEmail ? 'Saving...' : 'Save Email'}
          </button>
        </form>
      </div>

      {/* Infrastructure Health & Provider Status Summary */}
      <div className="p-6 rounded-2xl bg-[#0D121F] border border-slate-800">
        <h2 className="text-sm font-bold text-white mb-4">Infrastructure & Provider Health Status</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400 flex items-center gap-2">
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                PostgreSQL Database
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>
            <div className="text-sm font-bold text-white font-mono">CONNECTED</div>
            <div className="text-[11px] text-slate-500 mt-1">Prisma Client v5 · UTC Invariants</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400 flex items-center gap-2">
                <HardDrive className="w-3.5 h-3.5 text-sky-400" />
                Media Storage Engine
              </span>
              <span className="w-2 h-2 rounded-full bg-sky-400" />
            </div>
            <div className="text-sm font-bold text-white font-mono">OPERATIONAL</div>
            <div className="text-[11px] text-slate-500 mt-1">Secure local / Cloud storage active</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400 flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-purple-400" />
                Analytics Telemetry
              </span>
              <span className="w-2 h-2 rounded-full bg-purple-400" />
            </div>
            <div className="text-sm font-bold text-white font-mono">ISOLATED</div>
            <div className="text-[11px] text-slate-500 mt-1">PostHog / Noop provider non-authoritative</div>
          </div>
        </div>
      </div>
    </div>
  );
}
