'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  Volume2,
  Music,
  Info,
  X,
  Sparkles,
  ArrowRight,
  Filter,
  Loader2,
  Play,
  Grid,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ChordDiagram } from '@/components/guitar/ChordDiagram';
import { FretboardExplorer } from '@/components/guitar/FretboardExplorer';
import { strumChord } from '@/lib/audio';

interface ChordItem {
  id: string;
  name: string;
  slug: string;
  type: string;
  difficulty: string;
  notes: string[];
  diagramData: {
    strings: (number | string)[];
    fingers: (number | string)[];
    baseFret?: number;
    barres?: Array<{ fromString: number; toString: number; fret: number }>;
  };
  description: string;
}

export default function ChordLibraryPage() {
  const [libraryMode, setLibraryMode] = useState<'CHORDS' | 'FRETBOARD'>('CHORDS');
  const [chords, setChords] = useState<ChordItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'MAJOR' | 'MINOR' | 'SEVENTH'>('ALL');
  const [selectedChord, setSelectedChord] = useState<ChordItem | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/chords')
      .then((res) => res.json())
      .then((json) => {
        if (json.data) {
          setChords(json.data);
        }
      })
      .catch((err) => console.error('Failed to fetch chords', err))
      .finally(() => setIsLoading(false));
  }, []);

  const handlePlayChord = (e: React.MouseEvent, chord: ChordItem) => {
    e.stopPropagation();
    setPlayingId(chord.id);
    strumChord(chord.diagramData.strings, 'DOWN');
    setTimeout(() => {
      setPlayingId(null);
    }, 1500);
  };

  const filteredChords = useMemo(() => {
    return chords.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.notes.some((n) => n.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesType = typeFilter === 'ALL' || c.type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [chords, searchQuery, typeFilter]);

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-widest mb-1">
            <Music className="w-3.5 h-3.5" />
            <span>Interactive Reference</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">
            {libraryMode === 'CHORDS' ? 'Chord Library' : 'Interactive Fretboard'}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {libraryMode === 'CHORDS'
              ? 'Interactive fingering diagrams, acoustic string audio previews, and instant practice links.'
              : 'Explore the guitar neck across 15 frets, discover scale shapes, and hear note frequencies in real time.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Mode Switcher */}
          <div className="inline-flex rounded-xl bg-[#171A20] p-1 border border-[#2A303A]">
            <button
              onClick={() => setLibraryMode('CHORDS')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                libraryMode === 'CHORDS'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              <span>Chords</span>
            </button>
            <button
              onClick={() => setLibraryMode('FRETBOARD')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                libraryMode === 'FRETBOARD'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Fretboard</span>
            </button>
          </div>

          <Link href="/practice">
            <Button variant="outline" className="flex items-center gap-2">
              <Play className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Practice Room</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Mode 1: Fretboard Explorer */}
      {libraryMode === 'FRETBOARD' ? (
        <FretboardExplorer />
      ) : (
        /* Mode 2: Chords Catalog */
        <div className="space-y-6">
          {/* Filter and Search Bar */}
          <Card className="p-4 bg-[#171A20] border-[#2A303A] flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by chord (e.g. C, Am) or note..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#121418] border border-[#2A303A] rounded-xl pl-10 pr-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Type Filter Buttons */}
            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
              <Filter className="w-3.5 h-3.5 text-slate-500 mr-1 hidden sm:inline" />
              {(['ALL', 'MAJOR', 'MINOR', 'SEVENTH'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setTypeFilter(filter)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    typeFilter === filter
                      ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/20'
                      : 'bg-[#121418] text-slate-400 hover:text-slate-200 border border-[#2A303A]'
                  }`}
                >
                  {filter === 'ALL' ? 'All Chords' : filter.charAt(0) + filter.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </Card>

          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
              <p className="text-xs text-slate-400">Loading chord catalog...</p>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && filteredChords.length === 0 && (
            <Card className="p-12 text-center bg-[#171A20] border-[#2A303A] max-w-md mx-auto">
              <Music className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-200 mb-1">No chords found</h3>
              <p className="text-xs text-slate-400 mb-4">
                Try adjusting your search query or filter settings.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setTypeFilter('ALL');
                }}
              >
                Reset Filters
              </Button>
            </Card>
          )}

          {/* Chords Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {filteredChords.map((chord) => {
              const isPlaying = playingId === chord.id;
              return (
                <Card
                  key={chord.id}
                  onClick={() => setSelectedChord(chord)}
                  className="p-5 bg-[#171A20] border-[#2A303A] hover:border-amber-500/40 cursor-pointer transition-all duration-200 flex flex-col justify-between group relative overflow-hidden"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-xl font-black text-slate-100 tracking-tight group-hover:text-amber-400 transition-colors">
                          {chord.name}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Badge variant={chord.type === 'MAJOR' ? 'amber' : 'neutral'} size="sm">
                            {chord.type}
                          </Badge>
                          <span className="text-[10px] text-slate-500 uppercase font-mono">
                            {chord.difficulty}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={(e) => handlePlayChord(e, chord)}
                        title="Play acoustic strum"
                        className={`p-2.5 rounded-xl border transition-all ${
                          isPlaying
                            ? 'bg-amber-500 text-slate-950 border-amber-400 scale-110 shadow-lg shadow-amber-500/30'
                            : 'bg-[#121418] border-[#2A303A] text-slate-300 hover:text-white hover:border-amber-500/50'
                        }`}
                      >
                        <Volume2 className={`w-4 h-4 ${isPlaying ? 'animate-pulse' : ''}`} />
                      </button>
                    </div>

                    {/* SVG Chord Diagram */}
                    <div className="my-2 p-2 bg-[#121418] rounded-xl border border-[#2A303A] flex items-center justify-center">
                      <ChordDiagram
                        name={chord.name}
                        data={{
                          strings: chord.diagramData.strings,
                          fingers: chord.diagramData.fingers,
                          baseFret: chord.diagramData.baseFret || 1,
                        }}
                        showPlayButton={false}
                        size="sm"
                      />
                    </div>

                    {/* Notes List */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-2">
                      <span className="text-[11px] font-semibold text-slate-500">Notes:</span>
                      <div className="flex items-center gap-1">
                        {chord.notes.map((note, i) => (
                          <span
                            key={i}
                            className="px-1.5 py-0.5 rounded bg-[#121418] border border-[#2A303A] text-[11px] font-mono text-slate-300 font-bold"
                          >
                            {note}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="mt-4 pt-3 border-t border-[#2A303A] flex items-center justify-between gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedChord(chord);
                      }}
                      className="text-xs font-semibold text-slate-400 hover:text-slate-200 flex items-center gap-1"
                    >
                      <Info className="w-3.5 h-3.5" />
                      <span>Tips</span>
                    </button>

                    <Link
                      href={`/practice?type=CHORD&chord=${encodeURIComponent(chord.name)}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300"
                    >
                      <span>Practice</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Chord Detail Modal */}
      {selectedChord && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#171A20] border border-[#2A303A] rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-2xl font-black text-slate-100">{selectedChord.name}</h2>
                  <Badge variant="amber">{selectedChord.type}</Badge>
                </div>
                <p className="text-xs text-slate-400">
                  Difficulty: <span className="text-amber-400 uppercase font-semibold">{selectedChord.difficulty}</span>
                </p>
              </div>

              <button
                onClick={() => setSelectedChord(null)}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Diagram and Audio Player */}
            <div className="flex flex-col sm:flex-row items-center gap-6 bg-[#121418] p-5 rounded-2xl border border-[#2A303A]">
              <div className="shrink-0">
                <ChordDiagram
                  name={selectedChord.name}
                  data={{
                    strings: selectedChord.diagramData.strings,
                    fingers: selectedChord.diagramData.fingers,
                    baseFret: selectedChord.diagramData.baseFret || 1,
                  }}
                  notes={selectedChord.notes}
                  size="md"
                  showPlayButton={true}
                />
              </div>

              <div className="space-y-4 text-center sm:text-left w-full">
                <div>
                  <span className="text-xs text-slate-500 font-semibold block mb-1">Constituent Notes</span>
                  <div className="flex flex-wrap items-center gap-1.5 justify-center sm:justify-start">
                    {selectedChord.notes.map((n, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg bg-[#171A20] border border-[#2A303A] font-mono text-sm font-bold text-amber-400"
                      >
                        {n}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <Button
                    onClick={(e) => handlePlayChord(e, selectedChord)}
                    variant="outline"
                    size="sm"
                    className="w-full flex items-center justify-center gap-2 border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
                  >
                    <Volume2 className="w-4 h-4" />
                    <span>Hear Plucked Strum</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Beginner Advice & Description */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Playing Technique & Tips</span>
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed bg-[#121418] p-3.5 rounded-xl border border-[#2A303A]">
                {selectedChord.description}
              </p>
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setSelectedChord(null)}>
                Close
              </Button>
              <Link
                href={`/practice?type=CHORD&chord=${encodeURIComponent(selectedChord.name)}`}
                className="w-full sm:w-auto"
              >
                <Button className="w-full flex items-center justify-center gap-2">
                  <Play className="w-4 h-4" />
                  <span>Practice in Focus Room</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
