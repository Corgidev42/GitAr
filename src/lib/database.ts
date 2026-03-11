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

  for (const lesson of db.lessons) {
    if (!lesson.assets) {
      lesson.assets = { backingTracks: [], tabPath: '' };
      changed = true;
    }
    if (!lesson.assets.backingTracks) {
      lesson.assets.backingTracks = [];
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
    if (lesson.id === 'D100' && lesson.title === 'D100') {
      lesson.title = 'Rappels des bases pour bien démarrer';
      changed = true;
    }
    if (!lesson.knowledge.strums) {
      lesson.knowledge.strums = [];
      changed = true;
    }

    if (lesson.assets.backingTracks.length === 0) {
      const audioDir = path.join(process.cwd(), 'public', 'assets', 'audio', lesson.id);
      if (fs.existsSync(audioDir) && fs.statSync(audioDir).isDirectory()) {
        const mp3s = fs.readdirSync(audioDir).filter((f) => f.toLowerCase().endsWith('.mp3'));
        const tracks = mp3s
          .map((fileName) => {
            const bpmMatch = fileName.match(/(\d+)\s*bpm/i);
            const bpm = bpmMatch ? parseInt(bpmMatch[1], 10) : 120;
            return { bpm, path: `/assets/audio/${lesson.id}/${fileName}` };
          })
          .sort((a, b) => a.bpm - b.bpm);

        if (tracks.length > 0) {
          lesson.assets.backingTracks = tracks;
          changed = true;
        }
      }
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
