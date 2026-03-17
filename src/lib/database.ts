import fs from 'fs';
import path from 'path';
import type { Database, GuitarLesson, Knowledge } from '../types';

const DB_PATH = path.join(process.cwd(), 'database.json');

export function readDatabase(): Database {
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  const db = JSON.parse(raw) as Database;
  let changed = false;

  if (!db.globalKnowledge) {
    db.globalKnowledge = { chords: [], techniques: [], rhythms: [] };
    changed = true;
  }
  if (!db.globalKnowledge.strums) {
    db.globalKnowledge.strums = [];
    changed = true;
  }
  if (!db.lessons) {
    db.lessons = [];
    changed = true;
  }
  if (!db.techniqueDetails) {
    db.techniqueDetails = {};
    changed = true;
  }

  // Migration: convert old schema to new schema
  for (const lesson of db.lessons) {
    if (!lesson.assets) {
      lesson.assets = { backingTracks: [], tabs: [] };
      changed = true;
    }
    if (!lesson.assets.backingTracks) {
      lesson.assets.backingTracks = [];
      changed = true;
    }

    // Migrate tabPath -> tabs[]
    const legacyAssets = lesson.assets as Record<string, unknown>;
    if (typeof legacyAssets.tabPath === 'string') {
      const tabPath = legacyAssets.tabPath as string;
      lesson.assets.tabs = tabPath ? [{ name: 'Tablature', path: tabPath }] : [];
      delete legacyAssets.tabPath;
      changed = true;
    }
    if (!lesson.assets.tabs) {
      lesson.assets.tabs = [];
      changed = true;
    }

    // Remove legacy checklist & status fields
    const legacyLesson = lesson as unknown as Record<string, unknown>;
    if ('checklist' in legacyLesson) {
      delete legacyLesson.checklist;
      changed = true;
    }
    if ('status' in legacyLesson) {
      delete legacyLesson.status;
      changed = true;
    }

    if (!lesson.progressions) {
      lesson.progressions = [];
      changed = true;
    }
    if (typeof lesson.isSong !== 'boolean') {
      lesson.isSong = false;
      changed = true;
    }
    if (!lesson.knowledge.strums) {
      lesson.knowledge.strums = [];
      changed = true;
    }
  }

  if (changed) {
    writeDatabase(db);
  }

  return db;
}

export function writeDatabase(db: Database): void {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
}

export function upsertLesson(lesson: GuitarLesson): void {
  const db = readDatabase();
  const idx = db.lessons.findIndex((l) => l.id === lesson.id);
  if (idx >= 0) {
    db.lessons[idx] = lesson;
  } else {
    db.lessons.push(lesson);
  }
  mergeGlobalKnowledge(db, lesson.knowledge);
  writeDatabase(db);
}

function mergeGlobalKnowledge(db: Database, k: Knowledge): void {
  for (const chord of k.chords) {
    if (!db.globalKnowledge.chords.includes(chord)) {
      db.globalKnowledge.chords.push(chord);
    }
  }
  for (const tech of k.techniques) {
    if (!db.globalKnowledge.techniques.includes(tech)) {
      db.globalKnowledge.techniques.push(tech);
    }
  }
  for (const rhythm of k.rhythms) {
    if (!db.globalKnowledge.rhythms.includes(rhythm)) {
      db.globalKnowledge.rhythms.push(rhythm);
    }
  }
  for (const strum of k.strums || []) {
    if (!db.globalKnowledge.strums) db.globalKnowledge.strums = [];
    if (!db.globalKnowledge.strums.includes(strum)) {
      db.globalKnowledge.strums.push(strum);
    }
  }
}
