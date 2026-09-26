'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, Save } from 'lucide-react';

export default function NewCoursePage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState('BEGINNER');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [order, setOrder] = useState<number | ''>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!slug || slug === title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      const res = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          slug,
          description,
          difficulty,
          thumbnailUrl: thumbnailUrl.trim() || null,
          order: order === '' ? undefined : Number(order),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to create course');
      }

      router.push(`/admin/courses/${data.data.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create course');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/courses"
          className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-400" />
            <span>Create Course</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            New courses are created as DRAFT until reviewed and published.
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
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">Course Title</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="e.g. Acoustic Guitar Foundations"
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
            placeholder="e.g. acoustic-guitar-foundations"
            className="w-full px-3.5 py-2 rounded-lg bg-[#0C0F16] border border-[#222938] text-xs font-mono text-amber-400 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">Description</label>
          <textarea
            required
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Comprehensive description of what learners will accomplish..."
            className="w-full px-3.5 py-2 rounded-lg bg-[#0C0F16] border border-[#222938] text-xs text-slate-100 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Display Order (Optional)
            </label>
            <input
              type="number"
              min={1}
              value={order}
              onChange={(e) => setOrder(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
              placeholder="Auto-incremented if blank"
              className="w-full px-3.5 py-2 rounded-lg bg-[#0C0F16] border border-[#222938] text-xs text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Thumbnail Image URL (Optional)
          </label>
          <input
            type="url"
            value={thumbnailUrl}
            onChange={(e) => setThumbnailUrl(e.target.value)}
            placeholder="https://images.unsplash.com/..."
            className="w-full px-3.5 py-2 rounded-lg bg-[#0C0F16] border border-[#222938] text-xs text-slate-100 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="pt-3 flex justify-end gap-3 border-t border-[#1F2636]">
          <Link
            href="/admin/courses"
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
            {saving ? 'Creating Draft...' : 'Create Course Draft'}
          </button>
        </div>
      </form>
    </div>
  );
}
