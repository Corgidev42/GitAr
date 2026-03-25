import { ARPEGGIO_STEPS_PER_MEASURE } from '@/lib/arpeggioCodec';

/** Mi aigu → Mi grave, Hz à vide. */
const OPEN_STRING_HZ = [329.63, 246.94, 196.0, 146.83, 110.0, 82.41];

export function hzForFret(stringIndex: number, fret: number): number {
  const open = OPEN_STRING_HZ[stringIndex];
  if (!open) return 440;
  return open * 2 ** (fret / 12);
}

export function arpeggioStepDurationSec(bpm: number): number {
  return 60 / bpm / 2;
}

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

export function scheduleArpeggioPass(
  ctx: AudioContext,
  dest: AudioNode,
  notes: Array<{ step: number; string: number; fret: number }>,
  measures: number,
  bpm: number,
  startAtAudioTime: number,
): void {
  const sec = arpeggioStepDurationSec(bpm);
  const maxStep = measures * ARPEGGIO_STEPS_PER_MEASURE;
  const sorted = [...notes].filter((n) => n.step >= 0 && n.step < maxStep).sort((a, b) => a.step - b.step);
  for (const n of sorted) {
    const when = startAtAudioTime + n.step * sec;
    schedulePluck(ctx, dest, hzForFret(n.string, n.fret), when);
  }
}
