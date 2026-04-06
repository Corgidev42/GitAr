import { hzForFret } from '@/lib/arpeggioPlayback';
import { tabGridStepStartSec } from '@/lib/tabGridTiming';

function schedulePluck(ctx: AudioContext, dest: AudioNode, freq: number, when: number): void {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, when);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(0.16, when + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.28);
  osc.connect(g);
  g.connect(dest);
  osc.start(when);
  osc.stop(when + 0.32);
}

/** Durée d’un pas de grille en 4/4 (lecture droite, sans swing). */
export function gammeStepDurationSec(bpm: number, stepsPerMeasure: number): number {
  return (60 / bpm) * (4 / stepsPerMeasure);
}

export function scheduleGammePass(
  ctx: AudioContext,
  dest: AudioNode,
  notes: Array<{ step: number; string: number; fret: number }>,
  measures: number,
  bpm: number,
  startAtAudioTime: number,
  stepsPerMeasure: number,
  tripletFeel: boolean,
): void {
  const maxStep = measures * stepsPerMeasure;
  const sorted = [...notes]
    .filter((n) => n.step >= 0 && n.step < maxStep)
    .sort((a, b) => a.step - b.step || a.string - b.string);
  for (const n of sorted) {
    const when =
      startAtAudioTime + tabGridStepStartSec(n.step, measures, stepsPerMeasure, bpm, tripletFeel);
    schedulePluck(ctx, dest, hzForFret(n.string, n.fret), when);
  }
}
