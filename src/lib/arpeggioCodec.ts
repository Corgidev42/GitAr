export const ARPEGGIO_V2_PREFIX = 'ARPEGGIO_V2:';

export const ARPEGGIO_STEPS_PER_MEASURE = 8;

/** Corde 0 = Mi aigu (ligne du haut de la tab), 5 = Mi grave. */
export type ArpeggioNote = { step: number; string: number; fret: number };

export type ArpeggioPatternV2 = {
  v: 2;
  name: string;
  measures: number;
  notes: ArpeggioNote[];
};

export function makeEmptyArpeggioPattern(): ArpeggioPatternV2 {
  return { v: 2, name: 'Arpège perso', measures: 1, notes: [] };
}

export function serializeArpeggioPattern(p: ArpeggioPatternV2): string {
  return `${ARPEGGIO_V2_PREFIX}${encodeURIComponent(JSON.stringify(p))}`;
}

export function parseArpeggioPattern(raw: string): ArpeggioPatternV2 | null {
  if (!raw.startsWith(ARPEGGIO_V2_PREFIX)) return null;
  try {
    const encoded = raw.slice(ARPEGGIO_V2_PREFIX.length);
    const parsed = JSON.parse(decodeURIComponent(encoded)) as ArpeggioPatternV2;
    if (parsed.v !== 2 || !parsed.name || !Number.isInteger(parsed.measures) || parsed.measures < 1 || parsed.measures > 16) return null;
    if (!Array.isArray(parsed.notes)) return null;
    const maxSlots = parsed.measures * ARPEGGIO_STEPS_PER_MEASURE;
    const seen = new Set<number>();
    const notes: ArpeggioNote[] = [];
    for (const n of parsed.notes) {
      if (!Number.isInteger(n.step) || !Number.isInteger(n.string) || !Number.isInteger(n.fret)) continue;
      if (n.step < 0 || n.step >= maxSlots) continue;
      if (n.string < 0 || n.string > 5) continue;
      if (n.fret < 0 || n.fret > 24) continue;
      if (seen.has(n.step)) continue;
      seen.add(n.step);
      notes.push({ step: n.step, string: n.string, fret: n.fret });
    }
    notes.sort((a, b) => a.step - b.step);
    return { v: 2, name: parsed.name, measures: parsed.measures, notes };
  } catch {
    return null;
  }
}

export function arpeggioDisplayName(value: string): string {
  return parseArpeggioPattern(value)?.name ?? value;
}
