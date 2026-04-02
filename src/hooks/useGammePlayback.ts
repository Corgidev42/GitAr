'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { GammePatternV1 } from '@/lib/gammeCodec';
import { resolveGammeStepsPerMeasure } from '@/lib/gammeCodec';
import { gammeStepDurationSec, scheduleGammePass } from '@/lib/gammePlayback';
import { claimExclusivePlayback, releaseExclusivePlayback } from '@/lib/playbackCoordinator';

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

export function useGammePlayback(pattern: GammePatternV1, options?: { onAudioError?: (message: string) => void }) {
  const patternRef = useRef(pattern);
  patternRef.current = pattern;

  const errCbRef = useRef(options?.onAudioError);
  errCbRef.current = options?.onAudioError;

  const instanceTokenRef = useRef<object>({});
  const [playing, setPlaying] = useState(false);
  const [playhead, setPlayhead] = useState<number | null>(null);
  const [bpm, setBpm] = useState(72);
  const [loop, setLoop] = useState(false);
  const bpmRef = useRef(72);
  bpmRef.current = bpm;
  const loopRef = useRef(false);
  loopRef.current = loop;

  const audioRef = useRef<{ ctx: AudioContext | null; master: GainNode | null }>({ ctx: null, master: null });
  const metaRef = useRef({ startMs: 0, totalSteps: 4, secPerStep: 0.5 });

  const stop = useCallback(() => {
    setPlaying(false);
    setPlayhead(null);
    muteMaster(audioRef);
    releaseExclusivePlayback(instanceTokenRef.current);
  }, []);

  const scheduleOnePass = useCallback(() => {
    const p = patternRef.current;
    const { ctx, master } = audioRef.current;
    if (!ctx || !master) return;
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(0.32, now);
    const t0 = now + 0.06;
    const spm = resolveGammeStepsPerMeasure(p);
    scheduleGammePass(ctx, master, p.notes, p.measures, bpmRef.current, t0, spm);
  }, []);

  const startPlayback = useCallback(async () => {
    if (playing) return;

    const p = patternRef.current;
    const spm = resolveGammeStepsPerMeasure(p);
    const totalSteps = p.measures * spm;

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
      master.gain.value = 0.28;
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
    metaRef.current = {
      startMs: performance.now(),
      totalSteps,
      secPerStep: gammeStepDurationSec(bpmRef.current, spm),
    };
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
      const { startMs, totalSteps, secPerStep } = metaRef.current;
      const durationMs = totalSteps * secPerStep * 1000;
      const elapsed = performance.now() - startMs;
      if (elapsed >= durationMs) {
        if (loopRef.current) {
          scheduleOnePass();
          const p = patternRef.current;
          const spm = resolveGammeStepsPerMeasure(p);
          metaRef.current = {
            startMs: performance.now(),
            totalSteps: p.measures * spm,
            secPerStep: gammeStepDurationSec(bpmRef.current, spm),
          };
          setPlayhead(0);
          raf = requestAnimationFrame(tick);
          return;
        }
        setPlaying(false);
        setPlayhead(null);
        releaseExclusivePlayback(token);
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
  }, [playing, scheduleOnePass]);

  const signatureRef = useRef('');
  const sig = `${pattern.measures}|${resolveGammeStepsPerMeasure(pattern)}|${pattern.notes.map((n) => `${n.step}:${n.string}:${n.fret}:${n.root ? 1 : 0}`).join(',')}`;
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
