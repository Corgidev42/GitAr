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

export interface Database {
  lessons: GuitarLesson[];
  globalKnowledge: Knowledge;
  techniqueDetails?: Record<string, TechniqueDetail>;
}
