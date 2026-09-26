'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  FileText,
  FolderTree,
  HelpCircle,
  Music,
  Award,
  Plus,
  ArrowRight,
  Clock,
  CheckCircle,
  Archive,
  RefreshCw,
} from 'lucide-react';

interface Metrics {
  courses: { draft: number; published: number; archived: number };
  lessons: { draft: number; inReview: number; scheduled: number; published: number; archived: number };
  totals: { quizzes: number; chords: number; achievements: number };
  recentlyUpdatedLessons: Array<{
    id: string;
    title: string;
    slug: string;
    status: string;
    updatedAt: string;
    updatedBy: { name: string; email: string } | null;
  }>;
}

export default function ContentOverviewPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch('/api/admin/content/overview');
        const data = await res.json();
        if (ignore) return;
        if (!res.ok) {
          throw new Error(data.error?.message || 'Failed to load content metrics');
        }
        setMetrics(data.data);
        setError(null);
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Failed to load content metrics');
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
  }, [refreshIndex]);

  const handleRefresh = () => {
    setLoading(true);
    setRefreshIndex((prev) => prev + 1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#222938]">
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
            <span>Curriculum Management (CMS)</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20">
              Phase C
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Authoritative curriculum operations: drafts, editorial review, safe publishing, and revision restoration.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link
            href="/admin/lessons/new"
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400 font-bold transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            New Lesson Draft
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl bg-[#12161F] border border-[#1F2636] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Published Lessons</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-100">
            {loading ? '-' : metrics?.lessons.published}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            {metrics ? `${metrics.courses.published} courses live` : 'authoritative'}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#12161F] border border-[#1F2636] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>In Review</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-400">
            {loading ? '-' : metrics?.lessons.inReview}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Awaiting staff publication</div>
        </div>

        <div className="p-4 rounded-xl bg-[#12161F] border border-[#1F2636] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Draft Lessons</span>
            <FileText className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-100">
            {loading ? '-' : metrics?.lessons.draft}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            {metrics ? `${metrics.courses.draft} draft courses` : 'work in progress'}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#12161F] border border-[#1F2636] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Archived Items</span>
            <Archive className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-400">
            {loading ? '-' : (metrics?.lessons.archived ?? 0) + (metrics?.courses.archived ?? 0)}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Hidden from learners</div>
        </div>
      </div>

      {/* Module Shortcuts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <Link
          href="/admin/courses"
          className="p-4 rounded-xl bg-[#12161F] border border-[#1F2636] hover:border-amber-500/40 hover:bg-[#151b26] transition flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-slate-200 group-hover:text-amber-400 transition">
                Courses
              </h2>
              <p className="text-[11px] text-slate-500">
                {metrics ? `${metrics.courses.published + metrics.courses.draft} Total Courses` : 'Manage courses'}
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-amber-400 transition" />
        </Link>

        <Link
          href="/admin/modules"
          className="p-4 rounded-xl bg-[#12161F] border border-[#1F2636] hover:border-amber-500/40 hover:bg-[#151b26] transition flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <FolderTree className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-slate-200 group-hover:text-indigo-400 transition">
                Modules
              </h2>
              <p className="text-[11px] text-slate-500">Curriculum progression & reordering</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition" />
        </Link>

        <Link
          href="/admin/lessons"
          className="p-4 rounded-xl bg-[#12161F] border border-[#1F2636] hover:border-amber-500/40 hover:bg-[#151b26] transition flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-slate-200 group-hover:text-emerald-400 transition">
                Lessons & Sections
              </h2>
              <p className="text-[11px] text-slate-500">
                {metrics
                  ? `${metrics.lessons.published + metrics.lessons.draft + metrics.lessons.inReview} Lessons`
                  : 'Manage lessons'}
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-emerald-400 transition" />
        </Link>

        <Link
          href="/admin/quizzes"
          className="p-4 rounded-xl bg-[#12161F] border border-[#1F2636] hover:border-amber-500/40 hover:bg-[#151b26] transition flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-slate-200 group-hover:text-cyan-400 transition">
                Quizzes & Questions
              </h2>
              <p className="text-[11px] text-slate-500">
                {metrics ? `${metrics.totals.quizzes} Quizzes with history protection` : 'Manage quizzes'}
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition" />
        </Link>

        <Link
          href="/admin/chords"
          className="p-4 rounded-xl bg-[#12161F] border border-[#1F2636] hover:border-amber-500/40 hover:bg-[#151b26] transition flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-fuchsia-500/10 text-fuchsia-400">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-slate-200 group-hover:text-fuchsia-400 transition">
                Chord Library
              </h2>
              <p className="text-[11px] text-slate-500">
                {metrics ? `${metrics.totals.chords} Visual Interactive Chords` : 'Manage chords'}
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-fuchsia-400 transition" />
        </Link>

        <Link
          href="/admin/achievements"
          className="p-4 rounded-xl bg-[#12161F] border border-[#1F2636] hover:border-amber-500/40 hover:bg-[#151b26] transition flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-slate-200 group-hover:text-amber-400 transition">
                Gamification & Badges
              </h2>
              <p className="text-[11px] text-slate-500">
                {metrics ? `${metrics.totals.achievements} Achievements` : 'Manage achievements'}
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-amber-400 transition" />
        </Link>
      </div>

      {/* Recently Updated Lessons Table */}
      <div className="rounded-xl bg-[#12161F] border border-[#1F2636] overflow-hidden">
        <div className="p-4 border-b border-[#1F2636] flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Recently Edited Lessons
            </h2>
            <p className="text-[11px] text-slate-400">Quick access to in-flight editorial work</p>
          </div>
          <Link
            href="/admin/lessons"
            className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
          >
            <span>View All Lessons</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#0D111A] text-slate-400 text-[11px] font-semibold border-b border-[#1F2636]">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last Editor</th>
                <th className="px-4 py-3">Updated At</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2636]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    Loading editorial history...
                  </td>
                </tr>
              ) : metrics?.recentlyUpdatedLessons.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No recently updated lessons.
                  </td>
                </tr>
              ) : (
                metrics?.recentlyUpdatedLessons.map((l) => (
                  <tr key={l.id} className="hover:bg-[#151b26] transition">
                    <td className="px-4 py-3 font-semibold text-slate-200">{l.title}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-400">{l.slug}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded-full ${
                          l.status === 'PUBLISHED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : l.status === 'IN_REVIEW'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : l.status === 'ARCHIVED'
                            ? 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                            : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        }`}
                      >
                        {l.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {l.updatedBy?.name || l.updatedBy?.email || 'System'}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {new Date(l.updatedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <Link
                        href={`/admin/lessons/${l.id}/preview`}
                        className="text-[11px] text-slate-400 hover:text-white font-medium"
                      >
                        Preview
                      </Link>
                      <Link
                        href={`/admin/lessons/${l.id}`}
                        className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
