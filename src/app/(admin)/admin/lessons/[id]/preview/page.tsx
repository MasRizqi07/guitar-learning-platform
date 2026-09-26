'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ChordDiagram } from '@/components/guitar/ChordDiagram';
import {
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  AlertTriangle,
  Lightbulb,
  Music,
  CheckCircle2,
  HelpCircle,
  ShieldAlert,
} from 'lucide-react';

interface LessonSection {
  id: string;
  type: string;
  title: string;
  content: string;
  mediaUrl?: string | null;
  metadata?: Record<string, unknown> | null;
  required: boolean;
  order: number;
}

interface LessonDetail {
  id: string;
  title: string;
  slug: string;
  description: string;
  difficulty: string;
  estimatedMinutes: number;
  xpReward: number;
  order: number;
  status: string;
  module: {
    id: string;
    title: string;
    course: { title: string };
  };
  sections: LessonSection[];
  quiz?: {
    id: string;
    title: string;
    passingScore: number;
    xpReward: number;
    questions: Array<{
      id: string;
      prompt: string;
      type: string;
      options: Array<{ id: string; text: string; isCorrect: boolean }>;
    }>;
  } | null;
}

export default function LessonStaffPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch(`/api/admin/lessons/${id}`);
        const body = await res.json();
        if (ignore) return;
        if (!res.ok) {
          throw new Error(body.error?.message || 'Access denied or lesson not found');
        }
        setLesson(body.data);
        setCurrentSectionIndex(0);
        setError(null);
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Access denied or lesson not found');
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
  }, [id]);

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-500">Loading staff preview...</div>;
  }

  if (error || !lesson) {
    return (
      <div className="p-6 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
        {error || 'Lesson not accessible'}
      </div>
    );
  }

  const sections = lesson.sections || [];
  const currentSection = sections[currentSectionIndex];
  const isLastSection = currentSectionIndex === sections.length - 1;
  const progressPercent = sections.length > 0
    ? Math.round(((currentSectionIndex + 1) / sections.length) * 100)
    : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Staff Preview Watermark Banner */}
      <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <span>
            <strong>STAFF PREVIEW MODE:</strong> Rendering draft curriculum using production learner UI components. Learner progression and XP will not be modified.
          </span>
        </div>
        <Link
          href={`/admin/lessons/${lesson.id}`}
          className="px-3 py-1 rounded bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition"
        >
          Return to CMS
        </Link>
      </div>

      {/* Top Breadcrumb & Status */}
      <div className="flex items-center justify-between">
        <Link
          href={`/admin/lessons/${lesson.id}`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Lesson Editor</span>
        </Link>
        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
          Status: {lesson.status}
        </span>
      </div>

      {/* Header Info */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="neutral">{lesson.module.course.title}</Badge>
          <Badge variant="primary">{lesson.module.title}</Badge>
          <Badge variant="warning">{lesson.difficulty}</Badge>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-100">{lesson.title}</h1>
          <p className="text-xs text-slate-400 mt-1">{lesson.description}</p>
        </div>

        {/* Section Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-400">
            <span>
              Section {currentSectionIndex + 1} of {sections.length || 1}
            </span>
            <span>{progressPercent}%</span>
          </div>
          <ProgressBar value={progressPercent} size="sm" />
        </div>
      </div>

      {/* Main Section Content Card (Reusing learner styling) */}
      {currentSection ? (
        <Card className="p-6 sm:p-10 border-[#2A303A] space-y-6 min-h-[380px] flex flex-col justify-between">
          <div className="space-y-6">
            {/* Section Header */}
            <div className="flex items-center gap-3">
              {currentSection.type === 'TIP' ? (
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                  <Lightbulb className="w-5 h-5" />
                </div>
              ) : currentSection.type === 'WARNING' ? (
                <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              ) : currentSection.type === 'PRACTICE' ? (
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center">
                  <Music className="w-5 h-5" />
                </div>
              ) : currentSection.type === 'SUMMARY' ? (
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              ) : (
                <div className="w-9 h-9 rounded-xl bg-[#20242C] border border-[#2A303A] text-amber-400 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
              )}

              <div>
                <Badge
                  variant={
                    currentSection.type === 'WARNING'
                      ? 'error'
                      : currentSection.type === 'TIP'
                      ? 'warning'
                      : currentSection.type === 'SUMMARY'
                      ? 'success'
                      : 'primary'
                  }
                  size="sm"
                >
                  {currentSection.type}
                </Badge>
                <h2 className="text-lg sm:text-xl font-bold text-slate-100 mt-1">
                  {currentSection.title}
                </h2>
              </div>
            </div>

            {/* Section Body */}
            <div className="text-slate-300 text-sm sm:text-base leading-relaxed space-y-4 whitespace-pre-wrap">
              {currentSection.content}
            </div>

            {/* Specialized Rendering: CHORD Diagram */}
            {currentSection.type === 'CHORD' && (
              <div className="py-4 flex justify-center">
                <ChordDiagram
                  name={currentSection.title.replace('Chord Diagram: ', '')}
                  data={{
                    strings: ['X', 3, 2, 0, 1, 0],
                    fingers: [0, 3, 2, 0, 1, 0],
                    baseFret: 1,
                  }}
                  notes={['C', 'E', 'G']}
                  size="lg"
                />
              </div>
            )}

            {/* Specialized Rendering: Video/Image Media URL */}
            {currentSection.mediaUrl && (
              <div className="p-4 rounded-xl bg-[#0C0F16] border border-[#1F2636] text-xs space-y-2">
                <div className="font-semibold text-slate-300">Media Asset:</div>
                <div className="text-amber-400 font-mono text-[11px] truncate">
                  {currentSection.mediaUrl}
                </div>
              </div>
            )}
          </div>

          {/* Section Navigation Footer (Local state only!) */}
          <div className="flex items-center justify-between pt-6 border-t border-[#2A303A]">
            <Button
              variant="secondary"
              onClick={() => setCurrentSectionIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentSectionIndex === 0}
              className="gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </Button>

            {!isLastSection ? (
              <Button
                onClick={() => setCurrentSectionIndex((prev) => Math.min(sections.length - 1, prev + 1))}
                className="gap-1.5"
              >
                Next Section <ChevronRight className="w-4 h-4" />
              </Button>
            ) : lesson.quiz ? (
              <div className="text-xs text-cyan-400 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4" />
                <span>Quiz preview ({lesson.quiz.questions.length} questions attached)</span>
              </div>
            ) : (
              <div className="text-xs text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>End of lesson preview</span>
              </div>
            )}
          </div>
        </Card>
      ) : (
        <Card className="p-8 text-center text-xs text-slate-500">
          No sections in this lesson to preview.
        </Card>
      )}
    </div>
  );
}
