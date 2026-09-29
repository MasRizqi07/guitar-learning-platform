'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Flame,
  Zap,
  Award,
  Play,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  Clock,
  Radio,
  Sliders,
  Layers,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';


interface DashboardData {
  user: {
    id: string;
    name: string;
    email: string;
  };
  profile: {
    totalXP: number;
    currentStreak: number;
    longestStreak: number;
    timezone: string;
    level: {
      level: number;
      currentXP: number;
      nextLevelXP: number;
      progressPercent: number;
    };
  };
  dailyGoal: {
    todayMinutes: number;
    dailyGoalMinutes: number;
    goalPercentage: number;
    goalMet: boolean;
  };
  nextAction: {
    type: string;
    title: string;
    subtitle: string;
    href: string;
    buttonText: string;
    badge: string;
  };
  courseProgress: {
    title: string;
    slug: string;
    totalLessons: number;
    completedLessons: number;
    progressPercentage: number;
  };
  recentActivities: {
    id: string;
    type: string;
    createdAt: string;
    metadata?: {
      lessonTitle?: string;
      xpEarned?: number;
      [key: string]: unknown;
    } | null;
  }[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/dashboard')
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error?.message || 'Failed to load dashboard');
        return body.data;
      })
      .then((dashData: DashboardData) => setData(dashData))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Error'))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-12 bg-[#171A20] rounded-xl w-72" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 h-80 bg-[#171A20] rounded-2xl" />
          <div className="lg:col-span-4 h-80 bg-[#171A20] rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-44 bg-[#171A20] rounded-2xl" />
          <div className="h-44 bg-[#171A20] rounded-2xl" />
          <div className="h-44 bg-[#171A20] rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center space-y-4 rounded-2xl bg-[#171A20] border border-red-500/30">
        <div className="text-3xl">⚠️</div>
        <h2 className="text-xl font-bold text-[#F8FAFC]">Unable to load dashboard</h2>
        <p className="text-sm text-slate-400">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#0E1014] font-bold text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  const { user, profile, dailyGoal, nextAction, courseProgress, recentActivities } = data;

  // Circular progress calculations for Daily Practice Dial
  const radius = 50;
  const circumference = 2 * Math.PI * radius; // ~314.16
  const clampedGoalPercent = Math.min(100, Math.max(0, dailyGoal.goalPercentage));
  const strokeDashoffset = circumference - (clampedGoalPercent / 100) * circumference;

  return (
    <div className="space-y-6">
      {/* 1. Top Status & Streak Header */}
      <section className="rounded-2xl bg-[#171A20] border border-[#2A303A] p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(74,225,118,0.7)] animate-pulse shrink-0" />
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-extrabold text-[#F8FAFC] truncate tracking-tight">
              Welcome back, <span className="text-amber-400">{user.name}</span>. Keep the rhythm going.
            </h1>
            <p className="text-xs text-slate-400 hidden sm:block">
              Engine v2.4 • Next target: {nextAction.title}
            </p>
          </div>
        </div>

        {/* User Pill Bar */}
        <div className="flex items-center flex-wrap gap-2.5 shrink-0">
          {/* Streak Capsule */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-mono font-semibold shadow-[0_0_12px_rgba(245,158,11,0.15)]">
            <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>{profile.currentStreak} Days Active</span>
          </div>

          {/* XP Counter */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold">
            <Zap className="w-4 h-4 text-emerald-400" />
            <span>{profile.totalXP} XP</span>
          </div>

          {/* Level Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#20242C] border border-[#2A303A] text-slate-300 text-xs font-mono">
            <Award className="w-4 h-4 text-amber-400" />
            <span>Lvl {profile.level.level} • {profile.level.level <= 2 ? 'Apprentice' : profile.level.level <= 5 ? 'Practitioner' : 'Virtuoso'}</span>
          </div>
        </div>
      </section>

      {/* 2. Main Grid: Hero Next Action (8 cols) & Daily Practice Dial (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* HERO ACTION CARD (8 cols) */}
        <section className="lg:col-span-8 rounded-2xl bg-[#171A20] border border-amber-500/30 p-6 sm:p-7 flex flex-col justify-between shadow-xl relative overflow-hidden group">
          {/* Ambient Glow */}
          <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col gap-4">
            {/* Eyebrow Pill Cluster */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-mono font-semibold">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span>One Clear Next Action</span>
              </div>
              <span className="text-xs font-mono uppercase text-slate-400 bg-[#20242C] px-2.5 py-1 rounded border border-[#2A303A]">
                {courseProgress.title}
              </span>
            </div>

            {/* Split Content & Visual Chord Graphic */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center pt-1">
              {/* Text & Instructions */}
              <div className="md:col-span-7 flex flex-col gap-2">
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#F8FAFC] tracking-tight leading-snug">
                  {nextAction.title}
                </h2>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {nextAction.subtitle}
                </p>

                {/* Progress bar */}
                <div className="flex flex-col gap-1.5 pt-3">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">
                      {courseProgress.completedLessons} of {courseProgress.totalLessons} Lessons Done
                    </span>
                    <span className="text-amber-400 font-bold">
                      {courseProgress.progressPercentage}% Complete
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#0E1014] overflow-hidden border border-white/5">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(245,158,11,0.6)]"
                      style={{ width: `${courseProgress.progressPercentage}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Fretboard Visual Chord Card */}
              <div className="md:col-span-5 flex flex-col items-center justify-center p-3 rounded-xl bg-[#20242C]/70 border border-[#2A303A] shadow-inner">
                <div className="flex items-center justify-between w-full px-2 pb-1 text-xs">
                  <span className="font-bold text-amber-400">G Major Grip</span>
                  <span className="text-[10px] font-mono uppercase text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded border border-emerald-500/30">
                    Open Pos
                  </span>
                </div>

                {/* SVG Chord Diagram (G Major) */}
                <div className="w-full max-w-[170px] aspect-[4/5] flex items-center justify-center">
                  <svg aria-label="G Major Chord Diagram" className="w-full h-full text-slate-400 select-none" viewBox="0 0 160 180">
                    <rect fill="#F8FAFC" height="5" rx="1.5" width="110" x="25" y="24" opacity="0.9" />
                    <line stroke="#475569" strokeWidth="2.5" x1="30" x2="30" y1="28" y2="155" />
                    <line stroke="#475569" strokeWidth="2.0" x1="52" x2="52" y1="28" y2="155" />
                    <line stroke="#475569" strokeWidth="1.6" x1="74" x2="74" y1="28" y2="155" />
                    <line stroke="#475569" strokeWidth="1.4" x1="96" x2="96" y1="28" y2="155" />
                    <line stroke="#475569" strokeWidth="1.2" x1="118" x2="118" y1="28" y2="155" />
                    <line stroke="#475569" strokeWidth="1.0" x1="135" x2="135" y1="28" y2="155" />

                    <line stroke="#334155" strokeWidth="1.5" x1="30" x2="135" y1="70" y2="70" />
                    <line stroke="#334155" strokeWidth="1.5" x1="30" x2="135" y1="112" y2="112" />
                    <line stroke="#334155" strokeWidth="1.5" x1="30" x2="135" y1="155" y2="155" />

                    {/* Open markers */}
                    <circle cx="74" cy="14" fill="none" r="3" stroke="#22C55E" strokeWidth="1.5" />
                    <circle cx="96" cy="14" fill="none" r="3" stroke="#22C55E" strokeWidth="1.5" />
                    <circle cx="118" cy="14" fill="none" r="3" stroke="#22C55E" strokeWidth="1.5" />

                    {/* Finger Placements */}
                    <circle cx="30" cy="133" fill="#F59E0B" r="9" stroke="#F8FAFC" strokeWidth="1.5" />
                    <text fill="#0E1014" fontFamily="monospace" fontSize="10" fontWeight="bold" textAnchor="middle" x="30" y="137">2</text>

                    <circle cx="52" cy="91" fill="#F59E0B" r="9" stroke="#F8FAFC" strokeWidth="1.5" />
                    <text fill="#0E1014" fontFamily="monospace" fontSize="10" fontWeight="bold" textAnchor="middle" x="52" y="95">1</text>

                    <circle cx="135" cy="133" fill="#22C55E" r="9" stroke="#F8FAFC" strokeWidth="1.5" />
                    <text fill="#0E1014" fontFamily="monospace" fontSize="10" fontWeight="bold" textAnchor="middle" x="135" y="137">3</text>
                  </svg>
                </div>
                <span className="font-mono text-[10px] text-slate-400 uppercase pt-1">Frets 1-3 Position</span>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="relative z-10 pt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Link
              href={nextAction.href}
              className="h-12 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.99] text-[#0E1014] font-extrabold text-sm flex items-center justify-center gap-2 transition-all shadow-[0_4px_16px_rgba(245,158,11,0.35)]"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{nextAction.buttonText}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-black/20 text-[#0E1014] font-bold">
                +20 XP
              </span>
            </Link>

            <Link
              href="/learn"
              className="h-12 px-4 rounded-xl bg-[#20242C] hover:bg-slate-700/60 text-[#F8FAFC] font-semibold text-xs flex items-center justify-center gap-2 transition-colors border border-[#2A303A]"
            >
              <Layers className="w-4 h-4 text-slate-400" />
              <span>View Curriculum Roadmap</span>
            </Link>

            <Link
              href="/library"
              className="h-12 px-4 rounded-xl bg-[#20242C] hover:bg-slate-700/60 text-slate-300 hover:text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors border border-[#2A303A]"
            >
              <Radio className="w-4 h-4 text-slate-400" />
              <span>Chord Vault</span>
            </Link>
          </div>
        </section>

        {/* DAILY PRACTICE GOAL WIDGET (4 cols) */}
        <section className="lg:col-span-4 rounded-2xl bg-[#171A20] border border-[#2A303A] p-6 sm:p-7 flex flex-col justify-between shadow-xl">
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-extrabold text-[#F8FAFC]">Daily Practice Goal</h2>
            </div>
            <span className="text-[10px] font-mono uppercase bg-[#20242C] border border-[#2A303A] px-2 py-0.5 rounded text-slate-400">
              Adaptive
            </span>
          </div>

          {/* Circular Dial Gauge Display */}
          <div className="flex flex-col items-center justify-center py-4">
            <div className="relative w-44 h-44 flex items-center justify-center">
              {/* Progress Ring SVG */}
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 120 120">
                <circle cx="60" cy="60" fill="transparent" r={radius} stroke="#20242C" strokeWidth="10" />
                <circle
                  className="transition-all duration-1000 ease-out"
                  cx="60"
                  cy="60"
                  fill="transparent"
                  r={radius}
                  stroke={dailyGoal.goalMet ? '#22C55E' : '#F59E0B'}
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  strokeWidth="10"
                />
              </svg>

              {/* Inner Telemetry Metrics */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none">
                <span className="font-mono text-2xl text-[#F8FAFC] tracking-tight font-extrabold">
                  {dailyGoal.todayMinutes} / {dailyGoal.dailyGoalMinutes}
                </span>
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 pt-0.5">
                  MINUTES
                </span>
                <span className={`text-xs font-mono font-bold pt-1 ${dailyGoal.goalMet ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {dailyGoal.goalPercentage}% Achieved
                </span>
              </div>
            </div>

            <div className="mt-3 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-center flex items-center gap-1.5 text-xs font-medium">
              <Flame className="w-3.5 h-3.5 fill-amber-500" />
              <span>
                {dailyGoal.goalMet
                  ? 'Daily streak verified for today!'
                  : `${Math.max(0, dailyGoal.dailyGoalMinutes - dailyGoal.todayMinutes)} min left to lock streak!`}
              </span>
            </div>
          </div>

          {/* Quick Launch CTA */}
          <Link
            href="/practice"
            className="w-full h-11 rounded-xl bg-[#20242C] hover:bg-slate-700/60 text-amber-400 font-bold text-xs flex items-center justify-center gap-2 transition-all border border-[#2A303A]"
          >
            <span>Launch Focus Practice Room</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </section>
      </div>

      {/* 3. Row 2: Practice Shortcuts & Tool Utilities (3-Col Grid) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Utility A: Digital Strobe Tuner */}
        <div className="rounded-2xl bg-[#171A20] border border-[#2A303A] p-5 flex flex-col justify-between shadow-lg hover:border-slate-600 transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm text-[#F8FAFC]">Digital Autocorrelation Tuner</h3>
              </div>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                DSP 44.1k
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Direct microphone pitch estimation with sub-cent precision and 3+3 peg orientation.
            </p>

            {/* Cent Meter Visual */}
            <div className="p-3 rounded-xl bg-[#20242C]/70 border border-[#2A303A] flex flex-col items-center gap-1.5">
              <div className="flex items-baseline justify-between w-full">
                <span className="text-2xl font-mono font-bold text-emerald-400">E2</span>
                <span className="text-[10px] font-mono text-emerald-400 font-semibold">82.4 Hz • In Tune</span>
              </div>
              <div className="w-full flex items-center gap-1 py-1">
                <span className="h-1.5 flex-1 rounded bg-[#0E1014]" />
                <span className="h-1.5 flex-1 rounded bg-[#0E1014]" />
                <span className="h-2 flex-1 rounded bg-slate-700" />
                <span className="h-3.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#22C55E]" />
                <span className="h-2 flex-1 rounded bg-slate-700" />
                <span className="h-1.5 flex-1 rounded bg-[#0E1014]" />
                <span className="h-1.5 flex-1 rounded bg-[#0E1014]" />
              </div>
              <div className="flex justify-between w-full text-[9px] font-mono text-slate-500">
                <span>-50 ct</span>
                <span className="text-emerald-400 font-bold">0.0</span>
                <span>+50 ct</span>
              </div>
            </div>
          </div>

          <Link
            href="/tuner"
            className="mt-4 w-full h-10 rounded-xl bg-[#20242C] hover:bg-slate-700/60 text-[#F8FAFC] font-semibold text-xs flex items-center justify-between px-4 transition-colors border border-[#2A303A]"
          >
            <span>Open Interactive Tuner</span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </Link>
        </div>

        {/* Utility B: Chord Transition Drill */}
        <div className="rounded-2xl bg-[#171A20] border border-[#2A303A] p-5 flex flex-col justify-between shadow-lg hover:border-slate-600 transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm text-[#F8FAFC]">Chord Transition Deck</h3>
              </div>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                60-120 BPM
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Synchronized metronome prompts with instant finger posture guidance.
            </p>

            {/* Cadence Visual Widget */}
            <div className="p-3 rounded-xl bg-[#20242C]/70 border border-[#2A303A] flex items-center justify-around">
              <div className="text-center">
                <span className="text-base font-extrabold text-[#F8FAFC] font-mono block">C Maj</span>
                <span className="text-[9px] font-mono text-slate-400">Anchor Grip</span>
              </div>
              <div className="flex flex-col items-center text-amber-400">
                <RotateCcw className="w-4 h-4 animate-spin-slow" />
                <span className="text-[9px] font-mono uppercase text-amber-400 mt-0.5">Beat 4 Switch</span>
              </div>
              <div className="text-center">
                <span className="text-base font-extrabold text-amber-400 font-mono block">G Maj</span>
                <span className="text-[9px] font-mono text-slate-400">3rd-Finger</span>
              </div>
            </div>
          </div>

          <Link
            href="/practice"
            className="mt-4 w-full h-10 rounded-xl bg-[#20242C] hover:bg-slate-700/60 text-[#F8FAFC] font-semibold text-xs flex items-center justify-between px-4 transition-colors border border-[#2A303A]"
          >
            <span>Launch Transition Drill</span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </Link>
        </div>

        {/* Utility C: Interactive 15-Fret Neck */}
        <div className="rounded-2xl bg-[#171A20] border border-[#2A303A] p-5 flex flex-col justify-between shadow-lg hover:border-slate-600 transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm text-[#F8FAFC]">15-Fret Neck Explorer</h3>
              </div>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#20242C] border border-[#2A303A] text-slate-400">
                Scales
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Interactive 15 frets with Major, Minor Pentatonic, and Blues scale overlays.
            </p>

            {/* Mini Neck Graphic */}
            <div className="p-3 rounded-xl bg-[#20242C]/70 border border-[#2A303A] flex flex-col justify-center gap-1 select-none">
              <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 px-1">
                <span>NUT</span>
                <span>3</span>
                <span>5</span>
                <span>7</span>
                <span>9</span>
                <span>12</span>
              </div>
              <div className="relative w-full h-6 bg-[#0E1014] rounded flex items-center px-1 overflow-hidden border border-white/5">
                <div className="absolute inset-y-0 left-0 w-1 bg-slate-400" />
                <div className="absolute inset-y-0 left-1/4 w-[1px] bg-[#2A303A]" />
                <div className="absolute inset-y-0 left-2/4 w-[1px] bg-[#2A303A]" />
                <div className="absolute inset-y-0 left-3/4 w-[1px] bg-[#2A303A]" />
                <span className="absolute left-[20%] w-3 h-3 rounded-full bg-amber-500 flex items-center justify-center text-[7px] font-bold text-[#0E1014]">
                  R
                </span>
                <span className="absolute left-[46%] w-3 h-3 rounded-full bg-emerald-400 flex items-center justify-center text-[7px] font-bold text-[#0E1014]">
                  3
                </span>
                <span className="absolute left-[70%] w-3 h-3 rounded-full bg-emerald-400 flex items-center justify-center text-[7px] font-bold text-[#0E1014]">
                  5
                </span>
              </div>
              <span className="text-[9px] font-mono text-slate-400 text-center pt-0.5">
                C Major Pentatonic Box 1
              </span>
            </div>
          </div>

          <Link
            href="/library"
            className="mt-4 w-full h-10 rounded-xl bg-[#20242C] hover:bg-slate-700/60 text-[#F8FAFC] font-semibold text-xs flex items-center justify-between px-4 transition-colors border border-[#2A303A]"
          >
            <span>Explore Neck & Chords</span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </Link>
        </div>
      </section>

      {/* 4. Row 3: Verified Learning Feed & XP Activity Ledger */}
      <section className="rounded-2xl bg-[#171A20] border border-[#2A303A] p-5 sm:p-6 shadow-xl flex flex-col gap-4">
        {/* Ledger Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-[#2A303A]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#20242C] flex items-center justify-center text-amber-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#F8FAFC]">Verified Activity Ledger</h2>
              <p className="text-[11px] text-slate-400">Cryptographically signed learning transactions and practice intervals</p>
            </div>
          </div>

          <span className="font-mono text-[10px] uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-full flex items-center gap-1 self-start sm:self-auto">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Server Authoritative • Idempotent
          </span>
        </div>

        {/* Activity Items */}
        {recentActivities.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">
            No activity logged yet. Complete your first lesson or practice session to write to the ledger!
          </div>
        ) : (
          <div className="divide-y divide-[#2A303A]/60">
            {recentActivities.map((act) => (
              <div
                key={act.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-[#F8FAFC]">
                        {act.type.replace(/_/g, ' ')}
                      </span>
                      {act.metadata?.lessonTitle && (
                        <span className="text-slate-400 truncate max-w-[240px]">
                          • {act.metadata.lessonTitle}
                        </span>
                      )}
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#20242C] text-emerald-400 border border-emerald-500/30">
                        Verified
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {new Date(act.createdAt).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 pl-11 sm:pl-0">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    +{act.metadata?.xpEarned || 20} XP
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
