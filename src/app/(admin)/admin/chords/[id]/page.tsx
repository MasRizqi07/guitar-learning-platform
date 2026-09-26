'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Music, Save, AlertTriangle } from 'lucide-react';
import { ChordDiagram } from '@/components/guitar/ChordDiagram';

interface ChordDetail {
  id: string;
  name: string;
  slug: string;
  type: string;
  difficulty: string;
  notes: string[];
  diagramData: { strings: (number | string)[]; fingers: number[]; baseFret: number };
  description: string;
  status: string;
  updatedAt: string;
}

export default function ChordEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const [chord, setChord] = useState<ChordDetail | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [type, setType] = useState('MAJOR');
  const [difficulty, setDifficulty] = useState('BEGINNER');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('PUBLISHED');

  const [strings, setStrings] = useState<(number | string)[]>(['X', 0, 0, 0, 0, 0]);
  const [fingers, setFingers] = useState<(number | string)[]>([0, 0, 0, 0, 0, 0]);
  const [baseFret, setBaseFret] = useState(1);
  const [notesStr, setNotesStr] = useState('');
  const [clientUpdatedAt, setClientUpdatedAt] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [concurrencyConflict, setConcurrencyConflict] = useState(false);
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch(`/api/admin/chords/${id}`);
        const data = await res.json();
        if (ignore) return;
        if (!res.ok) {
          throw new Error(data.error?.message || 'Failed to load chord');
        }
        const c = data.data;
        setChord(c);
        setName(c.name);
        setSlug(c.slug);
        setType(c.type);
        setDifficulty(c.difficulty);
        setDescription(c.description);
        setStatus(c.status);
        setStrings(c.diagramData?.strings || ['X', 0, 0, 0, 0, 0]);
        setFingers(c.diagramData?.fingers || [0, 0, 0, 0, 0, 0]);
        setBaseFret(c.diagramData?.baseFret || 1);
        setNotesStr(Array.isArray(c.notes) ? c.notes.join(', ') : '');
        setClientUpdatedAt(c.updatedAt);
        setError(null);
        setConcurrencyConflict(false);
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Failed to load chord');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [id, refreshIndex]);

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
      setSuccess(null);
      setConcurrencyConflict(false);

      const parsedNotes = notesStr
        .split(',')
        .map((n) => n.trim())
        .filter(Boolean);

      const res = await fetch(`/api/admin/chords/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          slug,
          type,
          difficulty,
          description,
          status,
          notes: parsedNotes,
          diagramData: {
            strings,
            fingers,
            baseFret: Number(baseFret),
          },
          clientUpdatedAt,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          setConcurrencyConflict(true);
        }
        throw new Error(data.error?.message || 'Failed to update chord');
      }

      setSuccess('Chord updated successfully.');
      setRefreshIndex((r) => r + 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update chord');
    } finally {
      setSaving(false);
    }
  };

  const stringLabels = ['6th (E)', '5th (A)', '4th (D)', '3rd (G)', '2nd (B)', '1st (e)'];

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-500">Loading chord...</div>;
  }

  if (!chord) {
    return <div className="p-8 text-center text-xs text-rose-400">Chord not found.</div>;
  }

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
            <span>{chord.name}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-mono">{chord.slug}</p>
        </div>
      </div>

      {concurrencyConflict && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>This chord was modified by another editor. Refresh before saving.</span>
          </div>
          <button
            onClick={() => {
              setLoading(true);
              setRefreshIndex((r) => r + 1);
            }}
            className="px-3 py-1 bg-amber-500 text-slate-950 font-bold text-xs rounded-lg hover:bg-amber-400 transition"
          >
            Refresh Now
          </button>
        </div>
      )}

      {error && !concurrencyConflict && (
        <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <form onSubmit={handleSubmit} className="md:col-span-2 p-6 rounded-xl bg-[#12161F] border border-[#1F2636] space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Chord Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
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
                className="w-full px-3 py-1.5 rounded-lg bg-[#0C0F16] border border-[#222938] text-xs font-mono text-fuchsia-400 focus:outline-none focus:border-fuchsia-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-[#0C0F16] border border-[#222938] text-xs text-slate-200 focus:outline-none focus:border-fuchsia-500"
              >
                <option value="PUBLISHED">PUBLISHED</option>
                <option value="DRAFT">DRAFT</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Harmonic Notes</label>
            <input
              type="text"
              value={notesStr}
              onChange={(e) => setNotesStr(e.target.value)}
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
                    <label className="text-[9px] text-slate-500 block">Fret</label>
                    <input
                      type="text"
                      value={strings[idx]}
                      onChange={(e) => handleStringChange(idx, e.target.value)}
                      className="w-full text-center py-1 rounded bg-[#12161F] border border-slate-700 text-xs font-mono font-bold text-amber-400"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-500 block">Finger</label>
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

        <div className="p-6 rounded-xl bg-[#12161F] border border-[#1F2636] flex flex-col items-center justify-center space-y-4">
          <div className="text-center">
            <span className="text-xs font-bold text-fuchsia-400 uppercase tracking-wider block">
              Live Diagram Preview
            </span>
            <span className="text-[11px] text-slate-500">Real-time update</span>
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
        </div>
      </div>
    </div>
  );
}
