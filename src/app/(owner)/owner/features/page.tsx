'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

interface FeatureFlagItem {
  id: string;
  key: string;
  description: string | null;
  enabled: boolean;
  rolloutPercentage: number;
  config: unknown;
  createdAt: string;
  updatedAt: string;
  createdBy?: { name: string; email: string } | null;
}

export default function OwnerFeatureFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Create flag modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newRollout, setNewRollout] = useState(0);
  const [newEnabled, setNewEnabled] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch('/api/owner/features');
        if (!res.ok) {
          throw new Error(`Failed to load feature flags: ${res.statusText}`);
        }
        const json = await res.json();
        if (ignore) return;
        if (json.success) {
          setFlags(json.data);
          setError(null);
        } else {
          throw new Error(json.error?.message || 'Error loading flags');
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Error loading feature flags');
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
      const res = await fetch('/api/owner/features');
      const json = await res.json();
      if (json.success) {
        setFlags(json.data);
        setError(null);
      } else {
        throw new Error(json.error?.message || 'Error loading flags');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading feature flags');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEnabled = async (flag: FeatureFlagItem) => {
    try {
      const nextState = !flag.enabled;
      const res = await fetch(`/api/owner/features/${flag.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: nextState }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to update feature flag state');
      }
      setSuccessMsg(`Flag ${flag.key} successfully ${nextState ? 'enabled' : 'disabled'}.`);
      setTimeout(() => setSuccessMsg(null), 4000);
      handleRefresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to toggle feature flag');
    }
  };

  const handleUpdateRollout = async (flag: FeatureFlagItem, percentage: number) => {
    try {
      const res = await fetch(`/api/owner/features/${flag.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rolloutPercentage: percentage }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to update rollout percentage');
      }
      setSuccessMsg(`Rollout percentage for ${flag.key} updated to ${percentage}%.`);
      setTimeout(() => setSuccessMsg(null), 4000);
      handleRefresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update rollout percentage');
    }
  };

  const handleCreateFlag = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      const res = await fetch('/api/owner/features', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: newKey.trim().toUpperCase(),
          description: newDescription.trim() || undefined,
          enabled: newEnabled,
          rolloutPercentage: newRollout,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to create feature flag');
      }

      setSuccessMsg(`Feature flag ${newKey} created successfully.`);
      setTimeout(() => setSuccessMsg(null), 4000);
      setModalOpen(false);
      setNewKey('');
      setNewDescription('');
      setNewRollout(0);
      setNewEnabled(false);
      handleRefresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create feature flag');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <span>Feature Flags & Capabilities</span>
            <span className="text-xs font-medium px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
              Deterministic Hashing
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Authoritative dynamic release toggles and deterministic SHA-256 percentage cohort rollouts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setModalOpen(true)}
            className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Feature Flag</span>
          </button>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
            title="Refresh Flags"
            aria-label="Refresh Flags"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
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

      {/* Flags List */}
      <div className="space-y-4">
        {flags.length > 0 ? (
          flags.map((flag) => (
            <div
              key={flag.id}
              className="p-6 rounded-2xl bg-[#0D121F] border border-slate-800 hover:border-slate-700/80 transition-colors"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-white tracking-wide">
                      {flag.key}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold font-mono ${
                        flag.enabled
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {flag.enabled ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                    {flag.rolloutPercentage > 0 && flag.rolloutPercentage < 100 ? (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        {flag.rolloutPercentage}% Cohort
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-slate-400 max-w-2xl">
                    {flag.description || 'No description provided.'}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  {/* Master Toggle */}
                  <button
                    onClick={() => handleToggleEnabled(flag)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 ${
                      flag.enabled
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                        : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {flag.enabled ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Enabled</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5 text-slate-400" />
                        <span>Disabled</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Rollout Slider & Control */}
              <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1 max-w-md">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1 font-mono">
                    <span>Deterministic Rollout:</span>
                    <strong className="text-amber-400">{flag.rolloutPercentage}%</strong>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={flag.rolloutPercentage}
                    onChange={(e) => handleUpdateRollout(flag, parseInt(e.target.value, 10))}
                    disabled={!flag.enabled}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500 disabled:opacity-30 disabled:cursor-not-allowed"
                  />
                </div>

                <div className="text-[11px] font-mono text-slate-500">
                  Updated: {new Date(flag.updatedAt).toUTCString().slice(0, 22)} UTC
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center bg-[#0D121F] rounded-2xl border border-slate-800 text-sm text-slate-500">
            No feature flags found.
          </div>
        )}
      </div>

      {/* Create Flag Modal */}
      {modalOpen ? (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full p-6 rounded-2xl bg-[#0D121F] border border-slate-800 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-2">Create New Feature Flag</h2>
            <p className="text-xs text-slate-400 mb-6">
              Flag keys must be uppercase alphanumeric snake_case identifiers (e.g. ADAPTIVE_LEARNING).
            </p>

            <form onSubmit={handleCreateFlag} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Flag Key *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AI_TUTOR"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Operational purpose of this capability flag"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1">
                  <span>Initial Rollout Percentage</span>
                  <span className="text-amber-400 font-mono">{newRollout}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={newRollout}
                  onChange={(e) => setNewRollout(parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="newEnabled"
                  checked={newEnabled}
                  onChange={(e) => setNewEnabled(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-amber-500"
                />
                <label htmlFor="newEnabled" className="text-xs text-slate-300 select-none">
                  Enable flag immediately upon creation
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Flag'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
