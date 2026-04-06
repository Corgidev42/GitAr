import {
  parseGammeNotesArray,
  resolveGammeStepsPerMeasure,
  type GammeNote,
  type GammePatternV1,
} from '@/lib/gammeCodec';

export const WALKING_BASS_V1_PREFIX = 'WALKING_BASS_V1:';

export type WalkingBassPatternV1 = GammePatternV1;

export function makeEmptyWalkingBassPattern(): GammePatternV1 {
  return {
    v: 1,
    name: 'Ma ligne de basse',
    sectionLabel: 'Walking bass',
    measures: 1,
    firstMeasureNumber: 1,
    notes: [],
  };
}

export function serializeWalkingBassPattern(p: GammePatternV1): string {
  return `${WALKING_BASS_V1_PREFIX}${encodeURIComponent(JSON.stringify(p))}`;
}

export function parseWalkingBassPattern(raw: string): GammePatternV1 | null {
  if (!raw.startsWith(WALKING_BASS_V1_PREFIX)) return null;
  try {
    const encoded = raw.slice(WALKING_BASS_V1_PREFIX.length);
    const parsed = JSON.parse(decodeURIComponent(encoded)) as GammePatternV1;
    if (parsed.v !== 1 || !parsed.name || typeof parsed.sectionLabel !== 'string') return null;
    if (!Number.isInteger(parsed.measures) || parsed.measures < 1 || parsed.measures > 16) return null;
    const firstN =
      Number.isInteger(parsed.firstMeasureNumber) && parsed.firstMeasureNumber >= 1 && parsed.firstMeasureNumber <= 999
        ? parsed.firstMeasureNumber
        : 1;
    const stepsPerMeasure = resolveGammeStepsPerMeasure(parsed);
    const notes = parseGammeNotesArray(parsed.notes, parsed.measures, stepsPerMeasure);
    const tripletFeel = parsed.tripletFeel === true;
    return {
      v: 1,
      name: parsed.name,
      sectionLabel: parsed.sectionLabel.trim() || 'Walking bass',
      measures: parsed.measures,
      firstMeasureNumber: firstN,
      stepsPerMeasure,
      ...(tripletFeel ? { tripletFeel: true } : {}),
      notes,
    };
  } catch {
    return null;
  }
}

export function walkingBassDisplayName(value: string): string {
  return parseWalkingBassPattern(value)?.name ?? value;
}
