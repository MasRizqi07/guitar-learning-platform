'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  Mic,
  MicOff,
  Radio,
} from 'lucide-react';

import {
  STANDARD_TUNING,
  GuitarStringInfo,
  playGuitarString,
  autoCorrelate,
  getNearestGuitarString,
  getAudioContext,
} from '@/lib/audio';

export default function TunerPage() {
  const [activeTab, setActiveTab] = useState<'MIC' | 'EAR'>('MIC');
  const [selectedString, setSelectedString] = useState<GuitarStringInfo>(STANDARD_TUNING[0]);
  const [isListening, setIsListening] = useState(false);
  const [detectedHz, setDetectedHz] = useState<number | null>(null);
  const [detectedTarget, setDetectedTarget] = useState<GuitarStringInfo | null>(null);
  const [centsOffset, setCentsOffset] = useState<number>(0);
  const [isInTune, setIsInTune] = useState<boolean>(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [isLooping, setIsLooping] = useState(false);

  // Audio / Mic stream refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const loopIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Stop microphone and audio processing
  const stopListening = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsListening(false);
    setDetectedHz(null);
    setDetectedTarget(null);
    setCentsOffset(0);
    setIsInTune(false);
  };

  // Start microphone listener with Web Audio API autocorrelation
  const startListening = async () => {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          autoGainControl: false,
          noiseSuppression: false,
        },
      });
      mediaStreamRef.current = stream;

      const ctx =
        getAudioContext() ||
        new (
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        )();
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;

      setIsListening(true);

      const buffer = new Float32Array(analyser.fftSize);

      const updatePitch = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getFloatTimeDomainData(buffer);
        const pitch = autoCorrelate(buffer, ctx.sampleRate);

        if (pitch !== -1) {
          const nearest = getNearestGuitarString(pitch);
          setDetectedHz(Math.round(pitch * 10) / 10);
          setDetectedTarget(nearest.target);
          setCentsOffset(nearest.cents);
          setIsInTune(nearest.inTune);
        }

        animationFrameRef.current = requestAnimationFrame(updatePitch);
      };

      updatePitch();
    } catch (err: unknown) {
      console.error('Microphone access denied:', err);
      setMicError('Microphone permission was denied. You can still use the Reference Tones tab below.');
      setIsListening(false);
    }
  };

  useEffect(() => {
    return () => {
      stopListening();
      if (loopIntervalRef.current) clearInterval(loopIntervalRef.current);
    };
  }, []);

  const handlePlayString = (str: GuitarStringInfo) => {
    setSelectedString(str);
    playGuitarString(str.freq, 2.5);
  };

  const toggleLoop = () => {
    if (isLooping) {
      if (loopIntervalRef.current) clearInterval(loopIntervalRef.current);
      setIsLooping(false);
    } else {
      setIsLooping(true);
      playGuitarString(selectedString.freq, 2.2);
      loopIntervalRef.current = setInterval(() => {
        playGuitarString(selectedString.freq, 2.2);
      }, 2400);
    }
  };

  useEffect(() => {
    if (isLooping) {
      if (loopIntervalRef.current) clearInterval(loopIntervalRef.current);
      playGuitarString(selectedString.freq, 2.2);
      loopIntervalRef.current = setInterval(() => {
        playGuitarString(selectedString.freq, 2.2);
      }, 2400);
    }
  }, [selectedString, isLooping]);

  // Needle angle for arched gauge: -50 cents = -45 deg, +50 cents = +45 deg
  const needleRotation = Math.max(-50, Math.min(50, centsOffset)) * 0.9;
  const activeDisplayTarget = detectedTarget || selectedString;

  return (
    <div className="max-w-4xl mx-auto space-y-8 font-sans pb-16">
      {/* 1. Top Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-emerald-400 mb-1">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>Web Audio API Autocorrelation</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F8FAFC] tracking-tight">
            Precision Guitar Tuner
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Calibrated to A440 Standard Pitch (E2, A2, D3, G3, B3, E4) with sub-cent accuracy.
          </p>
        </div>

        {/* Dual Mode Switcher */}
        <div className="inline-flex rounded-xl bg-[#171A20] p-1 border border-[#2A303A] self-start sm:self-auto">
          <button
            onClick={() => {
              setActiveTab('MIC');
              if (isLooping) toggleLoop();
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'MIC'
                ? 'bg-amber-500 text-[#0E1014] shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Mic Pitch Detector</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('EAR');
              if (isListening) stopListening();
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'EAR'
                ? 'bg-amber-500 text-[#0E1014] shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Reference Tones</span>
          </button>
        </div>
      </div>

      {micError && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
          {micError}
        </div>
      )}

      {/* 2. Main Pitch Dial & Arched Gauge (7 cols) + Machine Head Peg Guide (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Needle Gauge Dial (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl bg-[#171A20] border border-[#2A303A] p-6 sm:p-8 flex flex-col justify-between shadow-xl relative overflow-hidden text-center">
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* Top Status */}
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 pb-2">
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isListening ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
              {isListening ? 'Microphone Active' : 'Standby'}
            </span>
            <span className="uppercase text-[10px] px-2 py-0.5 rounded bg-[#20242C] text-slate-300 border border-[#2A303A]">
              Autocorrelation 44.1k
            </span>
          </div>

          {/* Main Detected Pitch */}
          <div className="py-4 space-y-1">
            <div className="relative inline-block">
              <span
                className={`text-6xl sm:text-7xl font-black font-mono tracking-tight drop-shadow-md transition-colors ${
                  isInTune
                    ? 'text-emerald-400'
                    : Math.abs(centsOffset) > 10
                    ? 'text-amber-400'
                    : 'text-[#F8FAFC]'
                }`}
              >
                {detectedTarget ? detectedTarget.noteLetter : activeDisplayTarget.noteLetter}
                <span className="text-3xl text-slate-500 font-bold ml-1">
                  {detectedTarget ? detectedTarget.octave : activeDisplayTarget.octave}
                </span>
              </span>
              <span className="absolute -top-1 -right-8 px-1.5 py-0.5 bg-amber-500 text-[#0E1014] font-mono text-[9px] font-bold rounded">
                STR {detectedTarget ? detectedTarget.stringNum : activeDisplayTarget.stringNum}
              </span>
            </div>

            <div className="flex items-center justify-center gap-3 text-xs font-mono text-slate-400 pt-1">
              <span className="text-amber-400 font-bold">
                {detectedHz ? `${detectedHz} Hz` : `${activeDisplayTarget.freq} Hz`}
              </span>
              <span className="text-slate-600">•</span>
              <span>Target: {activeDisplayTarget.freq} Hz</span>
              <span className="text-slate-600">•</span>
              <span className={`font-bold ${isInTune ? 'text-emerald-400' : 'text-slate-300'}`}>
                {centsOffset > 0 ? `+${centsOffset}` : centsOffset} ct
              </span>
            </div>
          </div>

          {/* High-Precision Arched Cent Strobe Visualizer (SVG) */}
          <div className="w-full max-w-sm mx-auto my-2 relative">
            <svg aria-label="Cent Meter Visualizer" className="w-full h-auto overflow-visible" viewBox="0 0 300 150">
              {/* Background Arc */}
              <path d="M 30 140 A 120 120 0 0 1 270 140" fill="none" stroke="#2A303A" strokeLinecap="round" strokeWidth="12" />
              {/* Target Sweet Spot Arc (Emerald) */}
              <path d="M 138 21.5 A 120 120 0 0 1 162 21.5" fill="none" stroke="#22C55E" strokeLinecap="round" strokeWidth="16" />

              {/* Major Scale Ticks */}
              <line stroke="#64748B" strokeWidth="2" x1="30" x2="45" y1="140" y2="135" />
              <line stroke="#64748B" strokeWidth="2" x1="75" x2="88" y1="65" y2="72" />
              <line stroke="#22C55E" strokeWidth="3" x1="150" x2="150" y1="20" y2="38" />
              <line stroke="#64748B" strokeWidth="2" x1="225" x2="212" y1="65" y2="72" />
              <line stroke="#64748B" strokeWidth="2" x1="270" x2="255" y1="140" y2="135" />

              {/* Needle Gauge Pivot */}
              <g
                className="transition-transform duration-100 ease-out origin-bottom"
                style={{ transform: `rotate(${needleRotation}deg)`, transformOrigin: '150px 140px' }}
              >
                <line
                  stroke={isInTune ? '#22C55E' : '#F59E0B'}
                  strokeLinecap="round"
                  strokeWidth="3.5"
                  x1="150"
                  x2="150"
                  y1="140"
                  y2="24"
                />
                <circle cx="150" cy="140" fill={isInTune ? '#22C55E' : '#F59E0B'} r="8" />
                <circle cx="150" cy="140" fill="#0E1014" r="3" />
              </g>
            </svg>

            <div className="flex justify-between font-mono text-[10px] text-slate-500 px-4 -mt-2">
              <span>-50ct (FLAT)</span>
              <span className="text-emerald-400 font-bold">0.0 (IN TUNE)</span>
              <span>+50ct (SHARP)</span>
            </div>
          </div>

          {/* Action Trigger */}
          <div className="pt-4 border-t border-[#2A303A]/60 flex items-center justify-center">
            {activeTab === 'MIC' ? (
              !isListening ? (
                <button
                  onClick={startListening}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-[#0E1014] font-bold text-xs shadow-md shadow-amber-500/20 flex items-center gap-2 cursor-pointer"
                >
                  <Mic className="w-4 h-4" />
                  <span>Start Microphone Pitch Detector</span>
                </button>
              ) : (
                <button
                  onClick={stopListening}
                  className="px-5 py-2 rounded-xl bg-[#20242C] hover:bg-slate-700/60 text-slate-300 font-semibold text-xs border border-[#2A303A] flex items-center gap-2 cursor-pointer"
                >
                  <MicOff className="w-4 h-4 text-red-400" />
                  <span>Stop Listening</span>
                </button>
              )
            ) : (
              <button
                onClick={() => handlePlayString(selectedString)}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#0E1014] font-bold text-xs shadow-md shadow-amber-500/20 flex items-center gap-2"
              >
                <Volume2 className="w-4 h-4" />
                <span>Play Acoustic Reference Tone ({selectedString.note})</span>
              </button>
            )}
          </div>
        </div>

        {/* Machine Head Peg Guide (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl bg-[#171A20] border border-[#2A303A] p-6 flex flex-col justify-between shadow-xl">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span className="uppercase">Physical Peg Direction</span>
              <span className="text-amber-400 font-bold">3+3 Headstock</span>
            </div>
            <h2 className="text-base font-bold text-[#F8FAFC]">
              Machine Head Adjustment Guide
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Standard acoustic peg rotation eliminates gear-lash and maintains pitch stability.
            </p>

            {/* SVG Headstock Illustration */}
            <div className="w-full bg-[#121418] rounded-xl p-4 flex flex-col items-center justify-center relative my-2 border border-[#2A303A]/60">
              <svg aria-label="Acoustic Guitar Headstock" className="overflow-visible" height="200" viewBox="0 0 220 230" width="200">
                {/* Headstock Silhouette */}
                <path d="M 50 220 L 50 70 C 50 25, 90 15, 110 26 C 130 15, 170 25, 170 70 L 170 220 Z" fill="#1A1E26" stroke="#2A303A" strokeWidth="2" />
                {/* Nut */}
                <rect fill="#F8FAFC" height="6" rx="1" width="124" x="48" y="214" opacity="0.8" />

                {/* Left Side Pegs (Strings 6, 5, 4) */}
                {/* Peg 6 (Low E) */}
                <circle cx="35" cy="70" fill={activeDisplayTarget.stringNum === 6 ? '#F59E0B' : '#20242C'} r="9" stroke="#3A4250" strokeWidth="1.5" />
                <text fill={activeDisplayTarget.stringNum === 6 ? '#0E1014' : '#F8FAFC'} fontFamily="monospace" fontSize="8" fontWeight="bold" textAnchor="middle" x="35" y="73">E2</text>
                <line stroke={activeDisplayTarget.stringNum === 6 ? '#F59E0B' : '#3A4250'} strokeWidth="2" x1="35" x2="65" y1="70" y2="70" />

                {/* Peg 5 (A2) */}
                <circle cx="35" cy="115" fill={activeDisplayTarget.stringNum === 5 ? '#F59E0B' : '#20242C'} r="9" stroke="#3A4250" strokeWidth="1.5" />
                <text fill={activeDisplayTarget.stringNum === 5 ? '#0E1014' : '#F8FAFC'} fontFamily="monospace" fontSize="8" fontWeight="bold" textAnchor="middle" x="35" y="118">A2</text>
                <line stroke={activeDisplayTarget.stringNum === 5 ? '#F59E0B' : '#3A4250'} strokeWidth="2" x1="35" x2="72" y1="115" y2="115" />

                {/* Peg 4 (D3) */}
                <circle cx="35" cy="160" fill={activeDisplayTarget.stringNum === 4 ? '#F59E0B' : '#20242C'} r="9" stroke="#3A4250" strokeWidth="1.5" />
                <text fill={activeDisplayTarget.stringNum === 4 ? '#0E1014' : '#F8FAFC'} fontFamily="monospace" fontSize="8" fontWeight="bold" textAnchor="middle" x="35" y="163">D3</text>
                <line stroke={activeDisplayTarget.stringNum === 4 ? '#F59E0B' : '#3A4250'} strokeWidth="1.8" x1="35" x2="80" y1="160" y2="160" />

                {/* Right Side Pegs (Strings 3, 2, 1) */}
                {/* Peg 3 (G3) */}
                <circle cx="185" cy="160" fill={activeDisplayTarget.stringNum === 3 ? '#F59E0B' : '#20242C'} r="9" stroke="#3A4250" strokeWidth="1.5" />
                <text fill={activeDisplayTarget.stringNum === 3 ? '#0E1014' : '#F8FAFC'} fontFamily="monospace" fontSize="8" fontWeight="bold" textAnchor="middle" x="185" y="163">G3</text>
                <line stroke={activeDisplayTarget.stringNum === 3 ? '#F59E0B' : '#3A4250'} strokeWidth="1.5" x1="185" x2="140" y1="160" y2="160" />

                {/* Peg 2 (B3) */}
                <circle cx="185" cy="115" fill={activeDisplayTarget.stringNum === 2 ? '#F59E0B' : '#20242C'} r="9" stroke="#3A4250" strokeWidth="1.5" />
                <text fill={activeDisplayTarget.stringNum === 2 ? '#0E1014' : '#F8FAFC'} fontFamily="monospace" fontSize="8" fontWeight="bold" textAnchor="middle" x="185" y="118">B3</text>
                <line stroke={activeDisplayTarget.stringNum === 2 ? '#F59E0B' : '#3A4250'} strokeWidth="1.2" x1="185" x2="148" y1="115" y2="115" />

                {/* Peg 1 (High e4) */}
                <circle cx="185" cy="70" fill={activeDisplayTarget.stringNum === 1 ? '#F59E0B' : '#20242C'} r="9" stroke="#3A4250" strokeWidth="1.5" />
                <text fill={activeDisplayTarget.stringNum === 1 ? '#0E1014' : '#F8FAFC'} fontFamily="monospace" fontSize="8" fontWeight="bold" textAnchor="middle" x="185" y="73">e4</text>
                <line stroke={activeDisplayTarget.stringNum === 1 ? '#F59E0B' : '#3A4250'} strokeWidth="1" x1="185" x2="155" y1="70" y2="70" />

                {/* Strings to Nut */}
                <line stroke="#F59E0B" strokeWidth="2.5" x1="65" x2="65" y1="70" y2="214" />
                <line stroke="#475569" strokeWidth="2.0" x1="72" x2="80" y1="115" y2="214" />
                <line stroke="#475569" strokeWidth="1.6" x1="80" x2="95" y1="160" y2="214" />
                <line stroke="#475569" strokeWidth="1.4" x1="140" x2="125" y1="160" y2="214" />
                <line stroke="#475569" strokeWidth="1.2" x1="148" x2="140" y1="115" y2="214" />
                <line stroke="#475569" strokeWidth="1.0" x1="155" x2="155" y1="70" y2="214" />
              </svg>
            </div>

            {/* Instruction pill */}
            <div className="p-3 rounded-xl bg-[#20242C] border border-[#2A303A] flex items-center justify-between text-xs font-mono">
              <span className="text-amber-400 font-bold">
                {centsOffset < 0 ? '⟳ Tighten Peg' : '⟲ Loosen Peg'}
              </span>
              <span className="text-emerald-400 font-medium">
                {centsOffset < 0 ? 'Tune UP to pitch' : 'Tune DOWN to pitch'}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#20242C]/70 border border-[#2A303A] text-xs text-slate-400 mt-3">
            <span className="text-amber-400 font-bold block mb-0.5">Anti-Backlash Tip:</span>
            Always tune upwards into pitch. If sharp, drop below target pitch first, then tighten upwards to final tension.
          </div>
        </div>
      </div>

      {/* 3. Bottom Row: 6-String Isolation & Audio Reference Palette */}
      <div className="rounded-2xl bg-[#171A20] border border-[#2A303A] p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#2A303A] pb-3">
          <div>
            <h3 className="text-sm font-bold text-[#F8FAFC]">
              String Isolation & Pure Acoustic Reference Tones
            </h3>
            <p className="text-xs text-slate-400">
              Click any string card to pluck its synthesized dual-oscillator acoustic waveform.
            </p>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
            A440 Calibrated
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {STANDARD_TUNING.map((str) => {
            const isSelected = activeDisplayTarget.stringNum === str.stringNum;
            return (
              <button
                key={str.stringNum}
                onClick={() => handlePlayString(str)}
                className={`p-3.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-amber-500 bg-[#20242C] shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                    : 'border-[#2A303A] bg-[#121418] hover:border-slate-500 hover:bg-[#1A1E26]'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                  <span>STR {str.stringNum}</span>
                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
                </div>
                <div className="my-1">
                  <span className={`text-2xl font-black font-mono block ${isSelected ? 'text-amber-400' : 'text-[#F8FAFC]'}`}>
                    {str.note}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">{str.freq.toFixed(1)} Hz</span>
                </div>
                <div className="mt-2 py-1 rounded bg-[#20242C] text-[10px] font-mono uppercase text-slate-300 flex items-center justify-center gap-1 border border-[#2A303A]">
                  <Volume2 className="w-3 h-3 text-amber-400" />
                  <span>Pluck</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
