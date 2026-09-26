'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, FileText, Save } from 'lucide-react';

interface ModuleOption {
  id: string;
  title: string;
  course: { title: string };
}

export default function NewLessonPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialModuleId = searchParams.get('moduleId') || '';

  const [modules, setModules] = useState<ModuleOption[]>([]);
  const [moduleId, setModuleId] = useState(initialModuleId);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState('BEGINNER');
  const [estimatedMinutes, setEstimatedMinutes] = useState(10);
  const [xpReward, setXpReward] = useState(20);
  const [order, setOrder] = useState<number | ''>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function loadModules() {
      try {
        const res = await fetch('/api/admin/modules');
        const data = await res.json();
        if (ignore) return;
        if (data.success && data.data.length > 0) {
          setModules(data.data);
          if (!moduleId) {
            setModuleId(data.data[0].id);
          }
        }
      } catch {
        // ignore load errors
      }
    }
    loadModules();
    return () => {
      ignore = true;
    };
  }, [moduleId]);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    setSlug(
      val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      const res = await fetch('/api/admin/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleId,
          title,
          slug,
          description,
          difficulty,
          estimatedMinutes: Number(estimatedMinutes),
          xpReward: Number(xpReward),
          order: order === '' ? undefined : Number(order),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to create lesson');
      }

      router.push(`/admin/lessons/${data.data.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create lesson');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/lessons"
          className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            <span>Create Lesson Draft</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            New lessons are saved as DRAFT. You can add sections, media, and quizzes after creation.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-6 rounded-xl bg-[#12161F] border border-[#1F2636] space-y-5">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">Parent Module</label>
          <select
            required
            value={moduleId}
            onChange={(e) => setModuleId(e.target.value)}
            className="w-full px-3.5 py-2 rounded-lg bg-[#0C0F16] border border-[#222938] text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          >
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.course.title} → {m.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">Lesson Title</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="e.g. Ringing Out Clean Chords"
            className="w-full px-3.5 py-2 rounded-lg bg-[#0C0F16] border border-[#222938] text-xs text-slate-100 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Slug (URL identifier)
          </label>
          <input
            type="text"
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            placeholder="e.g. ringing-out-clean-chords"
            className="w-full px-3.5 py-2 rounded-lg bg-[#0C0F16] border border-[#222938] text-xs font-mono text-amber-400 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">Description</label>
          <textarea
            required
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief overview of what the learner will practice..."
            className="w-full px-3.5 py-2 rounded-lg bg-[#0C0F16] border border-[#222938] text-xs text-slate-100 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Difficulty</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg bg-[#0C0F16] border border-[#222938] text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="BEGINNER">BEGINNER</option>
              <option value="INTERMEDIATE">INTERMEDIATE</option>
              <option value="ADVANCED">ADVANCED</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Est. Minutes</label>
            <input
              type="number"
              min={1}
              max={300}
              required
              value={estimatedMinutes}
              onChange={(e) => setEstimatedMinutes(parseInt(e.target.value, 10))}
              className="w-full px-3.5 py-2 rounded-lg bg-[#0C0F16] border border-[#222938] text-xs text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">XP Reward</label>
            <input
              type="number"
              min={5}
              max={500}
              required
              value={xpReward}
              onChange={(e) => setXpReward(parseInt(e.target.value, 10))}
              className="w-full px-3.5 py-2 rounded-lg bg-[#0C0F16] border border-[#222938] text-xs text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Order (Optional)
            </label>
            <input
              type="number"
              min={1}
              value={order}
              onChange={(e) => setOrder(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
              placeholder="Auto"
              className="w-full px-3.5 py-2 rounded-lg bg-[#0C0F16] border border-[#222938] text-xs text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div className="pt-3 flex justify-end gap-3 border-t border-[#1F2636]">
          <Link
            href="/admin/lessons"
            className="px-4 py-2 rounded-lg bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Creating Draft...' : 'Save & Edit Sections'}
          </button>
        </div>
      </form>
    </div>
  );
}
