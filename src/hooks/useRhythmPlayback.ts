'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getRhythmAttackSteps,
  rhythmStepDurationSec,
  scheduleRhythmClicks,
  type RhythmPlaybackItem,
} from '@/lib/rhythmPlayback';

const STEPS_PER_MEASURE = 8;

export type RhythmPatternPlayback = {
  measures: number;
  items: RhythmPlaybackItem[];
};

let activeStopGlobal: (() => void) | null = null;
let activeTokenGlobal: object | null = null;

function createAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  return new AC();
}

function muteMaster(audioRef: { current: { ctx: AudioContext | null; master: GainNode | null } }) {
  const { ctx, master } = audioRef.current;
  if (ctx && master) {
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(0, t);
    master.gain.setValueAtTime(0.32, t + 0.06);
  }
}

export function useRhythmPlayback(
  pattern: RhythmPatternPlayback,
  options?: { onAudioError?: (message: string) => void },
) {
  const patternRef = useRef(pattern);
  patternRef.current = pattern;

  const errCbRef = useRef(options?.onAudioError);
  errCbRef.current = options?.onAudioError;

  const instanceTokenRef = useRef<object>({});
  const [playing, setPlaying] = useState(false);
  const [playhead, setPlayhead] = useState<number | null>(null);
  const [bpm, setBpm] = useState(96);
  const audioRef = useRef<{ ctx: AudioContext | null; master: GainNode | null }>({ ctx: null, master: null });
  const metaRef = useRef({ startMs: 0, totalSteps: 8, secPerStep: 0.25 });

  const clearActiveIfUs = useCallback(() => {
    if (activeTokenGlobal === instanceTokenRef.current) {
      activeStopGlobal = null;
      activeTokenGlobal = null;
    }
  }, []);

  const stop = useCallback(() => {
    setPlaying(false);
    setPlayhead(null);
    muteMaster(audioRef);
    clearActiveIfUs();
  }, [clearActiveIfUs]);

  const startPlayback = useCallback(async () => {
    if (playing) return;

    const p = patternRef.current;
    const totalSteps = p.measures * STEPS_PER_MEASURE;
    const attacks = getRhythmAttackSteps(p.items);

    if (activeStopGlobal) activeStopGlobal();

    activeStopGlobal = stop;
    activeTokenGlobal = instanceTokenRef.current;

    let { ctx, master } = audioRef.current;
    if (!ctx || !master) {
      const nextCtx = createAudioContext();
      if (!nextCtx) {
        errCbRef.current?.('La lecture audio n’est pas disponible sur ce navigateur.');
        clearActiveIfUs();
        return;
      }
      ctx = nextCtx;
      master = ctx.createGain();
      master.gain.value = 0.32;
      master.connect(ctx.destination);
      audioRef.current = { ctx, master };
    }

    try {
      if (ctx.state === 'suspended') await ctx.resume();
    } catch {
      errCbRef.current?.('Impossible de démarrer l’audio (autorise le son si le navigateur le demande).');
      clearActiveIfUs();
      return;
    }

    const secPerStep = rhythmStepDurationSec(bpm);
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(0.32, now);
    const t0 = now + 0.08;
    scheduleRhythmClicks(ctx, master, attacks, bpm, t0);

    metaRef.current = {
      startMs: performance.now(),
      totalSteps,
      secPerStep,
    };
    setPlaying(true);
    setPlayhead(0);
    errCbRef.current?.('');
  }, [playing, bpm, stop, clearActiveIfUs]);

  useEffect(() => {
    if (!playing) return;
    let cancelled = false;
    let raf = 0;
    const { startMs, totalSteps, secPerStep } = metaRef.current;
    const durationMs = totalSteps * secPerStep * 1000;
    const token = instanceTokenRef.current;

    const tick = () => {
      if (cancelled) return;
      const elapsed = performance.now() - startMs;
      if (elapsed >= durationMs) {
        setPlaying(false);
        setPlayhead(null);
        if (activeTokenGlobal === token) {
          activeStopGlobal = null;
          activeTokenGlobal = null;
        }
        return;
      }
      const step = Math.min(Math.floor(elapsed / (secPerStep * 1000)), totalSteps - 1);
      setPlayhead((prev) => (prev === step ? prev : step));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [playing]);

  const signatureRef = useRef('');
  const sig = `${pattern.measures}|${pattern.items.map((i) => `${i.id}:${i.start}:${i.length}:${i.syncToStart ?? ''}`).join(',')}`;
  useEffect(() => {
    if (signatureRef.current === sig) return;
    signatureRef.current = sig;
    setPlaying((was) => {
      if (!was) return false;
      muteMaster(audioRef);
      setPlayhead(null);
      clearActiveIfUs();
      return false;
    });
  }, [sig, clearActiveIfUs]);

  useEffect(
    () => () => {
      muteMaster(audioRef);
      clearActiveIfUs();
    },
    [clearActiveIfUs],
  );

  return { playing, playhead, bpm, setBpm, start: startPlayback, stop };
}
