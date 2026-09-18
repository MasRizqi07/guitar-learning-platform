'use client';

import React, { useState } from 'react';
import {
  Volume2,
  Sparkles,
  Info,
  Filter,
} from 'lucide-react';
import {
  STANDARD_TUNING,
  getFretFrequency,
  getFretNoteInfo,
  playGuitarString,
} from '@/lib/audio';

type ScaleType = 'ALL' | 'C_MAJOR' | 'A_MINOR_PENTATONIC' | 'E_MINOR_PENTATONIC' | 'A_BLUES';

const SCALES: Record<
  ScaleType,
  { name: string; notes: string[]; root: string; blueNote?: string; desc: string }
> = {
  ALL: {
    name: 'All Chromatic Notes',
    notes: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'],
    root: 'C',
    desc: 'Explore every fret and string note across the entire guitar neck.',
  },
  C_MAJOR: {
    name: 'C Major Scale',
    notes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
    root: 'C',
    desc: 'The foundational standard major scale with zero sharps or flats (W-W-H-W-W-W-H).',
  },
  A_MINOR_PENTATONIC: {
    name: 'A Minor Pentatonic',
    notes: ['A', 'C', 'D', 'E', 'G'],
    root: 'A',
    desc: 'The #1 beginner solo and riff scale across rock, blues, and pop.',
  },
  E_MINOR_PENTATONIC: {
    name: 'E Minor Pentatonic',
    notes: ['E', 'G', 'A', 'B', 'D'],
    root: 'E',
    desc: 'Powerhouse scale that uses all open strings for rich acoustic licks.',
  },
  A_BLUES: {
    name: 'A Blues Scale',
    notes: ['A', 'C', 'D', 'D#', 'E', 'G'],
    root: 'A',
    blueNote: 'D#',
    desc: 'Minor pentatonic plus the expressive diminished 5th (D#) blue note.',
  },
};

const FRET_COUNT = 15;
// Dot marker frets on the guitar neck
const SINGLE_DOT_FRETS = [3, 5, 7, 9, 15];
const DOUBLE_DOT_FRET = 12;

export function FretboardExplorer() {
  const [selectedScale, setSelectedScale] = useState<ScaleType>('A_MINOR_PENTATONIC');
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

  // Strings from High E (1) down to Low E (6)
  const stringsOrdered = [1, 2, 3, 4, 5, 6];

  return (
    <div className="space-y-6">
      {/* Controls & Scale Selector */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-2xl bg-[#171A20] border border-[#2A303A]">
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <Filter className="w-3.5 h-3.5 text-slate-500 mr-1 hidden sm:inline shrink-0" />
          {(Object.keys(SCALES) as ScaleType[]).map((st) => (
            <button
              key={st}
              onClick={() => setSelectedScale(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedScale === st
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-[#121418] text-slate-400 hover:text-slate-200 border border-[#2A303A]'
              }`}
            >
              {SCALES[st].name}
            </button>
          ))}
        </div>

        {activeFret && (
          <div className="flex items-center gap-3 bg-[#121418] px-3.5 py-1.5 rounded-xl border border-amber-500/30 text-xs shrink-0 animate-in fade-in">
            <Volume2 className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-bold text-amber-400">{activeFret.note}</span>
            <span className="text-slate-400 font-mono">({activeFret.freq} Hz)</span>
            <span className="text-slate-500">• String {activeFret.stringNum}, Fret {activeFret.fret}</span>
          </div>
        )}
      </div>

      {/* Scale Description Banner */}
      <div className="flex items-center justify-between gap-4 text-xs text-slate-400 bg-[#121418] px-4 py-2.5 rounded-xl border border-[#2A303A]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>{scaleConfig.desc}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="flex items-center gap-1 font-semibold text-amber-400">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
            Root ({scaleConfig.root})
          </span>
          {scaleConfig.blueNote && (
            <span className="flex items-center gap-1 font-semibold text-sky-400">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" />
              Blue Note ({scaleConfig.blueNote})
            </span>
          )}
        </div>
      </div>

      {/* Fretboard SVG / Visual Neck Container */}
      <div className="overflow-x-auto p-4 rounded-2xl bg-[#121418] border border-[#2A303A] shadow-inner">
        <div className="min-w-[780px] relative select-none">
          {/* Fret Numbers Header */}
          <div className="flex text-[11px] font-mono font-bold text-slate-500 border-b border-[#2A303A] pb-2 mb-2">
            <div className="w-14 text-center shrink-0">Open</div>
            {Array.from({ length: FRET_COUNT }, (_, i) => i + 1).map((fret) => (
              <div key={fret} className="flex-1 text-center">
                {fret}
              </div>
            ))}
          </div>

          {/* Guitar Strings (1 to 6) */}
          <div className="space-y-3 relative py-2">
            {stringsOrdered.map((stringNum) => {
              const strInfo = STANDARD_TUNING.find((s) => s.stringNum === stringNum)!;
              const stringThickness = stringNum === 6 ? 'h-[3px]' : stringNum === 5 ? 'h-[2.5px]' : stringNum === 4 ? 'h-[2px]' : 'h-[1.5px]';

              return (
                <div key={stringNum} className="flex items-center relative group">
                  {/* Open string label */}
                  <button
                    onClick={() => handleFretClick(stringNum, 0)}
                    title={`Open ${strInfo.name} (${strInfo.note})`}
                    className="w-14 shrink-0 flex items-center justify-center gap-1 text-xs font-mono font-bold text-slate-300 hover:text-amber-400 transition-colors pr-2"
                  >
                    <span>{strInfo.noteLetter}</span>
                    <span className="text-[10px] text-slate-500">{strInfo.octave}</span>
                  </button>

                  {/* Nut Border */}
                  <div className="w-2 h-7 bg-[#38404E] rounded-sm shrink-0 shadow" />

                  {/* Frets for this string */}
                  <div className="flex-1 flex items-center relative">
                    {/* Metal string line */}
                    <div className={`absolute inset-x-0 ${stringThickness} bg-gradient-to-r from-slate-400 via-slate-300 to-slate-400 opacity-70 pointer-events-none`} />

                    {Array.from({ length: FRET_COUNT }, (_, i) => i + 1).map((fret) => {
                      const noteInfo = getFretNoteInfo(stringNum, fret);
                      const inScale = scaleConfig.notes.includes(noteInfo.noteName);
                      const isRoot = noteInfo.noteName === scaleConfig.root;
                      const isBlueNote = noteInfo.noteName === scaleConfig.blueNote;

                      return (
                        <div
                          key={fret}
                          onClick={() => handleFretClick(stringNum, fret)}
                          className="flex-1 h-8 border-r border-[#2A303A] flex items-center justify-center relative cursor-pointer hover:bg-white/[0.03] transition-colors"
                        >
                          {/* Note Dot Indicator */}
                          {inScale && (
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shadow-md transition-transform transform group-hover:scale-105 ${
                                isRoot
                                  ? 'bg-amber-500 text-slate-950 font-black ring-2 ring-amber-400/60 scale-110'
                                  : isBlueNote
                                  ? 'bg-sky-500 text-slate-950 font-black ring-2 ring-sky-400/60'
                                  : 'bg-[#20242C] text-slate-200 border border-[#3A4250]'
                              }`}
                            >
                              {noteInfo.noteName}
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
                  {isSingle && <span className="w-2 h-2 rounded-full bg-slate-600 inline-block opacity-60" />}
                  {isDouble && (
                    <div className="flex gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-600 inline-block opacity-60" />
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-600 inline-block opacity-60" />
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
        <span>Click on any fret or open string to pluck its acoustic pitch in real time.</span>
      </div>
    </div>
  );
}
