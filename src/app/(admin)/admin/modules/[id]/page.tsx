'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  FolderTree,
  Save,
  Plus,
  ArrowUp,
  ArrowDown,
  FileText,
  AlertTriangle,
} from 'lucide-react';

interface LessonItem {
  id: string;
  title: string;
  slug: string;
  order: number;
  status: string;
  published: boolean;
  difficulty: string;
}

interface ModuleDetail {
  id: string;
  courseId: string;
  title: string;
  slug: string;
  description: string;
  order: number;
  status: string;
  estimatedMinutes: number;
  updatedAt: string;
  course: { id: string; title: string };
  lessons: LessonItem[];
}

export default function ModuleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const [module, setModule] = useState<ModuleDetail | null>(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [order, setOrder] = useState<number>(1);
  const [status, setStatus] = useState<string>('DRAFT');
  const [estimatedMinutes, setEstimatedMinutes] = useState(30);
  const [clientUpdatedAt, setClientUpdatedAt] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [concurrencyConflict, setConcurrencyConflict] = useState(false);
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch(`/api/admin/modules/${id}`);
        const data = await res.json();
        if (ignore) return;
        if (!res.ok) {
          throw new Error(data.error?.message || 'Failed to fetch module details');
        }
        const m = data.data;
        setModule(m);
        setTitle(m.title);
        setSlug(m.slug);
        setDescription(m.description);
        setOrder(m.order);
        setStatus(m.status);
        setEstimatedMinutes(m.estimatedMinutes);
        setClientUpdatedAt(m.updatedAt);
        setError(null);
        setConcurrencyConflict(false);
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Failed to fetch module details');
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
  }, [id, refreshIndex]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      setConcurrencyConflict(false);

      const res = await fetch(`/api/admin/modules/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          slug,
          description,
          order,
          estimatedMinutes,
          status,
          clientUpdatedAt,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          setConcurrencyConflict(true);
        }
        throw new Error(data.error?.message || 'Failed to update module');
      }

      setModule((prev) => (prev ? { ...prev, ...data.data } : null));
      setClientUpdatedAt(data.data.updatedAt);
      setSuccess('Module updated successfully.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update module');
    } finally {
      setSaving(false);
    }
  };

  const handleMoveLesson = async (index: number, direction: 'up' | 'down') => {
    if (!module || reordering) return;
    const lessons = [...module.lessons];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= lessons.length) return;

    const temp = lessons[index];
    lessons[index] = lessons[targetIndex];
    lessons[targetIndex] = temp;

    const items = lessons.map((l, idx) => ({ id: l.id, order: idx + 1 }));

    try {
      setReordering(true);
      setError(null);
      const res = await fetch('/api/admin/lessons/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to reorder lessons');
      }
      setRefreshIndex((r) => r + 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reorder lessons');
    } finally {
      setReordering(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-500">Loading module details...</div>;
  }

  if (!module) {
    return <div className="p-8 text-center text-xs text-rose-400">Module not found.</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#222938]">
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/modules?courseId=${module.courseId}`}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
              <FolderTree className="w-5 h-5 text-indigo-400" />
              <span>{module.title}</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Part of course <span className="text-slate-200 font-semibold">{module.course.title}</span> • Order #{module.order}
            </p>
          </div>
        </div>
      </div>

      {concurrencyConflict && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>This content was updated by another editor. Refresh before saving.</span>
          </div>
          <button
            onClick={() => {
              setLoading(true);
              setRefreshIndex((r) => r + 1);
            }}
            className="px-3 py-1 bg-amber-500 text-slate-950 font-bold text-xs rounded-lg hover:bg-amber-400 transition"
          >
            Refresh Now
          </button>
        </div>
      )}

      {error && !concurrencyConflict && (
        <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
          {success}
        </div>
      )}

      {/* Module Edit Form */}
      <form onSubmit={handleSave} className="p-6 rounded-xl bg-[#12161F] border border-[#1F2636] space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Module Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg bg-[#0C0F16] border border-[#222938] text-xs text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg bg-[#0C0F16] border border-[#222938] text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="DRAFT">DRAFT</option>
              <option value="IN_REVIEW">IN_REVIEW</option>
              <option value="PUBLISHED">PUBLISHED</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Slug</label>
            <input
              type="text"
              required
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              className="w-full px-3.5 py-2 rounded-lg bg-[#0C0F16] border border-[#222938] text-xs font-mono text-amber-400 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Estimated Minutes</label>
            <input
              type="number"
              min={5}
              max={600}
              required
              value={estimatedMinutes}
              onChange={(e) => setEstimatedMinutes(parseInt(e.target.value, 10))}
              className="w-full px-3.5 py-2 rounded-lg bg-[#0C0F16] border border-[#222938] text-xs text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">Description</label>
          <textarea
            required
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3.5 py-2 rounded-lg bg-[#0C0F16] border border-[#222938] text-xs text-slate-100 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="pt-3 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : 'Save Module'}
          </button>
        </div>
      </form>

      {/* Ordered Lessons in Module */}
      <div className="p-6 rounded-xl bg-[#12161F] border border-[#1F2636] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#1F2636]">
          <div>
            <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>Lessons in this Module ({module.lessons.length})</span>
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Ordered curriculum sequence. Reorder using safe two-pass transactional updates.
            </p>
          </div>
          <Link
            href={`/admin/lessons/new?moduleId=${module.id}`}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Lesson
          </Link>
        </div>

        {module.lessons.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No lessons in this module yet.
          </div>
        ) : (
          <div className="space-y-2">
            {module.lessons.map((les, index) => (
              <div
                key={les.id}
                className="p-3.5 rounded-lg bg-[#0C0F16] border border-[#1F2636] flex items-center justify-between gap-3 hover:border-slate-700 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-amber-400 w-6 text-center">
                    #{les.order}
                  </span>
                  <div>
                    <Link
                      href={`/admin/lessons/${les.id}`}
                      className="font-semibold text-xs text-slate-200 hover:text-amber-400 transition"
                    >
                      {les.title}
                    </Link>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                      <span>{les.difficulty}</span>
                      <span>•</span>
                      <span className="font-mono text-[10px] text-slate-400">{les.slug}</span>
                      <span>•</span>
                      <span
                        className={`uppercase text-[10px] font-bold px-1.5 py-0.2 rounded ${
                          les.status === 'PUBLISHED'
                            ? 'text-emerald-400 bg-emerald-500/10'
                            : 'text-indigo-400 bg-indigo-500/10'
                        }`}
                      >
                        {les.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleMoveLesson(index, 'up')}
                    disabled={index === 0 || reordering}
                    aria-label={`Move lesson ${les.title} up`}
                    className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveLesson(index, 'down')}
                    disabled={index === module.lessons.length - 1 || reordering}
                    aria-label={`Move lesson ${les.title} down`}
                    className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <Link
                    href={`/admin/lessons/${les.id}`}
                    className="ml-2 px-2.5 py-1 text-[11px] rounded bg-slate-800 text-amber-400 hover:bg-slate-700 font-medium"
                  >
                    Edit
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
