export const ARPEGGIO_V2_PREFIX = 'ARPEGGIO_V2:';

/** Défaut historique : 8 croches par mesure. */
export const ARPEGGIO_STEPS_PER_MEASURE = 8;

export type ArpeggioStepsPerMeasure = 4 | 8 | 16;

/** Corde 0 = Mi aigu (ligne du haut de la tab), 5 = Mi grave. */
export type ArpeggioNote = { step: number; string: number; fret: number };

export type ArpeggioPatternV2 = {
  v: 2;
  name: string;
  measures: number;
  /**
   * Pas par mesure (4 = noires, 8 = croches, 16 = doubles croches).
   * Absent en données anciennes → 8.
   */
  stepsPerMeasure?: ArpeggioStepsPerMeasure;
  /** Swing / triolet (grille 8 uniquement), comme pour les gammes. */
  tripletFeel?: boolean;
  notes: ArpeggioNote[];
};

export function resolveArpeggioStepsPerMeasure(p: Pick<ArpeggioPatternV2, 'stepsPerMeasure'>): ArpeggioStepsPerMeasure {
  const s = p.stepsPerMeasure;
  if (s === 4 || s === 8 || s === 16) return s;
  return 8;
}

export function resolveArpeggioTripletFeel(p: Pick<ArpeggioPatternV2, 'tripletFeel'>): boolean {
  return p.tripletFeel === true;
}

export function parseArpeggioNotesArray(rawNotes: unknown, measures: number, stepsPerMeasure: ArpeggioStepsPerMeasure): ArpeggioNote[] {
  if (!Array.isArray(rawNotes)) return [];
  const maxSlots = measures * stepsPerMeasure;
  const seen = new Set<string>();
  const notes: ArpeggioNote[] = [];
  for (const item of rawNotes) {
    if (!item || typeof item !== 'object') continue;
    const n = item as ArpeggioNote;
    if (!Number.isInteger(n.step) || !Number.isInteger(n.string) || !Number.isInteger(n.fret)) continue;
    if (n.step < 0 || n.step >= maxSlots) continue;
    if (n.string < 0 || n.string > 5) continue;
    if (n.fret < 0 || n.fret > 24) continue;
    const key = `${n.step}:${n.string}`;
    if (seen.has(key)) continue;
    seen.add(key);
    notes.push({ step: n.step, string: n.string, fret: n.fret });
  }
  notes.sort((a, b) => a.step - b.step || a.string - b.string);
  return notes;
}

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
    const stepsPerMeasure = resolveArpeggioStepsPerMeasure(parsed);
    const notes = parseArpeggioNotesArray(parsed.notes, parsed.measures, stepsPerMeasure);
    const tripletFeel = parsed.tripletFeel === true;
    return {
      v: 2,
      name: parsed.name,
      measures: parsed.measures,
      stepsPerMeasure,
      ...(tripletFeel ? { tripletFeel: true } : {}),
      notes,
    };
  } catch {
    return null;
  }
}

export function arpeggioDisplayName(value: string): string {
  return parseArpeggioPattern(value)?.name ?? value;
}
