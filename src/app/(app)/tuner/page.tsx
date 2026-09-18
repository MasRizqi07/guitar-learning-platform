'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  Mic,
  MicOff,
  Radio,
  Info,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  RotateCcw,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
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

  // Start microphone listener
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

      const ctx = getAudioContext() || new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
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

  // Keep looping with newly selected string if loop is active
  useEffect(() => {
    if (isLooping) {
      if (loopIntervalRef.current) clearInterval(loopIntervalRef.current);
      playGuitarString(selectedString.freq, 2.2);
      loopIntervalRef.current = setInterval(() => {
        playGuitarString(selectedString.freq, 2.2);
      }, 2400);
    }
  }, [selectedString, isLooping]);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-widest mb-1">
            <Radio className="w-3.5 h-3.5" />
            <span>Essential Utility</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">Guitar Tuner</h1>
          <p className="text-sm text-slate-400 mt-1">
            Standard Tuning (E A D G B E). Use your microphone or tune by ear with acoustic reference tones.
          </p>
        </div>

        {/* Mode Selector */}
        <div className="inline-flex rounded-xl bg-[#171A20] p-1 border border-[#2A303A]">
          <button
            onClick={() => {
              setActiveTab('MIC');
              if (isLooping) toggleLoop();
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'MIC'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Mic Tuner</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('EAR');
              if (isListening) stopListening();
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'EAR'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>By Ear (Tones)</span>
          </button>
        </div>
      </div>

      {/* Mode 1: Microphone Pitch Detector */}
      {activeTab === 'MIC' && (
        <Card className="p-8 bg-[#171A20] border-[#2A303A] text-center space-y-8 relative overflow-hidden">
          {micError && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
              {micError}
            </div>
          )}

          {!isListening ? (
            <div className="py-12 space-y-4">
              <div className="w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400">
                <Mic className="w-10 h-10" />
              </div>
              <h2 className="text-xl font-bold text-slate-100">Microphone Pitch Detection</h2>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Click below to allow microphone access. Pluck any open string cleanly to see real-time pitch accuracy.
              </p>
              <div>
                <Button onClick={startListening} className="px-8 py-3 text-sm font-bold shadow-lg shadow-amber-500/20">
                  Start Listening
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Note Display Display */}
              <div className="space-y-2">
                <span className="text-xs uppercase font-mono tracking-widest text-slate-400">
                  {detectedTarget ? `String ${detectedTarget.stringNum} (${detectedTarget.name})` : 'Pluck a string...'}
                </span>
                <div
                  className={`text-6xl sm:text-7xl font-black tracking-tight transition-colors duration-200 ${
                    isInTune
                      ? 'text-emerald-400'
                      : Math.abs(centsOffset) > 10
                      ? 'text-amber-400'
                      : 'text-slate-100'
                  }`}
                >
                  {detectedTarget?.noteLetter || '--'}
                </div>
                <div className="text-sm font-mono text-slate-400">
                  {detectedHz ? `${detectedHz} Hz` : 'Listening for signal...'}
                  {detectedTarget && (
                    <span className="text-slate-500 ml-2">(Target: {detectedTarget.freq} Hz)</span>
                  )}
                </div>
              </div>

              {/* Tuning Needle Gauge */}
              <div className="max-w-md mx-auto space-y-3">
                <div className="relative h-6 bg-[#121418] rounded-full border border-[#2A303A] flex items-center overflow-hidden px-1">
                  {/* Center In-Tune Zone */}
                  <div className="absolute left-1/2 -translate-x-1/2 w-4 h-full bg-emerald-500/30 border-x border-emerald-400/50" />
                  {/* Needle */}
                  <div
                    className="absolute top-1 bottom-1 w-2 rounded-full transition-all duration-100"
                    style={{
                      left: `calc(50% + ${Math.max(-45, Math.min(45, centsOffset))}%)`,
                      transform: 'translateX(-50%)',
                      backgroundColor: isInTune ? '#34D399' : '#F59E0B',
                      boxShadow: isInTune ? '0 0 10px #34D399' : '0 0 10px #F59E0B',
                    }}
                  />
                </div>

                <div className="flex justify-between text-[11px] font-mono text-slate-500">
                  <span>-50c (Flat)</span>
                  <span className="text-emerald-400 font-bold">0 (Perfect)</span>
                  <span>+50c (Sharp)</span>
                </div>
              </div>

              {/* Feedback status banner */}
              <div>
                {detectedTarget ? (
                  isInTune ? (
                    <Badge variant="success" size="md" className="py-2 px-4 text-xs">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>In Tune! Spot-on ({centsOffset > 0 ? `+${centsOffset}` : centsOffset} cents)</span>
                    </Badge>
                  ) : centsOffset < 0 ? (
                    <Badge variant="warning" size="md" className="py-2 px-4 text-xs">
                      <ArrowUp className="w-4 h-4" />
                      <span>Too Flat: Turn peg counter-clockwise to pitch UP ({centsOffset}c)</span>
                    </Badge>
                  ) : (
                    <Badge variant="warning" size="md" className="py-2 px-4 text-xs">
                      <ArrowDown className="w-4 h-4" />
                      <span>Too Sharp: Turn peg clockwise to pitch DOWN (+{centsOffset}c)</span>
                    </Badge>
                  )
                ) : (
                  <span className="text-xs text-slate-500 animate-pulse">
                    Pluck any single guitar string...
                  </span>
                )}
              </div>

              <div>
                <Button onClick={stopListening} variant="outline" size="sm" className="gap-2">
                  <MicOff className="w-4 h-4 text-red-400" />
                  <span>Stop Listening</span>
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Mode 2: By Ear (Reference Tones) */}
      {activeTab === 'EAR' && (
        <Card className="p-8 bg-[#171A20] border-[#2A303A] space-y-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[#2A303A] pb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-100">Acoustic Reference Tones</h2>
              <p className="text-xs text-slate-400">
                Pluck each string button to hear its pure acoustic frequency. Adjust your guitar until the pitch matches without warble.
              </p>
            </div>

            <Button
              onClick={toggleLoop}
              variant="outline"
              size="sm"
              className={`gap-2 ${isLooping ? 'border-amber-500 text-amber-400 bg-amber-500/10' : ''}`}
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isLooping ? 'animate-spin' : ''}`} />
              <span>{isLooping ? 'Stop Repeat' : 'Continuous Repeat'}</span>
            </Button>
          </div>

          {/* 6 String Selectors */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {STANDARD_TUNING.map((str) => {
              const isSelected = selectedString.stringNum === str.stringNum;
              return (
                <button
                  key={str.stringNum}
                  onClick={() => handlePlayString(str)}
                  className={`p-4 rounded-2xl border text-center transition-all group ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-500 text-slate-100 shadow-lg shadow-amber-500/10 scale-105'
                      : 'bg-[#121418] border-[#2A303A] text-slate-400 hover:text-slate-200 hover:border-amber-500/40'
                  }`}
                >
                  <span className="text-[11px] font-mono text-slate-500 block mb-1">
                    String {str.stringNum}
                  </span>
                  <span className="text-2xl font-black block text-slate-100 group-hover:text-amber-400 transition-colors">
                    {str.note}
                  </span>
                  <span className="text-[10px] text-amber-400/80 font-mono block mt-1">
                    {str.freq} Hz
                  </span>
                  <div className="mt-3">
                    <span className="inline-flex items-center justify-center p-1.5 rounded-lg bg-white/5 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors text-slate-400">
                      <Volume2 className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active String Detail */}
          <div className="p-4 rounded-2xl bg-[#121418] border border-[#2A303A] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xl">
                {selectedString.noteLetter}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-200">
                  {selectedString.name} ({selectedString.note})
                </h4>
                <p className="text-xs text-slate-400">
                  Standard frequency: <span className="text-amber-400 font-mono">{selectedString.freq} Hz</span>
                </p>
              </div>
            </div>

            <Button
              onClick={() => handlePlayString(selectedString)}
              className="w-full sm:w-auto gap-2"
            >
              <Volume2 className="w-4 h-4" />
              <span>Pluck Tone</span>
            </Button>
          </div>
        </Card>
      )}

      {/* Beginner Tuning Tips Section */}
      <Card className="p-6 bg-[#171A20] border-[#2A303A] space-y-4">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Info className="w-4 h-4 text-amber-400" />
          <span>Beginner Tuning Advice</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-400 leading-relaxed">
          <div className="p-3.5 rounded-xl bg-[#121418] border border-[#2A303A]">
            <h4 className="font-bold text-slate-200 mb-1 text-xs">1. Always Tune Up</h4>
            <p>
              If your string is too sharp, tune it lower first (below target), then tune back up to pitch. This locks string tension against the tuning gear.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#121418] border border-[#2A303A]">
            <h4 className="font-bold text-slate-200 mb-1 text-xs">2. Mute Other Strings</h4>
            <p>
              Rest your palm lightly on other strings so only the string being tuned vibrates. Sympathetic vibrations can confuse the pitch detector.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#121418] border border-[#2A303A]">
            <h4 className="font-bold text-slate-200 mb-1 text-xs">3. Tune Daily</h4>
            <p>
              Wooden acoustic guitars expand and contract with temperature and humidity changes. Check your tuning every time before you begin practicing!
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
