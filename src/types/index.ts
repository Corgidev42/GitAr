export interface BackingTrack {
  bpm: number;
  path: string;
}

export interface Knowledge {
  chords: string[];
  techniques: string[];
  rhythms: string[];
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
}

export interface ChecklistItem {
  label: string;
  done: boolean;
}

export interface Database {
  lessons: GuitarLesson[];
  globalKnowledge: Knowledge;
}
