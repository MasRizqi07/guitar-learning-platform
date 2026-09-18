'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  Sparkles,
  HelpCircle,
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

interface LessonData {
  lesson: {
    id: string;
    title: string;
    slug: string;
    description: string;
    difficulty: string;
    estimatedMinutes: number;
    xpReward: number;
    order: number;
    module: {
      id: string;
      title: string;
      order: number;
    };
    sections: LessonSection[];
    quiz?: {
      id: string;
      title: string;
      passingScore: number;
      xpReward: number;
    } | null;
  };
  progress: {
    status: string;
    currentSectionOrder: number;
    progressPercentage: number;
  };
  availability: string;
}

export default function LessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();

  const [data, setData] = useState<LessonData | null>(null);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/lessons/${slug}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) {
          throw new Error(body.error?.message || 'Failed to load lesson');
        }
        return body.data;
      })
      .then((lessonData: LessonData) => {
        setData(lessonData);
        // Start from user's current progress section
        const initialIndex = Math.max(
          0,
          Math.min(
            lessonData.progress.currentSectionOrder - 1,
            lessonData.lesson.sections.length - 1
          )
        );
        setCurrentSectionIndex(initialIndex);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Error loading lesson');
      })
      .finally(() => setIsLoading(false));
  }, [slug]);

  const saveProgress = async (nextOrder: number) => {
    if (!data) return;
    try {
      await fetch(`/api/lessons/${data.lesson.id}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentSectionOrder: nextOrder }),
      });
    } catch {
      // Background save failure is non-blocking
    }
  };

  const handleNextSection = () => {
    if (!data) return;
    if (currentSectionIndex < data.lesson.sections.length - 1) {
      const nextIndex = currentSectionIndex + 1;
      setCurrentSectionIndex(nextIndex);
      saveProgress(nextIndex + 1);
    }
  };

  const [isCompleting, setIsCompleting] = useState(false);

  const handleCompleteLesson = async () => {
    if (!data) return;
    setIsCompleting(true);
    try {
      const res = await fetch(`/api/lessons/${data.lesson.id}/complete`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to complete lesson');
      }
      router.push('/learn');
      router.refresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to complete lesson');
    } finally {
      setIsCompleting(false);
    }
  };

  const handlePrevSection = () => {
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex((prev) => prev - 1);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-pulse">
        <div className="h-10 bg-[#171A20] rounded-xl w-48" />
        <div className="h-72 bg-[#171A20] rounded-2xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="max-w-md mx-auto p-8 text-center space-y-4 border-red-500/30">
        <div className="text-4xl">🔒</div>
        <h1 className="text-xl font-bold text-slate-100">Access Restricted</h1>
        <p className="text-sm text-slate-400">{error}</p>
        <Button onClick={() => router.push('/learn')}>Return to Roadmap</Button>
      </Card>
    );
  }

  const { lesson } = data;
  const sections = lesson.sections;
  const currentSection = sections[currentSectionIndex];
  const isLastSection = currentSectionIndex === sections.length - 1;
  const progressPercent = Math.round(((currentSectionIndex + 1) / sections.length) * 100);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Link
            href="/learn"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Module {lesson.module.order}
          </Link>
          <Badge variant="primary" size="sm">
            <Sparkles className="w-3 h-3 mr-1" />
            +{lesson.xpReward} XP
          </Badge>
        </div>

        <div>
          <div className="text-xs font-bold text-amber-500 tracking-wider uppercase">
            Lesson #{lesson.order}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-100">{lesson.title}</h1>
        </div>

        {/* Section Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-400">
            <span>
              Section {currentSectionIndex + 1} of {sections.length}
            </span>
            <span>{progressPercent}%</span>
          </div>
          <ProgressBar value={progressPercent} size="sm" />
        </div>
      </div>

      {/* Main Section Content Card */}
      {currentSection && (
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
            <div className="text-slate-300 text-sm sm:text-base leading-relaxed space-y-4">
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

            {/* Specialized Rendering: PRACTICE Action Callout */}
            {currentSection.type === 'PRACTICE' && (
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-blue-200">
                  Ready to test your fingers? Open focused practice mode to build muscle memory.
                </div>
                <Link href={`/practice?lessonId=${lesson.id}`} className="shrink-0">
                  <Button variant="secondary" size="sm" className="border-blue-500/40 text-blue-300">
                    Open Practice Room ⏱️
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Section Navigation Footer */}
          <div className="flex items-center justify-between pt-6 border-t border-[#2A303A]">
            <Button
              variant="secondary"
              onClick={handlePrevSection}
              disabled={currentSectionIndex === 0}
              className="gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </Button>

            {!isLastSection ? (
              <Button onClick={handleNextSection} className="gap-1.5">
                Next Section <ChevronRight className="w-4 h-4" />
              </Button>
            ) : lesson.quiz ? (
              <Link href={`/quizzes/${lesson.quiz.id}`}>
                <Button className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold gap-2">
                  <HelpCircle className="w-4 h-4" /> Take Lesson Quiz
                </Button>
              </Link>
            ) : (
              <Button
                onClick={handleCompleteLesson}
                disabled={isCompleting}
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> {isCompleting ? 'Completing...' : 'Complete Lesson'}
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
