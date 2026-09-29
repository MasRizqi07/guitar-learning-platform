'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
  ShieldCheck,
  Zap,
} from 'lucide-react';


const PRACTICE_TYPES = [
  { id: 'DAILY', label: 'Daily Practice', minSec: 300, desc: '300s min • General practice routine' },
  { id: 'CHORD', label: 'Chord Finger Memory', minSec: 120, desc: '120s min • Holding clean chords' },
  { id: 'CHORD_TRANSITION', label: 'Chord Transitions', minSec: 120, desc: '120s min • Switching cadences' },
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
  const progressPercent = Math.min(100, Math.round((secondsElapsed / currentTypeConfig.minSec) * 100));

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
    <div className="max-w-4xl mx-auto space-y-8 font-sans pb-16">
      {/* 1. Header & Practice Type Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-amber-400 mb-1">
            <Zap className="w-3.5 h-3.5" />
            <span>Anti-Cheat Verified Practice Deck</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F8FAFC] tracking-tight">
            Focus Practice Room
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Lock in muscle memory, fluid chord changes, and steady rhythmic cadence.
          </p>
        </div>

        {/* Practice Type Selector Pills */}
        <div className="flex gap-1.5 flex-wrap">
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
                  ? 'bg-amber-500 border-amber-500 text-[#0E1014] shadow-md shadow-amber-500/20'
                  : 'bg-[#171A20] border-[#2A303A] text-slate-400 hover:text-slate-200'
              } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Top Row: Big Stopwatch Console (7 cols) & XP Attestation Guard (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Distraction-Free Stopwatch (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl bg-[#171A20] border border-[#2A303A] p-6 sm:p-8 flex flex-col justify-between shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* Top Bar */}
          <div className="flex items-center justify-between pb-3 text-xs font-mono">
            <span className="text-amber-400 uppercase font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>{currentTypeConfig.label}</span>
            </span>
            <span className="text-slate-400">{currentTypeConfig.desc}</span>
          </div>

          {/* Big Time Display */}
          <div className="py-6 text-center space-y-2">
            <div className="font-mono text-6xl sm:text-7xl font-black text-[#F8FAFC] tracking-tight drop-shadow-md">
              {formatTime(secondsElapsed)}
            </div>
            <div className="flex items-center justify-center gap-2 text-xs font-mono">
              {meetsThreshold ? (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Minimum Threshold Met (+15 XP Available)
                </span>
              ) : (
                <span className="text-amber-400 flex items-center gap-1">
                  <Clock className="w-4 h-4" /> Need {Math.max(0, currentTypeConfig.minSec - secondsElapsed)}s more to unlock XP
                </span>
              )}
            </div>
          </div>

          {/* Progress Bar towards minimum threshold */}
          <div className="space-y-1.5 pb-4">
            <div className="flex justify-between text-[11px] font-mono text-slate-400">
              <span>Anti-Cheat Verification</span>
              <span className={meetsThreshold ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                {progressPercent}%
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#0E1014] overflow-hidden border border-white/5">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  meetsThreshold ? 'bg-emerald-400 shadow-[0_0_8px_#22C55E]' : 'bg-amber-500'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3 pt-4 border-t border-[#2A303A]/70">
            <button
              onClick={() => setIsRunning(!isRunning)}
              className={`px-8 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-md ${
                isRunning
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-amber-500 hover:bg-amber-400 text-[#0E1014] shadow-amber-500/20'
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  <span>Pause Timer</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start Practice</span>
                </>
              )}
            </button>

            <button
              onClick={handleStop}
              disabled={secondsElapsed === 0}
              className={`px-5 py-3 rounded-xl font-bold text-xs border transition-all ${
                secondsElapsed > 0
                  ? 'bg-[#20242C] hover:bg-slate-700/60 text-[#F8FAFC] border-[#2A303A]'
                  : 'bg-[#171A20] text-slate-600 border-[#2A303A] cursor-not-allowed'
              }`}
            >
              End & Record
            </button>

            <button
              onClick={handleReset}
              disabled={secondsElapsed === 0 && !isRunning}
              title="Reset timer"
              className="p-3 rounded-xl bg-[#20242C] hover:bg-slate-700/60 text-slate-400 hover:text-white border border-[#2A303A] transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* XP Attestation Guard & Metronome Panel (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl bg-[#171A20] border border-[#2A303A] p-6 flex flex-col justify-between shadow-xl space-y-6">
          {/* Attestation details */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400 uppercase">XP Attestation Guard</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                meetsThreshold ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-[#20242C] text-slate-400'
              }`}>
                {meetsThreshold ? 'READY TO CLAIM' : 'ACCUMULATING'}
              </span>
            </div>
            <h2 className="text-base font-bold text-[#F8FAFC]">
              Server Authoritative Session Tracker
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Sessions under the anti-cheat threshold do not write XP or streak increments to prevent vanity padding.
            </p>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div className="p-3 rounded-xl bg-[#20242C]/70 border border-[#2A303A]">
                <span className="text-[10px] font-mono text-slate-400 uppercase block">XP Target</span>
                <span className="text-lg font-mono font-bold text-amber-400">+15 XP</span>
              </div>
              <div className="p-3 rounded-xl bg-[#20242C]/70 border border-[#2A303A]">
                <span className="text-[10px] font-mono text-slate-400 uppercase block">Min Duration</span>
                <span className="text-lg font-mono font-bold text-emerald-400">{currentTypeConfig.minSec}s</span>
              </div>
            </div>
          </div>

          {/* Integrated Acoustic Metronome */}
          <div className="p-4 rounded-xl bg-[#20242C]/80 border border-[#2A303A] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-[#F8FAFC]">Acoustic Metronome</span>
              </div>
              <button
                type="button"
                onClick={() => setIsMetronomeActive(!isMetronomeActive)}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                  isMetronomeActive
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_8px_rgba(34,197,94,0.3)]'
                    : 'bg-[#171A20] text-slate-400 border border-[#2A303A] hover:border-slate-500'
                }`}
              >
                {isMetronomeActive ? 'Ticking ON' : 'Turn ON'}
              </button>
            </div>

            {/* Tempo Slider & BPM Readout */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-400">Tempo</span>
                <span className="font-bold text-amber-400">{bpm} BPM</span>
              </div>
              <input
                type="range"
                min="40"
                max="208"
                value={bpm}
                onChange={(e) => setBpm(parseInt(e.target.value, 10))}
                className="w-full accent-amber-500 bg-[#2A303A] rounded-lg h-2 cursor-pointer"
              />
            </div>

            {/* 4 Beat Visualizer Dots */}
            <div className="flex justify-center gap-3 pt-1">
              {[1, 2, 3, 4].map((b) => (
                <div
                  key={b}
                  className={`w-3.5 h-3.5 rounded-full transition-all duration-75 ${
                    isMetronomeActive && beatCount === b
                      ? b === 1
                        ? 'bg-amber-400 scale-125 shadow-md shadow-amber-400/50'
                        : 'bg-emerald-400 scale-110 shadow-md shadow-emerald-400/50'
                      : 'bg-[#171A20] border border-[#2A303A]'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Chord Transition Flow Deck with dual SVG chord diagrams */}
      <div className="rounded-2xl bg-[#171A20] border border-[#2A303A] p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#2A303A] pb-3">
          <div>
            <div className="text-[10px] font-mono uppercase text-amber-400 tracking-wider font-semibold">
              Cadence Exercise
            </div>
            <h2 className="text-lg font-bold text-[#F8FAFC]">
              Dynamic Chord Transition Flow Deck
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-[#20242C] rounded-lg text-xs font-mono text-slate-300 border border-[#2A303A]">
              Anchor Pivot Finger
            </span>
            <span className="px-2.5 py-1 bg-[#20242C] rounded-lg text-xs font-mono text-amber-400 border border-amber-500/30">
              Progression I ⇄ V
            </span>
          </div>
        </div>

        {/* Dual Chord Diagrams */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          {/* Chord 1: C Major */}
          <div className="p-5 rounded-xl bg-[#20242C]/70 border border-[#2A303A] flex flex-col items-center justify-center space-y-3">
            <div className="flex items-center justify-between w-full px-2 text-xs font-mono">
              <span className="text-amber-400 font-bold">1. Chord A (Source)</span>
              <span className="text-slate-400">Open Position</span>
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
            <p className="text-[11px] font-mono text-slate-400 text-center">
              Finger 3 on A string (Fret 3) • Finger 2 on D string (Fret 2)
            </p>
          </div>

          {/* Chord 2: G Major */}
          <div className="p-5 rounded-xl bg-[#20242C]/70 border border-[#2A303A] flex flex-col items-center justify-center space-y-3">
            <div className="flex items-center justify-between w-full px-2 text-xs font-mono">
              <span className="text-emerald-400 font-bold">2. Chord B (Target)</span>
              <span className="text-slate-400">6-String Strum</span>
            </div>
            <ChordDiagram
              name="G Major"
              data={{
                strings: [3, 2, 0, 0, 0, 3],
                fingers: [2, 1, 0, 0, 0, 3],
                baseFret: 1,
              }}
              notes={['G', 'B', 'D']}
              size="md"
            />
            <p className="text-[11px] font-mono text-slate-400 text-center">
              Finger 2 on Low E (Fret 3) • Finger 3 on High E (Fret 3)
            </p>
          </div>
        </div>
      </div>

      {/* 4. Completion / Rating Modal */}
      {showCompletionModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full p-6 sm:p-8 rounded-2xl bg-[#171A20] border border-[#2A303A] space-y-6 text-center shadow-2xl">
            {!completionResult ? (
              <>
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-2xl flex items-center justify-center mx-auto text-amber-400">
                  ⏱️
                </div>
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-[#F8FAFC]">Practice Session Finished</h2>
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
                            ? 'bg-amber-500 border-amber-500 text-[#0E1014] font-bold'
                            : 'bg-[#121418] border-[#2A303A] text-slate-300 hover:border-slate-500'
                        }`}
                      >
                        {diff}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    className="w-1/2 py-2.5 rounded-xl bg-[#20242C] text-slate-300 border border-[#2A303A] hover:bg-slate-700/60 font-semibold text-xs"
                    onClick={() => setShowCompletionModal(false)}
                  >
                    Resume
                  </button>
                  <button
                    type="button"
                    className="w-1/2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#0E1014] font-bold text-xs disabled:opacity-50"
                    onClick={submitSession}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Recording...' : 'Save & Record'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-3xl flex items-center justify-center mx-auto text-emerald-400">
                  {completionResult.isValid ? '🎉' : '⚠️'}
                </div>
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-[#F8FAFC]">
                    {completionResult.isValid ? 'Practice Saved!' : 'Session Under Minimum'}
                  </h2>
                  <p className="text-sm text-slate-300">{completionResult.message}</p>
                </div>

                {completionResult.isValid && (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center gap-2 text-amber-400 font-bold text-sm">
                    <Sparkles className="w-4 h-4" /> +{completionResult.xpAwarded} XP Earned!
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowCompletionModal(false);
                    setCompletionResult(null);
                    setSecondsElapsed(0);
                    router.push('/dashboard');
                  }}
                  className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#0E1014] font-bold text-sm flex items-center justify-center gap-2"
                >
                  <span>Go to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
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
