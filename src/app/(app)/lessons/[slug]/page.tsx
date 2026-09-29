'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChordDiagram } from '@/components/guitar/ChordDiagram';
import { strumChord } from '@/lib/audio';
import {
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  Music,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  Volume2,
} from 'lucide-react';


interface LessonSection {
  id: string;
  type: string;
  title: string;
  content: string;
  mediaUrl?: string | null;
  mediaAssetId?: string | null;
  mediaAsset?: {
    id: string;
    publicUrl: string;
    mimeType?: string;
    type?: string;
    altText?: string | null;
  } | null;
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
  const [isPlucking, setIsPlucking] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showThumbTip, setShowThumbTip] = useState(false);

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
      // Non-blocking
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

  const handlePrevSection = () => {
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex((prev) => prev - 1);
    }
  };

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

  const handlePluckAcousticChord = () => {
    setIsPlucking(true);
    // G Major or C Major strum
    strumChord([3, 2, 0, 0, 0, 3], 'DOWN');
    setTimeout(() => setIsPlucking(false), 1200);
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-pulse pt-4">
        <div className="h-10 bg-[#171A20] rounded-xl w-48" />
        <div className="h-80 bg-[#171A20] rounded-2xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-md mx-auto p-8 text-center space-y-4 rounded-2xl bg-[#171A20] border border-red-500/30">
        <div className="text-4xl">🔒</div>
        <h1 className="text-xl font-bold text-[#F8FAFC]">Access Restricted</h1>
        <p className="text-sm text-slate-400">{error}</p>
        <button
          onClick={() => router.push('/learn')}
          className="px-5 py-2.5 rounded-xl bg-amber-500 text-[#0E1014] font-bold text-sm"
        >
          Return to Roadmap
        </button>
      </div>
    );
  }

  const { lesson } = data;
  const sections = lesson.sections;
  const currentSection = sections[currentSectionIndex];
  const isLastSection = currentSectionIndex === sections.length - 1;
  const progressPercent = Math.round(((currentSectionIndex + 1) / sections.length) * 100);

  return (
    <div className="min-h-screen bg-[#0E1014] text-[#F8FAFC] pb-28 font-sans">
      {/* 1. Minimalist Zen Progression Meta Bar */}
      <section className="w-full bg-[#171A20]/90 border-b border-[#2A303A] sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          {/* Left: Exit to Roadmap */}
          <Link
            href="/learn"
            className="group flex items-center gap-1.5 text-xs font-mono uppercase text-slate-400 hover:text-amber-400 transition-colors py-1"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            <span className="hidden sm:inline">Exit to Roadmap</span>
            <span className="sm:hidden">Exit</span>
          </Link>

          {/* Center: Segmented Progress Indicator */}
          <div className="flex flex-col items-center gap-1.5 flex-1 max-w-[280px]">
            <div className="flex items-center justify-between w-full">
              <span className="text-[10px] font-mono uppercase text-[#F8FAFC] tracking-wider font-semibold truncate max-w-[160px]">
                {lesson.title}
              </span>
              <span className="text-[11px] font-mono text-amber-400">
                Step {currentSectionIndex + 1} of {sections.length}
              </span>
            </div>
            {/* Segmented Bars */}
            <div className="flex items-center gap-1 w-full h-1.5">
              {sections.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-full flex-1 rounded-sm transition-all duration-300 ${
                    idx < currentSectionIndex
                      ? 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)]'
                      : idx === currentSectionIndex
                      ? 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.7)] animate-pulse'
                      : 'bg-[#2A303A]'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Right: Reward Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full shadow-[0_0_12px_rgba(245,158,11,0.15)] text-amber-400 text-xs font-mono font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>+{lesson.xpReward} XP</span>
          </div>
        </div>
      </section>

      {/* 2. Reader Body Content Area */}
      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">
        {/* Lesson Step Header */}
        <header className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-[10px] tracking-widest uppercase font-semibold">
              {currentSection?.type || 'LESSON'}
            </span>
            <span className="text-slate-400 font-mono text-[11px] uppercase">
              • Module {lesson.module.order}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F8FAFC] tracking-tight">
            {currentSection?.title || lesson.title}
          </h1>
        </header>

        {/* Section Content */}
        {currentSection && (
          <div className="space-y-6">
            {/* Visual Media Rendering (VIDEO or IMAGE) */}
            {(currentSection.mediaAsset?.publicUrl || currentSection.mediaUrl) && (
              <div className="rounded-2xl overflow-hidden border border-[#2A303A] bg-black">
                {currentSection.type === 'VIDEO' || currentSection.mediaAsset?.type === 'VIDEO' ? (
                  <video
                    controls
                    src={currentSection.mediaAsset?.publicUrl || currentSection.mediaUrl || ''}
                    className="w-full max-h-[440px] object-contain"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentSection.mediaAsset?.publicUrl || currentSection.mediaUrl || ''}
                    alt={currentSection.mediaAsset?.altText || currentSection.title}
                    className="w-full max-h-[440px] object-contain"
                  />
                )}
              </div>
            )}

            {/* Specialized Rendering: CHORD Diagram Card with Sound Plucker */}
            {currentSection.type === 'CHORD' && (
              <section className="flex flex-col bg-[#171A20] rounded-2xl border border-[#2A303A] overflow-hidden shadow-xl">
                <div className="p-5 border-b border-[#2A303A] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#20242C]/50">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-amber-400 tracking-wider font-semibold">
                      Acoustic Fretboard Engine
                    </span>
                    <h2 className="text-lg font-bold text-[#F8FAFC]">
                      {currentSection.title.replace('Chord Diagram: ', '')}
                    </h2>
                  </div>
                  <button
                    onClick={handlePluckAcousticChord}
                    disabled={isPlucking}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-[#0E1014] font-bold text-xs shadow-[0_2px_8px_rgba(245,158,11,0.3)] transition-all cursor-pointer"
                  >
                    <Volume2 className="w-4 h-4" />
                    <span>{isPlucking ? 'Synthesizing...' : 'Pluck Chord Sound'}</span>
                  </button>
                </div>

                {/* SVG Chord Rendering */}
                <div className="py-6 flex flex-col items-center justify-center bg-gradient-to-b from-[#121418] to-[#171A20]">
                  <ChordDiagram
                    name={currentSection.title.replace('Chord Diagram: ', '')}
                    data={{
                      strings: [3, 2, 0, 0, 0, 3],
                      fingers: [2, 1, 0, 0, 0, 3],
                      baseFret: 1,
                    }}
                    notes={['G', 'B', 'D']}
                    size="lg"
                  />
                  <div className="mt-3 flex items-center gap-2 text-xs font-mono text-slate-400">
                    <span className={`w-2 h-2 rounded-full ${isPlucking ? 'bg-emerald-400 animate-ping' : 'bg-emerald-400'}`} />
                    <span>Web Audio Synthesizer: 44.1 kHz Plucked String Waveform</span>
                  </div>
                </div>
              </section>
            )}

            {/* Main Text Content */}
            <div className="p-6 rounded-2xl bg-[#171A20] border border-[#2A303A] text-slate-300 text-sm sm:text-base leading-relaxed space-y-4">
              {currentSection.content}
            </div>

            {/* Warning / Form Correction Callout */}
            {currentSection.type === 'WARNING' && (
              <section className="flex flex-col p-5 bg-[#1E1517] rounded-xl border border-[#2A1D20] border-l-4 border-l-[#EF4444] shadow-md gap-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono uppercase text-red-400 tracking-wider font-bold">
                      Crucial Form Correction
                    </span>
                    <h4 className="text-sm sm:text-base font-bold text-[#F8FAFC]">
                      {currentSection.title}
                    </h4>
                  </div>
                </div>
                <div className="pl-8 text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Keep your fretting wrist relaxed and arch your knuckles straight down. If an adjacent string sounds muted or buzzy, adjust your finger angle away from the fretboard face.
                </div>
                <div className="pl-8 pt-1">
                  <button
                    onClick={() => setShowThumbTip(!showThumbTip)}
                    className="text-xs font-mono text-amber-400 hover:text-amber-300 underline"
                  >
                    {showThumbTip ? 'Hide thumb alignment tips' : 'View ergonomic thumb alignment tips →'}
                  </button>
                  {showThumbTip && (
                    <div className="mt-2 p-3 rounded-lg bg-[#20242C] border border-[#2A303A] text-xs text-slate-300 font-mono">
                      Keep the pad of your fretting thumb aligned behind the guitar neck opposite fret 2. This drops your palm forward and gives your fingertips perpendicular clearance.
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Specialized Rendering: PRACTICE Action Callout */}
            {currentSection.type === 'PRACTICE' && (
              <div className="p-5 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                    <Music className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#F8FAFC]">Launch Focus Practice Session</h4>
                    <p className="text-xs text-blue-200">Test finger transitions with the synchronized metronome and transition timer.</p>
                  </div>
                </div>
                <Link
                  href={`/practice?lessonId=${lesson.id}`}
                  className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 text-[#0E1014] font-bold text-xs shrink-0"
                >
                  Open Practice Room ⏱️
                </Link>
              </div>
            )}
          </div>
        )}
      </article>

      {/* 3. Sticky Bottom Progression Action Bar */}
      <footer className="w-full fixed bottom-0 left-0 bg-[#0E1014]/95 border-t border-[#2A303A] backdrop-blur-xl z-40 py-3">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4">
          {/* Previous Step Button */}
          <button
            onClick={handlePrevSection}
            disabled={currentSectionIndex === 0}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
              currentSectionIndex === 0
                ? 'opacity-40 bg-[#171A20] border-[#2A303A] text-slate-500 cursor-not-allowed'
                : 'bg-[#171A20] hover:bg-[#20242C] border-[#2A303A] text-[#F8FAFC]'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Previous Section</span>
            <span className="sm:hidden">Prev</span>
          </button>

          {/* Center Micro Indicator */}
          <div className="flex flex-col items-center">
            <span className="font-mono text-xs text-[#F8FAFC] font-semibold">
              Step {currentSectionIndex + 1} of {sections.length}
            </span>
            <span className="font-mono text-[10px] text-amber-400 uppercase">
              {progressPercent}% Complete
            </span>
          </div>

          {/* Next Step / Complete / Quiz Action Button */}
          {!isLastSection ? (
            <button
              onClick={handleNextSection}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#0E1014] font-extrabold text-xs shadow-[0_2px_10px_rgba(245,158,11,0.3)] transition-all cursor-pointer"
            >
              <span>Next Section</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : lesson.quiz ? (
            <Link
              href={`/quizzes/${lesson.quiz.id}`}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#0E1014] font-extrabold text-xs shadow-[0_2px_10px_rgba(34,197,94,0.3)] transition-all"
            >
              <HelpCircle className="w-4 h-4" />
              <span>Take Lesson Quiz</span>
            </Link>
          ) : (
            <button
              onClick={handleCompleteLesson}
              disabled={isCompleting}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#0E1014] font-extrabold text-xs shadow-[0_2px_10px_rgba(34,197,94,0.3)] transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isCompleting ? 'Completing...' : 'Complete Lesson'}</span>
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
