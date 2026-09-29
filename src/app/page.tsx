'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Volume2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Lock,
  Compass,
  Play,
  RotateCcw,
  Flame,
  Radio,
} from 'lucide-react';

import { Logo } from '@/components/ui/Logo';
import { playGuitarString, strumChord, playMetronomeClick } from '@/lib/audio';

export default function HomePage() {
  const [isPlayingStrum, setIsPlayingStrum] = useState(false);
  const [isMetronomeActive, setIsMetronomeActive] = useState(false);
  const [metronomeBpm] = useState(80);
  const [activeStringIndex, setActiveStringIndex] = useState<number | null>(null);

  // Play standard C Major grip via Web Audio API
  const handleStrumC = () => {
    setIsPlayingStrum(true);
    // C Major open chord: X 3 2 0 1 0
    strumChord(['X', 3, 2, 0, 1, 0], 'DOWN');
    setTimeout(() => setIsPlayingStrum(false), 1200);
  };

  // Play individual string note for tuner preview
  const handlePlayString = (freq: number, index: number) => {
    setActiveStringIndex(index);
    playGuitarString(freq, 1.8);
    setTimeout(() => setActiveStringIndex(null), 1000);
  };

  // Metronome test click
  const handleMetronomeTick = () => {
    setIsMetronomeActive(true);
    playMetronomeClick(true);
    setTimeout(() => setIsMetronomeActive(false), 300);
  };

  return (
    <div className="min-h-screen bg-[#0E1014] text-[#F8FAFC] selection:bg-amber-500/30 selection:text-amber-200 overflow-x-hidden relative font-sans">
      {/* Ambient Backdrop Lights */}
      <div className="fixed inset-0 pointer-events-none hero-glow-radial z-0" />
      <div className="fixed inset-0 pointer-events-none grid-lines opacity-60 z-0" />

      {/* 1. Glassmorphic Sticky Header */}
      <header className="sticky top-0 z-50 w-full transition-all duration-300">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-3 pb-3">
          <nav className="glass-panel rounded-2xl px-4 sm:px-6 py-3 flex items-center justify-between shadow-2xl shadow-black/40">
            {/* Left: Brand Logo */}
            <Logo size="md" href="/" />

            {/* Center Nav */}
            <div className="hidden md:flex items-center gap-1 lg:gap-2 text-sm font-medium text-slate-400">
              <a
                href="#curriculum"
                className="px-3.5 py-1.5 rounded-lg hover:text-[#F8FAFC] hover:bg-white/5 transition-colors focus:ring-1 focus:ring-amber-500/40 focus:outline-none"
              >
                Curriculum
              </a>
              <Link
                href="/practice"
                className="px-3.5 py-1.5 rounded-lg hover:text-[#F8FAFC] hover:bg-white/5 transition-colors focus:ring-1 focus:ring-amber-500/40 focus:outline-none flex items-center gap-1.5"
              >
                Practice Room
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  DSP 44.1k
                </span>
              </Link>
              <Link
                href="/tuner"
                className="px-3.5 py-1.5 rounded-lg hover:text-[#F8FAFC] hover:bg-white/5 transition-colors focus:ring-1 focus:ring-amber-500/40 focus:outline-none"
              >
                Interactive Tuner
              </Link>
              <Link
                href="/library"
                className="px-3.5 py-1.5 rounded-lg hover:text-[#F8FAFC] hover:bg-white/5 transition-colors focus:ring-1 focus:ring-amber-500/40 focus:outline-none"
              >
                Chord Library
              </Link>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="text-sm font-medium text-slate-300 hover:text-white px-3 py-2 rounded-lg transition-colors focus:outline-none focus:ring-1 focus:ring-[#2A303A]"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="relative group inline-flex items-center justify-center px-4 sm:px-5 py-2 rounded-xl text-sm font-semibold text-[#0E1014] bg-amber-500 hover:bg-amber-400 transition-all shadow-[0_0_20px_rgba(245,158,11,0.35)] hover:shadow-[0_0_25px_rgba(245,158,11,0.55)] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-[#0E1014]"
              >
                <span className="relative z-10 flex items-center gap-1.5">
                  Start Learning Free
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </div>
          </nav>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section id="top" className="relative z-10 pt-10 pb-20 lg:pt-16 lg:pb-28 overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Top Tagline Pill */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#171A20] border border-[#2A303A] shadow-lg shadow-black/40 text-xs font-mono text-slate-400">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span className="text-[#F8FAFC] font-semibold">V2.4 Precision Engine</span>
              <span className="text-[#2A303A]">|</span>
              <span className="text-amber-400">No YouTube Rabbit Holes</span>
            </div>
          </div>

          {/* Main Heading & Subhead */}
          <div className="text-center max-w-4xl mx-auto space-y-6">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08] text-[#F8FAFC]">
              Learn Guitar. <br className="hidden sm:inline" />
              <span className="amber-gradient-text drop-shadow-[0_0_35px_rgba(245,158,11,0.3)]">One Step</span> at a Time.
            </h1>
            <p className="text-lg sm:text-xl text-slate-400 font-normal max-w-2xl mx-auto leading-relaxed">
              Structured deterministic roadmap, guided focus practice sessions with real-time audio synthesis, and zero tutorial-hell confusion.
            </p>

            {/* Action Row */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-3">
              <Link
                href="/register"
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-semibold text-base text-[#0E1014] bg-amber-500 hover:bg-amber-400 transition-all shadow-[0_0_30px_rgba(245,158,11,0.4)] hover:shadow-[0_0_40px_rgba(245,158,11,0.6)] flex items-center justify-center gap-2 group active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <span>Start Your Journey (Free)</span>
                <ArrowRight className="w-5 h-5 text-[#0E1014] transform group-hover:translate-x-1 transition-transform" />
              </Link>

              <a
                href="#curriculum"
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-medium text-base text-[#F8FAFC] bg-[#171A20]/80 hover:bg-[#20242C] border border-[#2A303A] hover:border-[#3A4250] transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-1 focus:ring-slate-400"
              >
                <Compass className="w-4 h-4 text-slate-400" />
                <span>Explore 6-Module Roadmap</span>
              </a>
            </div>

            {/* Micro stats under button */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-slate-400 font-mono">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Zero Hardware Setup
              </span>
              <span className="text-[#2A303A]">•</span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Web Audio Tuner Built-in
              </span>
              <span className="text-[#2A303A] hidden sm:inline">•</span>
              <span className="hidden sm:flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Server-Verified XP
              </span>
            </div>
          </div>

          {/* Hero Visual: Interactive 3D Dark Mock Preview */}
          <div className="mt-12 lg:mt-16 relative max-w-5xl mx-auto">
            {/* Glow Backdrop */}
            <div className="absolute -inset-4 bg-gradient-to-r from-amber-500/20 via-amber-500/5 to-emerald-500/10 rounded-3xl blur-2xl opacity-60 -z-10 transform -rotate-1" />

            {/* Master Canvas Window Container */}
            <div className="glass-panel-elevated rounded-2xl p-4 sm:p-6 border border-[#2A303A]/90 shadow-2xl relative">
              {/* Mock Window Titlebar */}
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#2A303A]/70 text-xs font-mono text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-green-500/80 inline-block" />
                  <span className="ml-2 text-slate-500 hidden sm:inline">fretflow.app/dashboard</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded bg-[#171A20] border border-[#2A303A] text-[11px] text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> DSP Engine Active
                  </span>
                  <span className="text-slate-500 hidden sm:inline">Standard E (E-A-D-G-B-E)</span>
                </div>
              </div>

              {/* Mock Dashboard Inner Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Left Col: Priority Next Action Banner (7 cols) */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Primary Recommendation Hero Box */}
                  <div className="rounded-xl bg-gradient-to-br from-[#171A20] to-[#1a1f29] border border-amber-500/40 p-5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

                    <div className="flex items-center justify-between mb-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-xs font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Next Clear Action
                      </span>
                      <span className="text-xs font-mono text-slate-400">Est. 4 min</span>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                        Module 02 • Lesson 03
                      </span>
                      <h3 className="text-xl sm:text-2xl font-bold text-[#F8FAFC] tracking-tight">
                        Mastering the G Major Open Chord
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-400 line-clamp-2">
                        Refine clean 3rd-finger ring pressure on high E, eliminate fret buzz on inner strings, and lock into the 60 BPM tempo loop.
                      </p>
                    </div>

                    {/* Progress inside card */}
                    <div className="mt-4 pt-3 border-t border-[#2A303A]/60 flex items-center justify-between">
                      <div className="w-1/2 space-y-1">
                        <div className="flex justify-between text-[11px] font-mono text-slate-400">
                          <span>Step 2 of 5</span>
                          <span className="text-amber-400 font-semibold">40%</span>
                        </div>
                        <div className="w-full h-1.5 bg-[#20242C] rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full w-[40%]" />
                        </div>
                      </div>
                      <Link
                        href="/login"
                        className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-[#0E1014] font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-amber-500/20"
                      >
                        <span>Continue</span>
                        <span className="font-mono text-[10px] bg-black/20 px-1 py-0.5 rounded">+20 XP</span>
                      </Link>
                    </div>
                  </div>

                  {/* Secondary Row: Quick Launchers */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={handleMetronomeTick}
                      className={`p-3.5 rounded-xl bg-[#171A20]/90 border text-left transition-all ${
                        isMetronomeActive
                          ? 'border-amber-500 bg-amber-500/10'
                          : 'border-[#2A303A] hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#20242C] flex items-center justify-center text-amber-400">
                            <Zap className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-semibold text-[#F8FAFC]">Click Metronome</h4>
                            <p className="text-[11px] text-slate-400 font-mono">{metronomeBpm} BPM • 4/4</p>
                          </div>
                        </div>
                        <span className="text-xs font-mono text-emerald-400 font-medium">Test</span>
                      </div>
                    </button>

                    <Link
                      href="/practice"
                      className="p-3.5 rounded-xl bg-[#171A20]/90 border border-[#2A303A] hover:border-slate-600 flex items-center justify-between transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#20242C] flex items-center justify-center text-emerald-400">
                          <RotateCcw className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold text-[#F8FAFC]">Transition Deck</h4>
                          <p className="text-[11px] text-slate-400 font-mono">C Maj ⇄ G Maj</p>
                        </div>
                      </div>
                      <span className="text-xs font-mono text-amber-400 font-medium">Cadence</span>
                    </Link>
                  </div>
                </div>

                {/* Right Col: Interactive Visual Chord Diagram (5 cols) */}
                <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
                  {/* Floating Glass Card: Interactive C Major Chord Deck */}
                  <div className="p-4 rounded-xl bg-[#171A20] border border-[#2A303A]/90 relative overflow-hidden shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        <span className="font-bold text-sm text-[#F8FAFC]">C Major Grip</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#20242C] text-slate-400">
                          Open Position
                        </span>
                      </div>
                      <button
                        onClick={handleStrumC}
                        disabled={isPlayingStrum}
                        className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 text-xs font-mono flex items-center gap-1.5 transition-all active:scale-95"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>{isPlayingStrum ? 'Strumming...' : 'Click to Strum'}</span>
                      </button>
                    </div>

                    {/* SVG Interactive Chord Diagram */}
                    <div className="relative bg-[#20242C]/70 rounded-lg p-3 flex flex-col items-center">
                      <svg className="w-44 h-38 overflow-visible" viewBox="0 0 180 150">
                        {/* Fret Nut */}
                        <rect x="25" y="16" width="130" height="5" rx="1.5" fill="#F8FAFC" opacity="0.9" />

                        {/* Fret Wires */}
                        <line x1="25" y1="46" x2="155" y2="46" stroke="#475569" strokeWidth="1.5" />
                        <line x1="25" y1="78" x2="155" y2="78" stroke="#475569" strokeWidth="1.5" />
                        <line x1="25" y1="110" x2="155" y2="110" stroke="#475569" strokeWidth="1.5" />
                        <line x1="25" y1="142" x2="155" y2="142" stroke="#475569" strokeWidth="1.5" />

                        {/* Fret Roman Numerals */}
                        <text x="12" y="36" fill="#64748B" fontSize="10" fontFamily="monospace">I</text>
                        <text x="12" y="68" fill="#64748B" fontSize="10" fontFamily="monospace">II</text>
                        <text x="12" y="100" fill="#64748B" fontSize="10" fontFamily="monospace">III</text>

                        {/* String 6 (E - Muted X) */}
                        <text x="25" y="10" fill="#EF4444" fontSize="11" fontWeight="bold" textAnchor="middle">✕</text>
                        <line x1="25" y1="20" x2="25" y2="142" stroke="#475569" strokeWidth="2.5" />

                        {/* String 5 (A - Fret 3, Finger 3 - Ring) */}
                        <text x="51" y="10" fill="#94A3B8" fontSize="10" textAnchor="middle">3</text>
                        <line x1="51" y1="20" x2="51" y2="142" stroke="#F59E0B" strokeWidth="2" className="opacity-80" />
                        <circle cx="51" cy="94" r="8" fill="#F59E0B" stroke="#F8FAFC" strokeWidth="1.5" />
                        <text x="51" y="98" fill="#0E1014" fontSize="10" fontWeight="bold" textAnchor="middle">3</text>

                        {/* String 4 (D - Fret 2, Finger 2 - Middle) */}
                        <text x="77" y="10" fill="#94A3B8" fontSize="10" textAnchor="middle">2</text>
                        <line x1="77" y1="20" x2="77" y2="142" stroke="#F59E0B" strokeWidth="1.8" className="opacity-80" />
                        <circle cx="77" cy="62" r="8" fill="#F59E0B" stroke="#F8FAFC" strokeWidth="1.5" />
                        <text x="77" y="66" fill="#0E1014" fontSize="10" fontWeight="bold" textAnchor="middle">2</text>

                        {/* String 3 (G - Open O) */}
                        <text x="103" y="10" fill="#22C55E" fontSize="11" fontWeight="bold" textAnchor="middle">○</text>
                        <line x1="103" y1="20" x2="103" y2="142" stroke="#22C55E" strokeWidth="1.5" strokeDasharray="2 1" />

                        {/* String 2 (B - Fret 1, Finger 1 - Index) */}
                        <text x="129" y="10" fill="#94A3B8" fontSize="10" textAnchor="middle">1</text>
                        <line x1="129" y1="20" x2="129" y2="142" stroke="#F59E0B" strokeWidth="1.2" className="opacity-80" />
                        <circle cx="129" cy="31" r="8" fill="#F59E0B" stroke="#F8FAFC" strokeWidth="1.5" />
                        <text x="129" y="35" fill="#0E1014" fontSize="10" fontWeight="bold" textAnchor="middle">1</text>

                        {/* String 1 (High E - Open O) */}
                        <text x="155" y="10" fill="#22C55E" fontSize="11" fontWeight="bold" textAnchor="middle">○</text>
                        <line x1="155" y1="20" x2="155" y2="142" stroke="#22C55E" strokeWidth="1.2" strokeDasharray="2 1" />
                      </svg>

                      {/* Finger placement footer note */}
                      <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400 mt-2">
                        <span>1: Index (B)</span>
                        <span>2: Middle (D)</span>
                        <span>3: Ring (A)</span>
                      </div>
                    </div>
                  </div>

                  {/* Audio Harmonic Feedback */}
                  <div className="p-3 rounded-xl bg-[#171A20]/90 border border-[#2A303A] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs font-mono text-[#F8FAFC] font-medium">Harmonic Sustain</span>
                    </div>
                    {/* Soundwave equalizer bars */}
                    <div className="flex items-end gap-1 h-5">
                      <span className={`w-1 bg-amber-500 rounded-full transition-all duration-300 ${isPlayingStrum ? 'h-5' : 'h-2'}`} />
                      <span className={`w-1 bg-amber-400 rounded-full transition-all duration-300 ${isPlayingStrum ? 'h-4' : 'h-3'}`} />
                      <span className={`w-1 bg-emerald-400 rounded-full transition-all duration-300 ${isPlayingStrum ? 'h-5' : 'h-2'}`} />
                      <span className={`w-1 bg-amber-500 rounded-full transition-all duration-300 ${isPlayingStrum ? 'h-3' : 'h-4'}`} />
                      <span className={`w-1 bg-emerald-400 rounded-full transition-all duration-300 ${isPlayingStrum ? 'h-5' : 'h-1'}`} />
                      <span className={`w-1 bg-amber-400 rounded-full transition-all duration-300 ${isPlayingStrum ? 'h-4' : 'h-3'}`} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Badges Over Hero Visual (Desktop Only) */}
              <div className="hidden sm:flex absolute -top-5 -left-5 p-3 rounded-xl glass-panel border border-slate-700 shadow-xl items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#F8FAFC]">Daily Target</span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">66%</span>
                  </div>
                  <p className="text-xs font-mono text-slate-400">10 / 15 min complete</p>
                </div>
              </div>

              <div className="hidden sm:flex absolute -bottom-5 -right-4 p-3 rounded-xl glass-panel border border-slate-700 shadow-xl items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[#F8FAFC]">5-Day Streak</span>
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                  </div>
                  <p className="text-xs font-mono text-amber-400 font-semibold">+50 XP Bonus</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Core Learning Loop (Bento Grid Layout) */}
      <section id="curriculum" className="relative z-10 py-20 lg:py-28 bg-[#0B0D11] border-y border-[#2A303A]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#171A20] border border-[#2A303A] text-xs font-mono text-amber-400">
              <span>THE CORE LOOP</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-[#F8FAFC] tracking-tight">
              Engineered for Muscle Memory.
            </h2>
            <p className="text-base sm:text-lg text-slate-400">
              Our four-phase deterministic cycle takes you from zero to clean strumming without guessing what to play next.
            </p>
          </div>

          {/* Bento Grid (4 Pillars) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
            {/* Card 1: Step-by-Step Lessons - 7 cols */}
            <div className="lg:col-span-7 rounded-2xl bg-[#171A20] border border-[#2A303A] p-6 sm:p-8 flex flex-col justify-between hover:border-amber-500/50 transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#20242C] border border-[#2A303A] flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                  <Compass className="w-5 h-5" />
                </div>
                <h3 className="text-2xl font-bold text-[#F8FAFC] tracking-tight">01. Step-by-Step Roadmap</h3>
                <p className="text-sm text-slate-400 max-w-md">
                  30 deterministic lessons across 6 progressive modules. Prerequisite state machines ensure you never tackle advanced chord switches before finger posture is solidified.
                </p>
              </div>

              {/* Roadmap Nodes Visual Mini-UI */}
              <div className="mt-8 pt-6 border-t border-[#2A303A]/60">
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-[#20242C]/70 border border-emerald-500/40 flex flex-col justify-between space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-emerald-400 font-semibold">UNIT 01</span>
                      <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px]">✓</span>
                    </div>
                    <div className="text-xs font-bold text-[#F8FAFC]">Fundamentals</div>
                    <span className="text-[10px] text-slate-400 font-mono">5 / 5 Mastered</span>
                  </div>

                  <div className="p-3 rounded-xl bg-gradient-to-br from-[#20242C] to-[#171A20] border-2 border-amber-500 shadow-lg shadow-amber-500/10 flex flex-col justify-between space-y-2 relative">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-amber-400 font-semibold">UNIT 02</span>
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                    </div>
                    <div className="text-xs font-bold text-[#F8FAFC]">Open Chords</div>
                    <div className="w-full bg-[#171A20] h-1 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full w-[40%]" />
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#20242C]/30 border border-[#2A303A]/40 opacity-50 flex flex-col justify-between space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-400">UNIT 03</span>
                      <Lock className="w-3 h-3 text-slate-500" />
                    </div>
                    <div className="text-xs font-medium text-slate-400">Transitions</div>
                    <span className="text-[10px] text-slate-400 font-mono">Unlocks L2.5</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Focus Practice Room - 5 cols */}
            <div className="lg:col-span-5 rounded-2xl bg-[#171A20] border border-[#2A303A] p-6 sm:p-8 flex flex-col justify-between hover:border-amber-500/50 transition-all group relative overflow-hidden">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#20242C] border border-[#2A303A] flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                  <Play className="w-5 h-5" />
                </div>
                <h3 className="text-2xl font-bold text-[#F8FAFC] tracking-tight">02. Focus Practice Room</h3>
                <p className="text-sm text-slate-400">
                  Built-in DSP audio metronome, dual-oscillator acoustic plucked tone synthesis, and strict anti-cheat duration verification (60s – 300s).
                </p>
              </div>

              {/* Metronome Visualizer */}
              <div className="mt-8 p-4 rounded-xl bg-[#20242C] border border-[#2A303A] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-extrabold font-mono text-amber-400 tracking-tight">80</div>
                  <div>
                    <span className="text-xs font-bold text-[#F8FAFC] block">BPM METRONOME</span>
                    <span className="text-[11px] font-mono text-slate-400">Allegro Moderato</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-7 rounded-sm bg-[#2A303A]" />
                  <span className="w-2.5 h-7 rounded-sm bg-[#2A303A]" />
                  <span className="w-2.5 h-7 rounded-sm bg-[#2A303A]" />
                  <span className="w-2.5 h-7 rounded-sm bg-emerald-400 animate-pulse shadow-[0_0_10px_#22C55E]" />
                </div>
              </div>
            </div>

            {/* Card 3: Instant Quizzes - 5 cols */}
            <div className="lg:col-span-5 rounded-2xl bg-[#171A20] border border-[#2A303A] p-6 sm:p-8 flex flex-col justify-between hover:border-amber-500/50 transition-all group relative overflow-hidden">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#20242C] border border-[#2A303A] flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h3 className="text-2xl font-bold text-[#F8FAFC] tracking-tight">03. Server-Scored Quizzes</h3>
                <p className="text-sm text-slate-400">
                  Immediate feedback without client-side answer tampering. Passing threshold strictly locked at 60% with instant finger placement tips.
                </p>
              </div>

              <div className="mt-8 p-4 rounded-xl bg-[#20242C] border border-[#2A303A] flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#F8FAFC]">C Major Composition</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold">PASSED</span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono">3 / 3 Correct Questions</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-mono font-bold text-emerald-400">100%</span>
                  <span className="block text-[10px] text-amber-400 font-mono font-semibold">+10 XP</span>
                </div>
              </div>
            </div>

            {/* Card 4: Idempotent XP Ledger & Streaks - 7 cols */}
            <div className="lg:col-span-7 rounded-2xl bg-[#171A20] border border-[#2A303A] p-6 sm:p-8 flex flex-col justify-between hover:border-amber-500/50 transition-all group relative overflow-hidden">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#20242C] border border-[#2A303A] flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-2xl font-bold text-[#F8FAFC] tracking-tight">04. Idempotent XP Ledger & Streaks</h3>
                <p className="text-sm text-slate-400 max-w-md">
                  No fake progression or vanity numbers. Every completed lesson, practice session, and verified daily streak writes an immutable transaction to your learner record.
                </p>
              </div>

              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-6 border-t border-[#2A303A]/60">
                <div className="p-3 rounded-xl bg-[#20242C]/70 border border-[#2A303A] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <div>
                      <span className="text-xs font-semibold text-[#F8FAFC] block">Lesson Completed</span>
                      <span className="text-[10px] font-mono text-slate-400">G Major Architecture</span>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold text-amber-400">+20 XP</span>
                </div>

                <div className="p-3 rounded-xl bg-[#20242C]/70 border border-[#2A303A] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <div>
                      <span className="text-xs font-semibold text-[#F8FAFC] block">Practice Threshold</span>
                      <span className="text-[10px] font-mono text-slate-400">12 min transition loop</span>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold text-emerald-400">+10 XP</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Interactive Tuner Feature Highlight Section */}
      <section id="tuner" className="py-20 lg:py-24 relative z-10 border-b border-[#2A303A]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="glass-panel rounded-3xl p-8 sm:p-12 border border-slate-700/60 relative overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-6 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#20242C] border border-[#2A303A] text-xs font-mono text-emerald-400">
                  <Radio className="w-3.5 h-3.5 animate-pulse" />
                  <span>WEB AUDIO API AUTOCORRELATION</span>
                </div>

                <h2 className="text-3xl sm:text-4xl font-extrabold text-[#F8FAFC] tracking-tight">
                  A Studio Tuner in Your Browser. <br />
                  <span className="text-amber-400">Zero Plugs. Real-Time Pitch.</span>
                </h2>

                <p className="text-base text-slate-400 leading-relaxed">
                  Equipped with browser-native microphone autocorrelation analysis, FretFlow detects string vibration frequencies with ±0.1 Hz precision and real-time cent deviation gauges.
                </p>

                <ul className="space-y-3 text-sm text-slate-400 font-medium">
                  <li className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">✓</span>
                    All 6 Standard Strings (E2, A2, D3, G3, B3, E4) calibrated to 440.0 Hz.
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">✓</span>
                    Synthesized acoustic reference tones for tuning by ear.
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">✓</span>
                    Anti-backlash string tension tips for beginners.
                  </li>
                </ul>

                <div className="pt-2">
                  <Link
                    href="/tuner"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-amber-400 hover:text-amber-300 transition-colors"
                  >
                    <span>Launch Tuner Module</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Visual Tuner Dial Gauge Mockup */}
              <div className="lg:col-span-6">
                <div className="p-6 rounded-2xl bg-[#20242C] border border-[#2A303A] shadow-2xl relative">
                  <div className="text-center space-y-1 mb-6">
                    <span className="text-xs font-mono text-slate-400 uppercase">Interactive Reference Tones</span>
                    <div className="text-5xl font-mono font-extrabold text-[#F8FAFC]">
                      E<span className="text-2xl text-amber-400">2</span>
                    </div>
                    <div className="text-xs font-mono text-emerald-400 font-semibold">82.4 Hz • In Tune (0.0 ¢)</div>
                  </div>

                  {/* Meter Gauge Arc Visualizer */}
                  <div className="relative w-full max-w-xs mx-auto h-20 overflow-hidden flex items-end justify-center">
                    <div className="w-48 h-24 border-t-4 border-l-4 border-r-4 border-[#2A303A] rounded-t-full relative flex justify-center">
                      <div className="absolute -top-3 w-1.5 h-6 bg-emerald-400 rounded-full shadow-[0_0_8px_#22C55E]" />
                      <div className="absolute bottom-0 w-1 h-20 bg-[#F8FAFC] rounded-full origin-bottom transform rotate-0 transition-transform" />
                    </div>
                  </div>

                  {/* Clickable String Buttons Row (Plays Audio!) */}
                  <div className="grid grid-cols-6 gap-2 mt-6 pt-4 border-t border-[#2A303A]/80">
                    {[
                      { name: 'E', octave: '2', freq: 82.41 },
                      { name: 'A', octave: '2', freq: 110.0 },
                      { name: 'D', octave: '3', freq: 146.83 },
                      { name: 'G', octave: '3', freq: 196.0 },
                      { name: 'B', octave: '3', freq: 246.94 },
                      { name: 'e', octave: '4', freq: 329.63 },
                    ].map((str, idx) => (
                      <button
                        key={idx}
                        onClick={() => handlePlayString(str.freq, idx)}
                        className={`p-2 rounded-lg text-center transition-all cursor-pointer ${
                          activeStringIndex === idx
                            ? 'bg-amber-500/20 border-2 border-amber-500 scale-105'
                            : 'bg-[#171A20] border border-[#2A303A] hover:border-amber-500/50'
                        }`}
                      >
                        <span className={`block text-xs font-bold ${activeStringIndex === idx ? 'text-amber-400' : 'text-[#F8FAFC]'}`}>
                          {str.name}
                        </span>
                        <span className="text-[9px] font-mono text-slate-400">{str.freq.toFixed(1)}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-center text-[10px] font-mono text-slate-500 mt-2">
                    Click any string button to hear synthesized acoustic tone
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Metrics Bar */}
      <section className="py-20 lg:py-24 relative z-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
            <div className="p-6 rounded-2xl bg-[#171A20] border border-[#2A303A] text-center space-y-1">
              <div className="text-4xl font-extrabold font-mono text-amber-400">30</div>
              <div className="text-sm font-bold text-[#F8FAFC]">Core Curriculum Lessons</div>
              <p className="text-xs text-slate-400">From guitar anatomy to playing your first full song performance.</p>
            </div>

            <div className="p-6 rounded-2xl bg-[#171A20] border border-[#2A303A] text-center space-y-1">
              <div className="text-4xl font-extrabold font-mono text-emerald-400">10</div>
              <div className="text-sm font-bold text-[#F8FAFC]">Foundational Chords</div>
              <p className="text-xs text-slate-400">All essential Open Major, Minor, and Seventh grips with audio synthesis.</p>
            </div>

            <div className="p-6 rounded-2xl bg-[#171A20] border border-[#2A303A] text-center space-y-1">
              <div className="text-4xl font-extrabold font-mono text-[#F8FAFC]">100%</div>
              <div className="text-sm font-bold text-[#F8FAFC]">Server-Authoritative Progress</div>
              <p className="text-xs text-slate-400">Anti-cheat practice verification, XP idempotency, and clean streaks.</p>
            </div>
          </div>

          {/* Final Call to Action Card */}
          <div
            id="start"
            className="rounded-3xl bg-gradient-to-b from-[#171A20] to-[#11141B] border border-amber-500/40 p-8 sm:p-14 text-center max-w-4xl mx-auto shadow-2xl relative overflow-hidden"
          >
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

            <div className="space-y-6 relative z-10">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-xs font-mono font-medium">
                READY TO STRUM YOUR FIRST CHORD?
              </span>

              <h2 className="text-3xl sm:text-5xl font-black text-[#F8FAFC] tracking-tight">
                Stop Scrolling YouTube. <br />
                Start Playing Real Music.
              </h2>

              <p className="text-base sm:text-lg text-slate-400 max-w-xl mx-auto">
                Create your free account, calibrate your instrument, and clear your first lesson in under 10 minutes.
              </p>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/register"
                  className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-base text-[#0E1014] bg-amber-500 hover:bg-amber-400 transition-all shadow-[0_0_30px_rgba(245,158,11,0.4)] flex items-center justify-center gap-2 group active:scale-[0.98]"
                >
                  <span>Get Started Free</span>
                  <ArrowRight className="w-5 h-5 text-[#0E1014] group-hover:translate-x-1 transition-transform" />
                </Link>
                <a
                  href="#curriculum"
                  className="w-full sm:w-auto px-6 py-4 rounded-xl font-medium text-sm text-slate-400 hover:text-white transition-colors"
                >
                  Browse Full Course Syllabus →
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Minimalist Dark Footer */}
      <footer className="border-t border-[#2A303A] bg-[#0B0D11] relative z-10 py-12 text-sm text-slate-400">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            {/* Brand Info */}
            <div className="col-span-2 space-y-3">
              <Logo size="md" href="/" />
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                The structured, tactile web academy for beginner acoustic & electric guitarists.
              </p>
              <div className="pt-1">
                <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#171A20] border border-[#2A303A] text-[11px] font-mono text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  All Systems Operational
                </span>
              </div>
            </div>

            {/* Col 1 */}
            <div className="space-y-2">
              <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#F8FAFC]">Curriculum</h4>
              <ul className="space-y-1.5 text-xs">
                <li><Link href="/learn" className="hover:text-[#F8FAFC] transition-colors">01. Fundamentals</Link></li>
                <li><Link href="/library" className="hover:text-[#F8FAFC] transition-colors">02. Basic Chords</Link></li>
                <li><Link href="/practice" className="hover:text-[#F8FAFC] transition-colors">03. Chord Transitions</Link></li>
                <li><Link href="/learn" className="hover:text-[#F8FAFC] transition-colors">04. Rhythm & Strumming</Link></li>
                <li><Link href="/learn" className="hover:text-[#F8FAFC] transition-colors">05. Music Theory</Link></li>
              </ul>
            </div>

            {/* Col 2 */}
            <div className="space-y-2">
              <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#F8FAFC]">Utilities</h4>
              <ul className="space-y-1.5 text-xs">
                <li><Link href="/practice" className="hover:text-[#F8FAFC] transition-colors">DSP Audio Metronome</Link></li>
                <li><Link href="/tuner" className="hover:text-[#F8FAFC] transition-colors">Microphone Tuner</Link></li>
                <li><Link href="/library" className="hover:text-[#F8FAFC] transition-colors">Interactive Fretboard</Link></li>
                <li><Link href="/library" className="hover:text-[#F8FAFC] transition-colors">Chord Library (SVG)</Link></li>
              </ul>
            </div>

            {/* Col 3 */}
            <div className="space-y-2">
              <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#F8FAFC]">Platform</h4>
              <ul className="space-y-1.5 text-xs">
                <li><Link href="/login" className="hover:text-[#F8FAFC] transition-colors">Learner Sign In</Link></li>
                <li><Link href="/register" className="hover:text-[#F8FAFC] transition-colors">Free Registration</Link></li>
                <li><Link href="/privacy" className="hover:text-[#F8FAFC] transition-colors">Privacy Policy</Link></li>
                <li><Link href="/help" className="hover:text-[#F8FAFC] transition-colors">Help Center</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-[#2A303A]/70 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 font-mono gap-4">
            <div>
              © 2026 FretFlow Inc. Built with Next.js 16, Web Audio API & Tailwind CSS v4.
            </div>
            <div className="flex items-center gap-4">
              <span className="hover:text-slate-300">WCAG 2.2 AA Verified</span>
              <span>•</span>
              <span className="hover:text-slate-300">PostgreSQL Atomic Ledgers</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
