'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Music,
  Sprout,
  Repeat,
  Radio,
  Clock,
  Sparkles,
  ShieldCheck,
  Award,
  ArrowRight,
} from 'lucide-react';

import { Logo } from '@/components/ui/Logo';

const GOAL_OPTIONS = [
  {
    code: 'PLAY_FAVORITE_SONGS',
    title: 'Play Favorite Songs',
    desc: 'Jump straight into real tunes using 4 essential open chords (G, C, Em, D) and standard strumming cadences.',
    isPopular: true,
    icon: Music,
  },
  {
    code: 'LEARN_FROM_ZERO',
    title: 'Learn from Complete Scratch',
    desc: 'Zero experience assumed. Fretboard anatomy, finger posture, pain-free ergonomics, and clean single-string plucking.',
    icon: Sprout,
  },
  {
    code: 'IMPROVE_CHORDS',
    title: 'Master Chord Transitions',
    desc: 'Eliminate hesitation and fret buzz between C, G, and D with guided metronome cadences and anchor-finger technique.',
    icon: Repeat,
  },
  {
    code: 'UNDERSTAND_THEORY',
    title: 'Understand Rhythm & Theory',
    desc: 'Internalize 4/4 meter, steady down/up strokes, note roots, and why chords fit together logically on the fretboard.',
    icon: Radio,
  },
];

const EXPERIENCE_OPTIONS = [
  {
    value: 'ABSOLUTE_BEGINNER',
    title: 'Absolute Beginner',
    desc: 'I have never held or played a guitar before.',
    badge: 'Stage 0',
  },
  {
    value: 'BEGINNER',
    title: 'Early Beginner',
    desc: 'I know 1 or 2 chords, but cannot switch between them smoothly.',
    badge: 'Stage 1',
  },
  {
    value: 'BASIC_PLAYER',
    title: 'Basic Player',
    desc: 'I can play basic open chords and simple strum patterns.',
    badge: 'Stage 2',
  },
  {
    value: 'INTERMEDIATE',
    title: 'Experienced Player',
    desc: 'I want a systematic refresher to fill gaps in timing and fretboard navigation.',
    badge: 'Stage 3',
  },
];

const GUITAR_TYPES = [
  { value: 'ACOUSTIC', title: 'Acoustic Guitar', desc: 'Steel-string acoustic guitar (standard dreadnought or folk).' },
  { value: 'ELECTRIC', title: 'Electric Guitar', desc: 'Solid or semi-hollow body electric guitar.' },
  { value: 'CLASSICAL', title: 'Classical Guitar', desc: 'Nylon-string classical or Spanish guitar.' },
  { value: 'NO_GUITAR', title: 'No Guitar Yet', desc: 'Acquiring an instrument soon; learning fundamentals first.' },
];

const DAILY_GOALS = [
  { minutes: 10, label: 'Quick Start' },
  { minutes: 15, label: 'Recommended', isRecommended: true },
  { minutes: 30, label: 'Focused Pace' },
  { minutes: 45, label: 'Deep Dive' },
  { minutes: 60, label: 'Mastery Track' },
];

const ASSESSMENT_QUESTIONS = [
  {
    prompt: 'Can you cleanly switch between C Major and G Major in rhythm?',
    options: [
      { text: 'No, I struggle to change or don’t know them', score: 0 },
      { text: 'Yes, but with a slight pause', score: 25 },
      { text: 'Yes, smoothly without stopping', score: 50 },
    ],
  },
  {
    prompt: 'Do you know standard tuning notes for the 6 strings (6th to 1st)?',
    options: [
      { text: 'No, not yet', score: 0 },
      { text: 'I know some of them', score: 25 },
      { text: 'Yes: E - A - D - G - B - E', score: 50 },
    ],
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const totalSteps = 7;

  // Form State
  const [selectedGoals, setSelectedGoals] = useState<string[]>(['LEARN_FROM_ZERO']);
  const [experience, setExperience] = useState<string>('ABSOLUTE_BEGINNER');
  const [guitarType, setGuitarType] = useState<string>('ACOUSTIC');
  const [dailyGoal, setDailyGoal] = useState<number>(15);
  const [assessmentAnswers, setAssessmentAnswers] = useState<number[]>([0, 0]);
  const [placementResult, setPlacementResult] = useState<{
    recommendedLevel: string;
    startingLessonOrder: number;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleGoal = (code: string) => {
    setSelectedGoals((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleNext = () => {
    setError(null);
    if (step === 2 && selectedGoals.length === 0) {
      setError('Please select at least one learning goal');
      return;
    }

    // If step 3 is ABSOLUTE_BEGINNER, skip assessment (step 6)
    if (step === 5 && experience === 'ABSOLUTE_BEGINNER') {
      submitOnboarding(0);
      return;
    }

    if (step === 6) {
      const totalScore = assessmentAnswers.reduce((a, b) => a + b, 0);
      submitOnboarding(totalScore);
      return;
    }

    setStep((prev) => prev + 1);
  };

  const submitOnboarding = async (score: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const payload = {
        experienceLevel: experience,
        guitarType,
        dailyGoalMinutes: dailyGoal,
        learningGoalCodes: selectedGoals,
        assessmentScore: score,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta',
      };

      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to complete onboarding');
      }

      setPlacementResult({
        recommendedLevel: data.data.recommendedLevel,
        startingLessonOrder: data.data.startingLessonOrder,
      });
      setStep(7); // Placement Screen
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0E1014] text-[#F8FAFC] flex flex-col justify-between items-center p-4 sm:p-6 fret-grid-bg relative overflow-x-hidden selection:bg-amber-500 selection:text-slate-950 font-sans">
      {/* Ambient Top Glow Light Beam */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[340px] pointer-events-none bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-transparent blur-3xl -z-10" />

      {/* Micro Top Brand Bar */}
      <header className="w-full max-w-xl flex items-center justify-between pt-2 pb-4">
        <div className="flex items-center gap-2">
          <Logo size="sm" showText={true} href="/" />
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 px-1.5 py-0.5 rounded bg-white/5 border border-white/10 hidden sm:inline">
            Placement Engine
          </span>
        </div>

        <Link
          href="/login"
          className="text-xs font-medium text-slate-400 hover:text-white transition-colors flex items-center gap-1 py-1 px-2.5 rounded-md hover:bg-white/5"
        >
          <span>Already have an account?</span>
          <span className="text-amber-400 font-semibold hover:underline">Log in</span>
        </Link>
      </header>

      {/* Central Card Shell */}
      <main className="w-full max-w-xl bg-[#171A20]/90 backdrop-blur-xl border border-[#2A303A] rounded-2xl p-6 sm:p-8 shadow-2xl relative my-auto">
        {/* Top Stepper Header */}
        <div className="flex items-center justify-between mb-4">
          {step > 1 && step < 7 ? (
            <button
              type="button"
              onClick={() => setStep((prev) => prev - 1)}
              className="group flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors py-1.5 px-2.5 -ml-2 rounded-lg hover:bg-white/5"
            >
              <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-amber-400 transition-colors" />
              <span>Back</span>
            </button>
          ) : (
            <div className="w-16" />
          )}

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono tracking-widest text-amber-400 uppercase font-semibold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
              Step {step} of {totalSteps}
            </span>
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">
              {step === 7 ? 'Placement Ready' : 'Personalization'}
            </span>
          </div>
        </div>

        {/* Animated Smooth Progress Bar */}
        <div className="w-full bg-[#0E1014] h-2 rounded-full overflow-hidden mb-7 p-0.5 border border-white/5">
          <div
            className="bg-gradient-to-r from-amber-600 to-amber-400 h-full rounded-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(245,158,11,0.5)]"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Welcome & Overview */}
        {step === 1 && (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10">
              <Sparkles className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#F8FAFC]">
                Let&apos;s Personalize Your Learning Journey
              </h1>
              <p className="text-sm sm:text-base text-slate-400 max-w-md mx-auto leading-relaxed">
                In less than 2 minutes, we will tailor your beginner guitar roadmap to match your schedule, preferred instrument, and starting skill level.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2.5 text-left pt-2">
              <div className="p-3 rounded-xl bg-[#20242C]/70 border border-[#2A303A]">
                <ShieldCheck className="w-4 h-4 text-emerald-400 mb-1" />
                <div className="text-xs font-bold text-[#F8FAFC]">Deterministic</div>
                <div className="text-[10px] text-slate-400">Zero guessing</div>
              </div>
              <div className="p-3 rounded-xl bg-[#20242C]/70 border border-[#2A303A]">
                <Clock className="w-4 h-4 text-amber-400 mb-1" />
                <div className="text-xs font-bold text-[#F8FAFC]">10-15 Min</div>
                <div className="text-[10px] text-slate-400">Daily habit loop</div>
              </div>
              <div className="p-3 rounded-xl bg-[#20242C]/70 border border-[#2A303A]">
                <Award className="w-4 h-4 text-emerald-400 mb-1" />
                <div className="text-xs font-bold text-[#F8FAFC]">Server XP</div>
                <div className="text-[10px] text-slate-400">Real progress</div>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="button"
                onClick={handleNext}
                className="w-full h-12 bg-amber-500 hover:bg-amber-400 active:scale-[0.99] text-[#0E1014] font-extrabold text-sm rounded-xl shadow-[0_4px_20px_rgba(245,158,11,0.3)] transition-all flex items-center justify-center gap-2"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Learning Goals */}
        {step === 2 && (
          <div>
            <div className="mb-6">
              <h1 className="text-2xl sm:text-[26px] font-extrabold tracking-tight text-[#F8FAFC] leading-tight mb-1.5">
                What is your main guitar goal?
              </h1>
              <p className="text-sm text-slate-400 leading-relaxed">
                Choose the target that fits your vibe. We will tailor your starting drills and song repertoire.
              </p>
            </div>

            <div className="space-y-3 mb-6">
              {GOAL_OPTIONS.map((g) => {
                const selected = selectedGoals.includes(g.code);
                const IconComponent = g.icon;
                return (
                  <button
                    key={g.code}
                    type="button"
                    onClick={() => toggleGoal(g.code)}
                    className={`w-full p-4 rounded-xl border text-left transition-all relative flex items-start gap-4 ${
                      selected
                        ? 'border-amber-500 bg-[#1C2028] shadow-[0_0_0_1px_#F59E0B,0_10px_25px_-5px_rgba(245,158,11,0.15)]'
                        : 'border-[#2A303A] bg-[#171A20] hover:border-slate-600 hover:bg-[#20242C]'
                    }`}
                  >
                    <div
                      className={`w-11 h-11 rounded-lg border flex-shrink-0 flex items-center justify-center transition-colors ${
                        selected
                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                          : 'bg-[#20242C] border-[#2A303A] text-slate-400'
                      }`}
                    >
                      <IconComponent className="w-5 h-5" />
                    </div>

                    <div className="flex-1 pr-6">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#F8FAFC]">{g.title}</span>
                        {g.isPopular && (
                          <span className="text-[10px] font-mono uppercase bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded font-bold border border-amber-500/30">
                            Popular
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1 leading-normal">{g.desc}</p>
                    </div>

                    {selected && (
                      <div className="absolute top-3.5 right-3.5 w-5 h-5 rounded-full bg-amber-500 text-[#0E1014] flex items-center justify-center shadow-md">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleNext}
              className="w-full h-12 bg-amber-500 hover:bg-amber-400 text-[#0E1014] font-extrabold text-sm rounded-xl shadow-[0_4px_20px_rgba(245,158,11,0.3)] transition-all flex items-center justify-center gap-2"
            >
              <span>Continue</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 3: Experience Level */}
        {step === 3 && (
          <div>
            <div className="mb-6">
              <h1 className="text-2xl sm:text-[26px] font-extrabold tracking-tight text-[#F8FAFC] leading-tight mb-1.5">
                What is your guitar experience?
              </h1>
              <p className="text-sm text-slate-400 leading-relaxed">
                We calibrate your lesson sequencing so you never feel overwhelmed or bored.
              </p>
            </div>

            <div className="space-y-3 mb-6">
              {EXPERIENCE_OPTIONS.map((opt) => {
                const selected = experience === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setExperience(opt.value)}
                    className={`w-full p-4 rounded-xl border text-left flex items-start justify-between gap-4 transition-all ${
                      selected
                        ? 'border-amber-500 bg-[#1C2028] shadow-[0_0_0_1px_#F59E0B]'
                        : 'border-[#2A303A] bg-[#171A20] hover:border-slate-600 hover:bg-[#20242C]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#F8FAFC]">{opt.title}</span>
                        <span className="text-[10px] font-mono text-slate-400 bg-white/5 px-1.5 py-0.5 rounded">
                          {opt.badge}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 leading-normal">{opt.desc}</p>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center mt-0.5 border ${
                        selected
                          ? 'bg-amber-500 border-amber-500 text-[#0E1014]'
                          : 'border-slate-600 bg-transparent'
                      }`}
                    >
                      {selected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleNext}
              className="w-full h-12 bg-amber-500 hover:bg-amber-400 text-[#0E1014] font-extrabold text-sm rounded-xl shadow-[0_4px_20px_rgba(245,158,11,0.3)] transition-all flex items-center justify-center gap-2"
            >
              <span>Continue</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 4: Guitar Type */}
        {step === 4 && (
          <div>
            <div className="mb-6">
              <h1 className="text-2xl sm:text-[26px] font-extrabold tracking-tight text-[#F8FAFC] leading-tight mb-1.5">
                What type of guitar do you have?
              </h1>
              <p className="text-sm text-slate-400 leading-relaxed">
                Tension tips and chord grip recommendations adapt to your instrument setup.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {GUITAR_TYPES.map((g) => {
                const selected = guitarType === g.value;
                return (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setGuitarType(g.value)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      selected
                        ? 'border-amber-500 bg-[#1C2028] shadow-[0_0_0_1px_#F59E0B]'
                        : 'border-[#2A303A] bg-[#171A20] hover:border-slate-600 hover:bg-[#20242C]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-[#F8FAFC]">{g.title}</span>
                      {selected && <Check className="w-4 h-4 text-amber-400" />}
                    </div>
                    <p className="text-xs text-slate-400 mt-1.5 leading-normal">{g.desc}</p>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleNext}
              className="w-full h-12 bg-amber-500 hover:bg-amber-400 text-[#0E1014] font-extrabold text-sm rounded-xl shadow-[0_4px_20px_rgba(245,158,11,0.3)] transition-all flex items-center justify-center gap-2"
            >
              <span>Continue</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 5: Daily Goal */}
        {step === 5 && (
          <div>
            <div className="mb-6">
              <h1 className="text-2xl sm:text-[26px] font-extrabold tracking-tight text-[#F8FAFC] leading-tight mb-1.5">
                Daily Practice Target
              </h1>
              <p className="text-sm text-slate-400 leading-relaxed">
                How many minutes can you dedicate each day? Even 15 minutes creates rapid muscle memory.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-6">
              {DAILY_GOALS.map((g) => {
                const selected = dailyGoal === g.minutes;
                return (
                  <button
                    key={g.minutes}
                    type="button"
                    onClick={() => setDailyGoal(g.minutes)}
                    className={`p-3.5 rounded-xl border text-center transition-all ${
                      selected
                        ? 'border-amber-500 bg-amber-500 text-[#0E1014] font-bold shadow-[0_0_16px_rgba(245,158,11,0.35)]'
                        : 'border-[#2A303A] bg-[#171A20] text-slate-400 hover:text-white hover:border-slate-600'
                    }`}
                  >
                    <div className="text-base font-extrabold font-mono">{g.minutes} Min</div>
                    <div className="text-[10px] uppercase tracking-wider opacity-85 mt-0.5">
                      {g.label}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 mb-6 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>
                <strong>Tip:</strong> Daily 15-minute practice builds finger calluses 3x faster than 2-hour weekend binges.
              </span>
            </div>

            <button
              type="button"
              onClick={handleNext}
              disabled={isLoading}
              className="w-full h-12 bg-amber-500 hover:bg-amber-400 text-[#0E1014] font-extrabold text-sm rounded-xl shadow-[0_4px_20px_rgba(245,158,11,0.3)] transition-all flex items-center justify-center gap-2"
            >
              <span>{isLoading ? 'Calibrating...' : experience === 'ABSOLUTE_BEGINNER' ? 'Complete Calibration' : 'Next: Skill Assessment'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 6: Skill Assessment (For non-absolute beginners) */}
        {step === 6 && (
          <div>
            <div className="mb-6">
              <h1 className="text-2xl sm:text-[26px] font-extrabold tracking-tight text-[#F8FAFC] leading-tight mb-1.5">
                Quick Placement Check
              </h1>
              <p className="text-sm text-slate-400 leading-relaxed">
                Answer these 2 questions so we place you at the exact right starting module.
              </p>
            </div>

            <div className="space-y-5 mb-6">
              {ASSESSMENT_QUESTIONS.map((q, qIndex) => (
                <div key={qIndex} className="space-y-2.5">
                  <p className="text-sm font-semibold text-[#F8FAFC]">
                    {qIndex + 1}. {q.prompt}
                  </p>
                  <div className="space-y-2">
                    {q.options.map((opt, optIndex) => {
                      const selected = assessmentAnswers[qIndex] === opt.score;
                      return (
                        <button
                          key={optIndex}
                          type="button"
                          onClick={() => {
                            const next = [...assessmentAnswers];
                            next[qIndex] = opt.score;
                            setAssessmentAnswers(next);
                          }}
                          className={`w-full p-3.5 rounded-xl border text-left text-xs sm:text-sm transition-all ${
                            selected
                              ? 'border-amber-500 bg-amber-500/10 text-[#F8FAFC] font-medium shadow-[0_0_0_1px_#F59E0B]'
                              : 'border-[#2A303A] bg-[#171A20] text-slate-300 hover:border-slate-600'
                          }`}
                        >
                          {opt.text}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleNext}
              disabled={isLoading}
              className="w-full h-12 bg-amber-500 hover:bg-amber-400 text-[#0E1014] font-extrabold text-sm rounded-xl shadow-[0_4px_20px_rgba(245,158,11,0.3)] transition-all flex items-center justify-center gap-2"
            >
              <span>{isLoading ? 'Calculating Placement...' : 'Calculate Placement'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 7: Placement Result */}
        {step === 7 && placementResult && (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
              <Award className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-semibold">
                ✓ Placement Calibrated
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F8FAFC]">
                Your Learning Path is Ready!
              </h1>
              <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                Based on your profile, we have calibrated your curriculum to begin at{' '}
                <span className="text-amber-400 font-semibold">Lesson {placementResult.startingLessonOrder}</span>.
              </p>
            </div>

            {/* Placement Summary Card */}
            <div className="p-4 rounded-xl bg-[#20242C]/70 border border-[#2A303A] text-left space-y-2.5 text-xs sm:text-sm">
              <div className="flex justify-between py-1 border-b border-[#2A303A]">
                <span className="text-slate-400">Curriculum Track</span>
                <span className="font-semibold text-[#F8FAFC]">
                  {placementResult.recommendedLevel.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#2A303A]">
                <span className="text-slate-400">Daily Goal</span>
                <span className="font-semibold text-emerald-400">{dailyGoal} Minutes / Day</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Starting Lesson</span>
                <span className="font-semibold text-amber-400">Lesson #{placementResult.startingLessonOrder}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                router.push('/dashboard');
                router.refresh();
              }}
              className="w-full h-12 bg-amber-500 hover:bg-amber-400 text-[#0E1014] font-extrabold text-sm rounded-xl shadow-[0_4px_20px_rgba(245,158,11,0.3)] transition-all flex items-center justify-center gap-2"
            >
              <span>Enter Dashboard & Start Learning</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Trust & Anti-Tutorial-Hell Microcopy */}
        <div className="flex items-center justify-center gap-3 mt-5 pt-3 border-t border-[#2A303A]/60 text-[11px] font-mono text-slate-500">
          <span className="flex items-center gap-1">
            <Check className="w-3 h-3 text-emerald-400" />
            No Credit Card Required
          </span>
          <span className="text-slate-700">•</span>
          <span>Placement Takes &lt; 2 Minutes</span>
        </div>
      </main>

      {/* Clean Bottom Safety / Progress Footer */}
      <footer className="w-full max-w-xl text-center py-3 text-xs text-slate-500 flex items-center justify-between">
        <span className="font-mono text-[11px]">FretFlow OS v2.4</span>
        <span className="hover:text-slate-400 transition-colors">Deterministic Curriculum Engine</span>
        <span className="text-emerald-400 flex items-center gap-1 font-mono text-[11px]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Ready to calibrate
        </span>
      </footer>
    </div>
  );
}
