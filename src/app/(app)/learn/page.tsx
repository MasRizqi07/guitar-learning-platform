'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/Button';
import { CheckCircle2, Lock, Play, Clock, Sparkles } from 'lucide-react';

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
      <div className="space-y-6 animate-pulse">
        <div className="h-40 bg-[#171A20] rounded-2xl" />
        <div className="h-64 bg-[#171A20] rounded-2xl" />
        <div className="h-64 bg-[#171A20] rounded-2xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="p-8 text-center space-y-4 border-red-500/30">
        <div className="text-3xl">⚠️</div>
        <h2 className="text-xl font-bold text-slate-100">Unable to load curriculum</h2>
        <p className="text-sm text-slate-400">{error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Course Banner */}
      <Card className="p-6 sm:p-8 border-[#2A303A] bg-gradient-to-br from-[#1A1E26] to-[#121418] relative overflow-hidden">
        <div className="max-w-2xl space-y-4 relative z-10">
          <Badge variant="primary" size="md">
            Beginner Roadmap
          </Badge>
          <h1 className="text-2xl sm:text-4xl font-bold text-slate-100 tracking-tight">
            {data.course.title}
          </h1>
          <p className="text-sm sm:text-base text-slate-300">
            {data.course.description}
          </p>

          <div className="pt-2 space-y-2">
            <div className="flex justify-between text-xs text-slate-300 font-medium">
              <span>Overall Course Completion</span>
              <span className="text-amber-400 font-semibold">
                {data.course.completedLessons} of {data.course.totalLessons} Lessons ({data.course.progressPercentage}%)
              </span>
            </div>
            <ProgressBar value={data.course.progressPercentage} size="md" />
          </div>
        </div>
      </Card>

      {/* Modules Roadmap */}
      <div className="space-y-8">
        {data.modules.map((mod) => (
          <div key={mod.id} className="space-y-4">
            {/* Module Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#2A303A]">
              <div>
                <div className="text-xs font-bold text-amber-500 tracking-wider uppercase">
                  Module {mod.order}
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-100">{mod.title}</h2>
                <p className="text-xs text-slate-400 mt-0.5">{mod.description}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Badge variant={mod.progressPercentage === 100 ? 'success' : 'neutral'} size="sm">
                  {mod.progressPercentage}% Done
                </Badge>
              </div>
            </div>

            {/* Lessons Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {mod.lessons.map((les) => {
                const isLocked = les.availability === 'LOCKED';
                const isCompleted = les.availability === 'COMPLETED';
                const isInProgress = les.availability === 'IN_PROGRESS';

                const CardContent = (
                  <Card
                    variant={isLocked ? 'default' : 'interactive'}
                    className={`p-4 sm:p-5 flex items-start gap-4 transition-all ${
                      isInProgress
                        ? 'border-amber-500/80 bg-amber-500/5 shadow-md shadow-amber-500/10'
                        : isLocked
                        ? 'opacity-60 bg-[#121418]'
                        : 'hover:border-slate-500'
                    }`}
                  >
                    {/* Status Icon */}
                    <div className="mt-0.5">
                      {isCompleted ? (
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                      ) : isInProgress ? (
                        <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/50 text-amber-400 flex items-center justify-center">
                          <Play className="w-4 h-4 fill-amber-400" />
                        </div>
                      ) : isLocked ? (
                        <div className="w-9 h-9 rounded-xl bg-[#20242C] border border-[#2A303A] text-slate-500 flex items-center justify-center">
                          <Lock className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                          <Play className="w-4 h-4" />
                        </div>
                      )}
                    </div>

                    {/* Lesson Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400">#{les.order}</span>
                        <h3 className="text-sm sm:text-base font-semibold text-slate-100 truncate">
                          {les.title}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                        {les.description}
                      </p>

                      <div className="flex items-center gap-3 mt-3 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {les.estimatedMinutes} mins
                        </span>
                        <span className="flex items-center gap-1 text-amber-400 font-medium">
                          <Sparkles className="w-3.5 h-3.5" />
                          +{les.xpReward} XP
                        </span>

                        {isCompleted && (
                          <span className="text-emerald-400 font-semibold ml-auto">
                            Completed ✓
                          </span>
                        )}
                        {isInProgress && (
                          <span className="text-amber-400 font-semibold ml-auto">
                            In Progress ({les.progress?.progressPercentage || 0}%)
                          </span>
                        )}
                        {isLocked && (
                          <span className="text-slate-500 font-medium ml-auto">
                            Prerequisites required
                          </span>
                        )}
                      </div>
                    </div>
                  </Card>
                );

                if (isLocked) {
                  return <div key={les.id}>{CardContent}</div>;
                }

                return (
                  <Link key={les.id} href={`/lessons/${les.slug}`} className="block focus:outline-none">
                    {CardContent}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
