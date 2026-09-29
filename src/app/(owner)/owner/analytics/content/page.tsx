'use client';

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

interface LessonPerformance {
  lessonId: string;
  lessonTitle: string;
  moduleTitle: string;
  courseTitle: string;
  order: number;
  status: string;
  starts: number;
  completions: number;
  completionRate: number;
  stalledLearners: number;
  practiceDifficulty: {
    easy: number;
    okay: number;
    difficult: number;
  };
  quizAttempts: number;
  quizPassRate: number;
}

interface ContentAnalyticsData {
  summary: {
    totalLessons: number;
    publishedLessons: number;
    avgCompletionRate: number;
    totalStalledLearners: number;
  };
  lessons: LessonPerformance[];
}

export default function ContentAnalyticsPage() {
  const [data, setData] = useState<ContentAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch('/api/owner/analytics/content');
        if (!res.ok) {
          throw new Error(`Failed to load content analytics: ${res.statusText}`);
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
  }, []);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/owner/analytics/content');
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
            <span>Content & Lesson Performance</span>
            <span className="text-xs font-medium px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
              Curriculum Integrity
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Authoritative completion bottlenecks, drop-off grace period analysis, and stalled learner metrics.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={loading}
          className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50 self-start sm:self-auto"
          title="Refresh Data"
          aria-label="Refresh Data"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
        </button>
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
          <div className="text-xs text-slate-400">Total Lessons</div>
          <div className="text-xl font-bold text-white mt-1">
            {loading ? '—' : data?.summary.totalLessons.toLocaleString() ?? '0'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {data?.summary.publishedLessons ?? 0} published
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0D121F] border border-slate-800">
          <div className="text-xs text-slate-400">Avg Completion Rate</div>
          <div className="text-xl font-bold text-emerald-400 mt-1">
            {loading ? '—' : `${data?.summary.avgCompletionRate ?? 0}%`}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Starts vs completions</div>
        </div>

        <div className="p-4 rounded-xl bg-[#0D121F] border border-slate-800">
          <div className="text-xs text-slate-400">Total Stalled Learners</div>
          <div className="text-xl font-bold text-amber-400 mt-1">
            {loading ? '—' : data?.summary.totalStalledLearners.toLocaleString() ?? '0'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Inactive &gt; 7 days</div>
        </div>

        <div className="p-4 rounded-xl bg-[#0D121F] border border-slate-800">
          <div className="text-xs text-slate-400">Bottleneck Indicator</div>
          <div className="text-xl font-bold text-white mt-1">
            {loading ? '—' : data?.summary.totalStalledLearners ? 'Monitored' : 'Clear'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Grace period active</div>
        </div>
      </div>

      {/* Lesson Performance Table */}
      <div className="p-6 rounded-2xl bg-[#0D121F] border border-slate-800">
        <h2 className="text-base font-semibold text-white mb-4">Lesson Engagement & Drop-off Breakdown</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                <th className="py-3 px-3">Course / Module</th>
                <th className="py-3 px-3">Lesson Title</th>
                <th className="py-3 px-3">Starts</th>
                <th className="py-3 px-3">Completions</th>
                <th className="py-3 px-3">Completion Rate</th>
                <th className="py-3 px-3">Stalled (&gt;7d)</th>
                <th className="py-3 px-3">Quiz Pass Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {data?.lessons && data.lessons.length > 0 ? (
                data.lessons.map((l) => (
                  <tr key={l.lessonId} className="hover:bg-slate-900/40">
                    <td className="py-3 px-3 text-slate-400">
                      <div className="font-sans font-medium text-slate-200">{l.courseTitle}</div>
                      <div className="text-[11px] text-slate-400 font-sans">{l.moduleTitle}</div>
                    </td>
                    <td className="py-3 px-3 text-white font-sans font-semibold">
                      {l.lessonTitle}
                    </td>
                    <td className="py-3 px-3 text-slate-300">{l.starts}</td>
                    <td className="py-3 px-3 text-slate-300">{l.completions}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`font-bold ${
                          l.completionRate >= 70
                            ? 'text-emerald-400'
                            : l.completionRate >= 40
                            ? 'text-amber-400'
                            : 'text-red-400'
                        }`}
                      >
                        {l.completionRate}%
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {l.stalledLearners > 0 ? (
                        <span className="text-amber-400 font-semibold">{l.stalledLearners}</span>
                      ) : (
                        <span className="text-slate-600">0</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {l.quizAttempts > 0 ? (
                        <span className="text-sky-400">{l.quizPassRate}% ({l.quizAttempts})</span>
                      ) : (
                        <span className="text-slate-600">No Quiz</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-500">
                    No curriculum lessons found.
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
