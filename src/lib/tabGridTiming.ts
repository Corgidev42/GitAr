/**
 * Placement temporel des colonnes d’une grille tab 4/4.
 * En mode « swing / triolet » avec 8 colonnes (croches), chaque temps est divisé
 * en noire de triolet + croche de triolet (2/3 + 1/3 du temps), équivalent aux
 * deux croches inégales du shuffle.
 */

export function tabGridStepStartSec(
  globalStep: number,
  measures: number,
  stepsPerMeasure: number,
  bpm: number,
  tripletFeel: boolean,
): number {
  const beatDur = 60 / bpm;
  const measureDur = 4 * beatDur;
  if (globalStep < 0) return 0;
  const maxStep = measures * stepsPerMeasure;
  if (globalStep >= maxStep) return measures * measureDur;

  if (!tripletFeel || stepsPerMeasure !== 8) {
    return globalStep * (measureDur / stepsPerMeasure);
  }

  const m = Math.floor(globalStep / stepsPerMeasure);
  const local = globalStep % stepsPerMeasure;
  const beatInMeasure = Math.floor(local / 2);
  const half = local % 2;
  const offsetInMeasure = beatInMeasure * beatDur + half * (2 / 3) * beatDur;
  return m * measureDur + offsetInMeasure;
}

export function tabGridTotalDurationSec(measures: number, bpm: number): number {
  return measures * 4 * (60 / bpm);
}

/** Trouve l’index de colonne `step` actif pour un temps écoulé (lecture + playhead). */
export function tabGridStepFromElapsed(
  elapsedSec: number,
  measures: number,
  stepsPerMeasure: number,
  bpm: number,
  tripletFeel: boolean,
): number {
  const totalSteps = measures * stepsPerMeasure;
  if (totalSteps <= 0) return 0;
  for (let s = totalSteps - 1; s >= 0; s--) {
    const t0 = tabGridStepStartSec(s, measures, stepsPerMeasure, bpm, tripletFeel);
    if (elapsedSec + 1e-9 >= t0) return s;
  }
  return 0;
}
