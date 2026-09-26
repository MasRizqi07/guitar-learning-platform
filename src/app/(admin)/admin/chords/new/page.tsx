'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Music, Save } from 'lucide-react';
import { ChordDiagram } from '@/components/guitar/ChordDiagram';

export default function NewChordPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [type, setType] = useState('MAJOR');
  const [difficulty, setDifficulty] = useState('BEGINNER');
  const [description, setDescription] = useState('');

  // 6 strings from low E (6th) to high E (1st)
  const [strings, setStrings] = useState<(number | string)[]>(['X', 3, 2, 0, 1, 0]);
  const [fingers, setFingers] = useState<(number | string)[]>([0, 3, 2, 0, 1, 0]);
  const [baseFret, setBaseFret] = useState(1);
  const [notesStr, setNotesStr] = useState('C, E, G');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slug) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
      );
    }
  };

  const handleStringChange = (index: number, val: string) => {
    const next = [...strings];
    if (val.toUpperCase() === 'X') {
      next[index] = 'X';
    } else {
      const num = parseInt(val, 10);
      next[index] = isNaN(num) ? 0 : num;
    }
    setStrings(next);
  };

  const handleFingerChange = (index: number, val: string) => {
    const next = [...fingers];
    const num = parseInt(val, 10);
    next[index] = isNaN(num) ? 0 : num;
    setFingers(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);

      const parsedNotes = notesStr
        .split(',')
        .map((n) => n.trim())
        .filter(Boolean);

      const res = await fetch('/api/admin/chords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          slug,
          type,
          difficulty,
          description,
          notes: parsedNotes,
          diagramData: {
            strings,
            fingers,
            baseFret: Number(baseFret),
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to create chord');
      }

      router.push('/admin/chords');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create chord');
    } finally {
      setSaving(false);
    }
  };

  const stringLabels = ['6th (E)', '5th (A)', '4th (D)', '3rd (G)', '2nd (B)', '1st (e)'];

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/chords"
          className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
            <Music className="w-5 h-5 text-fuchsia-400" />
            <span>Create New Chord</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure fretboard coordinates, fingerings, and audio notes with real-time visual preview.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Form Column */}
        <form onSubmit={handleSubmit} className="md:col-span-2 p-6 rounded-xl bg-[#12161F] border border-[#1F2636] space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Chord Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. C Major"
                className="w-full px-3 py-1.5 rounded-lg bg-[#0C0F16] border border-[#222938] text-xs text-slate-100 focus:outline-none focus:border-fuchsia-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Slug</label>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="e.g. c-major"
                className="w-full px-3 py-1.5 rounded-lg bg-[#0C0F16] border border-[#222938] text-xs font-mono text-fuchsia-400 focus:outline-none focus:border-fuchsia-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Chord Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-[#0C0F16] border border-[#222938] text-xs text-slate-200 focus:outline-none focus:border-fuchsia-500"
              >
                <option value="MAJOR">MAJOR</option>
                <option value="MINOR">MINOR</option>
                <option value="SEVENTH">SEVENTH</option>
                <option value="MAJOR_SEVENTH">MAJOR_SEVENTH</option>
                <option value="MINOR_SEVENTH">MINOR_SEVENTH</option>
                <option value="SUSPENDED">SUSPENDED</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-[#0C0F16] border border-[#222938] text-xs text-slate-200 focus:outline-none focus:border-fuchsia-500"
              >
                <option value="BEGINNER">BEGINNER</option>
                <option value="INTERMEDIATE">INTERMEDIATE</option>
                <option value="ADVANCED">ADVANCED</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Base Fret</label>
              <input
                type="number"
                min={1}
                max={20}
                value={baseFret}
                onChange={(e) => setBaseFret(parseInt(e.target.value, 10))}
                className="w-full px-3 py-1.5 rounded-lg bg-[#0C0F16] border border-[#222938] text-xs text-slate-100 focus:outline-none focus:border-fuchsia-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Harmonic Notes (Comma-separated)
            </label>
            <input
              type="text"
              value={notesStr}
              onChange={(e) => setNotesStr(e.target.value)}
              placeholder="e.g. C, E, G"
              className="w-full px-3 py-1.5 rounded-lg bg-[#0C0F16] border border-[#222938] text-xs text-slate-100 focus:outline-none focus:border-fuchsia-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
            <textarea
              required
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Technique notes, tone characteristics, and tips..."
              className="w-full px-3 py-1.5 rounded-lg bg-[#0C0F16] border border-[#222938] text-xs text-slate-100 focus:outline-none focus:border-fuchsia-500"
            />
          </div>

          {/* 6 String Fret & Finger Matrix */}
          <div className="space-y-2 pt-2 border-t border-[#1F2636]">
            <h4 className="text-xs font-bold text-slate-300">String & Finger Mapping</h4>
            <div className="grid grid-cols-6 gap-2 text-center text-xs">
              {stringLabels.map((lbl, idx) => (
                <div key={idx} className="space-y-1 p-2 rounded bg-[#0C0F16] border border-[#222938]">
                  <div className="font-semibold text-slate-400 text-[10px]">{lbl}</div>
                  <div>
                    <label className="text-[9px] text-slate-500 block">Fret (or X)</label>
                    <input
                      type="text"
                      value={strings[idx]}
                      onChange={(e) => handleStringChange(idx, e.target.value)}
                      className="w-full text-center py-1 rounded bg-[#12161F] border border-slate-700 text-xs font-mono font-bold text-amber-400"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-500 block">Finger (0-4)</label>
                    <input
                      type="number"
                      min={0}
                      max={4}
                      value={fingers[idx]}
                      onChange={(e) => handleFingerChange(idx, e.target.value)}
                      className="w-full text-center py-1 rounded bg-[#12161F] border border-slate-700 text-xs font-mono text-slate-200"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-[#1F2636]">
            <Link
              href="/admin/chords"
              className="px-4 py-2 rounded-lg bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving...' : 'Save Chord'}
            </button>
          </div>
        </form>

        {/* Live Visual Preview Column */}
        <div className="p-6 rounded-xl bg-[#12161F] border border-[#1F2636] flex flex-col items-center justify-center space-y-4">
          <div className="text-center">
            <span className="text-xs font-bold text-fuchsia-400 uppercase tracking-wider block">
              Live Diagram Preview
            </span>
            <span className="text-[11px] text-slate-500">Instant visual verification</span>
          </div>

          <div className="p-4 rounded-xl bg-[#0C0F16] border border-[#1F2636]">
            <ChordDiagram
              name={name || 'Chord Preview'}
              data={{
                strings,
                fingers,
                baseFret: Number(baseFret) || 1,
              }}
              notes={notesStr.split(',').map((n) => n.trim()).filter(Boolean)}
              size="lg"
              showPlayButton={true}
            />
          </div>

          <div className="text-center text-[11px] text-slate-400 max-w-xs">
            Test the strum button to verify sound playback before saving.
          </div>
        </div>
      </div>
    </div>
  );
}
