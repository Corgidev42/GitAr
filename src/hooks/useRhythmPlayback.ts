'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getRhythmAttackSteps, scheduleRhythmClicks, type RhythmPlaybackItem } from '@/lib/rhythmPlayback';
import { tabGridStepFromElapsed, tabGridTotalDurationSec } from '@/lib/tabGridTiming';
import { claimExclusivePlayback, releaseExclusivePlayback } from '@/lib/playbackCoordinator';

const STEPS_PER_MEASURE = 8;

export type RhythmPatternPlayback = {
  measures: number;
  items: RhythmPlaybackItem[];
  tripletFeel?: boolean;
};

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
  const [loop, setLoop] = useState(false);
  const bpmRef = useRef(96);
  bpmRef.current = bpm;
  const loopRef = useRef(false);
  loopRef.current = loop;

  const audioRef = useRef<{ ctx: AudioContext | null; master: GainNode | null }>({ ctx: null, master: null });
  const metaRef = useRef({ startMs: 0 });

  const stop = useCallback(() => {
    setPlaying(false);
    setPlayhead(null);
    muteMaster(audioRef);
    releaseExclusivePlayback(instanceTokenRef.current);
  }, []);

  const scheduleOnePass = useCallback(() => {
    const p = patternRef.current;
    const attacks = getRhythmAttackSteps(p.items);
    const { ctx, master } = audioRef.current;
    if (!ctx || !master) return;
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(0.32, now);
    const t0 = now + 0.06;
    scheduleRhythmClicks(ctx, master, attacks, bpmRef.current, t0, p.measures, p.tripletFeel === true);
  }, []);

  const startPlayback = useCallback(async () => {
    if (playing) return;

    const p = patternRef.current;

    claimExclusivePlayback(instanceTokenRef.current, stop);

    let { ctx, master } = audioRef.current;
    if (!ctx || !master) {
      const nextCtx = createAudioContext();
      if (!nextCtx) {
        errCbRef.current?.('La lecture audio n’est pas disponible sur ce navigateur.');
        releaseExclusivePlayback(instanceTokenRef.current);
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
      releaseExclusivePlayback(instanceTokenRef.current);
      return;
    }

    scheduleOnePass();

    metaRef.current = { startMs: performance.now() };
    setPlaying(true);
    setPlayhead(0);
    errCbRef.current?.('');
  }, [playing, scheduleOnePass, stop]);

  useEffect(() => {
    if (!playing) return;
    let cancelled = false;
    let raf = 0;
    const token = instanceTokenRef.current;

    const tick = () => {
      if (cancelled) return;
      const p = patternRef.current;
      const measures = p.measures;
      const tripletFeel = p.tripletFeel === true;
      const bpmVal = bpmRef.current;
      const elapsedSec = (performance.now() - metaRef.current.startMs) / 1000;
      const totalDur = tabGridTotalDurationSec(measures, bpmVal);
      if (elapsedSec >= totalDur - 1e-6) {
        if (loopRef.current) {
          scheduleOnePass();
          metaRef.current = { startMs: performance.now() };
          setPlayhead(0);
          raf = requestAnimationFrame(tick);
          return;
        }
        setPlaying(false);
        setPlayhead(null);
        releaseExclusivePlayback(token);
        return;
      }
      const step = tabGridStepFromElapsed(elapsedSec, measures, STEPS_PER_MEASURE, bpmVal, tripletFeel);
      setPlayhead((prev) => (prev === step ? prev : step));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [playing, scheduleOnePass]);

  const signatureRef = useRef('');
  const sig = `${pattern.measures}|${pattern.tripletFeel === true ? '1' : '0'}|${pattern.items.map((i) => `${i.id}:${i.start}:${i.length}:${i.syncToStart ?? ''}`).join(',')}`;
  useEffect(() => {
    if (signatureRef.current === sig) return;
    signatureRef.current = sig;
    setPlaying((was) => {
      if (!was) return false;
      muteMaster(audioRef);
      setPlayhead(null);
      releaseExclusivePlayback(instanceTokenRef.current);
      return false;
    });
  }, [sig]);

  useEffect(
    () => () => {
      muteMaster(audioRef);
      releaseExclusivePlayback(instanceTokenRef.current);
    },
    [],
  );

  return { playing, playhead, bpm, setBpm, loop, setLoop, start: startPlayback, stop };
}
