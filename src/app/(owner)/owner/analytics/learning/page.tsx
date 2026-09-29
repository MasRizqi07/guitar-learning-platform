'use client';

import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Clock,
  Flame,
  Award,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

interface LearningData {
  window: {
    range: string;
    startDate: string;
    endDate: string;
  };
  lessonProgress: {
    lessonsStarted: number;
    lessonsCompleted: number;
    uniqueStartedLearners: number;
    uniqueCompletedLearners: number;
    completionRate: number;
  };
  practice: {
    totalMinutes: number;
    sessionCount: number;
    averageSessionDuration: number;
    sessionsPerActiveLearner: number;
    typeDistribution: Record<string, { count: number; totalMinutes: number }>;
    difficultyDistribution: Record<string, number>;
  };
  quizzes: {
    totalAttempts: number;
    passedAttempts: number;
    passRate: number;
    averageScore: number;
    uniqueLearners: number;
    averageAttemptsPerLearner: number;
  };
  achievementsUnlocked: number;
  streakDistribution: Record<string, number>;
}

export default function LearningAnalyticsPage() {
  const [data, setData] = useState<LearningData | null>(null);
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch(`/api/owner/analytics/learning?range=${range}`);
        if (!res.ok) {
          throw new Error(`Failed to load learning analytics: ${res.statusText}`);
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
      const res = await fetch(`/api/owner/analytics/learning?range=${range}`);
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <span>Learning & Practice Analytics</span>
            <span className="text-xs font-medium px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
              Valid Sessions Only
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Authoritative curriculum engagement, anti-cheat validated practice volume, and quiz mastery.
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

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Valid Practice Minutes */}
        <div className="p-5 rounded-xl bg-[#0D121F] border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Practice Minutes</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {loading ? '—' : data?.practice.totalMinutes.toLocaleString() ?? '0'}
          </div>
          <div className="text-xs text-slate-400 mt-2">
            {data?.practice.sessionCount ?? 0} valid sessions ({Math.round((data?.practice.averageSessionDuration ?? 0) / 60)}m avg)
          </div>
        </div>

        {/* Lesson Completion Rate */}
        <div className="p-5 rounded-xl bg-[#0D121F] border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Lesson Completion Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {loading ? '—' : `${data?.lessonProgress.completionRate ?? 0}%`}
          </div>
          <div className="text-xs text-slate-400 mt-2">
            {data?.lessonProgress.uniqueCompletedLearners ?? 0} finished / {data?.lessonProgress.uniqueStartedLearners ?? 0} started
          </div>
        </div>

        {/* Quiz Pass Rate */}
        <div className="p-5 rounded-xl bg-[#0D121F] border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Quiz Pass Rate</span>
            <GraduationCap className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {loading ? '—' : `${data?.quizzes.passRate ?? 0}%`}
          </div>
          <div className="text-xs text-slate-400 mt-2">
            Avg score: {data?.quizzes.averageScore ?? 0}% across {data?.quizzes.totalAttempts ?? 0} attempts
          </div>
        </div>

        {/* Achievements Unlocked */}
        <div className="p-5 rounded-xl bg-[#0D121F] border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Achievements Unlocked</span>
            <Award className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {loading ? '—' : data?.achievementsUnlocked.toLocaleString() ?? '0'}
          </div>
          <div className="text-xs text-slate-400 mt-2">
            During selected time window
          </div>
        </div>
      </div>

      {/* Practice Details & Difficulty Feedback */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Practice Type Distribution */}
        <div className="p-6 rounded-2xl bg-[#0D121F] border border-slate-800">
          <h2 className="text-base font-semibold text-white mb-4">Practice Type Breakdown</h2>
          <div className="space-y-3 font-mono text-xs">
            {data?.practice.typeDistribution &&
              Object.entries(data.practice.typeDistribution).map(([type, stats]) => (
                <div key={type} className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-300 font-semibold">{type}</span>
                  <div className="flex items-center gap-4 text-right">
                    <span className="text-slate-400">{stats.count} sessions</span>
                    <span className="text-amber-400 font-bold">{stats.totalMinutes} mins</span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Practice Difficulty Feedback */}
        <div className="p-6 rounded-2xl bg-[#0D121F] border border-slate-800">
          <h2 className="text-base font-semibold text-white mb-4">Self-Assessed Practice Difficulty</h2>
          <p className="text-xs text-slate-400 mb-4">
            Learner feedback collected immediately following valid practice routines.
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-slate-900/80 border border-emerald-500/20 text-center">
              <div className="text-xs text-emerald-400 font-semibold mb-1">EASY</div>
              <div className="text-2xl font-bold text-white font-mono">
                {data?.practice.difficultyDistribution.EASY ?? 0}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/80 border border-sky-500/20 text-center">
              <div className="text-xs text-sky-400 font-semibold mb-1">OKAY</div>
              <div className="text-2xl font-bold text-white font-mono">
                {data?.practice.difficultyDistribution.OKAY ?? 0}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/80 border border-red-500/20 text-center">
              <div className="text-xs text-red-400 font-semibold mb-1">DIFFICULT</div>
              <div className="text-2xl font-bold text-white font-mono">
                {data?.practice.difficultyDistribution.DIFFICULT ?? 0}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Streak Distribution */}
      <div className="p-6 rounded-2xl bg-[#0D121F] border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-400" />
            Active Learner Daily Streak Distribution
          </h2>
          <span className="text-xs text-slate-400 font-mono">All Eligible Learners</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {data?.streakDistribution &&
            Object.entries(data.streakDistribution).map(([bucket, count]) => (
              <div key={bucket} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                <div className="text-xs text-slate-400">{bucket} Days</div>
                <div className="text-lg font-bold text-white font-mono mt-1">{count}</div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
