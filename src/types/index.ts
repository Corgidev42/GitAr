export interface BackingTrack {
  bpm: number;
  path: string;
}

export interface TabAsset {
  name: string;
  path: string;
}

export interface Knowledge {
  chords: string[];
  techniques: string[];
  rhythms: string[];
  strums?: string[];
  /** Motifs tablature arpège encodés ARPEGGIO_V2:… */
  arpeggios?: string[];
  /** Noms de gammes (ex. pentatonique mineure, majeure 3e case) — regroupées à l’UI sous Techniques */
  gammes?: string[];
}

export interface TechniqueDetail {
  title?: string;
  summary: string;
  steps?: string[];
  /** Chemin public, ex. /assets/techniques/hammer-on_photo.png */
  image?: string;
}

export interface ChordProgression {
  name?: string;
  chords: string[];
  notes?: string;
  favorite?: boolean;
}

export interface GuitarLesson {
  id: string;
  title: string;
  level: 'debutant' | 'intermediaire';
  knowledge: Knowledge;
  assets: {
    backingTracks: BackingTrack[];
    tabs: TabAsset[];
  };
  progressions?: ChordProgression[];
  techniqueDetails?: Record<string, TechniqueDetail>;
  isSong?: boolean;
  favorite?: boolean;
}

/** Doigté affiché dans les pastilles du diagramme (1–4, pouce T) */
export type ChordFingerMark = 1 | 2 | 3 | 4 | 'T';

export interface ChordDiagramData {
  frets: number[];
  /** Par corde (ordre : Mi grave → Mi aigu), uniquement si case > 0 */
  fingers?: (ChordFingerMark | null)[];
  barres?: number[];
  /** Première case affichée si l’accord est haut sur le manche */
  position?: number;
  /** Sous-titre FR sous le nom (ex. « LA sus2 ») */
  labelFr?: string;
}

export interface Database {
  lessons: GuitarLesson[];
  globalKnowledge: Knowledge;
  techniqueDetails?: Record<string, TechniqueDetail>;
  /** Surcharges / accords créés à la main (clé = nom exact comme dans la KB) */
  chordDiagrams?: Record<string, ChordDiagramData>;
}
