'use client';

import React, { useState } from 'react';
import {
  Volume2,
  Sparkles,
  Info,
  Filter,
  Play,
} from 'lucide-react';
import {
  STANDARD_TUNING,
  getFretFrequency,
  getFretNoteInfo,
  playGuitarString,
} from '@/lib/audio';

type ScaleType = 'ALL' | 'C_MAJOR' | 'A_MINOR_PENTATONIC' | 'E_MINOR_PENTATONIC' | 'A_BLUES' | 'G_PENTATONIC';

const SCALES: Record<
  ScaleType,
  { name: string; notes: string[]; root: string; blueNote?: string; degrees: Record<string, string>; desc: string }
> = {
  ALL: {
    name: 'All Chromatic',
    notes: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'],
    root: 'C',
    degrees: {},
    desc: 'Explore every fret and string note across the entire 15-fret guitar neck.',
  },
  A_MINOR_PENTATONIC: {
    name: 'A Minor Pentatonic',
    notes: ['A', 'C', 'D', 'E', 'G'],
    root: 'A',
    degrees: { A: 'R', C: 'b3', D: '4', E: '5', G: 'b7' },
    desc: 'The #1 beginner solo and riff scale across rock, blues, and acoustic guitar.',
  },
  C_MAJOR: {
    name: 'C Major Scale',
    notes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
    root: 'C',
    degrees: { C: 'R', D: '2', E: '3', F: '4', G: '5', A: '6', B: '7' },
    desc: 'The foundational standard major scale with zero sharps or flats (W-W-H-W-W-W-H).',
  },
  E_MINOR_PENTATONIC: {
    name: 'E Minor Pentatonic',
    notes: ['E', 'G', 'A', 'B', 'D'],
    root: 'E',
    degrees: { E: 'R', G: 'b3', A: '4', B: '5', D: 'b7' },
    desc: 'Powerhouse scale that uses all open strings for resonant acoustic licks.',
  },
  G_PENTATONIC: {
    name: 'G Major Pentatonic',
    notes: ['G', 'A', 'B', 'D', 'E'],
    root: 'G',
    degrees: { G: 'R', A: '2', B: '3', D: '5', E: '6' },
    desc: 'Sweet, bright country & acoustic melodic soloing scale.',
  },
  A_BLUES: {
    name: 'A Blues Scale',
    notes: ['A', 'C', 'D', 'D#', 'E', 'G'],
    root: 'A',
    blueNote: 'D#',
    degrees: { A: 'R', C: 'b3', D: '4', 'D#': 'b5', E: '5', G: 'b7' },
    desc: 'Minor pentatonic plus the expressive diminished 5th (D#) blue note.',
  },
};

const FRET_COUNT = 15;
const SINGLE_DOT_FRETS = [3, 5, 7, 9, 15];
const DOUBLE_DOT_FRET = 12;

export function FretboardExplorer() {
  const [selectedScale, setSelectedScale] = useState<ScaleType>('A_MINOR_PENTATONIC');
  const [displayMode, setDisplayMode] = useState<'notes' | 'degrees'>('notes');
  const [activeFret, setActiveFret] = useState<{ stringNum: number; fret: number; note: string; freq: number } | null>(null);

  const scaleConfig = SCALES[selectedScale];

  const handleFretClick = (stringNum: number, fret: number) => {
    const freq = getFretFrequency(stringNum, fret);
    const noteInfo = getFretNoteInfo(stringNum, fret);
    playGuitarString(freq, 1.5);
    setActiveFret({
      stringNum,
      fret,
      note: `${noteInfo.noteName}${noteInfo.octave}`,
      freq: Math.round(freq * 10) / 10,
    });
  };

  const handlePluckArpeggio = () => {
    // Play strings 6 through 1 with slight delays
    [6, 5, 4, 3, 2, 1].forEach((sNum, index) => {
      setTimeout(() => {
        const freq = getFretFrequency(sNum, 0);
        playGuitarString(freq, 1.8);
      }, index * 120);
    });
  };

  // Strings from High E (1) down to Low E (6)
  const stringsOrdered = [1, 2, 3, 4, 5, 6];

  return (
    <div className="space-y-6">
      {/* Controls & Scale Selector */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-4 rounded-2xl bg-[#171A20] border border-[#2A303A] shadow-md">
        <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0">
          <Filter className="w-3.5 h-3.5 text-slate-500 mr-1 hidden sm:inline shrink-0" />
          {(Object.keys(SCALES) as ScaleType[]).map((st) => (
            <button
              key={st}
              onClick={() => setSelectedScale(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedScale === st
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : 'bg-[#121418] text-slate-400 hover:text-slate-200 border border-[#2A303A]'
              }`}
            >
              {SCALES[st].name}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
          {/* Note names vs Degrees Toggle */}
          <div className="flex items-center bg-[#121418] p-1 rounded-xl border border-[#2A303A] text-xs">
            <button
              onClick={() => setDisplayMode('notes')}
              className={`px-2.5 py-1 rounded-lg font-mono font-medium transition-all ${
                displayMode === 'notes' ? 'bg-[#20242C] text-amber-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Notes
            </button>
            <button
              onClick={() => setDisplayMode('degrees')}
              className={`px-2.5 py-1 rounded-lg font-mono font-medium transition-all ${
                displayMode === 'degrees' ? 'bg-[#20242C] text-amber-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Degrees
            </button>
          </div>

          {/* Arpeggio Pluck */}
          <button
            onClick={handlePluckArpeggio}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Pluck Arpeggio</span>
          </button>
        </div>
      </div>

      {/* Active Inspector & Scale Description Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-400 bg-[#121418] px-4 py-3 rounded-xl border border-[#2A303A]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>{scaleConfig.desc}</span>
        </div>

        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          {activeFret && (
            <div className="flex items-center gap-2 bg-[#171A20] px-2.5 py-1 rounded-lg border border-amber-500/40 text-amber-400 font-mono">
              <Volume2 className="w-3.5 h-3.5" />
              <span className="font-bold">{activeFret.note}</span>
              <span className="text-slate-500">({activeFret.freq} Hz)</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 font-semibold text-amber-400">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
              Root ({scaleConfig.root})
            </span>
            {scaleConfig.blueNote && (
              <span className="flex items-center gap-1 font-semibold text-sky-400">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block shadow-[0_0_8px_rgba(56,189,248,0.6)]" />
                Blue Note ({scaleConfig.blueNote})
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 15-Fret Neck Viewport */}
      <div className="overflow-x-auto p-4 rounded-2xl bg-gradient-to-b from-[#171A20] via-[#12151B] to-[#171A20] border border-[#2A303A] shadow-2xl">
        <div className="min-w-[840px] relative select-none">
          {/* Fret Numbers Header */}
          <div className="flex text-[11px] font-mono font-bold text-slate-500 border-b border-[#2A303A] pb-2 mb-2">
            <div className="w-14 text-center shrink-0 text-slate-400">NUT</div>
            {Array.from({ length: FRET_COUNT }, (_, i) => i + 1).map((fret) => (
              <div key={fret} className="flex-1 text-center">
                {fret}
              </div>
            ))}
          </div>

          {/* Guitar Strings (1 to 6) */}
          <div className="space-y-3.5 relative py-2">
            {stringsOrdered.map((stringNum) => {
              const strInfo = STANDARD_TUNING.find((s) => s.stringNum === stringNum)!;
              const stringThickness = stringNum === 6 ? 'h-[3.5px]' : stringNum === 5 ? 'h-[3px]' : stringNum === 4 ? 'h-[2.5px]' : stringNum === 3 ? 'h-[2px]' : stringNum === 2 ? 'h-[1.5px]' : 'h-[1px]';

              return (
                <div key={stringNum} className="flex items-center relative group">
                  {/* Open string label */}
                  <button
                    onClick={() => handleFretClick(stringNum, 0)}
                    title={`Pluck Open ${strInfo.name} (${strInfo.note})`}
                    className="w-14 shrink-0 flex items-center justify-center gap-1 text-xs font-mono font-bold text-slate-300 hover:text-amber-400 transition-colors pr-2"
                  >
                    <span className="text-amber-400/90">{strInfo.noteLetter}</span>
                    <span className="text-[10px] text-slate-500">{strInfo.octave}</span>
                  </button>

                  {/* Nut Divider */}
                  <div className="w-2.5 h-8 bg-[#827568]/50 rounded-sm shrink-0 shadow-[2px_0_4px_rgba(0,0,0,0.6)]" />

                  {/* Frets for this string */}
                  <div className="flex-1 flex items-center relative">
                    {/* Metal string line */}
                    <div className={`absolute inset-x-0 ${stringThickness} bg-gradient-to-r from-slate-400 via-slate-200 to-slate-400 opacity-80 pointer-events-none shadow-[0_1px_2px_rgba(0,0,0,0.8)]`} />

                    {Array.from({ length: FRET_COUNT }, (_, i) => i + 1).map((fret) => {
                      const noteInfo = getFretNoteInfo(stringNum, fret);
                      const inScale = scaleConfig.notes.includes(noteInfo.noteName);
                      const isRoot = noteInfo.noteName === scaleConfig.root;
                      const isBlueNote = noteInfo.noteName === scaleConfig.blueNote;
                      const degree = scaleConfig.degrees[noteInfo.noteName] || noteInfo.noteName;
                      const displayText = displayMode === 'degrees' && inScale ? degree : noteInfo.noteName;

                      return (
                        <div
                          key={fret}
                          onClick={() => handleFretClick(stringNum, fret)}
                          className="flex-1 h-9 border-r border-[#2A303A] flex items-center justify-center relative cursor-pointer hover:bg-white/[0.04] transition-colors"
                        >
                          {/* Note Dot Indicator */}
                          {inScale && (
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shadow-md transition-transform transform group-hover:scale-105 ${
                                isRoot
                                  ? 'bg-amber-500 text-slate-950 font-black ring-2 ring-amber-400/60 scale-110 shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                                  : isBlueNote
                                  ? 'bg-sky-500 text-slate-950 font-black ring-2 ring-sky-400/60 shadow-[0_0_12px_rgba(14,165,233,0.5)]'
                                  : 'bg-[#20242C] text-slate-200 border border-[#3A4250]'
                              }`}
                            >
                              {displayText}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Fret Markers Inlay Row (Dots at 3, 5, 7, 9, 12, 15) */}
          <div className="flex pt-3 pl-16">
            {Array.from({ length: FRET_COUNT }, (_, i) => i + 1).map((fret) => {
              const isSingle = SINGLE_DOT_FRETS.includes(fret);
              const isDouble = fret === DOUBLE_DOT_FRET;

              return (
                <div key={fret} className="flex-1 flex items-center justify-center h-4">
                  {isSingle && <span className="w-2 h-2 rounded-full bg-slate-500/50 inline-block" />}
                  {isDouble && (
                    <div className="flex gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-500/50 inline-block" />
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-500/50 inline-block" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="text-center text-xs text-slate-500 flex items-center justify-center gap-1.5">
        <Info className="w-3.5 h-3.5 text-slate-400" />
        <span>Click on any fret or open string node to trigger synthesized acoustic string pluck in real time.</span>
      </div>
    </div>
  );
}
