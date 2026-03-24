/**
 * Lecture audio d'un motif rythmique v2 (grille en croches, 8 pas / mesure 4/4).
 * Les notes « fantômes » (cible d'une syncope) ne produisent pas d'attaque.
 */

export type RhythmPlaybackItem = {
  id: string;
  start: number;
  length: number;
  isRest: boolean;
  syncToStart?: number;
  syncopated?: boolean;
};

function collectSyncopeTargetIds(items: RhythmPlaybackItem[]): Set<string> {
  const notes = items.filter((it) => !it.isRest).sort((a, b) => a.start - b.start);
  const ids = new Set<string>();
  for (const from of notes) {
    let target: RhythmPlaybackItem | undefined;
    if (Number.isInteger(from.syncToStart)) {
      target = notes.find((n) => n.start === from.syncToStart);
    } else if (from.syncopated) {
      target = notes.find((n) => n.start > from.start);
    }
    if (target && target.start > from.start) ids.add(target.id);
  }
  return ids;
}

/** Indices globaux de croche (0, 1, …) où il y a une attaque jouée. */
export function getRhythmAttackSteps(items: RhythmPlaybackItem[]): number[] {
  const targets = collectSyncopeTargetIds(items);
  const set = new Set<number>();
  for (const it of items) {
    if (it.isRest) continue;
    if (targets.has(it.id)) continue;
    set.add(it.start);
  }
  return [...set].sort((a, b) => a - b);
}

/** Durée d'un pas (une croche) en secondes pour un 4/4 avec 2 croches par temps. */
export function rhythmStepDurationSec(bpm: number): number {
  return 60 / bpm / 2;
}

function scheduleOneClick(ctx: AudioContext, destination: AudioNode, when: number, strong: boolean): void {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'sine';
  const freq = strong ? 760 : 520;
  const peak = strong ? 0.22 : 0.12;
  osc.frequency.setValueAtTime(freq, when);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(peak, when + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.055);
  osc.connect(g);
  g.connect(destination);
  osc.start(when);
  osc.stop(when + 0.065);
}

/** Programme les clics sur le nœud de sortie (ex. gain maître). */
export function scheduleRhythmClicks(
  ctx: AudioContext,
  destination: AudioNode,
  attacks: number[],
  bpm: number,
  startAtAudioTime: number,
): void {
  const sec = rhythmStepDurationSec(bpm);
  for (const step of attacks) {
    const strong = step % 2 === 0;
    scheduleOneClick(ctx, destination, startAtAudioTime + step * sec, strong);
  }
}
