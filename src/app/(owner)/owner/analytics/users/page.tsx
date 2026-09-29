'use client';

import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  AlertTriangle,
  Info,
} from 'lucide-react';

interface TimeseriesPoint {
  date: string;
  newRegistrations: number;
  verifiedRegistrations: number;
  activeLearners: number;
}

interface FunnelStage {
  stage: string;
  count: number;
  stepConversionRate: number;
  overallConversionRate: number;
}

interface CohortRow {
  cohortDate: string;
  cohortSize: number;
  d1: { eligible: boolean; retainedCount: number; rate: number };
  d7: { eligible: boolean; retainedCount: number; rate: number };
  d30: { eligible: boolean; retainedCount: number; rate: number };
}

interface UserAnalyticsData {
  window: {
    range: string;
    startDate: string;
    endDate: string;
  };
  summary: {
    totalLearners: number;
    verifiedLearners: number;
    verifiedRate: number;
    newLearners: number;
    activeInWindow: number;
    dau: number;
    wau: number;
    mau: number;
    stickiness: number;
  };
  timeseries: TimeseriesPoint[];
  activationFunnel: FunnelStage[];
  retention: {
    cohorts: CohortRow[];
    matureAverages: { d1: number; d7: number; d30: number };
  };
}

export default function UserAnalyticsPage() {
  const [data, setData] = useState<UserAnalyticsData | null>(null);
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch(`/api/owner/analytics/users?range=${range}`);
        if (!res.ok) {
          throw new Error(`Failed to load user analytics: ${res.statusText}`);
        }
        const json = await res.json();
        if (ignore) return;
        if (json.success) {
          setData(json.data);
          setError(null);
        } else {
          throw new Error(json.error?.message || 'Error loading data');
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Error loading analytics');
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
  }, [range]);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/owner/analytics/users?range=${range}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setError(null);
      } else {
        throw new Error(json.error?.message || 'Error loading data');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading analytics');
    } finally {
      setLoading(false);
    }
  };

  const maxTimeseriesVal = Math.max(
    ...(data?.timeseries.map((t) => Math.max(t.newRegistrations, t.activeLearners)) || [10]),
    1
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <span>User Growth & Retention</span>
            <span className="text-xs font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Mature Cohorts
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Authoritative learner acquisition, step-by-step activation funnels, and deterministic cohort retention.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg bg-slate-900 border border-slate-800 p-0.5 text-xs font-medium">
            <button
              onClick={() => setRange('7d')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                range === '7d' ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setRange('30d')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                range === '30d' ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              30 Days
            </button>
            <button
              onClick={() => setRange('90d')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                range === '90d' ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              90 Days
            </button>
          </div>

          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
            title="Refresh Data"
            aria-label="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Staff Exclusion Notice Banner */}
      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-sky-400 flex-shrink-0" />
          <span>
            Staff accounts (<code className="text-amber-300 font-mono">ADMIN</code>, <code className="text-amber-300 font-mono">SUPPORT</code>, <code className="text-amber-300 font-mono">CONTENT_EDITOR</code>, <code className="text-amber-300 font-mono">OWNER</code>) and accounts marked with <code className="text-amber-300 font-mono">analyticsExcluded=true</code> are strictly excluded from all metrics.
          </span>
        </div>
      </div>

      {error ? (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#0D121F] border border-slate-800">
          <div className="text-xs text-slate-400">Total Registered</div>
          <div className="text-xl font-bold text-white mt-1">
            {loading ? '—' : data?.summary.totalLearners.toLocaleString() ?? '0'}
          </div>
          <div className="text-[11px] text-emerald-400 mt-1">
            {data?.summary.verifiedRate ?? 0}% verified
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0D121F] border border-slate-800">
          <div className="text-xs text-slate-400">New Learners (Window)</div>
          <div className="text-xl font-bold text-white mt-1">
            {loading ? '—' : data?.summary.newLearners.toLocaleString() ?? '0'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Eligible cohort</div>
        </div>

        <div className="p-4 rounded-xl bg-[#0D121F] border border-slate-800">
          <div className="text-xs text-slate-400">Active (Window)</div>
          <div className="text-xl font-bold text-amber-400 mt-1">
            {loading ? '—' : data?.summary.activeInWindow.toLocaleString() ?? '0'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Meaningful actions</div>
        </div>

        <div className="p-4 rounded-xl bg-[#0D121F] border border-slate-800">
          <div className="text-xs text-slate-400">Engagement Ratio</div>
          <div className="text-xl font-bold text-white mt-1">
            {loading ? '—' : `${data?.summary.stickiness ?? 0}%`}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">DAU / MAU</div>
        </div>
      </div>

      {/* Timeseries Visualizer */}
      <div className="p-6 rounded-2xl bg-[#0D121F] border border-slate-800">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-semibold text-white">Daily Registration & Active Learner Velocity</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Daily counts aggregated across strict UTC calendar days.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="text-slate-300">New Registrations</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span className="text-slate-300">Active Learners</span>
            </span>
          </div>
        </div>

        {/* CSS-based accessible bar visualizer */}
        <div className="space-y-3">
          {data?.timeseries && data.timeseries.length > 0 ? (
            <div className="grid grid-cols-7 sm:grid-cols-14 md:grid-cols-30 gap-1 items-end h-40 pt-4 border-b border-slate-800">
              {data.timeseries.slice(-30).map((t) => {
                const regHeight = Math.max(Math.round((t.newRegistrations / maxTimeseriesVal) * 100), 4);
                const actHeight = Math.max(Math.round((t.activeLearners / maxTimeseriesVal) * 100), 4);
                return (
                  <div
                    key={t.date}
                    className="flex flex-col items-center justify-end h-full gap-0.5 group relative"
                  >
                    {/* Hover tooltip */}
                    <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-2 z-10 px-2 py-1 rounded bg-slate-950 border border-slate-700 text-[10px] text-white whitespace-nowrap pointer-events-none transition-opacity">
                      <div className="font-semibold text-amber-300">{t.date}</div>
                      <div>New: {t.newRegistrations}</div>
                      <div>Active: {t.activeLearners}</div>
                    </div>

                    <div className="w-full flex items-end justify-center gap-0.5 h-full">
                      <div
                        className="w-1.5 bg-emerald-500 rounded-t"
                        style={{ height: `${regHeight}%` }}
                        aria-label={`Date ${t.date} new registrations: ${t.newRegistrations}`}
                      />
                      <div
                        className="w-1.5 bg-amber-500 rounded-t"
                        style={{ height: `${actHeight}%` }}
                        aria-label={`Date ${t.date} active learners: ${t.activeLearners}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-xs text-slate-500">
              No timeseries records found in selected window.
            </div>
          )}

          <div className="flex justify-between text-[10px] font-mono text-slate-500 pt-1">
            <span>{data?.timeseries[0]?.date || 'Start Date'}</span>
            <span>{data?.timeseries[data.timeseries.length - 1]?.date || 'End Date'}</span>
          </div>
        </div>
      </div>

      {/* 6-Stage Activation Funnel */}
      <div className="p-6 rounded-2xl bg-[#0D121F] border border-slate-800">
        <div className="mb-6">
          <h2 className="text-base font-semibold text-white">Official 6-Stage Activation Funnel</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Strict single-cohort analysis for learners registered in the selected window.
          </p>
        </div>

        <div className="space-y-4">
          {data?.activationFunnel.map((stage, idx) => (
            <div key={stage.stage} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-mono font-bold text-slate-300">
                    {idx + 1}
                  </div>
                  <span className="text-sm font-semibold text-white">{stage.stage}</span>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono">
                  <span className="text-slate-400">
                    Step: <strong className="text-emerald-400">{stage.stepConversionRate}%</strong>
                  </span>
                  <span className="text-slate-400">
                    Overall: <strong className="text-amber-400">{stage.overallConversionRate}%</strong>
                  </span>
                  <span className="text-white font-bold px-2 py-0.5 rounded bg-slate-800">
                    {stage.count.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Conversion bar */}
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(stage.overallConversionRate, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Retention Cohorts Matrix */}
      <div className="p-6 rounded-2xl bg-[#0D121F] border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-base font-semibold text-white">Cohort Retention (D1, D7, D30)</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Exact-day activity evaluated against registration Day 0. Denominators enforce maturity invariants.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="px-3 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300">
              Mature Avg D1: <strong className="text-amber-400">{data?.retention.matureAverages.d1 ?? 0}%</strong>
            </span>
            <span className="px-3 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300">
              Mature Avg D7: <strong className="text-emerald-400">{data?.retention.matureAverages.d7 ?? 0}%</strong>
            </span>
            <span className="px-3 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300">
              Mature Avg D30: <strong className="text-sky-400">{data?.retention.matureAverages.d30 ?? 0}%</strong>
            </span>
          </div>
        </div>

        {/* Cohort Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                <th className="py-2.5 px-3">Cohort Date</th>
                <th className="py-2.5 px-3">Learners (Day 0)</th>
                <th className="py-2.5 px-3">Day 1 Retention</th>
                <th className="py-2.5 px-3">Day 7 Retention</th>
                <th className="py-2.5 px-3">Day 30 Retention</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {data?.retention.cohorts && data.retention.cohorts.length > 0 ? (
                data.retention.cohorts.map((c) => (
                  <tr key={c.cohortDate} className="hover:bg-slate-900/40">
                    <td className="py-2.5 px-3 text-slate-200">{c.cohortDate}</td>
                    <td className="py-2.5 px-3 text-white font-bold">{c.cohortSize}</td>
                    <td className="py-2.5 px-3">
                      {c.d1.eligible ? (
                        <span className="text-amber-400 font-semibold">
                          {c.d1.rate}% ({c.d1.retainedCount})
                        </span>
                      ) : (
                        <span className="text-slate-600 italic">Immature (&lt;1d)</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      {c.d7.eligible ? (
                        <span className="text-emerald-400 font-semibold">
                          {c.d7.rate}% ({c.d7.retainedCount})
                        </span>
                      ) : (
                        <span className="text-slate-600 italic">Immature (&lt;7d)</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      {c.d30.eligible ? (
                        <span className="text-sky-400 font-semibold">
                          {c.d30.rate}% ({c.d30.retainedCount})
                        </span>
                      ) : (
                        <span className="text-slate-600 italic">Immature (&lt;30d)</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500">
                    No registered cohorts found in selected window.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
