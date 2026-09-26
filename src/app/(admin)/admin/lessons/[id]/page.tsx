'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  FileText,
  Save,
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
  Eye,
  History,
  Send,
  UploadCloud,
  Archive,
  HelpCircle,
  AlertTriangle,
  Edit2,
  X,
} from 'lucide-react';

interface LessonSectionItem {
  id: string;
  type: string;
  title: string;
  content: string;
  mediaUrl: string | null;
  metadata: Record<string, unknown> | null;
  required: boolean;
  order: number;
}

interface LessonDetail {
  id: string;
  moduleId: string;
  title: string;
  slug: string;
  description: string;
  difficulty: string;
  estimatedMinutes: number;
  xpReward: number;
  order: number;
  status: 'DRAFT' | 'IN_REVIEW' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED';
  published: boolean;
  updatedAt: string;
  module: {
    id: string;
    title: string;
    course: { id: string; title: string };
  };
  sections: LessonSectionItem[];
  quiz: {
    id: string;
    title: string;
    passingScore: number;
    xpReward: number;
    questions: Array<{ id: string }>;
  } | null;
  revisions: Array<{ id: string; version: number; createdAt: string }>;
}

export default function LessonEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState('BEGINNER');
  const [estimatedMinutes, setEstimatedMinutes] = useState(10);
  const [xpReward, setXpReward] = useState(20);
  const [order, setOrder] = useState<number>(1);
  const [status, setStatus] = useState<string>('DRAFT');
  const [clientUpdatedAt, setClientUpdatedAt] = useState<string>('');

  // Section modal state
  const [editingSection, setEditingSection] = useState<LessonSectionItem | null>(null);
  const [isNewSection, setIsNewSection] = useState(false);
  const [secType, setSecType] = useState('TEXT');
  const [secTitle, setSecTitle] = useState('');
  const [secContent, setSecContent] = useState('');
  const [secMediaUrl, setSecMediaUrl] = useState('');
  const [secRequired, setSecRequired] = useState(true);

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
        const res = await fetch(`/api/admin/lessons/${id}`);
        const data = await res.json();
        if (ignore) return;
        if (!res.ok) {
          throw new Error(data.error?.message || 'Failed to fetch lesson details');
        }
        const l = data.data;
        setLesson(l);
        setTitle(l.title);
        setSlug(l.slug);
        setDescription(l.description);
        setDifficulty(l.difficulty);
        setEstimatedMinutes(l.estimatedMinutes);
        setXpReward(l.xpReward);
        setOrder(l.order);
        setStatus(l.status);
        setClientUpdatedAt(l.updatedAt);
        setError(null);
        setConcurrencyConflict(false);
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Failed to fetch lesson details');
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

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      setConcurrencyConflict(false);

      const res = await fetch(`/api/admin/lessons/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          slug,
          description,
          difficulty,
          estimatedMinutes: Number(estimatedMinutes),
          xpReward: Number(xpReward),
          order: Number(order),
          status,
          clientUpdatedAt,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          setConcurrencyConflict(true);
        }
        throw new Error(data.error?.message || 'Failed to update lesson');
      }

      setLesson((prev) => (prev ? { ...prev, ...data.data } : null));
      setClientUpdatedAt(data.data.updatedAt);
      setSuccess('Lesson metadata saved successfully.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update lesson');
    } finally {
      setSaving(false);
    }
  };

  const handleWorkflowAction = async (action: 'submit-review' | 'publish' | 'archive') => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      const res = await fetch(`/api/admin/lessons/${id}/${action}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || `Action ${action} failed`);
      }
      setSuccess(`Lesson successfully ${action === 'submit-review' ? 'submitted for review' : action === 'publish' ? 'published' : 'archived'}!`);
      setRefreshIndex((r) => r + 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : `Action ${action} failed`);
    } finally {
      setSaving(false);
    }
  };

  // Section Modal open
  const openNewSectionModal = () => {
    setIsNewSection(true);
    setEditingSection(null);
    setSecType('TEXT');
    setSecTitle('');
    setSecContent('');
    setSecMediaUrl('');
    setSecRequired(true);
  };

  const openEditSectionModal = (sec: LessonSectionItem) => {
    setIsNewSection(false);
    setEditingSection(sec);
    setSecType(sec.type);
    setSecTitle(sec.title);
    setSecContent(sec.content);
    setSecMediaUrl(sec.mediaUrl || '');
    setSecRequired(sec.required);
  };

  const handleSaveSection = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      if (isNewSection) {
        const res = await fetch(`/api/admin/lessons/${id}/sections`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lessonId: id,
            type: secType,
            title: secTitle,
            content: secContent,
            mediaUrl: secMediaUrl.trim() || null,
            required: secRequired,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || 'Failed to add section');
      } else if (editingSection) {
        const res = await fetch(`/api/admin/lessons/${id}/sections/${editingSection.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: secType,
            title: secTitle,
            content: secContent,
            mediaUrl: secMediaUrl.trim() || null,
            required: secRequired,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || 'Failed to update section');
      }

      setEditingSection(null);
      setIsNewSection(false);
      setRefreshIndex((r) => r + 1);
      setSuccess('Section saved.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save section');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm('Are you sure you want to delete this section?')) return;
    try {
      setSaving(true);
      setError(null);
      const res = await fetch(`/api/admin/lessons/${id}/sections/${sectionId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to delete section');
      setRefreshIndex((r) => r + 1);
      setSuccess('Section deleted.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete section');
    } finally {
      setSaving(false);
    }
  };

  const handleMoveSection = async (index: number, direction: 'up' | 'down') => {
    if (!lesson || reordering) return;
    const sections = [...lesson.sections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;

    const temp = sections[index];
    sections[index] = sections[targetIndex];
    sections[targetIndex] = temp;

    const items = sections.map((s, idx) => ({ id: s.id, order: idx + 1 }));

    try {
      setReordering(true);
      setError(null);
      const res = await fetch(`/api/admin/lessons/${id}/reorder-sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to reorder sections');
      setRefreshIndex((r) => r + 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reorder sections');
    } finally {
      setReordering(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-500">Loading lesson...</div>;
  }

  if (!lesson) {
    return <div className="p-8 text-center text-xs text-rose-400">Lesson not found.</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Navigation & Workflow Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#222938]">
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
              <span>{lesson.title}</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Module: <span className="text-slate-200">{lesson.module.title}</span> • Status:{' '}
              <span className="font-semibold text-amber-400 uppercase">{lesson.status}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/admin/lessons/${lesson.id}/preview`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:text-white hover:bg-slate-700 transition"
          >
            <Eye className="w-3.5 h-3.5" />
            Preview
          </Link>

          <Link
            href={`/admin/lessons/${lesson.id}/revisions`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:text-white hover:bg-slate-700 transition"
          >
            <History className="w-3.5 h-3.5" />
            Revisions ({lesson.revisions.length})
          </Link>

          {lesson.status === 'DRAFT' && (
            <button
              onClick={() => handleWorkflowAction('submit-review')}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-bold hover:bg-amber-500/20 transition"
            >
              <Send className="w-3.5 h-3.5" />
              Submit Review
            </button>
          )}

          {lesson.status === 'IN_REVIEW' && (
            <button
              onClick={() => handleWorkflowAction('publish')}
              disabled={saving}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 text-slate-950 text-xs font-bold hover:bg-emerald-400 transition"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              Approve & Publish
            </button>
          )}

          {lesson.status === 'PUBLISHED' && (
            <button
              onClick={() => handleWorkflowAction('archive')}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 text-xs font-semibold hover:text-rose-400 transition"
            >
              <Archive className="w-3.5 h-3.5" />
              Archive
            </button>
          )}
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

      {/* Lesson Metadata Form */}
      <form onSubmit={handleSaveLesson} className="p-6 rounded-xl bg-[#12161F] border border-[#1F2636] space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Lesson Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg bg-[#0C0F16] border border-[#222938] text-xs text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Lifecycle Status</label>
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

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Display Order</label>
            <input
              type="number"
              min={1}
              required
              value={order}
              onChange={(e) => setOrder(parseInt(e.target.value, 10))}
              className="w-full px-3.5 py-2 rounded-lg bg-[#0C0F16] border border-[#222938] text-xs text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">Description</label>
          <textarea
            required
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3.5 py-2 rounded-lg bg-[#0C0F16] border border-[#222938] text-xs text-slate-100 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : 'Save Lesson Metadata'}
          </button>
        </div>
      </form>

      {/* Sections Management */}
      <div className="p-6 rounded-xl bg-[#12161F] border border-[#1F2636] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#1F2636]">
          <div>
            <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>Content Sections ({lesson.sections.length})</span>
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Structured lesson steps. Required for publishing.
            </p>
          </div>
          <button
            onClick={openNewSectionModal}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Section
          </button>
        </div>

        {lesson.sections.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No sections yet. Add at least one section before submitting for review.
          </div>
        ) : (
          <div className="space-y-2">
            {lesson.sections.map((sec, index) => (
              <div
                key={sec.id}
                className="p-3.5 rounded-lg bg-[#0C0F16] border border-[#1F2636] flex items-center justify-between gap-3 hover:border-slate-700 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-amber-400 w-6 text-center">
                    #{sec.order}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-slate-100">{sec.title}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 uppercase">
                        {sec.type}
                      </span>
                      {sec.required && (
                        <span className="text-[10px] text-emerald-400">Required</span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                      {sec.content}
                    </div>
                    {sec.mediaUrl && (
                      <div className="text-[10px] text-amber-400/80 truncate max-w-sm mt-0.5">
                        Media: {sec.mediaUrl}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleMoveSection(index, 'up')}
                    disabled={index === 0 || reordering}
                    aria-label={`Move section ${sec.title} up`}
                    className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveSection(index, 'down')}
                    disabled={index === lesson.sections.length - 1 || reordering}
                    aria-label={`Move section ${sec.title} down`}
                    className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => openEditSectionModal(sec)}
                    aria-label={`Edit section ${sec.title}`}
                    className="p-1 rounded bg-slate-800 text-amber-400 hover:bg-slate-700"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteSection(sec.id)}
                    aria-label={`Delete section ${sec.title}`}
                    className="p-1 rounded bg-slate-800 text-slate-500 hover:text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quiz Card */}
      <div className="p-6 rounded-xl bg-[#12161F] border border-[#1F2636] space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-[#1F2636]">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-cyan-400" />
            <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Lesson Quiz
            </h2>
          </div>
          {lesson.quiz ? (
            <Link
              href={`/admin/quizzes/${lesson.quiz.id}`}
              className="text-xs text-amber-400 font-semibold hover:underline"
            >
              Open Quiz Editor →
            </Link>
          ) : (
            <span className="text-xs text-slate-500">No quiz configured</span>
          )}
        </div>

        {lesson.quiz ? (
          <div className="p-3.5 rounded-lg bg-[#0C0F16] border border-[#1F2636] flex items-center justify-between text-xs">
            <div>
              <div className="font-semibold text-slate-100">{lesson.quiz.title}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {lesson.quiz.questions.length} questions • Passing score: {lesson.quiz.passingScore}% • Reward: +{lesson.quiz.xpReward} XP
              </div>
            </div>
            <Link
              href={`/admin/quizzes/${lesson.quiz.id}`}
              className="px-3 py-1 rounded bg-slate-800 text-cyan-400 hover:bg-slate-700 font-medium"
            >
              Edit Questions
            </Link>
          </div>
        ) : (
          <p className="text-xs text-slate-400">
            Quizzes can be created through the curriculum or seed. Once attached, quiz questions and options are edited through the dedicated Quiz CMS.
          </p>
        )}
      </div>

      {/* Section Edit / Create Modal */}
      {(isNewSection || editingSection) && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-[#12161F] border border-[#222938] rounded-xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1F2636]">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                <span>{isNewSection ? 'Add New Section' : `Edit Section #${editingSection?.order}`}</span>
              </h3>
              <button
                onClick={() => {
                  setEditingSection(null);
                  setIsNewSection(false);
                }}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSection} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Section Type
                  </label>
                  <select
                    value={secType}
                    onChange={(e) => setSecType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#0C0F16] border border-[#222938] text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="TEXT">TEXT (Standard reading)</option>
                    <option value="VIDEO">VIDEO (Embedded player)</option>
                    <option value="IMAGE">IMAGE (Visual illustration)</option>
                    <option value="CHORD">CHORD (Interactive diagram)</option>
                    <option value="TIP">TIP (Helpful advice)</option>
                    <option value="WARNING">WARNING (Critical posture/habit)</option>
                    <option value="PRACTICE">PRACTICE (Interactive exercise)</option>
                    <option value="SUMMARY">SUMMARY (Lesson wrap-up)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Section Title
                  </label>
                  <input
                    type="text"
                    required
                    value={secTitle}
                    onChange={(e) => setSecTitle(e.target.value)}
                    placeholder="e.g. Finger Placement Guide"
                    className="w-full px-3 py-2 rounded-lg bg-[#0C0F16] border border-[#222938] text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Content (Markdown supported)
                </label>
                <textarea
                  required
                  rows={4}
                  value={secContent}
                  onChange={(e) => setSecContent(e.target.value)}
                  placeholder="Detailed instructional content for this step..."
                  className="w-full px-3 py-2 rounded-lg bg-[#0C0F16] border border-[#222938] text-xs text-slate-100 focus:outline-none focus:border-amber-500 font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Media URL (Required for VIDEO and IMAGE types)
                </label>
                <input
                  type="url"
                  value={secMediaUrl}
                  onChange={(e) => setSecMediaUrl(e.target.value)}
                  placeholder="https://example.com/video.mp4"
                  className="w-full px-3 py-2 rounded-lg bg-[#0C0F16] border border-[#222938] text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="secReq"
                  checked={secRequired}
                  onChange={(e) => setSecRequired(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500"
                />
                <label htmlFor="secReq" className="text-xs text-slate-300 select-none">
                  Learner must complete this section before progressing
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#1F2636]">
                <button
                  type="button"
                  onClick={() => {
                    setEditingSection(null);
                    setIsNewSection(false);
                  }}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition"
                >
                  {saving ? 'Saving...' : 'Save Section'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
