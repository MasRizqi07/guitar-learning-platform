'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Eye,
  History,
  Archive,
  ChevronLeft,
  ChevronRight,
  Send,
  UploadCloud,
} from 'lucide-react';

interface LessonListItem {
  id: string;
  title: string;
  slug: string;
  order: number;
  status: string;
  published: boolean;
  difficulty: string;
  estimatedMinutes: number;
  xpReward: number;
  module: {
    id: string;
    title: string;
    course: { id: string; title: string };
  };
  _count: { sections: number; revisions: number };
  quiz: { id: string; title: string } | null;
  updatedAt: string;
  updatedBy: { name: string; email: string } | null;
}

export default function LessonsListPage() {
  const [lessons, setLessons] = useState<LessonListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [difficulty, setDifficulty] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          pageSize: pageSize.toString(),
          status,
        });
        if (search.trim()) params.set('search', search.trim());
        if (difficulty) params.set('difficulty', difficulty);

        const res = await fetch(`/api/admin/lessons?${params.toString()}`);
        const data = await res.json();
        if (ignore) return;
        if (!res.ok) {
          throw new Error(data.error?.message || 'Failed to load lessons');
        }
        setLessons(data.data.items);
        setTotal(data.data.total);
        setError(null);
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Failed to load lessons');
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
  }, [page, pageSize, status, search, difficulty, refreshIndex]);

  const handleQuickPublish = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to validate and publish "${title}"?`)) return;
    try {
      setError(null);
      setActionMessage(null);
      const res = await fetch(`/api/admin/lessons/${id}/publish`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Publish failed');
      }
      setActionMessage(`Lesson "${title}" published successfully!`);
      setRefreshIndex((r) => r + 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Publish failed');
    }
  };

  const handleQuickSubmitReview = async (id: string, title: string) => {
    try {
      setError(null);
      setActionMessage(null);
      const res = await fetch(`/api/admin/lessons/${id}/submit-review`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to submit review');
      }
      setActionMessage(`Lesson "${title}" submitted for editorial review.`);
      setRefreshIndex((r) => r + 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit review');
    }
  };

  const handleQuickArchive = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to archive "${title}"? It will be hidden from learners.`)) return;
    try {
      setError(null);
      setActionMessage(null);
      const res = await fetch(`/api/admin/lessons/${id}/archive`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Archive failed');
      }
      setActionMessage(`Lesson "${title}" archived.`);
      setRefreshIndex((r) => r + 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Archive failed');
    }
  };

  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#222938]">
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            <span>Lessons CMS</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Authoritative lesson authoring, section configuration, review workflow, and publishing.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setLoading(true);
              setRefreshIndex((r) => r + 1);
            }}
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
            Create Lesson Draft
          </Link>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
          {actionMessage}
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-[#12161F] border border-[#1F2636] flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search lessons by title, slug, or content..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#0C0F16] border border-[#222938] text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <span>Status:</span>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-[#0C0F16] border border-[#222938] text-xs text-slate-200 focus:outline-none focus:border-amber-500/50"
            >
              <option value="ALL">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="IN_REVIEW">In Review</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Difficulty:</span>
            <select
              value={difficulty}
              onChange={(e) => {
                setDifficulty(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-[#0C0F16] border border-[#222938] text-xs text-slate-200 focus:outline-none focus:border-amber-500/50"
            >
              <option value="">All Levels</option>
              <option value="BEGINNER">BEGINNER</option>
              <option value="INTERMEDIATE">INTERMEDIATE</option>
              <option value="ADVANCED">ADVANCED</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lesson List Table */}
      <div className="rounded-xl bg-[#12161F] border border-[#1F2636] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#0D111A] text-slate-400 text-[11px] font-semibold border-b border-[#1F2636]">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Lesson Title</th>
                <th className="px-4 py-3">Course & Module</th>
                <th className="px-4 py-3">Sections</th>
                <th className="px-4 py-3">Quiz</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2636]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    Loading lessons...
                  </td>
                </tr>
              ) : lessons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No lessons found matching criteria.
                  </td>
                </tr>
              ) : (
                lessons.map((les) => (
                  <tr key={les.id} className="hover:bg-[#151b26] transition">
                    <td className="px-4 py-3 font-mono font-bold text-amber-400">
                      #{les.order}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/lessons/${les.id}`}
                        className="font-semibold text-slate-100 hover:text-amber-400 transition"
                      >
                        {les.title}
                      </Link>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-[10px] text-slate-400">{les.slug}</span>
                        <span>•</span>
                        <span>{les.difficulty}</span>
                        <span>•</span>
                        <span>{les.estimatedMinutes}m</span>
                        <span>•</span>
                        <span>+{les.xpReward} XP</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      <div className="font-medium text-slate-300">{les.module.course.title}</div>
                      <div className="text-[11px] text-slate-500">{les.module.title}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-200">
                        {les._count.sections} sections
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {les.quiz ? (
                        <Link
                          href={`/admin/quizzes/${les.quiz.id}`}
                          className="text-[11px] text-cyan-400 hover:underline"
                        >
                          Configured
                        </Link>
                      ) : (
                        <span className="text-[11px] text-slate-500">None</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded-full ${
                          les.status === 'PUBLISHED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : les.status === 'IN_REVIEW'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : les.status === 'ARCHIVED'
                            ? 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                            : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        }`}
                      >
                        {les.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Link
                          href={`/admin/lessons/${les.id}/preview`}
                          title="Preview Lesson"
                          className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Link>
                        <Link
                          href={`/admin/lessons/${les.id}/revisions`}
                          title="Revision History"
                          className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white"
                        >
                          <History className="w-3.5 h-3.5" />
                        </Link>

                        {les.status === 'DRAFT' && (
                          <button
                            onClick={() => handleQuickSubmitReview(les.id, les.title)}
                            title="Submit for Review"
                            className="p-1 rounded bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/30"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {les.status === 'IN_REVIEW' && (
                          <button
                            onClick={() => handleQuickPublish(les.id, les.title)}
                            title="Approve & Publish"
                            className="p-1 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30"
                          >
                            <UploadCloud className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {les.status === 'PUBLISHED' && (
                          <button
                            onClick={() => handleQuickArchive(les.id, les.title)}
                            title="Archive Lesson"
                            className="p-1 rounded bg-slate-800 text-slate-400 hover:text-rose-400"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <Link
                          href={`/admin/lessons/${les.id}`}
                          className="px-2.5 py-1 text-[11px] rounded bg-slate-800 text-amber-400 hover:bg-slate-700 font-semibold"
                        >
                          Edit
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-[#1F2636] flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing {lessons.length} of {total} lessons
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg bg-[#0C0F16] border border-[#222938] disabled:opacity-40 disabled:cursor-not-allowed hover:text-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg bg-[#0C0F16] border border-[#222938] disabled:opacity-40 disabled:cursor-not-allowed hover:text-white"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
