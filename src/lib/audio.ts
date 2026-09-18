// Web Audio API Acoustic Guitar Synthesizer, Metronome Click, Pitch Utilities, and Autocorrelation Pitch Detector
// Uses Karplus-Strong style damped oscillators to synthesize realistic guitar string plucked tones.

let audioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Frequency table for standard guitar string notes
const NOTE_FREQUENCIES: Record<string, number> = {
  // Open strings (Standard Tuning)
  E2: 82.41,
  A2: 110.0,
  D3: 146.83,
  G3: 196.0,
  B3: 246.94,
  E4: 329.63,

  // Common fretted notes
  C3: 130.81,
  F3: 174.61,
  Fsharp3: 185.0,
  Gsharp3: 207.65,
  Asharp3: 233.08,
  C4: 261.63,
  Csharp4: 277.18,
  D4: 293.66,
  Dsharp4: 311.13,
  F4: 349.23,
  Fsharp4: 369.99,
  G4: 392.0,
  A4: 440.0,
  B4: 493.88,
};

export interface GuitarStringInfo {
  stringNum: number; // 6 to 1
  name: string; // 'Low E', 'A', 'D', 'G', 'B', 'High E'
  note: string; // 'E2', 'A2', 'D3', 'G3', 'B3', 'E4'
  noteLetter: string;
  freq: number;
  octave: number;
}

export const STANDARD_TUNING: GuitarStringInfo[] = [
  { stringNum: 6, name: 'Low E', note: 'E2', noteLetter: 'E', freq: 82.41, octave: 2 },
  { stringNum: 5, name: 'A', note: 'A2', noteLetter: 'A', freq: 110.0, octave: 2 },
  { stringNum: 4, name: 'D', note: 'D3', noteLetter: 'D', freq: 146.83, octave: 3 },
  { stringNum: 3, name: 'G', note: 'G3', noteLetter: 'G', freq: 196.0, octave: 3 },
  { stringNum: 2, name: 'B', note: 'B3', noteLetter: 'B', freq: 246.94, octave: 3 },
  { stringNum: 1, name: 'High E', note: 'E4', noteLetter: 'E', freq: 329.63, octave: 4 },
];

const CHROMATIC_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Semitone offset for each open string from C0
const OPEN_STRING_SEMITONES: Record<number, number> = {
  6: 28, // E2
  5: 33, // A2
  4: 38, // D3
  3: 43, // G3
  2: 47, // B3
  1: 52, // E4
};

/**
 * Calculates the exact frequency for a given string and fret.
 */
export function getFretFrequency(stringNum: number, fret: number): number {
  const openStr = STANDARD_TUNING.find((s) => s.stringNum === stringNum);
  if (!openStr) return 440;
  return openStr.freq * Math.pow(2, fret / 12);
}

/**
 * Returns note name and octave for a given string and fret.
 */
export function getFretNoteInfo(stringNum: number, fret: number): { noteName: string; octave: number; isRootC?: boolean } {
  const openSemitones = OPEN_STRING_SEMITONES[stringNum] ?? 28;
  const totalSemitones = openSemitones + fret;
  const noteIndex = totalSemitones % 12;
  const octave = Math.floor(totalSemitones / 12);
  const noteName = CHROMATIC_NOTES[noteIndex];
  return { noteName, octave, isRootC: noteName === 'C' };
}

/**
 * Synthesizes a single plucked guitar string sound.
 */
export function playGuitarString(freq: number, duration = 1.2, startTimeOffset = 0) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime + startTimeOffset;

  // Dual oscillator for rich harmonic resonance
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gainNode = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc1.type = 'triangle';
  osc1.frequency.setValueAtTime(freq, now);

  osc2.type = 'sawtooth';
  osc2.frequency.setValueAtTime(freq * 1.002, now); // subtle chorus/detune

  // Lowpass filter for acoustic wood warmth
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1800, now);
  filter.frequency.exponentialRampToValueAtTime(300, now + duration * 0.8);

  // Karplus-Strong style rapid attack and exponential acoustic decay
  gainNode.gain.setValueAtTime(0.001, now);
  gainNode.gain.linearRampToValueAtTime(0.3, now + 0.015);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + duration);
  osc2.stop(now + duration);
}

/**
 * Strums a chord by rolling string plucks across time.
 */
export function strumChord(
  diagramStrings: (number | string)[],
  direction: 'DOWN' | 'UP' = 'DOWN'
) {
  // Base open frequencies from string 6 to string 1
  const openFreqs = [82.41, 110.0, 146.83, 196.0, 246.94, 329.63];

  const activeStrings: { stringIndex: number; freq: number }[] = [];

  diagramStrings.forEach((fret, i) => {
    if (fret === 'X' || fret === 'x' || fret === null) return;
    const fretNum = typeof fret === 'number' ? fret : parseInt(fret, 10);
    if (isNaN(fretNum)) return;

    // Calculate frequency: freq = base * 2^(fret/12)
    const baseFreq = openFreqs[i];
    const stringFreq = baseFreq * Math.pow(2, fretNum / 12);
    activeStrings.push({ stringIndex: i, freq: stringFreq });
  });

  if (direction === 'UP') {
    activeStrings.reverse();
  }

  const strumDelay = 0.04; // 40ms stagger between strings
  activeStrings.forEach((item, index) => {
    playGuitarString(item.freq, 1.8, index * strumDelay);
  });
}

/**
 * Plays a crisp metronome click tone.
 */
export function playMetronomeClick(isHighAccent = false) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(isHighAccent ? 1200 : 800, now);

  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.05);
}

/**
 * Autocorrelation algorithm for microphone guitar pitch detection.
 * Computes fundamental frequency (Hz) or returns -1 if signal is noise/silence.
 */
export function autoCorrelate(buf: Float32Array, sampleRate: number): number {
  let rms = 0;
  for (let i = 0; i < buf.length; i++) {
    rms += buf[i] * buf[i];
  }
  rms = Math.sqrt(rms / buf.length);
  if (rms < 0.015) return -1; // Ignore silence or low ambient noise

  // Trim quiet ends to isolate clean vibration
  let r1 = 0;
  let r2 = buf.length - 1;
  const thres = 0.2;
  for (let i = 0; i < buf.length / 2; i++) {
    if (Math.abs(buf[i]) < thres) {
      r1 = i;
      break;
    }
  }
  for (let i = 1; i < buf.length / 2; i++) {
    if (Math.abs(buf[buf.length - i]) < thres) {
      r2 = buf.length - i;
      break;
    }
  }

  const trimmed = buf.slice(r1, r2);
  const c = new Float32Array(trimmed.length);
  for (let i = 0; i < trimmed.length; i++) {
    for (let j = 0; j < trimmed.length - i; j++) {
      c[i] = c[i] + trimmed[j] * trimmed[j + i];
    }
  }

  // Find the primary peak
  let d = 0;
  while (c[d] > c[d + 1]) d++;
  let maxval = -1;
  let maxpos = -1;
  for (let i = d; i < trimmed.length; i++) {
    if (c[i] > maxval) {
      maxval = c[i];
      maxpos = i;
    }
  }

  let T0 = maxpos;
  if (T0 <= 0 || T0 >= trimmed.length - 1) return -1;

  // Parabolic interpolation for sub-bin precision
  const x1 = c[T0 - 1];
  const x2 = c[T0];
  const x3 = c[T0 + 1];
  const a = (x1 + x3 - 2 * x2) / 2;
  const b = (x3 - x1) / 2;
  if (a) {
    T0 = T0 - b / (2 * a);
  }

  const pitch = sampleRate / T0;
  // Guitar pitch fundamental range: ~70Hz (low D drop) to ~450Hz (high fret A4)
  if (pitch < 70 || pitch > 450) return -1;
  return pitch;
}

/**
 * Finds the nearest guitar string in standard tuning and cent deviation.
 */
export function getNearestGuitarString(freq: number): {
  target: GuitarStringInfo;
  cents: number;
  inTune: boolean;
} {
  let closestString = STANDARD_TUNING[0];
  let minDiff = Infinity;

  for (const s of STANDARD_TUNING) {
    const diff = Math.abs(freq - s.freq);
    if (diff < minDiff) {
      minDiff = diff;
      closestString = s;
    }
  }

  // Cents formula: 1200 * log2(f / f_target)
  const cents = Math.round(1200 * Math.log2(freq / closestString.freq));
  const inTune = Math.abs(cents) <= 3; // within +- 3 cents is spot-on

  return { target: closestString, cents, inTune };
}

export { NOTE_FREQUENCIES, CHROMATIC_NOTES };
