import fs from 'fs';
import path from 'path';
import type { Database, GuitarLesson, Knowledge } from '../types';

const DB_PATH = path.join(process.cwd(), 'database.json');

export function readDatabase(): Database {
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  return JSON.parse(raw) as Database;
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
}
