'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';

const GOAL_OPTIONS = [
  { code: 'PLAY_FAVORITE_SONGS', title: 'Play Favorite Songs', desc: 'Learn chords and strumming to play acoustic hits.' },
  { code: 'LEARN_FROM_ZERO', title: 'Learn from Zero', desc: 'Never played before; want proper technique from day one.' },
  { code: 'IMPROVE_CHORDS', title: 'Improve Chords', desc: 'Master clean chord transitions without buzz or delay.' },
  { code: 'IMPROVE_RHYTHM', title: 'Improve Rhythm', desc: 'Develop internal clock, timing, and confident strumming.' },
  { code: 'UNDERSTAND_THEORY', title: 'Understand Theory', desc: 'Understand notes, keys, and how music works.' },
  { code: 'BUILD_CONFIDENCE', title: 'Build Confidence', desc: 'Feel relaxed and fluent picking up the guitar.' },
];

const EXPERIENCE_OPTIONS = [
  { value: 'ABSOLUTE_BEGINNER', title: 'Absolute Beginner', desc: 'I have never held or played a guitar before.', icon: '🌱' },
  { value: 'BEGINNER', title: 'Early Beginner', desc: 'I know 1 or 2 chords, but cannot switch between them smoothly.', icon: '🎸' },
  { value: 'BASIC_PLAYER', title: 'Basic Player', desc: 'I can play basic open chords and simple strum patterns.', icon: '🎶' },
  { value: 'INTERMEDIATE', title: 'Experienced', desc: 'I want a systematic refresher to fill gaps in my playing.', icon: '⭐' },
];

const GUITAR_TYPES = [
  { value: 'ACOUSTIC', title: 'Acoustic Guitar', desc: 'Steel-string acoustic guitar', icon: '🪕' },
  { value: 'ELECTRIC', title: 'Electric Guitar', desc: 'Solid or semi-hollow body electric', icon: '⚡' },
  { value: 'CLASSICAL', title: 'Classical Guitar', desc: 'Nylon-string acoustic guitar', icon: '🎻' },
  { value: 'NO_GUITAR', title: 'No Guitar Yet', desc: 'Planning to acquire one soon', icon: '📦' },
];

const DAILY_GOALS = [10, 15, 30, 45, 60];

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
      setError('Please select at least one goal');
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
    <div className="min-h-screen bg-[#0E1014] flex flex-col justify-between p-4 sm:p-6 md:p-8">
      {/* Header with progress */}
      <div className="max-w-2xl w-full mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎸</span>
            <span className="font-bold text-slate-200 text-sm">Guitar Learning Platform</span>
          </div>
          <Badge variant="primary" size="sm">
            Step {step} of {totalSteps}
          </Badge>
        </div>
        <ProgressBar value={(step / totalSteps) * 100} size="sm" />
      </div>

      {/* Main Content Area */}
      <div className="max-w-2xl w-full mx-auto my-8">
        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Welcome */}
        {step === 1 && (
          <Card className="p-6 sm:p-10 border-[#2A303A] text-center space-y-6">
            <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-4xl flex items-center justify-center mx-auto">
              🎯
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-100">
                Let&apos;s Personalize Your Learning Journey
              </h1>
              <p className="text-sm sm:text-base text-slate-400 max-w-lg mx-auto">
                In less than 2 minutes, we will tailor your beginner guitar roadmap to match your goals, schedule, and current experience.
              </p>
            </div>
            <div className="pt-4">
              <Button onClick={handleNext} size="lg" className="w-full sm:w-auto px-10">
                Get Started →
              </Button>
            </div>
          </Card>
        )}

        {/* STEP 2: Learning Goals */}
        {step === 2 && (
          <Card className="p-6 sm:p-8 border-[#2A303A] space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-100">What are your guitar goals?</h2>
              <p className="text-sm text-slate-400 mt-1">Select all that apply to you.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {GOAL_OPTIONS.map((g) => {
                const selected = selectedGoals.includes(g.code);
                return (
                  <button
                    key={g.code}
                    type="button"
                    onClick={() => toggleGoal(g.code)}
                    className={`p-4 rounded-xl border text-left transition-all duration-150 ${
                      selected
                        ? 'bg-amber-500/10 border-amber-500 text-slate-100'
                        : 'bg-[#121418] border-[#2A303A] text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <div className="font-semibold text-sm flex items-center justify-between">
                      <span>{g.title}</span>
                      {selected && <span className="text-amber-400">✓</span>}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">{g.desc}</div>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="secondary" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={handleNext}>Continue →</Button>
            </div>
          </Card>
        )}

        {/* STEP 3: Experience Level */}
        {step === 3 && (
          <Card className="p-6 sm:p-8 border-[#2A303A] space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-100">What is your current experience?</h2>
              <p className="text-sm text-slate-400 mt-1">We will adjust your starting position accordingly.</p>
            </div>

            <div className="space-y-3">
              {EXPERIENCE_OPTIONS.map((opt) => {
                const selected = experience === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setExperience(opt.value)}
                    className={`w-full p-4 rounded-xl border text-left flex items-start gap-4 transition-all ${
                      selected
                        ? 'bg-amber-500/10 border-amber-500 text-slate-100'
                        : 'bg-[#121418] border-[#2A303A] text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <span className="text-2xl mt-0.5">{opt.icon}</span>
                    <div className="flex-1">
                      <div className="font-semibold text-sm flex items-center justify-between">
                        <span>{opt.title}</span>
                        {selected && <span className="text-amber-400 font-bold">✓</span>}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">{opt.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="secondary" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={handleNext}>Continue →</Button>
            </div>
          </Card>
        )}

        {/* STEP 4: Guitar Type */}
        {step === 4 && (
          <Card className="p-6 sm:p-8 border-[#2A303A] space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-100">What guitar do you have?</h2>
              <p className="text-sm text-slate-400 mt-1">Our tips adapt to your instrument setup.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {GUITAR_TYPES.map((g) => {
                const selected = guitarType === g.value;
                return (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setGuitarType(g.value)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      selected
                        ? 'bg-amber-500/10 border-amber-500 text-slate-100'
                        : 'bg-[#121418] border-[#2A303A] text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <div className="text-2xl mb-2">{g.icon}</div>
                    <div className="font-semibold text-sm flex items-center justify-between">
                      <span>{g.title}</span>
                      {selected && <span className="text-amber-400">✓</span>}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">{g.desc}</div>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="secondary" onClick={() => setStep(3)}>Back</Button>
              <Button onClick={handleNext}>Continue →</Button>
            </div>
          </Card>
        )}

        {/* STEP 5: Daily Goal */}
        {step === 5 && (
          <Card className="p-6 sm:p-8 border-[#2A303A] space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-100">Daily practice target</h2>
              <p className="text-sm text-slate-400 mt-1">
                How many minutes can you dedicate each day? Even 15 minutes creates rapid improvement.
              </p>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {DAILY_GOALS.map((min) => {
                const selected = dailyGoal === min;
                return (
                  <button
                    key={min}
                    type="button"
                    onClick={() => setDailyGoal(min)}
                    className={`p-4 rounded-2xl border text-center transition-all ${
                      selected
                        ? 'bg-amber-500 border-amber-500 text-slate-950 font-bold'
                        : 'bg-[#121418] border-[#2A303A] text-slate-200 hover:border-slate-600'
                    }`}
                  >
                    <div className="text-xl font-bold">{min}</div>
                    <div className="text-[11px] opacity-80 uppercase tracking-wider">min/day</div>
                  </button>
                );
              })}
            </div>

            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
              💡 <strong>Recommended:</strong> 15 minutes a day builds muscle memory without finger fatigue.
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="secondary" onClick={() => setStep(4)}>Back</Button>
              <Button onClick={handleNext} isLoading={isLoading}>
                {experience === 'ABSOLUTE_BEGINNER' ? 'Complete Setup →' : 'Next: Quick Assessment →'}
              </Button>
            </div>
          </Card>
        )}

        {/* STEP 6: Skill Assessment (For non-absolute beginners) */}
        {step === 6 && (
          <Card className="p-6 sm:p-8 border-[#2A303A] space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-100">Quick Skill Check</h2>
              <p className="text-sm text-slate-400 mt-1">Helps place you at the right module.</p>
            </div>

            <div className="space-y-6">
              {ASSESSMENT_QUESTIONS.map((q, qIndex) => (
                <div key={qIndex} className="space-y-3">
                  <p className="text-sm font-semibold text-slate-200">{qIndex + 1}. {q.prompt}</p>
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
                          className={`w-full p-3.5 rounded-xl border text-left text-sm transition-all ${
                            selected
                              ? 'bg-amber-500/10 border-amber-500 text-slate-100 font-medium'
                              : 'bg-[#121418] border-[#2A303A] text-slate-300 hover:border-slate-600'
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

            <div className="flex justify-between pt-4">
              <Button variant="secondary" onClick={() => setStep(5)}>Back</Button>
              <Button onClick={handleNext} isLoading={isLoading}>Complete Assessment →</Button>
            </div>
          </Card>
        )}

        {/* STEP 7: Placement Result */}
        {step === 7 && placementResult && (
          <Card className="p-6 sm:p-10 border-[#2A303A] text-center space-y-6">
            <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-4xl flex items-center justify-center mx-auto">
              🎉
            </div>
            <div className="space-y-2">
              <Badge variant="success" size="md">Placement Ready</Badge>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-100">
                You&apos;re Set for Success!
              </h1>
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                Based on your preferences, we&apos;ve customized your curriculum starting from{' '}
                <span className="text-amber-400 font-semibold">Lesson {placementResult.startingLessonOrder}</span>.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#121418] border border-[#2A303A] max-w-md mx-auto text-left space-y-2 text-sm">
              <div className="flex justify-between py-1 border-b border-[#2A303A]">
                <span className="text-slate-400">Recommended Track</span>
                <span className="font-semibold text-slate-200">{placementResult.recommendedLevel.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#2A303A]">
                <span className="text-slate-400">Daily Target</span>
                <span className="font-semibold text-slate-200">{dailyGoal} Minutes</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Starting Lesson</span>
                <span className="font-semibold text-amber-400">Lesson #{placementResult.startingLessonOrder}</span>
              </div>
            </div>

            <Button
              onClick={() => {
                router.push('/dashboard');
                router.refresh();
              }}
              size="lg"
              className="w-full sm:w-auto px-10"
            >
              Enter Dashboard & Start Learning 🎸
            </Button>
          </Card>
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-slate-500 py-2">
        Guitar Learning Platform • Structured Beginner Roadmap
      </div>
    </div>
  );
}
