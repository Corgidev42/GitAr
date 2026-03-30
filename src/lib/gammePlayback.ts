import { GAMME_STEPS_PER_MEASURE } from '@/lib/gammeCodec';
import { hzForFret } from '@/lib/arpeggioPlayback';

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

export function gammeStepDurationSec(bpm: number): number {
  return 60 / bpm;
}

export function scheduleGammePass(
  ctx: AudioContext,
  dest: AudioNode,
  notes: Array<{ step: number; string: number; fret: number }>,
  measures: number,
  bpm: number,
  startAtAudioTime: number,
): void {
  const sec = gammeStepDurationSec(bpm);
  const maxStep = measures * GAMME_STEPS_PER_MEASURE;
  const sorted = [...notes].filter((n) => n.step >= 0 && n.step < maxStep).sort((a, b) => a.step - b.step);
  for (const n of sorted) {
    const when = startAtAudioTime + n.step * sec;
    schedulePluck(ctx, dest, hzForFret(n.string, n.fret), when);
  }
}
