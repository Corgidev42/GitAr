export const GAMME_V1_PREFIX = 'GAMME_V1:';

/** 4 noires par mesure (comme une gamme en noires). */
export const GAMME_STEPS_PER_MEASURE = 4;

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
  notes: GammeNote[];
};

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
    if (!Array.isArray(parsed.notes)) return null;
    const maxSlots = parsed.measures * GAMME_STEPS_PER_MEASURE;
    const seen = new Set<number>();
    const notes: GammeNote[] = [];
    for (const n of parsed.notes) {
      if (!Number.isInteger(n.step) || !Number.isInteger(n.string) || !Number.isInteger(n.fret)) continue;
      if (n.step < 0 || n.step >= maxSlots) continue;
      if (n.string < 0 || n.string > 5) continue;
      if (n.fret < 0 || n.fret > 24) continue;
      if (seen.has(n.step)) continue;
      seen.add(n.step);
      notes.push({
        step: n.step,
        string: n.string,
        fret: n.fret,
        root: n.root === true,
      });
    }
    notes.sort((a, b) => a.step - b.step);
    return {
      v: 1,
      name: parsed.name,
      sectionLabel: parsed.sectionLabel.trim() || 'Technique',
      measures: parsed.measures,
      firstMeasureNumber: firstN,
      notes,
    };
  } catch {
    return null;
  }
}

export function gammeDisplayName(value: string): string {
  return parseGammePattern(value)?.name ?? value;
}
