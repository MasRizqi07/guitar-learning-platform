import { describe, it, expect } from 'vitest';
import {
  getFretFrequency,
  getFretNoteInfo,
  getNearestGuitarString,
  autoCorrelate,
} from '@/lib/audio';

describe('Web Audio Pitch Mathematics & Tuner Engine', () => {
  describe('Fret Frequency Calculation (f = f0 * 2^(fret/12))', () => {
    it('returns exact open string frequencies for fret 0', () => {
      expect(getFretFrequency(6, 0)).toBeCloseTo(82.41, 1);
      expect(getFretFrequency(5, 0)).toBeCloseTo(110.0, 1);
      expect(getFretFrequency(4, 0)).toBeCloseTo(146.83, 1);
      expect(getFretFrequency(3, 0)).toBeCloseTo(196.0, 1);
      expect(getFretFrequency(2, 0)).toBeCloseTo(246.94, 1);
      expect(getFretFrequency(1, 0)).toBeCloseTo(329.63, 1);
    });

    it('calculates octave accurately at fret 12 (double frequency)', () => {
      const openE2 = getFretFrequency(6, 0);
      const fret12E3 = getFretFrequency(6, 12);
      expect(fret12E3).toBeCloseTo(openE2 * 2, 1);

      const openA2 = getFretFrequency(5, 0);
      const fret12A3 = getFretFrequency(5, 12);
      expect(fret12A3).toBeCloseTo(openA2 * 2, 1);
    });

    it('calculates intermediate frets accurately', () => {
      // 5th fret on Low E (string 6) is A2 = 110.0 Hz
      const fifthFretLowE = getFretFrequency(6, 5);
      expect(fifthFretLowE).toBeCloseTo(110.0, 0);

      // 7th fret on Low E (string 6) is B2 ≈ 123.47 Hz
      const seventhFretLowE = getFretFrequency(6, 7);
      expect(seventhFretLowE).toBeCloseTo(123.47, 0);
    });
  });

  describe('Fret Note Identification', () => {
    it('identifies open string notes correctly', () => {
      expect(getFretNoteInfo(6, 0)).toEqual({ noteName: 'E', octave: 2, isRootC: false });
      expect(getFretNoteInfo(5, 0)).toEqual({ noteName: 'A', octave: 2, isRootC: false });
      expect(getFretNoteInfo(4, 0)).toEqual({ noteName: 'D', octave: 3, isRootC: false });
      expect(getFretNoteInfo(3, 0)).toEqual({ noteName: 'G', octave: 3, isRootC: false });
      expect(getFretNoteInfo(2, 0)).toEqual({ noteName: 'B', octave: 3, isRootC: false });
      expect(getFretNoteInfo(1, 0)).toEqual({ noteName: 'E', octave: 4, isRootC: false });
    });

    it('identifies C root notes correctly', () => {
      // 3rd fret on A string (string 5) is C3
      const note = getFretNoteInfo(5, 3);
      expect(note.noteName).toBe('C');
      expect(note.octave).toBe(3);
      expect(note.isRootC).toBe(true);

      // 1st fret on B string (string 2) is C4
      const noteC4 = getFretNoteInfo(2, 1);
      expect(noteC4.noteName).toBe('C');
      expect(noteC4.octave).toBe(4);
      expect(noteC4.isRootC).toBe(true);
    });
  });

  describe('Tuner Nearest String & Cent Deviation', () => {
    it('identifies in-tune strings when frequency matches target (<= 3 cents)', () => {
      const resultE2 = getNearestGuitarString(82.41);
      expect(resultE2.target.note).toBe('E2');
      expect(resultE2.cents).toBe(0);
      expect(resultE2.inTune).toBe(true);

      const resultA2 = getNearestGuitarString(110.0);
      expect(resultA2.target.note).toBe('A2');
      expect(resultA2.cents).toBe(0);
      expect(resultA2.inTune).toBe(true);
    });

    it('calculates positive cents when sharp', () => {
      // 112 Hz is sharp relative to 110 Hz
      const sharpA = getNearestGuitarString(112.0);
      expect(sharpA.target.note).toBe('A2');
      expect(sharpA.cents).toBeGreaterThan(0);
      expect(sharpA.inTune).toBe(false);
    });

    it('calculates negative cents when flat', () => {
      // 108 Hz is flat relative to 110 Hz
      const flatA = getNearestGuitarString(108.0);
      expect(flatA.target.note).toBe('A2');
      expect(flatA.cents).toBeLessThan(0);
      expect(flatA.inTune).toBe(false);
    });
  });

  describe('Autocorrelation Pitch Detection Algorithm', () => {
    it('returns -1 for silence (zero RMS buffer)', () => {
      const silentBuffer = new Float32Array(2048);
      expect(autoCorrelate(silentBuffer, 44100)).toBe(-1);
    });

    it('returns -1 for low-amplitude noise below threshold', () => {
      const noiseBuffer = new Float32Array(2048);
      for (let i = 0; i < noiseBuffer.length; i++) {
        noiseBuffer[i] = (Math.random() - 0.5) * 0.005; // tiny amplitude < 0.015 RMS
      }
      expect(autoCorrelate(noiseBuffer, 44100)).toBe(-1);
    });

    it('detects fundamental frequency from a clean synthetic sine wave', () => {
      const sampleRate = 44100;
      const targetFreq = 110.0; // A2
      const buffer = new Float32Array(2048);

      for (let i = 0; i < buffer.length; i++) {
        buffer[i] = 0.5 * Math.sin((2 * Math.PI * targetFreq * i) / sampleRate);
      }

      const detected = autoCorrelate(buffer, sampleRate);
      expect(detected).toBeGreaterThan(0);
      expect(detected).toBeCloseTo(targetFreq, 0); // Within ~1 Hz precision
    });

    it('detects fundamental frequency for D3 (146.83 Hz)', () => {
      const sampleRate = 44100;
      const targetFreq = 146.83; // D3
      const buffer = new Float32Array(2048);

      for (let i = 0; i < buffer.length; i++) {
        buffer[i] = 0.5 * Math.sin((2 * Math.PI * targetFreq * i) / sampleRate);
      }

      const detected = autoCorrelate(buffer, sampleRate);
      expect(detected).toBeGreaterThan(0);
      expect(detected).toBeCloseTo(targetFreq, 0);
    });
  });
});
