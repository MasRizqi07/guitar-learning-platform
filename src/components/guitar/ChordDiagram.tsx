'use client';

import React from 'react';
import { strumChord } from '@/lib/audio';
import { Volume2 } from 'lucide-react';

export interface ChordDiagramData {
  strings: (number | string)[]; // e.g. ["X", 3, 2, 0, 1, 0] from 6th (low E) to 1st (high E)
  fingers?: (number | string)[]; // e.g. [0, 3, 2, 0, 1, 0]
  baseFret?: number; // 1 by default
}

interface ChordDiagramProps {
  name: string;
  data: ChordDiagramData;
  notes?: string[];
  size?: 'sm' | 'md' | 'lg';
  showPlayButton?: boolean;
  className?: string;
}

export function ChordDiagram({
  name,
  data,
  notes,
  size = 'md',
  showPlayButton = true,
  className = '',
}: ChordDiagramProps) {
  const { strings = ['X', 0, 0, 0, 0, 0], fingers = [0, 0, 0, 0, 0, 0], baseFret = 1 } = data;

  const width = size === 'sm' ? 140 : size === 'lg' ? 220 : 180;
  const height = size === 'sm' ? 170 : size === 'lg' ? 260 : 210;

  // Grid dimensions
  const startX = width * 0.18;
  const endX = width * 0.82;
  const startY = height * 0.22;
  const endY = height * 0.88;

  const stringSpacing = (endX - startX) / 5;
  const fretSpacing = (endY - startY) / 5;

  const handlePlay = () => {
    strumChord(strings);
  };

  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      <div className="flex items-center justify-between w-full max-w-[200px] mb-2 px-2">
        <span className="font-bold text-base text-slate-100">{name}</span>
        {showPlayButton && (
          <button
            type="button"
            onClick={handlePlay}
            title={`Listen to ${name}`}
            className="p-1.5 rounded-lg bg-[#20242C] hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 border border-[#2A303A] hover:border-amber-500/40 transition-colors"
          >
            <Volume2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="bg-[#171A20] border border-[#2A303A] rounded-2xl shadow-md"
        role="img"
        aria-label={`Chord diagram for ${name}`}
      >
        {/* Nut (Thick line if baseFret is 1) */}
        {baseFret === 1 ? (
          <line
            x1={startX}
            y1={startY}
            x2={endX}
            y2={startY}
            stroke="#E2E8F0"
            strokeWidth={size === 'sm' ? 4 : 5}
            strokeLinecap="round"
          />
        ) : (
          <>
            <line
              x1={startX}
              y1={startY}
              x2={endX}
              y2={startY}
              stroke="#64748B"
              strokeWidth={1.5}
            />
            {/* Fret label */}
            <text
              x={startX - 12}
              y={startY + fretSpacing * 0.7}
              fill="#F59E0B"
              fontSize={size === 'sm' ? 10 : 12}
              fontWeight="bold"
              textAnchor="middle"
            >
              {baseFret}fr
            </text>
          </>
        )}

        {/* 5 Fret Wires */}
        {[1, 2, 3, 4, 5].map((fret) => {
          const y = startY + fret * fretSpacing;
          return (
            <line
              key={`fret-${fret}`}
              x1={startX}
              y1={y}
              x2={endX}
              y2={y}
              stroke="#334155"
              strokeWidth={1.5}
            />
          );
        })}

        {/* 6 Vertical Strings */}
        {[0, 1, 2, 3, 4, 5].map((sIndex) => {
          const x = startX + sIndex * stringSpacing;
          const strokeWidth = 1 + (5 - sIndex) * 0.4; // 6th string thicker than 1st
          return (
            <line
              key={`string-${sIndex}`}
              x1={x}
              y1={startY}
              x2={x}
              y2={endY}
              stroke="#94A3B8"
              strokeWidth={strokeWidth}
              opacity={0.8}
            />
          );
        })}

        {/* Top String Markers (O, X) and Fretted Dots */}
        {strings.map((fretVal, sIndex) => {
          const x = startX + sIndex * stringSpacing;
          const topMarkerY = startY - 12;

          // Muted string 'X'
          if (fretVal === 'X' || fretVal === 'x') {
            return (
              <text
                key={`top-${sIndex}`}
                x={x}
                y={topMarkerY}
                fill="#EF4444"
                fontSize={size === 'sm' ? 11 : 13}
                fontWeight="bold"
                textAnchor="middle"
                dominantBaseline="central"
              >
                ✕
              </text>
            );
          }

          const fretNum = typeof fretVal === 'number' ? fretVal : parseInt(fretVal, 10);

          // Open string 'O'
          if (fretNum === 0) {
            return (
              <circle
                key={`top-${sIndex}`}
                cx={x}
                cy={topMarkerY}
                r={size === 'sm' ? 4 : 5}
                fill="none"
                stroke="#22C55E"
                strokeWidth={1.8}
              />
            );
          }

          // Fretted note dot
          if (fretNum > 0) {
            const adjustedFret = fretNum - baseFret + 1;
            if (adjustedFret >= 1 && adjustedFret <= 5) {
              const dotY = startY + (adjustedFret - 0.5) * fretSpacing;
              const finger = fingers[sIndex];
              const dotRadius = size === 'sm' ? 8 : 10;

              return (
                <g key={`dot-${sIndex}`}>
                  <circle
                    cx={x}
                    cy={dotY}
                    r={dotRadius}
                    fill="#F59E0B"
                    className="drop-shadow-md"
                  />
                  {finger && finger !== 0 && finger !== '0' && (
                    <text
                      x={x}
                      y={dotY}
                      fill="#0E1014"
                      fontSize={size === 'sm' ? 9 : 11}
                      fontWeight="bold"
                      textAnchor="middle"
                      dominantBaseline="central"
                    >
                      {finger}
                    </text>
                  )}
                </g>
              );
            }
          }

          return null;
        })}
      </svg>

      {/* Optional Note labels below */}
      {notes && notes.length > 0 && (
        <div className="flex gap-1.5 mt-2 text-[11px] text-slate-400 font-mono">
          <span>Notes:</span>
          <span className="text-amber-400 font-semibold">{notes.join(' - ')}</span>
        </div>
      )}
    </div>
  );
}
