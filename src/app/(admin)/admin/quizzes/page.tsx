'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  HelpCircle,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

interface QuizItem {
  id: string;
  lessonId: string;
  title: string;
  description: string;
  passingScore: number;
  xpReward: number;
  lesson: {
    id: string;
    title: string;
    slug: string;
    status: string;
    module: { title: string; course: { title: string } };
  };
  _count: { questions: number; attempts: number };
}

export default function QuizzesListPage() {
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          pageSize: pageSize.toString(),
        });
        if (search.trim()) params.set('search', search.trim());

        const res = await fetch(`/api/admin/quizzes?${params.toString()}`);
        const data = await res.json();
        if (ignore) return;
        if (!res.ok) {
          throw new Error(data.error?.message || 'Failed to load quizzes');
        }
        setQuizzes(data.data.items);
        setTotal(data.data.total);
        setError(null);
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Failed to load quizzes');
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
  }, [page, pageSize, search, refreshIndex]);

  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#222938]">
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-cyan-400" />
            <span>Quizzes CMS</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Authoritative assessment configuration. Historical learner attempts and answers are strictly preserved.
          </p>
        </div>
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
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-[#12161F] border border-[#1F2636] flex items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search quizzes by title or lesson..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#0C0F16] border border-[#222938] text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>
      </div>

      {/* Quizzes Table */}
      <div className="rounded-xl bg-[#12161F] border border-[#1F2636] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#0D111A] text-slate-400 text-[11px] font-semibold border-b border-[#1F2636]">
              <tr>
                <th className="px-4 py-3">Quiz Title</th>
                <th className="px-4 py-3">Lesson & Module</th>
                <th className="px-4 py-3">Questions</th>
                <th className="px-4 py-3">Passing Score</th>
                <th className="px-4 py-3">XP Reward</th>
                <th className="px-4 py-3">Learner Attempts</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2636]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    Loading quizzes...
                  </td>
                </tr>
              ) : quizzes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No quizzes found.
                  </td>
                </tr>
              ) : (
                quizzes.map((quiz) => (
                  <tr key={quiz.id} className="hover:bg-[#151b26] transition">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/quizzes/${quiz.id}`}
                        className="font-semibold text-slate-100 hover:text-cyan-400 transition"
                      >
                        {quiz.title}
                      </Link>
                      <div className="text-[11px] text-slate-500 line-clamp-1">{quiz.description}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      <div className="font-medium text-slate-200">{quiz.lesson.title}</div>
                      <div className="text-[11px] text-slate-500">
                        {quiz.lesson.module.course.title} → {quiz.lesson.module.title}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-200">
                        {quiz._count.questions} questions
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-amber-400">
                      {quiz.passingScore}%
                    </td>
                    <td className="px-4 py-3 font-medium text-emerald-400">
                      +{quiz.xpReward} XP
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      <span className="inline-flex items-center gap-1 font-mono">
                        <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                        {quiz._count.attempts} attempts
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/quizzes/${quiz.id}`}
                        className="px-2.5 py-1 text-[11px] rounded bg-slate-800 text-cyan-400 hover:bg-slate-700 font-semibold"
                      >
                        Edit Quiz
                      </Link>
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
            Showing {quizzes.length} of {total} quizzes
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
