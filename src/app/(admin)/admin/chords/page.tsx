'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Music,
  Plus,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { ChordDiagram } from '@/components/guitar/ChordDiagram';

interface ChordItem {
  id: string;
  name: string;
  slug: string;
  type: string;
  difficulty: string;
  notes: string[];
  diagramData: { strings: (number | string)[]; fingers: number[]; baseFret: number };
  description: string;
  status: string;
  _count: { sessionChords: number };
}

export default function ChordsListPage() {
  const [chords, setChords] = useState<ChordItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          pageSize: pageSize.toString(),
        });
        if (search.trim()) params.set('search', search.trim());
        if (difficulty) params.set('difficulty', difficulty);

        const res = await fetch(`/api/admin/chords?${params.toString()}`);
        const data = await res.json();
        if (ignore) return;
        if (!res.ok) {
          throw new Error(data.error?.message || 'Failed to load chords');
        }
        setChords(data.data.items);
        setTotal(data.data.total);
        setError(null);
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Failed to load chords');
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
  }, [page, pageSize, search, difficulty, refreshIndex]);

  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#222938]">
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
            <Music className="w-5 h-5 text-fuchsia-400" />
            <span>Chord Library CMS</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Authoritative chord diagrams, fingerings, fret data, and audio playback definitions.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setLoading(true);
              setRefreshIndex((r) => r + 1);
            }}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link
            href="/admin/chords/new"
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400 font-bold transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Chord
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-[#12161F] border border-[#1F2636] flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search chords by name or slug..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#0C0F16] border border-[#222938] text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-fuchsia-500/50"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <span>Difficulty:</span>
            <select
              value={difficulty}
              onChange={(e) => {
                setDifficulty(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-[#0C0F16] border border-[#222938] text-xs text-slate-200 focus:outline-none focus:border-fuchsia-500/50"
            >
              <option value="">All Difficulties</option>
              <option value="BEGINNER">BEGINNER</option>
              <option value="INTERMEDIATE">INTERMEDIATE</option>
              <option value="ADVANCED">ADVANCED</option>
            </select>
          </div>
        </div>
      </div>

      {/* Chords Visual Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">Loading chord library...</div>
      ) : chords.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate-500">No chords found.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {chords.map((chord) => (
            <div
              key={chord.id}
              className="p-4 rounded-xl bg-[#12161F] border border-[#1F2636] flex flex-col justify-between hover:border-fuchsia-500/40 transition group"
            >
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-[#1F2636]">
                  <div>
                    <h3 className="font-bold text-sm text-slate-100 group-hover:text-fuchsia-400 transition">
                      {chord.name}
                    </h3>
                    <span className="font-mono text-[10px] text-slate-500">{chord.slug}</span>
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 uppercase">
                    {chord.difficulty}
                  </span>
                </div>

                {/* Live Visual Chord Diagram */}
                <div className="py-3 flex justify-center">
                  <ChordDiagram
                    name={chord.name}
                    data={chord.diagramData || { strings: ['X', 0, 0, 0, 0, 0], fingers: [0, 0, 0, 0, 0, 0], baseFret: 1 }}
                    notes={chord.notes || []}
                    size="sm"
                    showPlayButton={true}
                  />
                </div>

                <div className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                  {chord.description}
                </div>
              </div>

              <div className="pt-3 border-t border-[#1F2636] mt-3 flex items-center justify-between text-xs">
                <span className="text-[10px] text-slate-500">
                  {chord._count?.sessionChords ?? 0} practice sessions
                </span>
                <Link
                  href={`/admin/chords/${chord.id}`}
                  className="px-2.5 py-1 rounded bg-slate-800 text-amber-400 hover:bg-slate-700 font-semibold text-[11px]"
                >
                  Edit Diagram
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      <div className="p-4 rounded-xl bg-[#12161F] border border-[#1F2636] flex items-center justify-between text-xs text-slate-400">
        <div>
          Showing {chords.length} of {total} chords
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="p-1.5 rounded-lg bg-[#0C0F16] border border-[#222938] disabled:opacity-40 disabled:cursor-not-allowed hover:text-white"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="p-1.5 rounded-lg bg-[#0C0F16] border border-[#222938] disabled:opacity-40 disabled:cursor-not-allowed hover:text-white"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
