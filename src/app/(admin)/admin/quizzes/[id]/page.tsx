'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  HelpCircle,
  Save,
  Plus,
  Trash2,
  AlertTriangle,
  ShieldCheck,
  X,
} from 'lucide-react';

interface AnswerOptionInput {
  id?: string;
  text: string;
  isCorrect: boolean;
  order: number;
}

interface QuestionInput {
  id?: string;
  type: string;
  prompt: string;
  explanation?: string | null;
  order: number;
  options: AnswerOptionInput[];
  _count?: { attemptAnswers: number };
}

interface QuizDetail {
  id: string;
  lessonId: string;
  title: string;
  description: string;
  passingScore: number;
  xpReward: number;
  updatedAt: string;
  lesson: { id: string; title: string; slug: string; status: string };
  questions: QuestionInput[];
}

export default function QuizEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const [quiz, setQuiz] = useState<QuizDetail | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [passingScore, setPassingScore] = useState(60);
  const [xpReward, setXpReward] = useState(10);
  const [questions, setQuestions] = useState<QuestionInput[]>([]);
  const [clientUpdatedAt, setClientUpdatedAt] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [concurrencyConflict, setConcurrencyConflict] = useState(false);
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch(`/api/admin/quizzes/${id}`);
        const data = await res.json();
        if (ignore) return;
        if (!res.ok) {
          throw new Error(data.error?.message || 'Failed to fetch quiz');
        }
        const q = data.data;
        setQuiz(q);
        setTitle(q.title);
        setDescription(q.description);
        setPassingScore(q.passingScore);
        setXpReward(q.xpReward);
        setQuestions(q.questions);
        setClientUpdatedAt(q.updatedAt);
        setError(null);
        setConcurrencyConflict(false);
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Failed to fetch quiz');
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

  const handleAddQuestion = () => {
    const newQ: QuestionInput = {
      type: 'MULTIPLE_CHOICE',
      prompt: 'New Question Prompt',
      explanation: '',
      order: questions.length + 1,
      options: [
        { text: 'Option A (Correct)', isCorrect: true, order: 1 },
        { text: 'Option B', isCorrect: false, order: 2 },
        { text: 'Option C', isCorrect: false, order: 3 },
      ],
    };
    setQuestions([...questions, newQ]);
  };

  const handleRemoveQuestion = (qIndex: number) => {
    const target = questions[qIndex];
    if (target._count && target._count.attemptAnswers > 0) {
      alert(`Cannot delete question because it has ${target._count.attemptAnswers} learner attempts recorded.`);
      return;
    }
    const updated = questions.filter((_, idx) => idx !== qIndex);
    // renumber orders
    setQuestions(updated.map((q, idx) => ({ ...q, order: idx + 1 })));
  };

  const handleQuestionChange = (qIndex: number, field: string, value: unknown) => {
    const updated = [...questions];
    updated[qIndex] = { ...updated[qIndex], [field]: value };
    setQuestions(updated);
  };

  const handleOptionChange = (qIndex: number, optIndex: number, text: string) => {
    const updated = [...questions];
    const options = [...updated[qIndex].options];
    options[optIndex] = { ...options[optIndex], text };
    updated[qIndex] = { ...updated[qIndex], options };
    setQuestions(updated);
  };

  const handleSetCorrectOption = (qIndex: number, correctOptIndex: number) => {
    const updated = [...questions];
    const options = updated[qIndex].options.map((opt, idx) => ({
      ...opt,
      isCorrect: idx === correctOptIndex,
    }));
    updated[qIndex] = { ...updated[qIndex], options };
    setQuestions(updated);
  };

  const handleAddOption = (qIndex: number) => {
    const updated = [...questions];
    const options = [...updated[qIndex].options];
    options.push({
      text: `Option ${String.fromCharCode(65 + options.length)}`,
      isCorrect: false,
      order: options.length + 1,
    });
    updated[qIndex] = { ...updated[qIndex], options };
    setQuestions(updated);
  };

  const handleRemoveOption = (qIndex: number, optIndex: number) => {
    const updated = [...questions];
    if (updated[qIndex].options.length <= 2) {
      alert('Questions must have at least 2 options.');
      return;
    }
    const options = updated[qIndex].options.filter((_, idx) => idx !== optIndex);
    // If we removed the correct option, default first option to correct
    if (!options.some((o) => o.isCorrect) && options.length > 0) {
      options[0].isCorrect = true;
    }
    updated[qIndex] = { ...updated[qIndex], options: options.map((o, idx) => ({ ...o, order: idx + 1 })) };
    setQuestions(updated);
  };

  const handleSaveQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      setConcurrencyConflict(false);

      const res = await fetch(`/api/admin/quizzes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          passingScore: Number(passingScore),
          xpReward: Number(xpReward),
          questions: questions.map((q, idx) => ({
            id: q.id,
            type: q.type,
            prompt: q.prompt,
            explanation: q.explanation || null,
            order: idx + 1,
            options: q.options.map((o, oIdx) => ({
              id: o.id,
              text: o.text,
              isCorrect: o.isCorrect,
              order: oIdx + 1,
            })),
          })),
          clientUpdatedAt,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          setConcurrencyConflict(true);
        }
        throw new Error(data.error?.message || 'Failed to save quiz');
      }

      setSuccess('Quiz and questions updated successfully.');
      setRefreshIndex((r) => r + 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save quiz');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-500">Loading quiz details...</div>;
  }

  if (!quiz) {
    return <div className="p-8 text-center text-xs text-rose-400">Quiz not found.</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#222938]">
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/lessons/${quiz.lessonId}`}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-cyan-400" />
              <span>{quiz.title}</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Assessment for lesson:{' '}
              <Link href={`/admin/lessons/${quiz.lessonId}`} className="text-amber-400 font-semibold hover:underline">
                {quiz.lesson.title}
              </Link>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleAddQuestion}
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Question
          </button>
          <button
            onClick={handleSaveQuiz}
            disabled={saving}
            type="button"
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : 'Save Quiz'}
          </button>
        </div>
      </div>

      {concurrencyConflict && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>This quiz was modified by another editor. Refresh before saving.</span>
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

      {/* Quiz Top Settings Form */}
      <form onSubmit={handleSaveQuiz} className="p-6 rounded-xl bg-[#12161F] border border-[#1F2636] space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Quiz Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg bg-[#0C0F16] border border-[#222938] text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Pass Score %
              </label>
              <input
                type="number"
                min={0}
                max={100}
                required
                value={passingScore}
                onChange={(e) => setPassingScore(parseInt(e.target.value, 10))}
                className="w-full px-3.5 py-2 rounded-lg bg-[#0C0F16] border border-[#222938] text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">XP Reward</label>
              <input
                type="number"
                min={0}
                max={500}
                required
                value={xpReward}
                onChange={(e) => setXpReward(parseInt(e.target.value, 10))}
                className="w-full px-3.5 py-2 rounded-lg bg-[#0C0F16] border border-[#222938] text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Quiz Description / Instructions
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3.5 py-2 rounded-lg bg-[#0C0F16] border border-[#222938] text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </form>

      {/* Questions List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <span>Questions ({questions.length})</span>
          </h2>
          <button
            onClick={handleAddQuestion}
            type="button"
            className="flex items-center gap-1 text-xs text-cyan-400 font-semibold hover:underline"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Another Question
          </button>
        </div>

        {questions.length === 0 ? (
          <div className="p-8 rounded-xl bg-[#12161F] border border-[#1F2636] text-center text-xs text-slate-500">
            No questions added yet. Click &quot;Add Question&quot; above.
          </div>
        ) : (
          questions.map((q, qIdx) => (
            <div
              key={q.id || `q-${qIdx}`}
              className="p-5 rounded-xl bg-[#12161F] border border-[#1F2636] space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#1F2636]">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-cyan-400">
                    Q{qIdx + 1}
                  </span>
                  <select
                    value={q.type}
                    onChange={(e) => handleQuestionChange(qIdx, 'type', e.target.value)}
                    className="px-2 py-1 rounded bg-[#0C0F16] border border-[#222938] text-xs text-slate-300 focus:outline-none"
                  >
                    <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                    <option value="TRUE_FALSE">True / False</option>
                    <option value="CHORD_IDENTIFICATION">Chord Identification</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  {q._count && q._count.attemptAnswers > 0 && (
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      {q._count.attemptAnswers} historical attempts
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveQuestion(qIdx)}
                    title="Delete Question"
                    className="p-1 rounded text-slate-500 hover:text-rose-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Prompt Question
                </label>
                <input
                  type="text"
                  required
                  value={q.prompt}
                  onChange={(e) => handleQuestionChange(qIdx, 'prompt', e.target.value)}
                  placeholder="e.g. Which finger plays the 3rd fret on the 5th string in a C Major chord?"
                  className="w-full px-3 py-1.5 rounded-lg bg-[#0C0F16] border border-[#222938] text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Explanation / Feedback after submission
                </label>
                <input
                  type="text"
                  value={q.explanation || ''}
                  onChange={(e) => handleQuestionChange(qIdx, 'explanation', e.target.value)}
                  placeholder="e.g. Your ring finger (3rd finger) holds down the 5th string at the 3rd fret."
                  className="w-full px-3 py-1.5 rounded-lg bg-[#0C0F16] border border-[#222938] text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Answer Options */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Answer Options (Select the single correct answer):</span>
                  <button
                    type="button"
                    onClick={() => handleAddOption(qIdx)}
                    className="text-cyan-400 hover:underline flex items-center gap-0.5 text-[10px]"
                  >
                    <Plus className="w-3 h-3" /> Add Option
                  </button>
                </div>

                {q.options.map((opt, optIdx) => (
                  <div
                    key={opt.id || `opt-${optIdx}`}
                    className={`flex items-center gap-3 p-2 rounded-lg border ${
                      opt.isCorrect
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200'
                        : 'bg-[#0C0F16] border-[#222938] text-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`correct-answer-${qIdx}`}
                      checked={opt.isCorrect}
                      onChange={() => handleSetCorrectOption(qIdx, optIdx)}
                      className="text-emerald-500 focus:ring-emerald-500"
                      title="Mark as correct answer"
                    />
                    <input
                      type="text"
                      required
                      value={opt.text}
                      onChange={(e) => handleOptionChange(qIdx, optIdx, e.target.value)}
                      placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                      className="flex-1 bg-transparent border-none text-xs text-inherit focus:outline-none"
                    />
                    {opt.isCorrect && (
                      <span className="text-[10px] font-bold text-emerald-400 uppercase">
                        Correct
                      </span>
                    )}
                    {q.options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(qIdx, optIdx)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}

        <div className="pt-4 flex justify-end">
          <button
            onClick={handleSaveQuiz}
            disabled={saving}
            type="button"
            className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : 'Save All Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
