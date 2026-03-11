import fs from 'fs';
import path from 'path';
import type { Database, GuitarLesson, Knowledge } from '../types';

const DB_PATH = path.join(process.cwd(), 'database.json');

export function readDatabase(): Database {
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  const db = JSON.parse(raw) as Database;
  let changed = false;

  const normalizeForKey = (raw: string): string =>
    raw
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .replace(/[’]/g, "'")
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();

  const normalizeStrum = (raw: string): string => {
    let s = raw.trim().replace(/[’]/g, "'");
    s = s.replace(/[-–—]+/g, ' ').replace(/\s+/g, ' ');
    const tokens = s
      .split(/\s+/)
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => {
        const lower = t.toLowerCase();
        if (lower === 'b') return 'bas';
        if (lower === 'h') return 'haut';
        return lower;
      });
    const isFormula = tokens.every((t) => t === 'bas' || t === 'haut') && tokens.length >= 4;
    if (isFormula) return tokens.map((t) => (t === 'bas' ? 'Bas' : 'Haut')).join(' ');
    const lower = s.toLowerCase();
    if (lower.includes('feu de camp')) return 'rythme feu de camp';
    if (lower.startsWith('rythmique ')) return lower;
    if (lower.startsWith('rythme ')) return lower;
    return s;
  };

  const isValidStrumName = (raw: string): boolean => {
    const lower = raw.toLowerCase();
    if (!(lower.startsWith('rythme ') || lower.startsWith('rythmique '))) {
      return lower.includes('feu de camp');
    }
    const rest = normalizeForKey(raw).replace(/^(rythme|rythmique)\s+/, '');
    const tokens = rest.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return false;
    if (tokens.length > 4) return false;
    const last = tokens[tokens.length - 1];
    if (last === 'de' || last === 'du' || last === 'des' || last === 'd') return false;
    const stop = new Set(['est', 'objectifs', 'objectif', 'technique', 'qui', 'dans', 'et', 'ca', 'ça', 'permet', 'module']);
    if (stop.has(tokens[0])) return false;
    return true;
  };

  const dedupeStrings = (arr: string[], normalizer?: (s: string) => string): string[] => {
    const map = new Map<string, string>();
    for (const v of arr) {
      const cleaned = v?.trim();
      if (!cleaned) continue;
      const key = normalizer ? normalizer(cleaned) : normalizeForKey(cleaned);
      if (!map.has(key)) map.set(key, cleaned);
    }
    return [...map.values()];
  };

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

    const nextChords = dedupeStrings(lesson.knowledge.chords);
    const nextTechs = dedupeStrings(lesson.knowledge.techniques).filter((t) => {
      const k = normalizeForKey(t);
      return k !== 'gratte' && !k.startsWith('gratt');
    });
    const nextRhythms = dedupeStrings(lesson.knowledge.rhythms, (s) => normalizeForKey(s).replace(/s$/, ''));
    const currentStrums = lesson.knowledge.strums || [];
    const nextStrumsRaw = dedupeStrings(currentStrums, (s) => normalizeForKey(normalizeStrum(s)))
      .map(normalizeStrum)
      .filter((s) => {
        const tokens = normalizeForKey(s).split(/\s+/).filter(Boolean);
        const isFormula = tokens.length >= 4 && tokens.every((t) => t === 'bas' || t === 'haut');
        return isFormula || isValidStrumName(s);
      });
    const nextStrums = (() => {
      const formulas: string[] = [];
      const names: string[] = [];
      for (const s of nextStrumsRaw) {
        const key = normalizeForKey(s);
        const tokens = key.split(/\s+/).filter(Boolean);
        const isFormula = tokens.length >= 4 && tokens.every((t) => t === 'bas' || t === 'haut');
        if (isFormula) formulas.push(s);
        else names.push(s);
      }
      const formulaKeys = formulas.map((f) => normalizeForKey(f));
      const keepFormulas = formulas.filter((f, i) => {
        const k = formulaKeys[i];
        for (let j = 0; j < formulaKeys.length; j++) {
          if (i === j) continue;
          const other = formulaKeys[j];
          if (other.length > k.length && other.includes(k)) return false;
        }
        return true;
      });
      return [...names, ...keepFormulas];
    })();

    if (
      nextChords.length !== lesson.knowledge.chords.length ||
      nextTechs.length !== lesson.knowledge.techniques.length ||
      nextRhythms.length !== lesson.knowledge.rhythms.length ||
      nextStrums.length !== currentStrums.length ||
      nextStrums.some((v, i) => v !== currentStrums[i])
    ) {
      lesson.knowledge.chords = nextChords;
      lesson.knowledge.techniques = nextTechs;
      lesson.knowledge.rhythms = nextRhythms;
      lesson.knowledge.strums = nextStrums;
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
    db.globalKnowledge.chords = dedupeStrings(db.globalKnowledge.chords);
    db.globalKnowledge.techniques = dedupeStrings(db.globalKnowledge.techniques).filter((t) => {
      const k = normalizeForKey(t);
      return k !== 'gratte' && !k.startsWith('gratt');
    });
    db.globalKnowledge.rhythms = dedupeStrings(db.globalKnowledge.rhythms, (s) => normalizeForKey(s).replace(/s$/, ''));
    db.globalKnowledge.strums = dedupeStrings(db.globalKnowledge.strums || [], (s) => normalizeForKey(normalizeStrum(s)))
      .map(normalizeStrum)
      .filter((s) => {
        const tokens = normalizeForKey(s).split(/\s+/).filter(Boolean);
        const isFormula = tokens.length >= 4 && tokens.every((t) => t === 'bas' || t === 'haut');
        return isFormula || isValidStrumName(s);
      });
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
