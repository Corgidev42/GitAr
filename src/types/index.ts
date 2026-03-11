export interface BackingTrack {
  bpm: number;
  path: string;
}

export interface Knowledge {
  chords: string[];
  techniques: string[];
  rhythms: string[];
}

export interface TechniqueDetail {
  title?: string;
  summary: string;
  steps?: string[];
}

export interface ChordProgression {
  name: string;
  chords: string[];
  notes?: string;
}

export interface GuitarLesson {
  id: string; // ex: D1L05
  title: string;
  level: 'debutant' | 'intermediaire';
  status: 'lock' | 'in-progress' | 'completed';
  knowledge: Knowledge;
  assets: {
    backingTracks: BackingTrack[];
    tabPath: string;
  };
  checklist: ChecklistItem[];
  progressions?: ChordProgression[];
  techniqueDetails?: Record<string, TechniqueDetail>;
  isSong?: boolean;
}

export interface ChecklistItem {
  label: string;
  done: boolean;
}

export interface Database {
  lessons: GuitarLesson[];
  globalKnowledge: Knowledge;
  techniqueDetails?: Record<string, TechniqueDetail>;
}
