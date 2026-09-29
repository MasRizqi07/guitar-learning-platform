'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Check,
  Lock,
  Play,
  Clock,
  Sparkles,
  Flame,
  Zap,
  ArrowRight,
} from 'lucide-react';


interface LessonItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  estimatedMinutes: number;
  xpReward: number;
  order: number;
  availability: 'COMPLETED' | 'IN_PROGRESS' | 'AVAILABLE' | 'LOCKED';
  progress?: {
    status: string;
    progressPercentage: number;
  } | null;
}

interface ModuleItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  order: number;
  estimatedMinutes: number;
  progressPercentage: number;
  lessons: LessonItem[];
}

interface CurriculumData {
  course: {
    id: string;
    title: string;
    slug: string;
    description: string;
    totalLessons: number;
    completedLessons: number;
    progressPercentage: number;
  };
  modules: ModuleItem[];
}

export default function LearnPage() {
  const [data, setData] = useState<CurriculumData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/learning-path')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load learning path');
        return res.json();
      })
      .then((resData) => setData(resData.data))
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
        <div className="h-44 bg-[#171A20] rounded-2xl" />
        <div className="h-64 bg-[#171A20] rounded-2xl" />
        <div className="h-64 bg-[#171A20] rounded-2xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-md mx-auto p-8 rounded-2xl bg-[#171A20] border border-red-500/30 text-center space-y-4">
        <div className="text-3xl">⚠️</div>
        <h2 className="text-xl font-bold text-[#F8FAFC]">Unable to load curriculum</h2>
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

  const { course, modules } = data;

  // Calculate circular stroke values
  const radius = 18;
  const circumference = 2 * Math.PI * radius; // ~113.1
  const strokeOffset = circumference - (course.progressPercentage / 100) * circumference;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* 1. Breadcrumb & Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-400 uppercase tracking-wider">
        <div className="flex items-center gap-1.5">
          <Link href="/dashboard" className="hover:text-amber-400 transition-colors">
            Roadmap
          </Link>
          <span className="text-slate-600">/</span>
          <span className="text-[#F8FAFC] font-semibold">{course.title}</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#171A20] border border-[#2A303A] text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono text-xs">Standard E A D G B E</span>
        </div>
      </div>

      {/* 2. Course Overview Header Panel */}
      <div className="rounded-2xl bg-[#171A20] border border-[#2A303A] p-6 sm:p-8 relative overflow-hidden shadow-xl">
        <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col gap-6 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <span className="text-[11px] font-mono uppercase tracking-widest text-amber-400 font-semibold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 inline-block">
                Curriculum Path
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F8FAFC] tracking-tight">
                {course.title}
              </h1>
              <p className="text-sm text-slate-300 leading-relaxed">
                {course.description}
              </p>
            </div>

            {/* Course Progress Circular Badge */}
            <div className="flex items-center gap-4 bg-[#20242C]/70 px-5 py-3.5 rounded-xl border border-[#2A303A] self-start md:self-auto shrink-0">
              <div className="text-right">
                <span className="text-[10px] font-mono uppercase text-slate-400 block">Lessons Mastered</span>
                <span className="text-xl font-mono font-extrabold text-[#F8FAFC]">
                  {course.completedLessons} <span className="text-slate-500 font-normal text-sm">/ {course.totalLessons}</span>
                </span>
              </div>
              <div className="relative w-12 h-12 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 44 44">
                  <circle cx="22" cy="22" fill="none" r={radius} stroke="#2A303A" strokeWidth="4.5" />
                  <circle
                    cx="22"
                    cy="22"
                    fill="none"
                    r={radius}
                    stroke="#F59E0B"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeOffset}
                    strokeLinecap="round"
                    strokeWidth="4.5"
                    className="transition-all duration-700 ease-out"
                  />
                </svg>
                <span className="absolute font-mono text-[11px] text-amber-400 font-bold">
                  {course.progressPercentage}%
                </span>
              </div>
            </div>
          </div>

          {/* Fast Stats Telemetry Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#2A303A]/60">
            <div className="flex items-center gap-3 bg-[#20242C]/50 rounded-xl p-3 border border-[#2A303A]">
              <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Flame className="w-5 h-5 fill-amber-500" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-400">Streak Cadence</span>
                <span className="text-xs font-mono font-bold text-[#F8FAFC] block">Daily Active 🔥</span>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-[#20242C]/50 rounded-xl p-3 border border-[#2A303A]">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-400">Server Verified</span>
                <span className="text-xs font-mono font-bold text-[#F8FAFC] block">Idempotent XP</span>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-[#20242C]/50 rounded-xl p-3 border border-[#2A303A]">
              <div className="w-9 h-9 rounded-lg bg-[#20242C] border border-[#2A303A] flex items-center justify-center text-slate-300">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-400">Pacing</span>
                <span className="text-xs font-mono font-bold text-[#F8FAFC] block">15 Min / Day</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Modules List with Vertical Spine */}
      <div className="space-y-12">
        {modules.map((mod) => {
          const isModuleComplete = mod.progressPercentage === 100;
          return (
            <div key={mod.id} className="space-y-6">
              {/* Module Header Card */}
              <div
                className={`rounded-2xl border p-5 sm:p-6 transition-all ${
                  isModuleComplete
                    ? 'bg-[#171A20]/80 border-emerald-500/40'
                    : 'bg-[#171A20] border-amber-500/40 shadow-[0_0_24px_rgba(245,158,11,0.08)]'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-[#2A303A]/70 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-500 text-[#0E1014]">
                        Module {mod.order}
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        {mod.lessons.length} Lessons • ~{mod.estimatedMinutes} mins
                      </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-[#F8FAFC]">
                      {mod.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
                      {mod.description}
                    </p>
                  </div>

                  <div className="flex flex-col gap-1 min-w-[140px] shrink-0">
                    <div className="flex justify-between items-center text-xs font-mono">
                      <span className="text-slate-400">Module Progress</span>
                      <span className="text-amber-400 font-bold">{mod.progressPercentage}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#0E1014] overflow-hidden border border-white/5">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all duration-500"
                        style={{ width: `${mod.progressPercentage}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-400 pt-3">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      {mod.lessons.filter((l) => l.availability === 'COMPLETED').length} Completed
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                      {mod.lessons.filter((l) => l.availability === 'IN_PROGRESS' || l.availability === 'AVAILABLE').length} Active
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-slate-600" />
                      {mod.lessons.filter((l) => l.availability === 'LOCKED').length} Locked
                    </span>
                  </div>
                </div>
              </div>

              {/* Vertical Interactive Learning Path Nodes */}
              <div className="relative flex flex-col py-2 pl-4 sm:pl-6">
                {/* Central Dynamic Path Spine */}
                <div className="absolute left-10 sm:left-14 top-8 bottom-8 w-[2px] bg-[#2A303A] pointer-events-none -translate-x-1/2" />

                <div className="space-y-6 z-10">
                  {mod.lessons.map((les) => {
                    const isLocked = les.availability === 'LOCKED';
                    const isCompleted = les.availability === 'COMPLETED';
                    const isInProgress = les.availability === 'IN_PROGRESS';
                    const isAvailable = les.availability === 'AVAILABLE';

                    return (
                      <div key={les.id} className="flex items-start gap-4 sm:gap-6 group">
                        {/* Anchor Node Marker */}
                        <div className="relative flex items-center justify-center shrink-0 w-12 h-12 sm:w-16 sm:h-16">
                          {isCompleted ? (
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#171A20] border-2 border-emerald-400 flex items-center justify-center text-emerald-400 shadow-[0_0_16px_rgba(74,225,118,0.35)]">
                              <Check className="w-5 h-5 stroke-[2.5]" />
                            </div>
                          ) : isInProgress ? (
                            <div className="relative flex items-center justify-center">
                              <div className="absolute w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-amber-500/20 animate-ping" />
                              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#171A20] border-2 border-amber-500 flex items-center justify-center text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.6)]">
                                <Play className="w-4 h-4 fill-amber-400 ml-0.5" />
                              </div>
                            </div>
                          ) : isAvailable ? (
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#20242C] border-2 border-slate-500 group-hover:border-amber-400 text-slate-300 group-hover:text-amber-400 flex items-center justify-center transition-colors">
                              <Play className="w-4 h-4 ml-0.5" />
                            </div>
                          ) : (
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#121418] border border-[#2A303A] text-slate-600 flex items-center justify-center">
                              <Lock className="w-4 h-4" />
                            </div>
                          )}

                          {isCompleted && (
                            <span className="absolute -bottom-2 font-mono text-[9px] text-emerald-400 font-bold bg-[#0E1014] px-1 rounded border border-emerald-500/40">
                              DONE
                            </span>
                          )}
                          {isInProgress && (
                            <span className="absolute -bottom-2 font-mono text-[9px] text-[#0E1014] bg-amber-500 font-bold px-1.5 rounded-full shadow">
                              LIVE
                            </span>
                          )}
                        </div>

                        {/* Lesson Content Card */}
                        <div
                          className={`flex-1 rounded-xl p-4 sm:p-5 transition-all border ${
                            isCompleted
                              ? 'bg-[#171A20]/90 border-emerald-500/30 hover:border-emerald-500/60 shadow-md'
                              : isInProgress
                              ? 'bg-[#1C2028] border-2 border-amber-500/80 shadow-[0_4px_24px_rgba(245,158,11,0.15)]'
                              : isAvailable
                              ? 'bg-[#171A20] border-[#2A303A] hover:border-slate-500 hover:bg-[#20242C]'
                              : 'bg-[#121418]/60 border-[#2A303A]/40 opacity-50'
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-[#20242C] text-slate-300 border border-[#2A303A]">
                                Lesson {mod.order}.{les.order}
                              </span>
                              {isCompleted && (
                                <span className="text-[10px] font-mono uppercase text-emerald-400 font-semibold">
                                  ✓ Mastered
                                </span>
                              )}
                              {isInProgress && (
                                <span className="text-[10px] font-mono uppercase text-amber-400 font-bold">
                                  Active Target
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {les.estimatedMinutes} mins
                              </span>
                              <span className="flex items-center gap-1 text-amber-400 font-semibold">
                                <Sparkles className="w-3.5 h-3.5" />
                                +{les.xpReward} XP
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-1 max-w-xl">
                              <h3 className="text-base sm:text-lg font-bold text-[#F8FAFC]">
                                {les.title}
                              </h3>
                              <p className="text-xs sm:text-sm text-slate-400 line-clamp-2">
                                {les.description}
                              </p>
                            </div>

                            {/* Action Button */}
                            <div className="shrink-0 self-start sm:self-center">
                              {isLocked ? (
                                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#20242C] text-xs font-mono text-slate-500 border border-[#2A303A]">
                                  <Lock className="w-3.5 h-3.5" /> Locked
                                </span>
                              ) : (
                                <Link
                                  href={`/lessons/${les.slug}`}
                                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                    isInProgress
                                      ? 'bg-amber-500 hover:bg-amber-400 text-[#0E1014] shadow-md shadow-amber-500/20'
                                      : isCompleted
                                      ? 'bg-[#20242C] hover:bg-slate-700 text-[#F8FAFC] border border-[#2A303A]'
                                      : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40'
                                  }`}
                                >
                                  <span>{isCompleted ? 'Review Lesson' : isInProgress ? 'Resume Lesson' : 'Start Lesson'}</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
