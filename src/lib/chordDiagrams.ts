import type { ChordDiagramData, Database } from '@/types';
import { BUILTIN_CHORD_DIAGRAMS } from '@/data/builtinChordDiagrams';

/** Diagramme affiché : surcharge BDD > catalogue intégré. */
export function resolveChordDiagram(name: string, custom?: Database['chordDiagrams'] | null): ChordDiagramData | null {
  const fromDb = custom?.[name];
  if (fromDb && Array.isArray(fromDb.frets) && fromDb.frets.length === 6) {
    return fromDb;
  }
  const built = BUILTIN_CHORD_DIAGRAMS[name];
  return built ? { ...built } : null;
}
