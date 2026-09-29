'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Activity,
  Flame,
  GraduationCap,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';

interface OverviewData {
  window: {
    range: string;
    startDate: string;
    endDate: string;
  };
  learners: {
    total: number;
    verified: number;
    verifiedRate: number;
    new: number;
    activeInWindow: number;
  };
  engagement: {
    dau: number;
    wau: number;
    mau: number;
    stickiness: number;
  };
  activation: {
    onboardingCompleted: number;
    onboardingRate: number;
    firstLessonStarted: number;
    firstLessonActivationRate: number;
  };
  learning: {
    validPracticeMinutes: number;
    validPracticeSessions: number;
    quizPassRate: number;
    courseCompletions: number;
  };
}

export default function OwnerOverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch(`/api/owner/overview?range=${range}`);
        if (!res.ok) {
          throw new Error(`Failed to load owner overview: ${res.statusText}`);
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
      const res = await fetch(`/api/owner/overview?range=${range}`);
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

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <span>Executive Overview</span>
            <span className="text-xs font-medium px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
              Live Authoritative
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Authoritative transactional metrics governing user growth, activation, and learning engagement.
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

      {error ? (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {/* Main KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Learners */}
        <div className="p-5 rounded-xl bg-[#0D121F] border border-slate-800 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Total Learners</span>
            <Users className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {loading ? '—' : data?.learners.total.toLocaleString() ?? '0'}
          </div>
          <div className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
            <span className="text-emerald-400 font-medium">
              {data?.learners.verifiedRate ?? 0}% verified
            </span>
            <span className="text-slate-400">({data?.learners.verified ?? 0})</span>
          </div>
        </div>

        {/* New Learners in Window */}
        <div className="p-5 rounded-xl bg-[#0D121F] border border-slate-800 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">New Registrations</span>
            <UserPlus className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {loading ? '—' : data?.learners.new.toLocaleString() ?? '0'}
          </div>
          <div className="text-xs text-slate-400 mt-2">
            During trailing {range === '7d' ? '7 days' : range === '90d' ? '90 days' : '30 days'}
          </div>
        </div>

        {/* Active Learners in Window */}
        <div className="p-5 rounded-xl bg-[#0D121F] border border-slate-800 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Active Learners</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {loading ? '—' : data?.learners.activeInWindow.toLocaleString() ?? '0'}
          </div>
          <div className="text-xs text-slate-400 mt-2">
            Executed valid practice, quiz, or lesson
          </div>
        </div>

        {/* Stickiness DAU / MAU */}
        <div className="p-5 rounded-xl bg-[#0D121F] border border-slate-800 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Stickiness (DAU/MAU)</span>
            <Flame className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {loading ? '—' : `${data?.engagement.stickiness ?? 0}%`}
          </div>
          <div className="text-xs text-slate-400 mt-2 flex items-center gap-2">
            <span>DAU: {data?.engagement.dau ?? 0}</span>
            <span>·</span>
            <span>MAU: {data?.engagement.mau ?? 0}</span>
          </div>
        </div>
      </div>

      {/* Trailing Active Users & Activation Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Engagement Trailing Velocity */}
        <div className="p-6 rounded-2xl bg-[#0D121F] border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-400" />
                Active User Velocity
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                UTC Windows
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-6">
              Meaningful educational participation: lessons in progress, completed quizzes, or valid practice.
            </p>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/60 border border-slate-800/80">
                <span className="text-xs font-medium text-slate-300">DAU (Trailing 24h)</span>
                <span className="text-base font-bold text-white font-mono">{data?.engagement.dau ?? 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/60 border border-slate-800/80">
                <span className="text-xs font-medium text-slate-300">WAU (Trailing 7d)</span>
                <span className="text-base font-bold text-white font-mono">{data?.engagement.wau ?? 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/60 border border-slate-800/80">
                <span className="text-xs font-medium text-slate-300">MAU (Trailing 30d)</span>
                <span className="text-base font-bold text-white font-mono">{data?.engagement.mau ?? 0}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800">
            <Link
              href="/owner/analytics/users"
              className="text-xs font-medium text-amber-400 hover:text-amber-300 flex items-center justify-between"
            >
              <span>Explore Growth & Retention Cohorts</span>
              <span>&rarr;</span>
            </Link>
          </div>
        </div>

        {/* Activation Funnel Milestone */}
        <div className="p-6 rounded-2xl bg-[#0D121F] border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Activation Milestones
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                Window Cohort
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-6">
              Critical conversion milestones for new learners transitioning into active players.
            </p>

            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-slate-300">Onboarding Completion</span>
                  <span className="text-xs font-bold text-white font-mono">{data?.activation.onboardingRate ?? 0}%</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(data?.activation.onboardingRate ?? 0, 100)}%` }}
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-slate-300">First Lesson Started</span>
                  <span className="text-xs font-bold text-white font-mono">{data?.activation.firstLessonActivationRate ?? 0}%</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-sky-500 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(data?.activation.firstLessonActivationRate ?? 0, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800">
            <Link
              href="/owner/analytics/users"
              className="text-xs font-medium text-amber-400 hover:text-amber-300 flex items-center justify-between"
            >
              <span>View Full 6-Stage Activation Funnel</span>
              <span>&rarr;</span>
            </Link>
          </div>
        </div>

        {/* Practice & Curriculum Output */}
        <div className="p-6 rounded-2xl bg-[#0D121F] border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-amber-400" />
                Practice & Learning Output
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                Quality Verified
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-6">
              Only authentic practice sessions (anti-cheat validated) and completed quiz assessments.
            </p>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/60 border border-slate-800/80">
                <span className="text-xs font-medium text-slate-300">Valid Practice Time</span>
                <span className="text-base font-bold text-amber-400 font-mono">
                  {data?.learning.validPracticeMinutes.toLocaleString() ?? 0} mins
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/60 border border-slate-800/80">
                <span className="text-xs font-medium text-slate-300">Quiz Pass Rate</span>
                <span className="text-base font-bold text-emerald-400 font-mono">
                  {data?.learning.quizPassRate ?? 0}%
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/60 border border-slate-800/80">
                <span className="text-xs font-medium text-slate-300">Course Completions</span>
                <span className="text-base font-bold text-white font-mono">
                  {data?.learning.courseCompletions ?? 0}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800">
            <Link
              href="/owner/analytics/learning"
              className="text-xs font-medium text-amber-400 hover:text-amber-300 flex items-center justify-between"
            >
              <span>Inspect Practice & Quiz Breakdown</span>
              <span>&rarr;</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
