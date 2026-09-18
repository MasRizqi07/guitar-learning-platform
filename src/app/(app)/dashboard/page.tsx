'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import {
  Flame,
  Clock,
  Sparkles,
  ArrowRight,
  BookOpen,
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
        <div className="h-10 bg-[#171A20] rounded-xl w-64" />
        <div className="h-44 bg-[#171A20] rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-36 bg-[#171A20] rounded-2xl" />
          <div className="h-36 bg-[#171A20] rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="p-8 text-center space-y-4 border-red-500/30">
        <div className="text-3xl">⚠️</div>
        <h2 className="text-xl font-bold text-slate-100">Unable to load dashboard</h2>
        <p className="text-sm text-slate-400">{error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </Card>
    );
  }

  const { user, profile, dailyGoal, nextAction, courseProgress, recentActivities } = data;

  return (
    <div className="space-y-8">
      {/* Top Greeting & Level Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-100">
            Welcome back, {user.name}! 🎸
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Every minute on the fretboard brings you closer to fluid playing.
          </p>
        </div>

        {/* Level & Streak Widget */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#171A20] border border-[#2A303A]">
            <Flame className="w-5 h-5 text-amber-500 fill-amber-500" />
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Streak</div>
              <div className="text-xs font-bold text-slate-100">{profile.currentStreak} Days</div>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#171A20] border border-[#2A303A]">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Level {profile.level.level}</div>
              <div className="text-xs font-bold text-amber-400">{profile.totalXP} XP</div>
            </div>
          </div>
        </div>
      </div>

      {/* PRIORITY 1: ONE CLEAR NEXT ACTION (Dominant Hero Banner) */}
      <Card className="p-6 sm:p-8 border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-[#171A20] to-[#121418] relative overflow-hidden shadow-xl shadow-amber-500/5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-xl">
            <Badge variant="primary" size="sm">
              {nextAction.badge}
            </Badge>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-100 tracking-tight">
              {nextAction.title}
            </h2>
            <p className="text-sm text-slate-300">
              {nextAction.subtitle}
            </p>
          </div>

          <Link href={nextAction.href} className="w-full md:w-auto shrink-0">
            <Button size="lg" className="w-full md:w-auto px-8 gap-2 font-bold text-slate-950">
              {nextAction.buttonText}
            </Button>
          </Link>
        </div>
      </Card>

      {/* PRIORITY 2 & 3: Daily Goal & Course Progress */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Daily Goal Card */}
        <Card className="p-5 sm:p-6 border-[#2A303A] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold text-sm text-slate-200">Daily Practice Target</h3>
            </div>
            <Badge variant={dailyGoal.goalMet ? 'success' : 'neutral'} size="sm">
              {dailyGoal.goalMet ? 'Completed ✓' : `${dailyGoal.todayMinutes}/${dailyGoal.dailyGoalMinutes} min`}
            </Badge>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Goal Progress</span>
              <span className="font-semibold text-slate-200">{dailyGoal.goalPercentage}%</span>
            </div>
            <ProgressBar value={dailyGoal.goalPercentage} variant={dailyGoal.goalMet ? 'success' : 'amber'} size="md" />
          </div>

          <div className="flex items-center justify-between pt-2 text-xs">
            <span className="text-slate-400">
              {dailyGoal.goalMet
                ? 'Daily goal completed! +10 XP awarded.'
                : `${dailyGoal.dailyGoalMinutes - dailyGoal.todayMinutes} mins remaining today.`}
            </span>
            <Link href="/practice" className="text-amber-400 hover:text-amber-300 font-semibold">
              Open Practice →
            </Link>
          </div>
        </Card>

        {/* Current Course Progress Card */}
        <Card className="p-5 sm:p-6 border-[#2A303A] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold text-sm text-slate-200">Curriculum Progress</h3>
            </div>
            <Badge variant="primary" size="sm">
              {courseProgress.completedLessons}/{courseProgress.totalLessons} Lessons
            </Badge>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Course Roadmap</span>
              <span className="font-semibold text-slate-200">{courseProgress.progressPercentage}%</span>
            </div>
            <ProgressBar value={courseProgress.progressPercentage} size="md" />
          </div>

          <div className="flex items-center justify-between pt-2 text-xs">
            <span className="text-slate-400">Beginner Guitar Fundamentals</span>
            <Link href="/learn" className="text-amber-400 hover:text-amber-300 font-semibold">
              View Roadmap →
            </Link>
          </div>
        </Card>
      </div>

      {/* PRIORITY 4: Recommended Practice Shortcuts */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Quick Practice Routines
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <Link href="/practice" className="block focus:outline-none">
            <Card variant="interactive" className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-xs">
                  ⏱️
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-100">Daily Practice</div>
                  <div className="text-[11px] text-slate-400">5-minute freeform routine</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </Card>
          </Link>

          <Link href="/practice" className="block focus:outline-none">
            <Card variant="interactive" className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-xs">
                  🔄
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-100">Chord Transitions</div>
                  <div className="text-[11px] text-slate-400">C to G, G to D drill</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </Card>
          </Link>

          <Link href="/library" className="block focus:outline-none">
            <Card variant="interactive" className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs">
                  📚
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-100">Chord Library</div>
                  <div className="text-[11px] text-slate-400">10+ chords with audio</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </Card>
          </Link>
        </div>
      </div>

      {/* PRIORITY 5: Recent Activity History */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Recent Learning Activity
          </h3>
          <Link href="/progress" className="text-xs text-amber-400 hover:text-amber-300 font-semibold">
            Full Analytics →
          </Link>
        </div>

        {recentActivities.length === 0 ? (
          <Card className="p-6 text-center text-xs text-slate-400">
            No activity yet. Start your first lesson to record progress!
          </Card>
        ) : (
          <Card className="divide-y divide-[#2A303A] border-[#2A303A] overflow-hidden">
            {recentActivities.map((act) => (
              <div key={act.id} className="p-3.5 sm:p-4 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                  <span className="font-semibold text-slate-200">
                    {act.type.replace(/_/g, ' ')}
                  </span>
                  {act.metadata?.lessonTitle && (
                    <span className="text-slate-400 truncate max-w-[200px]">
                      • {act.metadata.lessonTitle}
                    </span>
                  )}
                </div>
                <span className="text-slate-400 text-[11px] shrink-0">
                  {new Date(act.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}
