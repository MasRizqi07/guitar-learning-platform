'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  FolderTree,
  Plus,
  BookOpen,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  FileText,
} from 'lucide-react';

interface ModuleItem {
  id: string;
  courseId: string;
  title: string;
  slug: string;
  description: string;
  order: number;
  status: string;
  estimatedMinutes: number;
  course: { id: string; title: string; slug: string };
  _count: { lessons: number };
}

interface CourseOption {
  id: string;
  title: string;
}

export default function ModulesListPage() {
  const searchParams = useSearchParams();
  const initialCourseId = searchParams.get('courseId') || '';

  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState(initialCourseId);
  const [loading, setLoading] = useState(true);
  const [reordering, setReordering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

  // Quick create module state
  const [showCreate, setShowCreate] = useState(false);
  const [createCourseId, setCreateCourseId] = useState(initialCourseId);
  const [createTitle, setCreateTitle] = useState('');
  const [createSlug, setCreateSlug] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createMinutes, setCreateMinutes] = useState(30);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function loadCourses() {
      try {
        const res = await fetch('/api/admin/courses?pageSize=100');
        const data = await res.json();
        if (ignore) return;
        if (res.ok) {
          setCourses(data.data.items);
          if (!selectedCourseId && data.data.items.length > 0) {
            setSelectedCourseId(data.data.items[0].id);
            setCreateCourseId(data.data.items[0].id);
          }
        }
      } catch {
        // ignore load errors
      }
    }
    loadCourses();
    return () => {
      ignore = true;
    };
  }, [selectedCourseId]);

  useEffect(() => {
    let ignore = false;
    async function loadModules() {
      try {
        const url = selectedCourseId
          ? `/api/admin/modules?courseId=${selectedCourseId}`
          : '/api/admin/modules';
        const res = await fetch(url);
        const data = await res.json();
        if (ignore) return;
        if (!res.ok) {
          throw new Error(data.error?.message || 'Failed to load modules');
        }
        setModules(data.data);
        setError(null);
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Failed to load modules');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    loadModules();
    return () => {
      ignore = true;
    };
  }, [selectedCourseId, refreshIndex]);

  const handleTitleChange = (val: string) => {
    setCreateTitle(val);
    setCreateSlug(
      val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    );
  };

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);
      setError(null);
      const res = await fetch('/api/admin/modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: createCourseId || selectedCourseId,
          title: createTitle,
          slug: createSlug,
          description: createDescription,
          estimatedMinutes: createMinutes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to create module');
      }

      setCreateTitle('');
      setCreateSlug('');
      setCreateDescription('');
      setShowCreate(false);
      setRefreshIndex((r) => r + 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create module');
    } finally {
      setCreating(false);
    }
  };

  const handleMoveModule = async (index: number, direction: 'up' | 'down') => {
    if (reordering) return;
    const items = [...modules];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const temp = items[index];
    items[index] = items[targetIndex];
    items[targetIndex] = temp;

    const payload = items.map((m, idx) => ({ id: m.id, order: idx + 1 }));

    try {
      setReordering(true);
      setError(null);
      const res = await fetch('/api/admin/modules/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: payload }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to reorder modules');
      }
      setRefreshIndex((r) => r + 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reorder modules');
    } finally {
      setReordering(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#222938]">
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
            <FolderTree className="w-5 h-5 text-indigo-400" />
            <span>Modules</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Progression chapters grouped within courses. Supports safe transactional reordering.
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
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400 font-bold transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            {showCreate ? 'Close Form' : 'New Module'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Course Filter Bar */}
      <div className="p-4 rounded-xl bg-[#12161F] border border-[#1F2636] flex items-center gap-3">
        <BookOpen className="w-4 h-4 text-amber-400" />
        <span className="text-xs text-slate-400 font-medium">Filter by Course:</span>
        <select
          value={selectedCourseId}
          onChange={(e) => {
            setSelectedCourseId(e.target.value);
            setCreateCourseId(e.target.value);
          }}
          className="px-3 py-1.5 rounded-lg bg-[#0C0F16] border border-[#222938] text-xs text-slate-200 focus:outline-none focus:border-amber-500/50"
        >
          <option value="">All Courses</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </div>

      {/* Quick Create Drawer / Box */}
      {showCreate && (
        <form onSubmit={handleCreateModule} className="p-5 rounded-xl bg-[#12161F] border border-amber-500/30 space-y-4">
          <h2 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
            Create New Module
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Target Course</label>
              <select
                required
                value={createCourseId}
                onChange={(e) => setCreateCourseId(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-[#0C0F16] border border-[#222938] text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Module Title</label>
              <input
                type="text"
                required
                value={createTitle}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="e.g. Essential Open Chords"
                className="w-full px-3 py-1.5 rounded-lg bg-[#0C0F16] border border-[#222938] text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Slug</label>
              <input
                type="text"
                required
                value={createSlug}
                onChange={(e) => setCreateSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                className="w-full px-3 py-1.5 rounded-lg bg-[#0C0F16] border border-[#222938] text-xs font-mono text-amber-400 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Estimated Minutes</label>
              <input
                type="number"
                min={5}
                max={300}
                value={createMinutes}
                onChange={(e) => setCreateMinutes(parseInt(e.target.value, 10))}
                className="w-full px-3 py-1.5 rounded-lg bg-[#0C0F16] border border-[#222938] text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
            <textarea
              required
              rows={2}
              value={createDescription}
              onChange={(e) => setCreateDescription(e.target.value)}
              placeholder="What this module covers..."
              className="w-full px-3 py-1.5 rounded-lg bg-[#0C0F16] border border-[#222938] text-xs text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition"
            >
              {creating ? 'Saving...' : 'Save Module'}
            </button>
          </div>
        </form>
      )}

      {/* Modules List Table */}
      <div className="rounded-xl bg-[#12161F] border border-[#1F2636] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#0D111A] text-slate-400 text-[11px] font-semibold border-b border-[#1F2636]">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Course</th>
                <th className="px-4 py-3">Module Title</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Lessons</th>
                <th className="px-4 py-3">Est. Time</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Reorder & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2636]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    Loading modules...
                  </td>
                </tr>
              ) : modules.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    No modules found for selected course.
                  </td>
                </tr>
              ) : (
                modules.map((mod, index) => (
                  <tr key={mod.id} className="hover:bg-[#151b26] transition">
                    <td className="px-4 py-3 font-mono font-bold text-amber-400">
                      #{mod.order}
                    </td>
                    <td className="px-4 py-3 text-slate-400 font-medium">{mod.course.title}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/modules/${mod.id}`}
                        className="font-semibold text-slate-100 hover:text-amber-400 transition"
                      >
                        {mod.title}
                      </Link>
                      <div className="text-[11px] text-slate-500 line-clamp-1">{mod.description}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-400">{mod.slug}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-slate-300">
                        <FileText className="w-3.5 h-3.5 text-emerald-400" />
                        {mod._count.lessons} lessons
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{mod.estimatedMinutes}m</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded-full ${
                          mod.status === 'PUBLISHED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        }`}
                      >
                        {mod.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleMoveModule(index, 'up')}
                          disabled={index === 0 || reordering}
                          aria-label={`Move module ${mod.title} up`}
                          className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveModule(index, 'down')}
                          disabled={index === modules.length - 1 || reordering}
                          aria-label={`Move module ${mod.title} down`}
                          className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <Link
                          href={`/admin/modules/${mod.id}`}
                          className="ml-2 px-2.5 py-1 text-[11px] rounded bg-slate-800 text-amber-400 hover:bg-slate-700 font-medium"
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
      </div>
    </div>
  );
}
