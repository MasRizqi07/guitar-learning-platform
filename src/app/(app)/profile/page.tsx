'use client';

import React, { useEffect, useState } from 'react';
import {
  User as UserIcon,
  Clock,
  Globe,
  Award,
  Flame,
  Zap,
  BookOpen,
  Check,
  AlertCircle,
  Guitar,
  Loader2,
  Calendar,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface ProfileData {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
  };
  profile: {
    currentLevel: number;
    totalXP: number;
    currentStreak: number;
    longestStreak: number;
    timezone: string;
    lastActiveDate: string | null;
  };
  onboarding: {
    experienceLevel: string;
    guitarType: string;
    dailyGoalMinutes: number;
    recommendedLevel: string;
  } | null;
  stats: {
    completedLessonsCount: number;
    totalPracticeSeconds: number;
    totalPracticeSessions: number;
    quizAttemptsCount: number;
    unlockedAchievementsCount: number;
    totalAchievementsCount: number;
  };
  achievements: Array<{
    id: string;
    code: string;
    title: string;
    description: string;
    icon: string;
    xpReward: number;
    unlocked: boolean;
    unlockedAt: string | null;
  }>;
}

const COMMON_TIMEZONES = [
  { value: 'Asia/Jakarta', label: 'Asia/Jakarta (WIB, UTC+7)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT, UTC+8)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST, UTC+9)' },
  { value: 'America/New_York', label: 'America/New York (EST/EDT, UTC-5)' },
  { value: 'America/Chicago', label: 'America/Chicago (CST/CDT, UTC-6)' },
  { value: 'America/Los_Angeles', label: 'America/Los Angeles (PST/PDT, UTC-8)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST, UTC+0)' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin (CET/CEST, UTC+1)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST, UTC+10)' },
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
];

const DAILY_TARGET_OPTIONS = [10, 15, 30, 45, 60] as const;

export default function ProfilePage() {
  const [data, setData] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('Asia/Jakarta');
  const [dailyGoal, setDailyGoal] = useState<10 | 15 | 30 | 45 | 60>(15);
  const [guitarType, setGuitarType] = useState('ACOUSTIC');

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetch('/api/profile')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load profile');
        return res.json();
      })
      .then((json) => {
        if (json.data) {
          const d = json.data as ProfileData;
          setData(d);
          setName(d.user.name);
          setTimezone(d.profile?.timezone || 'Asia/Jakarta');
          if (d.onboarding?.dailyGoalMinutes) {
            setDailyGoal(d.onboarding.dailyGoalMinutes as 10 | 15 | 30 | 45 | 60);
          }
          if (d.onboarding?.guitarType) {
            setGuitarType(d.onboarding.guitarType);
          }
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          timezone,
          dailyGoalMinutes: dailyGoal,
          guitarType,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to save settings');

      setData(json.data);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: unknown) {
      const e = err as Error;
      alert(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        <span className="text-sm text-slate-400">Loading your profile...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="p-8 text-center max-w-md mx-auto my-12 border-red-500/20 bg-red-500/5">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-100 mb-1">Failed to load profile</h2>
        <p className="text-xs text-slate-400 mb-4">{error || 'Unknown error occurred'}</p>
        <Button onClick={() => window.location.reload()} variant="outline" size="sm">
          Try Again
        </Button>
      </Card>
    );
  }

  const formatPracticeTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hours}h ${remMins}m`;
  };

  const memberSince = new Date(data.user.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header Profile Card */}
      <Card className="p-6 md:p-8 bg-[#171A20] border-[#2A303A] relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 font-black text-2xl flex items-center justify-center shadow-lg shadow-amber-500/20 border border-amber-400/40">
              {data.user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-slate-100">{data.user.name}</h1>
                <Badge variant="amber">Level {data.profile?.currentLevel || 1}</Badge>
              </div>
              <p className="text-xs text-slate-400">{data.user.email}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Joined {memberSince}
                </span>
                <span>•</span>
                <span className="capitalize">{data.user.role.toLowerCase()}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-[#121418] px-4 py-3 rounded-xl border border-[#2A303A]">
            <div className="text-center">
              <span className="text-[10px] text-slate-400 font-medium block">Streak</span>
              <span className="text-base font-bold text-amber-400 flex items-center justify-center gap-1">
                <Flame className="w-4 h-4 fill-amber-500" />
                {data.profile?.currentStreak || 0}d
              </span>
            </div>
            <div className="h-6 w-px bg-[#2A303A]" />
            <div className="text-center">
              <span className="text-[10px] text-slate-400 font-medium block">Total XP</span>
              <span className="text-base font-bold text-slate-100 flex items-center justify-center gap-1">
                <Zap className="w-4 h-4 text-amber-400" />
                {data.profile?.totalXP || 0}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Lifetime Stats Matrix */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 bg-[#171A20] border-[#2A303A]">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <BookOpen className="w-4 h-4 text-amber-400" />
            <span>Lessons Completed</span>
          </div>
          <div className="text-2xl font-bold text-slate-100">
            {data.stats.completedLessonsCount}
          </div>
        </Card>

        <Card className="p-4 bg-[#171A20] border-[#2A303A]">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Clock className="w-4 h-4 text-sky-400" />
            <span>Practice Time</span>
          </div>
          <div className="text-2xl font-bold text-slate-100">
            {formatPracticeTime(data.stats.totalPracticeSeconds)}
          </div>
        </Card>

        <Card className="p-4 bg-[#171A20] border-[#2A303A]">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Flame className="w-4 h-4 text-orange-400" />
            <span>Longest Streak</span>
          </div>
          <div className="text-2xl font-bold text-slate-100">
            {data.profile?.longestStreak || 0} days
          </div>
        </Card>

        <Card className="p-4 bg-[#171A20] border-[#2A303A]">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Award className="w-4 h-4 text-emerald-400" />
            <span>Achievements</span>
          </div>
          <div className="text-2xl font-bold text-slate-100">
            {data.stats.unlockedAchievementsCount} / {data.stats.totalAchievementsCount}
          </div>
        </Card>
      </div>

      {/* Profile Settings & Preferences Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 bg-[#171A20] border-[#2A303A]">
            <h2 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-amber-400" />
              <span>Learning Preferences</span>
            </h2>

            <form onSubmit={handleSave} className="space-y-6">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Display Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-[#121418] border border-[#2A303A] rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              {/* Daily Target Options */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Daily Practice Target</span>
                  <span className="text-amber-400 font-bold">{dailyGoal} Minutes</span>
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {DAILY_TARGET_OPTIONS.map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDailyGoal(mins)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                        dailyGoal === mins
                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                          : 'bg-[#121418] text-slate-400 hover:text-slate-200 border border-[#2A303A]'
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>

              {/* Timezone Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  <span>Your Timezone (Used for daily streaks)</span>
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full bg-[#121418] border border-[#2A303A] rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500 transition-colors"
                >
                  {COMMON_TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Guitar Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Guitar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Primary Guitar</span>
                </label>
                <select
                  value={guitarType}
                  onChange={(e) => setGuitarType(e.target.value)}
                  className="w-full bg-[#121418] border border-[#2A303A] rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500 transition-colors"
                >
                  <option value="ACOUSTIC">Acoustic Guitar</option>
                  <option value="ELECTRIC">Electric Guitar</option>
                  <option value="CLASSICAL">Classical (Nylon String)</option>
                  <option value="NO_GUITAR">No Guitar Yet</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-4 pt-2">
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    'Save Preferences'
                  )}
                </Button>

                {saveSuccess && (
                  <div className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-semibold animate-fade-in">
                    <Check className="w-4 h-4" />
                    <span>Saved successfully!</span>
                  </div>
                )}
              </div>
            </form>
          </Card>
        </div>

        {/* Achievements Column */}
        <div>
          <Card className="p-6 bg-[#171A20] border-[#2A303A] space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                <span>Achievements</span>
              </h2>
              <span className="text-xs font-semibold text-amber-400">
                {data.stats.unlockedAchievementsCount}/{data.stats.totalAchievementsCount}
              </span>
            </div>

            <div className="space-y-3">
              {data.achievements.map((ach) => (
                <div
                  key={ach.id}
                  className={`p-3.5 rounded-xl border flex items-start gap-3 transition-all ${
                    ach.unlocked
                      ? 'bg-amber-500/10 border-amber-500/30 text-slate-100'
                      : 'bg-[#121418] border-[#2A303A] text-slate-500 opacity-60'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0 ${
                      ach.unlocked ? 'bg-amber-500/20 border border-amber-500/40' : 'bg-slate-800'
                    }`}
                  >
                    {ach.unlocked ? ach.icon : '🔒'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-200">{ach.title}</span>
                      <span className="text-[10px] font-semibold text-amber-400">
                        +{ach.xpReward} XP
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                      {ach.description}
                    </p>
                    {ach.unlocked && ach.unlockedAt && (
                      <span className="text-[10px] text-emerald-400 mt-1 block">
                        ✓ Unlocked {new Date(ach.unlockedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
