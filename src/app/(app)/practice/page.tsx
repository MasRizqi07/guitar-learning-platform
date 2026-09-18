'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ChordDiagram } from '@/components/guitar/ChordDiagram';
import { playMetronomeClick } from '@/lib/audio';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

const PRACTICE_TYPES = [
  { id: 'DAILY', label: 'Daily Practice', minSec: 300, desc: '300s min • General practice routine' },
  { id: 'CHORD', label: 'Chord Finger Memory', minSec: 120, desc: '120s min • Holding clear chords' },
  { id: 'CHORD_TRANSITION', label: 'Chord Transitions', minSec: 120, desc: '120s min • Switching between chords' },
  { id: 'STRUMMING', label: 'Strumming Rhythm', minSec: 120, desc: '120s min • Rhythm & tempo drills' },
  { id: 'LESSON', label: 'Lesson Exercise', minSec: 60, desc: '60s min • Guided lesson practice' },
];

function PracticeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lessonIdParam = searchParams.get('lessonId');

  const [practiceType, setPracticeType] = useState<string>(lessonIdParam ? 'LESSON' : 'DAILY');
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  // Metronome State
  const [isMetronomeActive, setIsMetronomeActive] = useState(false);
  const [bpm, setBpm] = useState(80);
  const [beatCount, setBeatCount] = useState(0);

  // Difficulty Feedback Modal State
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'EASY' | 'OKAY' | 'DIFFICULT'>('OKAY');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completionResult, setCompletionResult] = useState<{
    isValid: boolean;
    xpAwarded: number;
    message: string;
  } | null>(null);

  // Practice Timer Ref
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRunning) {
      timer = setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRunning]);

  // Metronome Tick Effect
  useEffect(() => {
    let metronomeInterval: NodeJS.Timeout;
    if (isMetronomeActive && bpm > 0) {
      const intervalMs = (60 / bpm) * 1000;
      metronomeInterval = setInterval(() => {
        setBeatCount((prev) => {
          const nextBeat = (prev % 4) + 1;
          playMetronomeClick(nextBeat === 1);
          return nextBeat;
        });
      }, intervalMs);
    }
    return () => clearInterval(metronomeInterval);
  }, [isMetronomeActive, bpm]);

  const currentTypeConfig = PRACTICE_TYPES.find((t) => t.id === practiceType) || PRACTICE_TYPES[0];
  const meetsThreshold = secondsElapsed >= currentTypeConfig.minSec;

  const handleStop = () => {
    setIsRunning(false);
    setIsMetronomeActive(false);
    setShowCompletionModal(true);
  };

  const handleReset = () => {
    setIsRunning(false);
    setIsMetronomeActive(false);
    setSecondsElapsed(0);
  };

  const submitSession = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/practice/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          practiceType,
          durationSeconds: secondsElapsed,
          lessonId: lessonIdParam || null,
          difficultyFeedback: selectedDifficulty,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to record session');

      setCompletionResult({
        isValid: data.data.isValid,
        xpAwarded: data.data.xpAwarded,
        message: data.data.message,
      });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error submitting session');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Badge variant="primary" size="md">Focused Practice Mode</Badge>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 mt-1">Guitar Practice Room</h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Build muscle memory and internal timing with dedicated practice routines.
          </p>
        </div>

        {/* Practice Type Selector */}
        <div className="flex gap-2 flex-wrap">
          {PRACTICE_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              disabled={isRunning}
              onClick={() => {
                setPracticeType(t.id);
                setSecondsElapsed(0);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                practiceType === t.id
                  ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-[#171A20] border-[#2A303A] text-slate-400 hover:text-slate-200'
              } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Practice Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Timer & Metronome */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-8 border-[#2A303A] text-center space-y-8 bg-gradient-to-b from-[#171A20] to-[#121418]">
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {currentTypeConfig.desc}
              </div>
              {/* Huge Timer */}
              <div className="font-mono text-6xl sm:text-8xl font-black text-slate-100 tracking-tight">
                {formatTime(secondsElapsed)}
              </div>
              <div className="flex items-center justify-center gap-2 text-xs">
                {meetsThreshold ? (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Threshold met (+10 XP ready)
                  </span>
                ) : (
                  <span className="text-amber-400 flex items-center gap-1">
                    <Clock className="w-4 h-4" /> Need {Math.max(0, currentTypeConfig.minSec - secondsElapsed)}s more for XP
                  </span>
                )}
              </div>
            </div>

            {/* Timer Controls */}
            <div className="flex items-center justify-center gap-4">
              <Button
                size="lg"
                onClick={() => setIsRunning(!isRunning)}
                className={`px-8 gap-2 font-bold ${
                  isRunning
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                }`}
              >
                {isRunning ? (
                  <>
                    <Pause className="w-5 h-5 fill-current" /> Pause
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 fill-current" /> Start Practice
                  </>
                )}
              </Button>

              <Button
                variant="secondary"
                size="lg"
                onClick={handleStop}
                disabled={secondsElapsed === 0}
                className="gap-2"
              >
                End & Record
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                disabled={secondsElapsed === 0 && !isRunning}
                title="Reset timer"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>

            {/* Built-in Metronome Controller */}
            <div className="pt-6 border-t border-[#2A303A] max-w-md mx-auto space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-semibold text-slate-200">Acoustic Metronome</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMetronomeActive(!isMetronomeActive)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                    isMetronomeActive
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-[#20242C] text-slate-400 border border-[#2A303A]'
                  }`}
                >
                  {isMetronomeActive ? 'Clicking ON' : 'Turn ON'}
                </button>
              </div>

              {/* BPM Slider & Indicator */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Tempo</span>
                  <span className="font-bold text-amber-400 text-sm">{bpm} BPM</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="180"
                  value={bpm}
                  onChange={(e) => setBpm(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-500 bg-[#2A303A] rounded-lg h-2 cursor-pointer"
                />
              </div>

              {/* 4 Beat Pulse Visualizer */}
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4].map((b) => (
                  <div
                    key={b}
                    className={`w-4 h-4 rounded-full transition-all duration-75 ${
                      isMetronomeActive && beatCount === b
                        ? b === 1
                          ? 'bg-amber-400 scale-125 shadow-md shadow-amber-400/50'
                          : 'bg-slate-200 scale-110'
                        : 'bg-[#2A303A]'
                    }`}
                  />
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Right Col: Interactive Reference Chord */}
        <div className="space-y-4">
          <Card className="p-6 border-[#2A303A] text-center space-y-4">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Focus Chord Reference
            </div>

            <ChordDiagram
              name="C Major"
              data={{
                strings: ['X', 3, 2, 0, 1, 0],
                fingers: [0, 3, 2, 0, 1, 0],
                baseFret: 1,
              }}
              notes={['C', 'E', 'G']}
              size="md"
            />

            <div className="text-xs text-slate-400 pt-2 border-t border-[#2A303A]">
              Strive for round, curved fingertips so every open string rings freely.
            </div>
          </Card>
        </div>
      </div>

      {/* Completion / Rating Modal */}
      {showCompletionModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6 sm:p-8 border-[#2A303A] space-y-6 text-center animate-in fade-in zoom-in-95">
            {!completionResult ? (
              <>
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-2xl flex items-center justify-center mx-auto">
                  ⏱️
                </div>
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-slate-100">Practice Session Finished</h2>
                  <p className="text-sm text-slate-400">
                    Duration: <span className="text-amber-400 font-bold">{formatTime(secondsElapsed)}</span>
                  </p>
                </div>

                <div className="space-y-2 text-left">
                  <label className="text-xs font-semibold text-slate-300">How did that session feel?</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['EASY', 'OKAY', 'DIFFICULT'] as const).map((diff) => (
                      <button
                        key={diff}
                        type="button"
                        onClick={() => setSelectedDifficulty(diff)}
                        className={`p-3 rounded-xl border text-xs font-semibold transition-all ${
                          selectedDifficulty === diff
                            ? 'bg-amber-500 border-amber-500 text-slate-950 font-bold'
                            : 'bg-[#121418] border-[#2A303A] text-slate-300 hover:border-slate-500'
                        }`}
                      >
                        {diff}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="secondary"
                    className="w-1/2"
                    onClick={() => setShowCompletionModal(false)}
                  >
                    Resume
                  </Button>
                  <Button
                    className="w-1/2 font-bold"
                    onClick={submitSession}
                    isLoading={isSubmitting}
                  >
                    Save & Finish
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-3xl flex items-center justify-center mx-auto">
                  {completionResult.isValid ? '🎉' : '⚠️'}
                </div>
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-slate-100">
                    {completionResult.isValid ? 'Practice Saved!' : 'Session Under Minimum'}
                  </h2>
                  <p className="text-sm text-slate-300">{completionResult.message}</p>
                </div>

                {completionResult.isValid && (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center gap-2 text-amber-400 font-bold text-sm">
                    <Sparkles className="w-4 h-4" /> +{completionResult.xpAwarded} XP Earned!
                  </div>
                )}

                <Button
                  onClick={() => {
                    setShowCompletionModal(false);
                    setCompletionResult(null);
                    setSecondsElapsed(0);
                    router.push('/dashboard');
                  }}
                  className="w-full font-bold"
                >
                  Go to Dashboard <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

export default function PracticePage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto p-8 text-center text-slate-400">
          Loading Practice Room...
        </div>
      }
    >
      <PracticeContent />
    </Suspense>
  );
}
