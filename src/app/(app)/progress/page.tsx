'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import {
  Flame,
  Clock,
  Sparkles,
  BookOpen,
  Trophy,
  Award,
  History,
  CheckCircle2,
} from 'lucide-react';

interface ProgressData {
  profile: {
    totalXP: number;
    currentStreak: number;
    longestStreak: number;
    level: {
      level: number;
      currentXP: number;
      nextLevelXP: number;
      progressPercent: number;
    };
  };
  curriculum: {
    totalLessons: number;
    completedLessons: number;
    progressPercentage: number;
    modules: {
      id: string;
      title: string;
      order: number;
      progressPercentage: number;
    }[];
  };
  practice: {
    totalMinutes: number;
    sessionsCount: number;
  };
  quizzes: {
    attemptsCount: number;
    passedCount: number;
    averageScore: number;
  };
  achievements: {
    id: string;
    code: string;
    name: string;
    description: string;
    icon: string;
    xpReward: number;
    isUnlocked: boolean;
    unlockedAt: string | null;
  }[];
  xpLedger: {
    id: string;
    type: string;
    amount: number;
    createdAt: string;
    referenceType?: string | null;
  }[];
}

export default function ProgressPage() {
  const [data, setData] = useState<ProgressData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/progress')
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error?.message || 'Failed to load progress data');
        return body.data;
      })
      .then((progData: ProgressData) => setData(progData))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Error'))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-[#171A20] rounded-xl w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-[#171A20] rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="p-8 text-center space-y-4 border-red-500/30">
        <div className="text-3xl">⚠️</div>
        <h2 className="text-xl font-bold text-slate-100">Unable to load progress</h2>
        <p className="text-sm text-slate-400">{error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </Card>
    );
  }

  const { profile, curriculum, practice, quizzes, achievements, xpLedger } = data;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <Badge variant="primary" size="md">Learning Analytics</Badge>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 mt-1">Your Guitar Progress</h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Measurable milestones and authentic metrics from your practice sessions.
        </p>
      </div>

      {/* 4 Metric Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Streak */}
        <Card className="p-5 border-[#2A303A] space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Learning Streak</span>
            <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-100">{profile.currentStreak} Days</div>
          <div className="text-[11px] text-slate-400">Best: {profile.longestStreak} days</div>
        </Card>

        {/* Metric 2: Level & XP */}
        <Card className="p-5 border-[#2A303A] space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Current Level</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-amber-400">Level {profile.level.level}</div>
          <div className="text-[11px] text-slate-400">{profile.totalXP} Total XP</div>
        </Card>

        {/* Metric 3: Total Practice */}
        <Card className="p-5 border-[#2A303A] space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Verified Practice</span>
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-100">{practice.totalMinutes} Mins</div>
          <div className="text-[11px] text-slate-400">{practice.sessionsCount} sessions completed</div>
        </Card>

        {/* Metric 4: Lessons Done */}
        <Card className="p-5 border-[#2A303A] space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Lessons Completed</span>
            <BookOpen className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-100">
            {curriculum.completedLessons}/{curriculum.totalLessons}
          </div>
          <div className="text-[11px] text-slate-400">{curriculum.progressPercentage}% of roadmap</div>
        </Card>
      </div>

      {/* Level XP Progress Bar Card */}
      <Card className="p-6 border-[#2A303A] space-y-3">
        <div className="flex justify-between items-center text-xs font-semibold">
          <span className="text-slate-200">Level {profile.level.level} Progression</span>
          <span className="text-amber-400">
            {profile.totalXP} / {profile.level.nextLevelXP} XP ({profile.level.progressPercent}%)
          </span>
        </div>
        <ProgressBar value={profile.level.progressPercent} size="md" />
        <div className="text-[11px] text-slate-400">
          Earn {profile.level.nextLevelXP - profile.totalXP} more XP to reach Level {profile.level.level + 1}.
        </div>
      </Card>

      {/* Module Breakdown & Quiz Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Module Breakdown */}
        <Card className="p-6 border-[#2A303A] space-y-4">
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-amber-400" /> Module Completion
          </h2>
          <div className="space-y-3">
            {curriculum.modules.map((m) => (
              <div key={m.id} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-medium">
                    Module {m.order}: {m.title}
                  </span>
                  <span className="font-bold text-slate-400">{m.progressPercentage}%</span>
                </div>
                <ProgressBar
                  value={m.progressPercentage}
                  variant={m.progressPercentage === 100 ? 'success' : 'primary'}
                  size="sm"
                />
              </div>
            ))}
          </div>
        </Card>

        {/* Quiz Performance */}
        <Card className="p-6 border-[#2A303A] space-y-4">
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" /> Quiz Evaluation
          </h2>
          <div className="grid grid-cols-3 gap-3 text-center py-2">
            <div className="p-3 bg-[#121418] rounded-xl border border-[#2A303A]">
              <div className="text-xs text-slate-400">Attempts</div>
              <div className="text-xl font-bold text-slate-100 mt-1">{quizzes.attemptsCount}</div>
            </div>
            <div className="p-3 bg-[#121418] rounded-xl border border-[#2A303A]">
              <div className="text-xs text-slate-400">Passed</div>
              <div className="text-xl font-bold text-emerald-400 mt-1">{quizzes.passedCount}</div>
            </div>
            <div className="p-3 bg-[#121418] rounded-xl border border-[#2A303A]">
              <div className="text-xs text-slate-400">Avg Score</div>
              <div className="text-xl font-bold text-amber-400 mt-1">{quizzes.averageScore}%</div>
            </div>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Quizzes test your conceptual understanding of anatomy, chords, and timing. 60% passing score is required.
          </p>
        </Card>
      </div>

      {/* Achievements Showcase */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-400" /> Achievements ({achievements.filter((a) => a.isUnlocked).length}/{achievements.length})
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {achievements.map((ach) => (
            <Card
              key={ach.id}
              className={`p-4 flex items-start gap-3.5 border transition-all ${
                ach.isUnlocked
                  ? 'bg-amber-500/5 border-amber-500/40 shadow-sm'
                  : 'bg-[#121418] border-[#2A303A] opacity-50'
              }`}
            >
              <div className="text-2xl mt-0.5">{ach.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-100">{ach.name}</h3>
                  {ach.isUnlocked && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{ach.description}</p>
                <div className="mt-2 text-[11px] text-amber-400 font-medium">
                  +{ach.xpReward} XP {ach.isUnlocked ? '• Unlocked' : '• Locked'}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* XP Transaction Ledger */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <History className="w-4 h-4 text-amber-400" /> XP Transaction Ledger
        </h2>
        <Card className="divide-y divide-[#2A303A] border-[#2A303A] overflow-hidden">
          {xpLedger.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No transactions recorded yet. Complete lessons and practice to earn XP!
            </div>
          ) : (
            xpLedger.map((tx) => (
              <div key={tx.id} className="p-3.5 sm:p-4 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="font-semibold text-slate-200">
                    {tx.type.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-bold text-amber-400">+{tx.amount} XP</span>
                  <span className="text-slate-500 text-[11px]">
                    {new Date(tx.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </Card>
      </div>
    </div>
  );
}
