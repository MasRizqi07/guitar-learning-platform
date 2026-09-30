'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LifeBuoy,
  ArrowLeft,
  Send,
  AlertCircle,
  Shield,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function NewSupportTicketPage() {
  const router = useRouter();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('AUDIO_TUNER');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Minimal diagnostic data
  const [diagnostics, setDiagnostics] = useState<{
    userAgent?: string;
    audioSampleRate?: number;
    audioContextState?: string;
    platform?: string;
    screenResolution?: string;
  }>({});

  useEffect(() => {
    async function collectMinimalDiagnostics() {
      let sampleRate: number | undefined;
      let contextState: string | undefined;

      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          sampleRate = ctx.sampleRate;
          contextState = ctx.state;
          ctx.close().catch(() => {});
        }
      } catch {
        // AudioContext not supported
      }

      setDiagnostics({
        userAgent: navigator.userAgent.slice(0, 200),
        audioSampleRate: sampleRate,
        audioContextState: contextState,
        platform: navigator.platform?.slice(0, 50),
        screenResolution: `${window.innerWidth}x${window.innerHeight}`,
      });
    }

    collectMinimalDiagnostics();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) {
      setError('Please fill in both the subject and problem description.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subject.trim(),
          body: body.trim(),
          category,
          telemetry: diagnostics,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to submit support ticket.');
      }

      const ticketId = data.data?.ticket?.id;
      if (ticketId) {
        router.push(`/support/${ticketId}`);
      } else {
        router.push('/support');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error submitting support ticket.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <Link
        href="/support"
        className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-amber-400 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Support History</span>
      </Link>

      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2.5">
          <LifeBuoy className="w-6 h-6 text-amber-400" />
          <span>Open Support Ticket</span>
        </h1>
        <p className="text-sm text-slate-400">
          Describe the audio tuning anomaly, lesson progress defect, or account question.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Card className="p-6 bg-[#171A20] border-[#2A303A] shadow-md space-y-5">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400" htmlFor="category-select">
              Category
            </label>
            <select
              id="category-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-11 bg-[#0E1014] border border-[#2A303A] rounded-lg px-3.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500 transition-colors font-mono"
            >
              <option value="AUDIO_TUNER">Audio &amp; Tuner DSP Hardware</option>
              <option value="CURRICULUM">Curriculum &amp; Lesson Progress</option>
              <option value="CONTENT_BUG">Content &amp; Tab Notation Bug</option>
              <option value="ACCOUNT_ACCESS">Account &amp; Security</option>
              <option value="GENERAL">General Platform Question</option>
            </select>
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400" htmlFor="ticket-subject">
              Subject
            </label>
            <input
              id="ticket-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Tuner needle frozen on Low E string"
              required
              minLength={3}
              maxLength={200}
              className="w-full h-11 bg-[#0E1014] border border-[#2A303A] rounded-lg px-4 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400" htmlFor="ticket-description">
              Problem Description
            </label>
            <textarea
              id="ticket-description"
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Please provide steps to reproduce the issue, what you expected, and what actually occurred..."
              required
              minLength={10}
              maxLength={5000}
              className="w-full bg-[#0E1014] border border-[#2A303A] rounded-lg p-4 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition-colors leading-relaxed"
            />
          </div>

          {/* Privacy Notice & Minimal Diagnostics Preview */}
          <div className="p-3.5 rounded-xl bg-[#0E1014] border border-[#2A303A] space-y-2 text-xs text-slate-400">
            <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Minimal Diagnostic Metadata</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Only standard audio engine state (sample rate: {diagnostics.audioSampleRate || '44.1k'} Hz, status: {diagnostics.audioContextState || 'idle'}) is attached to expedite troubleshooting. No audio or private data is ever recorded.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Link href="/support">
              <Button type="button" variant="outline" className="border-[#2A303A] text-slate-300">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={submitting || !subject.trim() || !body.trim()}
              isLoading={submitting}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold gap-2"
            >
              <Send className="w-4 h-4" />
              <span>Submit Ticket</span>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
