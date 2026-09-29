'use client';

import React, { useState, useEffect } from 'react';
import {
  LifeBuoy,
  Search,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  Send,
  HelpCircle,
  Cpu,
  Sparkles,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface FAQItem {
  id: string;
  tag: string;
  question: string;
  answer: string;
  tip?: string;
  extra?: React.ReactNode;
}

const FAQS: FAQItem[] = [
  {
    id: 'faq-1',
    tag: 'TUNER & DSP',
    question: 'How to tune low E string with the Web Audio Tuner?',
    answer:
      'Pluck with your thumb or a heavy pick near the 12th fret to encourage a clean, round fundamental frequency (82.4 Hz). Ensure ambient room noise is under 45 dB, and allow 1 to 2 seconds for the autocorrelation DSP engine to isolate the fundamental pitch from overtone harmonics.',
    tip: 'Avoid resting your palm on the bridge or letting adjacent strings vibrate sympathetically.',
  },
  {
    id: 'faq-2',
    tag: 'CHORD CADENCE',
    question: 'Why is my chord transition drill not recognizing clean C to G switches?',
    answer:
      'The cadence detector tracks clean chord attacks within a ±40ms precision window. Ensure all fretted strings ring clearly without muting from neighboring fingers. Use the acoustic chord plucker in the Chord Vault to compare your attack clarity.',
    tip: 'Keep your thumb anchored on the back center of the guitar neck to arch your knuckles over the fretboard.',
  },
  {
    id: 'faq-3',
    tag: 'STREAKS & XP',
    question: 'How does the cryptographic activity ledger verify my practice streaks?',
    answer:
      'Practice sessions are recorded in an immutable event ledger. When you practice in the Focus Room for at least the minimum anti-cheat threshold (3 minutes), your browser attests the session with SHA-256 session integrity tokens.',
    tip: 'Pausing the timer or leaving the tab active without playing stops the verified session counter.',
  },
  {
    id: 'faq-4',
    tag: 'AUDIO ENGINE',
    question: 'Why do I hear a delay or latency when using headphones?',
    answer:
      'Bluetooth audio devices introduce 150-250ms hardware latency, which conflicts with real-time pitch feedback. For best results, use wired headphones or device built-in speakers while the Web Audio API runs in low-latency interactive mode.',
    tip: 'Check your browser tab sound permissions if audio is muted or suspended.',
  },
];

export default function StudentHelpPage() {
  const [activeFaq, setActiveFaq] = useState<string | null>('faq-1');
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState<'AUDIO_DSP' | 'CURRICULUM' | 'ACCOUNT' | 'CONTENT_BUG'>('AUDIO_DSP');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [diagnostics, setDiagnostics] = useState<{
    userAgent: string;
    audioSampleRate: number;
    audioContextState: string;
    platform: string;
    screenResolution: string;
  } | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submittedTicketId, setSubmittedTicketId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Auto-collect diagnostic telemetry on mount
  useEffect(() => {
    let ignore = false;

    async function initDiagnostics() {
      let sampleRate = 48000;
      let state = 'running';

      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const tempCtx = new AudioCtx();
          sampleRate = tempCtx.sampleRate;
          state = tempCtx.state;
          await tempCtx.close().catch(() => null);
        }
      } catch {
        // AudioContext unavailable
      }

      try {
        const res = await fetch('/api/auth/me');
        const json = await res.json();
        if (!ignore && json.data) {
          setStudentName(json.data.name || '');
          setStudentEmail(json.data.email || '');
        }
      } catch {
        // user details optional
      }

      if (!ignore) {
        setDiagnostics({
          userAgent: navigator.userAgent,
          audioSampleRate: sampleRate,
          audioContextState: state,
          platform: navigator.platform || 'Unknown OS',
          screenResolution: `${window.innerWidth}x${window.innerHeight}`,
        });
      }
    }

    initDiagnostics();
    return () => {
      ignore = true;
    };
  }, []);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError('Please provide a subject title and problem description.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          category,
          priority,
          studentName,
          studentEmail,
          telemetry: diagnostics,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to submit support request.');
      }

      setSubmittedTicketId(data.data?.ticket?.id || 'T-SUCCESS');
      setTitle('');
      setDescription('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error submitting ticket.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredFaqs = FAQS.filter(
    (f) =>
      f.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.tag.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full max-w-7xl mx-auto space-y-12">
      {/* Hero Section */}
      <section className="relative w-full overflow-hidden bg-[#121418] rounded-2xl p-6 sm:p-10 border border-[#2A303A] shadow-lg">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-6 max-w-3xl">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              Audio Lab &amp; Learner Support Systems
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-100 tracking-tight">
            FretFlow Help &amp; Guitar Support Desk
          </h1>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
            Browse immediate troubleshooting answers or connect directly with our audio engineering and guitar coaching staff.
          </p>

          {/* Search Bar */}
          <div className="relative w-full">
            <Search className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tuning issues, chord errors, audio pitch detection, or streaks..."
              className="w-full h-12 bg-[#0E1014] border border-[#2A303A] rounded-xl pl-12 pr-16 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
            />
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded bg-[#171A20] border border-[#2A303A] font-mono text-[11px] text-slate-500">
              ⌘K
            </div>
          </div>
        </div>
      </section>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN: Precision FAQs (6 Cols) */}
        <div className="lg:col-span-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <HelpCircle className="w-5 h-5 text-amber-400" />
              <h2 className="text-xl font-bold text-slate-100">Precision FAQs</h2>
            </div>
            <span className="font-mono text-xs text-slate-400 bg-[#171A20] px-2.5 py-1 rounded border border-[#2A303A]">
              {filteredFaqs.length} Articles
            </span>
          </div>

          <div className="space-y-3">
            {filteredFaqs.map((faq) => {
              const isOpen = activeFaq === faq.id;
              return (
                <Card
                  key={faq.id}
                  className="bg-[#171A20] border-[#2A303A] overflow-hidden transition-all duration-200"
                >
                  <button
                    onClick={() => setActiveFaq(isOpen ? null : faq.id)}
                    className="w-full p-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-bold text-amber-400">{faq.id.replace('faq-', '0')}</span>
                      <div>
                        <span className="inline-block px-1.5 py-0.5 rounded bg-[#0E1014] text-amber-400 font-mono text-[10px] font-bold border border-amber-500/20 mb-1">
                          {faq.tag}
                        </span>
                        <h3 className="text-sm font-semibold text-slate-200">{faq.question}</h3>
                      </div>
                    </div>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-amber-400 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 space-y-3 text-xs text-slate-400 pl-10 border-t border-[#2A303A]/40">
                      <p className="leading-relaxed">{faq.answer}</p>
                      {faq.tip && (
                        <div className="p-2.5 rounded-lg bg-[#0E1014] border border-[#2A303A] flex items-start gap-2 text-slate-300">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <span className="font-mono text-[11px]">{faq.tip}</span>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Submit Ticket with Auto-Diagnostics (6 Cols) */}
        <div className="lg:col-span-6 space-y-6">
          <Card className="p-6 bg-[#171A20] border-[#2A303A] shadow-md space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <LifeBuoy className="w-5 h-5 text-amber-400" />
                <div>
                  <h2 className="text-base font-bold text-slate-100">Submit Support Ticket</h2>
                  <p className="text-xs text-slate-400">Direct escalation to staff audio engineers</p>
                </div>
              </div>
              <span className="font-mono text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                SLA: &lt; 2h
              </span>
            </div>

            {submittedTicketId && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Ticket Logged Successfully: {submittedTicketId}</span>
                </div>
                <p className="text-slate-300">
                  Our staff operations desk has received your ticket and client audio diagnostics. You can monitor replies in your session inbox.
                </p>
                <button
                  onClick={() => setSubmittedTicketId(null)}
                  className="font-mono underline text-emerald-300 hover:text-white"
                >
                  Submit another inquiry
                </button>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {!submittedTicketId && (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Category & Priority Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="uppercase font-mono text-[10px] tracking-wider text-slate-400 font-semibold">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as typeof category)}
                      className="w-full h-10 bg-[#0E1014] border border-[#2A303A] rounded-lg px-3 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    >
                      <option value="AUDIO_DSP">Audio &amp; Autocorrelation Tuner</option>
                      <option value="CURRICULUM">Lesson &amp; Practice Drills</option>
                      <option value="CONTENT_BUG">Chord Diagram Bug</option>
                      <option value="ACCOUNT">Account &amp; Sessions</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="uppercase font-mono text-[10px] tracking-wider text-slate-400 font-semibold">
                      Urgency
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as typeof priority)}
                      className="w-full h-10 bg-[#0E1014] border border-[#2A303A] rounded-lg px-3 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    >
                      <option value="LOW">Low (Question / Advice)</option>
                      <option value="MEDIUM">Medium (Minor Glitch)</option>
                      <option value="HIGH">High (Blocked on Lesson)</option>
                      <option value="URGENT">Urgent (Tuner / Audio Engine Broken)</option>
                    </select>
                  </div>
                </div>

                {/* Subject Title */}
                <div className="space-y-1.5">
                  <label className="uppercase font-mono text-[10px] tracking-wider text-slate-400 font-semibold">
                    Issue Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Tuner needle frozen on D string 146 Hz"
                    required
                    className="w-full h-10 bg-[#0E1014] border border-[#2A303A] rounded-lg px-3 font-sans text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="uppercase font-mono text-[10px] tracking-wider text-slate-400 font-semibold">
                    Description &amp; Steps to Reproduce
                  </label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what you were practicing, what happened, and any browser audio error alerts..."
                    required
                    className="w-full bg-[#0E1014] border border-[#2A303A] rounded-lg p-3 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500 resize-none"
                  />
                </div>

                {/* Attached Auto-Diagnostics Telemetry Pill */}
                {diagnostics && (
                  <div className="p-3 rounded-lg bg-[#0E1014] border border-[#2A303A] space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                        <Cpu className="w-3.5 h-3.5" /> Auto-Diagnostics Attached
                      </span>
                      <span>DSP: {diagnostics.audioSampleRate} Hz</span>
                    </div>
                    <p className="text-[10px] font-mono text-slate-500 truncate">
                      {diagnostics.platform} • {diagnostics.screenResolution} • {diagnostics.audioContextState}
                    </p>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={submitting}
                  isLoading={submitting}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                >
                  <Send className="w-4 h-4 mr-2" />
                  <span>Send Help Request</span>
                </Button>
              </form>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
