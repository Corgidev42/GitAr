export const GAMME_V1_PREFIX = 'GAMME_V1:';

/** Défaut historique : 4 noires par mesure. */
export const GAMME_STEPS_PER_MEASURE = 4;

/** Subdivision d’une mesure 4/4 : 4 noires, 8 croches ou 16 doubles croches. */
export type StepsPerMeasure = 4 | 8 | 16;

/** Corde 0 = Mi aigu (ligne du haut), 5 = Mi grave. */
export type GammeNote = { step: number; string: number; fret: number; root?: boolean };

export type GammePatternV1 = {
  v: 1;
  /** Titre affiché sous la section (ex. « La gamme de Do ») */
  name: string;
  /** Libellé de section au-dessus (ex. « Technique ») */
  sectionLabel: string;
  measures: number;
  /** Numéro affiché au-dessus de la 1ʳᵉ mesure (ex. 21 si la suite continue une leçon) */
  firstMeasureNumber: number;
  /**
   * Pas par mesure (4 = noires, 8 = croches, 16 = doubles croches).
   * Absent en données anciennes → 4.
   */
  stepsPerMeasure?: StepsPerMeasure;
  notes: GammeNote[];
};

export function resolveGammeStepsPerMeasure(p: Pick<GammePatternV1, 'stepsPerMeasure'>): StepsPerMeasure {
  const s = p.stepsPerMeasure;
  if (s === 4 || s === 8 || s === 16) return s;
  return 4;
}

/** Libellé pour la ligne rythmique sous la tab (même sens que les arpèges : 4/8/16 pas par mesure). */
export function tabRhythmSubdivisionLabel(stepsPerMeasure: StepsPerMeasure): string {
  switch (stepsPerMeasure) {
    case 4:
      return 'Noires';
    case 8:
      return 'Croches';
    case 16:
      return 'Doubles croches';
    default:
      return 'Noires';
  }
}

export function parseGammeNotesArray(rawNotes: unknown, measures: number, stepsPerMeasure: StepsPerMeasure): GammeNote[] {
  if (!Array.isArray(rawNotes)) return [];
  const maxSlots = measures * stepsPerMeasure;
  const seen = new Set<string>();
  const notes: GammeNote[] = [];
  for (const item of rawNotes) {
    if (!item || typeof item !== 'object') continue;
    const n = item as GammeNote;
    if (!Number.isInteger(n.step) || !Number.isInteger(n.string) || !Number.isInteger(n.fret)) continue;
    if (n.step < 0 || n.step >= maxSlots) continue;
    if (n.string < 0 || n.string > 5) continue;
    if (n.fret < 0 || n.fret > 24) continue;
    const key = `${n.step}:${n.string}`;
    if (seen.has(key)) continue;
    seen.add(key);
    notes.push({
      step: n.step,
      string: n.string,
      fret: n.fret,
      root: n.root === true,
    });
  }
  notes.sort((a, b) => a.step - b.step || a.string - b.string);
  return notes;
}

export function makeEmptyGammePattern(): GammePatternV1 {
  return {
    v: 1,
    name: 'Ma gamme',
    sectionLabel: 'Technique',
    measures: 1,
    firstMeasureNumber: 1,
    notes: [],
  };
}

export function serializeGammePattern(p: GammePatternV1): string {
  return `${GAMME_V1_PREFIX}${encodeURIComponent(JSON.stringify(p))}`;
}

export function parseGammePattern(raw: string): GammePatternV1 | null {
  if (!raw.startsWith(GAMME_V1_PREFIX)) return null;
  try {
    const encoded = raw.slice(GAMME_V1_PREFIX.length);
    const parsed = JSON.parse(decodeURIComponent(encoded)) as GammePatternV1;
    if (parsed.v !== 1 || !parsed.name || typeof parsed.sectionLabel !== 'string') return null;
    if (!Number.isInteger(parsed.measures) || parsed.measures < 1 || parsed.measures > 16) return null;
    const firstN =
      Number.isInteger(parsed.firstMeasureNumber) && parsed.firstMeasureNumber >= 1 && parsed.firstMeasureNumber <= 999
        ? parsed.firstMeasureNumber
        : 1;
    const stepsPerMeasure = resolveGammeStepsPerMeasure(parsed);
    const notes = parseGammeNotesArray(parsed.notes, parsed.measures, stepsPerMeasure);
    return {
      v: 1,
      name: parsed.name,
      sectionLabel: parsed.sectionLabel.trim() || 'Technique',
      measures: parsed.measures,
      firstMeasureNumber: firstN,
      stepsPerMeasure,
      notes,
    };
  } catch {
    return null;
  }
}

export function gammeDisplayName(value: string): string {
  return parseGammePattern(value)?.name ?? value;
}
