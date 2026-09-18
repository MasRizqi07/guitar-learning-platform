import React from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Music,
  CheckCircle2,
  Award,
  Flame,
  ArrowRight,
  Sparkles,
  Volume2,
  ChevronRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0E1014] text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950 font-sans">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#0E1014]/90 border-b border-[#2A303A]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-xl">
              🎸
            </div>
            <div>
              <span className="font-bold text-base text-slate-100 tracking-tight">Guitar Learning</span>
              <span className="text-[11px] text-amber-400 block font-medium">Beginner Platform</span>
            </div>
          </Link>

          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl shadow-lg shadow-amber-500/20 transition-all"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-28 border-b border-[#2A303A]/60">
        <div className="absolute inset-0 -z-10 flex items-center justify-center">
          <div className="w-[600px] h-[350px] bg-amber-500/10 blur-[130px] rounded-full pointer-events-none" />
          <div className="w-[400px] h-[250px] bg-blue-500/5 blur-[100px] rounded-full pointer-events-none" />
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-semibold tracking-wide">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Structured Roadmap for Absolute Beginners</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-50 leading-tight md:leading-tight">
            Stop Guessing. <br />
            <span className="bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 bg-clip-text text-transparent">
              Learn Guitar Step-by-Step.
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-400 leading-relaxed">
            No more scattered YouTube videos or confusing tabs. Follow a proven, progressive 30-lesson
            curriculum with interactive chord voicings, guided practice timers, and instant quizzes.
          </p>

          {/* Primary Call to Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              href="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-base shadow-xl shadow-amber-500/25 transition-all hover:scale-[1.02]"
            >
              <span>Start Learning Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-[#171A20] hover:bg-[#20242C] border border-[#2A303A] text-slate-200 font-semibold text-base transition-all"
            >
              <span>Resume Your Progress</span>
            </Link>
          </div>

          {/* Trust Highlights */}
          <div className="pt-8 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Zero Prior Experience Needed</span>
            </div>
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-amber-400" />
              <span>Real Acoustic String Audio</span>
            </div>
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-400" />
              <span>Streak & Daily Goal Habits</span>
            </div>
          </div>
        </div>
      </section>

      {/* The Core Product Loop */}
      <section className="py-16 md:py-24 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center space-y-3 mb-12">
          <h2 className="text-xs font-bold uppercase tracking-widest text-amber-400">
            The Proven Beginner Loop
          </h2>
          <p className="text-2xl sm:text-3xl font-bold text-slate-100">
            Learn. Practice. Quiz. Progress. Repeat.
          </p>
          <p className="text-sm text-slate-400 max-w-xl mx-auto">
            Every step is designed to build muscle memory without frustration.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            {
              step: '01',
              title: 'Learn',
              desc: 'Bite-sized visual lessons with clear hand positioning and technique breakdowns.',
              icon: BookOpen,
              color: 'text-amber-400',
              bg: 'bg-amber-500/10',
            },
            {
              step: '02',
              title: 'Practice',
              desc: 'Focused practice room with synchronized metronome and chord transition prompts.',
              icon: Music,
              color: 'text-sky-400',
              bg: 'bg-sky-500/10',
            },
            {
              step: '03',
              title: 'Quiz',
              desc: 'Interactive chord recognition and theory checks to lock knowledge into memory.',
              icon: CheckCircle2,
              color: 'text-emerald-400',
              bg: 'bg-emerald-500/10',
            },
            {
              step: '04',
              title: 'Progress',
              desc: 'Earn XP, unlock badges, maintain streaks, and watch your skills grow.',
              icon: Award,
              color: 'text-purple-400',
              bg: 'bg-purple-500/10',
            },
            {
              step: '05',
              title: 'Continue',
              desc: 'Always know your exact next lesson. Never wonder what to practice again.',
              icon: Zap,
              color: 'text-orange-400',
              bg: 'bg-orange-500/10',
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="p-5 rounded-2xl bg-[#171A20] border border-[#2A303A] hover:border-amber-500/30 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-mono font-bold text-slate-500">{item.step}</span>
                    <div className={`w-9 h-9 rounded-xl ${item.bg} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${item.color}`} />
                    </div>
                  </div>
                  <h3 className="font-bold text-base text-slate-100 mb-1.5">{item.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Curriculum Preview */}
      <section className="py-16 bg-[#121418] border-y border-[#2A303A]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
                Course Roadmap
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-100 mt-1">
                Beginner Guitar Fundamentals
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                6 structured modules taking you from holding a pick to playing your first full song.
              </p>
            </div>
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-400 hover:text-amber-300"
            >
              <span>Explore full syllabus</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                num: '1',
                title: 'Guitar Fundamentals',
                lessons: '5 Lessons',
                desc: 'Anatomy, proper posture, picking technique, and standard tuning.',
                badge: 'Level 1',
              },
              {
                num: '2',
                title: 'Essential Open Chords',
                lessons: '5 Lessons',
                desc: 'C Major, G Major, D Major, A Minor, and E Minor with clean fingerings.',
                badge: 'Level 2',
              },
              {
                num: '3',
                title: 'Chord Transitions',
                lessons: '5 Lessons',
                desc: 'Smooth switching techniques and muscle memory for popular progressions.',
                badge: 'Level 3',
              },
              {
                num: '4',
                title: 'Rhythm & Strumming',
                lessons: '5 Lessons',
                desc: 'Timing, downstrokes, upstrokes, and essential strumming grooves.',
                badge: 'Level 4',
              },
              {
                num: '5',
                title: 'Music Theory Basics',
                lessons: '5 Lessons',
                desc: 'Musical alphabet, major vs minor emotional feel, and 4-chord songs.',
                badge: 'Level 5',
              },
              {
                num: '6',
                title: 'Your First Song',
                lessons: '5 Lessons',
                desc: 'Put chords, transitions, and rhythm together to play your first complete song.',
                badge: 'Capstone',
              },
            ].map((module) => (
              <div
                key={module.num}
                className="p-6 rounded-2xl bg-[#171A20] border border-[#2A303A] hover:border-[#38404E] transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
                      Module {module.num}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">{module.lessons}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-100 mb-2">{module.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{module.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action Footer Banner */}
      <section className="py-20 max-w-4xl mx-auto px-4 text-center">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-[#1C2028] to-[#121418] border border-[#2A303A] space-y-6">
          <div className="text-3xl">🎸</div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-100 tracking-tight">
            Ready to Play Your First Chord Today?
          </h2>
          <p className="text-slate-400 text-sm sm:text-base max-w-md mx-auto">
            Join thousands of beginners building clean technique, consistent habits, and confidence.
          </p>
          <div>
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-base shadow-xl shadow-amber-500/30 transition-all hover:scale-[1.02]"
            >
              <span>Create Free Account</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-[#2A303A] py-8 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span>🎸</span>
            <span className="font-semibold text-slate-400">Guitar Learning Platform for Beginners</span>
          </div>
          <div>Server-Authoritative • Accessible • Progressive Learning</div>
          <div>© {new Date().getFullYear()} All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
