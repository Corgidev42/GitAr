/**
 * GitAr Auto-Ingest Script
 *
 * Processes files dropped into /import:
 *  - PDF "Guide" / "Synthèse" → parsed with pdf-parse, structured via LLM
 *  - PDF Tablature → moved to /public/assets/tabs/[ID].pdf
 *  - MP3 Backing Tracks → moved to /public/assets/audio/[ID]/
 *  - Updates database.json
 *
 * Usage:
 *   npx tsx scripts/ingest.ts              # one-shot processing
 *
 * File naming convention in /import:
 *   [ID] - Guide - Titre.pdf        → Text document to parse
 *   [ID] - Synthèse - Titre.pdf     → Text document to parse
 *   [ID] - Tab - Titre.pdf          → Tablature PDF
 *   [ID] - Tab.pdf                  → Tablature PDF
 *   [ID] - [BPM]bpm - Titre.mp3    → Backing track
 *   [ID] - [BPM]bpm.mp3            → Backing track
 */

import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';
import { PDFParse } from 'pdf-parse';
import { extractLessonFromText } from '../src/lib/llm-extract';
import type { GuitarLesson, BackingTrack, Database } from '../src/types';

// Load .env.local so GEMINI_API_KEY is available
config({ path: path.resolve(__dirname, '..', '.env.local') });

const ROOT = path.resolve(__dirname, '..');
const IMPORT_DIR = path.join(ROOT, 'import');
const TABS_DIR = path.join(ROOT, 'public', 'assets', 'tabs');
const AUDIO_DIR = path.join(ROOT, 'public', 'assets', 'audio');
const DB_PATH = path.join(ROOT, 'database.json');

// ---- Database helpers (standalone, no alias) ----

function readDB(): Database {
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  return JSON.parse(raw);
}

function writeDB(db: Database): void {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
}

// ---- Classification ----

interface ClassifiedFile {
  filePath: string;
  fileName: string;
  lessonId: string;
  baseLessonId: string;
  type: 'guide' | 'tab' | 'audio';
  bpm?: number;
}

function classifyFile(filePath: string): ClassifiedFile | null {
  const fileName = path.basename(filePath);
  const ext = path.extname(fileName).toLowerCase();

  // Extract lesson ID — supports formats:
  //   D1L05, I2L03        (original)
  //   PAC_D101, PAC_I201   (Parcours format)
  const idMatch = fileName.match(/^(?:PAC_)?([DI]\d+(?:L\d+)?)/i);
  if (!idMatch) {
    console.log(`⚠ Skipping "${fileName}" — cannot determine lesson ID.`);
    return null;
  }
  const baseLessonId = idMatch[1].toUpperCase();

  const lowerName = fileName.toLowerCase();
  const isSongPart =
    lowerName.includes('paroles') ||
    lowerName.includes('chanson') ||
    lowerName.includes('morceau') ||
    lowerName.includes('song') ||
    lowerName.includes('jam along') ||
    lowerName.includes('backing track') ||
    lowerName.includes('cover') ||
    lowerName.includes('original') ||
    lowerName.includes('instrumental');
  const lessonId = isSongPart ? `${baseLessonId}S` : baseLessonId;

  if (ext === '.mp3') {
    const bpmMatch = fileName.match(/(\d+)\s*bpm/i);
    return {
      filePath, fileName, lessonId, baseLessonId,
      type: 'audio',
      bpm: bpmMatch ? parseInt(bpmMatch[1], 10) : 120,
    };
  }

  if (ext === '.pdf') {
    if (
      lowerName.includes('tab') ||
      lowerName.includes('score') ||
      lowerName.includes('partition') ||
      lowerName.includes('jam along')
    ) {
      return { filePath, fileName, lessonId, baseLessonId, type: 'tab' };
    }
    if (
      lowerName.includes('guide') ||
      lowerName.includes('synth') ||
      lowerName.includes('fiche') ||
      lowerName.includes('paroles') ||
      lowerName.includes('chanson') ||
      lowerName.includes('morceau') ||
      lowerName.includes('song')
    ) {
      return { filePath, fileName, lessonId, baseLessonId, type: 'guide' };
    }
    // PDF without guide/synth/tab keyword → treat as tablature
    return { filePath, fileName, lessonId, baseLessonId, type: 'tab' };
  }

  return null;
}

function inferTitleFromFilename(fileName: string): string | null {
  const m = fileName.match(
    /(?:PAC_)?[DI]\d+(?:L\d+)?\s*[-–]\s*(?:(?:Guide|Synthèse|Fiche[^-]*|Tab)\s*[-–]\s*)?(.+?)\.(?:pdf|mp3)$/i
  );
  return m ? m[1].trim() : null;
}

function applyTitleDefaults(lesson: { id: string; title: string }, fileName: string): void {
  if (lesson.title === lesson.id) {
    const inferred = inferTitleFromFilename(fileName);
    if (inferred) lesson.title = inferred;
  }
  if (lesson.id === 'D100' && lesson.title === 'D100') {
    lesson.title = 'Rappels des bases pour bien démarrer';
  }
}

// ---- Processing ----

async function processGuide(file: ClassifiedFile): Promise<Omit<GuitarLesson, 'status' | 'assets' | 'checklist'> | null> {
  console.log(`📄 Parsing guide: ${file.fileName}`);
  const buffer = fs.readFileSync(file.filePath);
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  const text = result.text;
  await parser.destroy();

  if (!text.trim()) {
    console.log(`⚠ Empty text in "${file.fileName}". Skipping.`);
    return null;
  }

  const lesson = await extractLessonFromText(text, file.fileName);
  // Override ID with the one from filename to ensure consistency
  lesson.id = file.lessonId;
  return lesson;
}

async function processTab(file: ClassifiedFile): Promise<{ tabPath: string; extraChords: string[] }> {
  const destDir = TABS_DIR;
  fs.mkdirSync(destDir, { recursive: true });
  const destPath = path.join(destDir, `${file.lessonId}.pdf`);
  fs.copyFileSync(file.filePath, destPath);
  console.log(`📑 Tab moved → ${path.relative(ROOT, destPath)}`);

  // Extract text from tab PDF to detect chords mentioned in it
  const extraChords: string[] = [];
  try {
    const buffer = fs.readFileSync(file.filePath);
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    const text = result.text;
    await parser.destroy();

    if (text.trim()) {
      const chordRegex = /\b([A-G][#b]?(?:m|maj|min|dim|aug|sus[24]?|add)?[2-9]?(?:\/[A-G][#b]?)?)\b/g;
      const found = [...new Set(text.match(chordRegex) || [])];
      extraChords.push(...found);
      if (found.length > 0) {
        console.log(`  🎵 Chords found in tab: ${found.join(', ')}`);
      }
    }
  } catch {
    console.log(`  ⚠ Could not extract text from tab PDF (may be image-based)`);
  }

  return { tabPath: `/assets/tabs/${file.lessonId}.pdf`, extraChords };
}

function processAudio(file: ClassifiedFile): BackingTrack {
  const destDir = path.join(AUDIO_DIR, file.lessonId);
  fs.mkdirSync(destDir, { recursive: true });
  const destName = `${file.bpm || 120}bpm.mp3`;
  const destPath = path.join(destDir, destName);
  fs.copyFileSync(file.filePath, destPath);
  console.log(`🎵 Audio moved → ${path.relative(ROOT, destPath)}`);
  return {
    bpm: file.bpm || 120,
    path: `/assets/audio/${file.lessonId}/${destName}`,
  };
}

// ---- Main ingest ----

async function ingest(): Promise<void> {
  if (!fs.existsSync(IMPORT_DIR)) {
    fs.mkdirSync(IMPORT_DIR, { recursive: true });
    console.log('📁 Created /import folder. Drop your files there and run again.');
    return;
  }

  const files = fs.readdirSync(IMPORT_DIR).filter((f) => !f.startsWith('.'));
  if (files.length === 0) {
    console.log('📭 /import is empty. Nothing to process.');
    return;
  }

  console.log(`\n🎸 GitAr Auto-Ingest — Processing ${files.length} file(s)...\n`);

  // Classify all files
  const classified: ClassifiedFile[] = [];
  for (const f of files) {
    const c = classifyFile(path.join(IMPORT_DIR, f));
    if (c) classified.push(c);
  }

  // Group by lesson ID
  const byLesson = new Map<string, ClassifiedFile[]>();
  for (const c of classified) {
    const arr = byLesson.get(c.lessonId) || [];
    arr.push(c);
    byLesson.set(c.lessonId, arr);
  }

  const db = readDB();
  const processedFiles: string[] = [];

  for (const [lessonId, lessonFiles] of byLesson) {
    console.log(`\n--- Lesson ${lessonId} ---`);

    // Find or create lesson entry
    let lesson = db.lessons.find((l) => l.id === lessonId);
    if (!lesson) {
      lesson = {
        id: lessonId,
        title: lessonId,
        level: lessonId.startsWith('I') ? 'intermediaire' : 'debutant',
        status: 'lock',
        knowledge: { chords: [], techniques: [], rhythms: [], strums: [] },
        assets: { backingTracks: [], tabPath: '' },
        checklist: [],
        progressions: [],
      };
      db.lessons.push(lesson);
    }

    for (const file of lessonFiles) {
      switch (file.type) {
        case 'guide': {
          const extracted = await processGuide(file);
          if (extracted) {
            lesson.title = extracted.title;
            lesson.level = extracted.level;
            if (typeof extracted.isSong === 'boolean') {
              lesson.isSong = extracted.isSong;
            }
            // Merge knowledge
            for (const c of extracted.knowledge.chords) {
              if (!lesson.knowledge.chords.includes(c)) lesson.knowledge.chords.push(c);
            }
            for (const t of extracted.knowledge.techniques) {
              if (!lesson.knowledge.techniques.includes(t)) lesson.knowledge.techniques.push(t);
            }
            for (const r of extracted.knowledge.rhythms) {
              if (!lesson.knowledge.rhythms.includes(r)) lesson.knowledge.rhythms.push(r);
            }
            for (const s of extracted.knowledge.strums || []) {
              if (!lesson.knowledge.strums) lesson.knowledge.strums = [];
              if (!lesson.knowledge.strums.includes(s)) lesson.knowledge.strums.push(s);
            }

            if (extracted.progressions && extracted.progressions.length > 0) {
              const existing = new Set((lesson.progressions || []).map((p) => p.chords.join('>')));
              for (const p of extracted.progressions) {
                const key = p.chords.join('>');
                if (!existing.has(key)) {
                  (lesson.progressions ||= []).push(p);
                  existing.add(key);
                }
              }
            }

            if (extracted.techniqueDetails) {
              db.techniqueDetails ||= {};
              for (const [k, v] of Object.entries(extracted.techniqueDetails)) {
                if (!db.techniqueDetails[k] && v.summary) {
                  db.techniqueDetails[k] = v;
                }
              }
            }
          }
          // Guide PDFs are deleted after processing
          processedFiles.push(file.filePath);
          break;
        }
        case 'tab': {
          const { tabPath, extraChords } = await processTab(file);
          lesson.assets.tabPath = tabPath;
          applyTitleDefaults(lesson, file.fileName);
          // Merge chords found in tablature
          for (const c of extraChords) {
            if (!lesson.knowledge.chords.includes(c)) lesson.knowledge.chords.push(c);
          }
          processedFiles.push(file.filePath);
          break;
        }
        case 'audio': {
          const track = processAudio(file);
          // Avoid duplicate BPM entries
          const existingIdx = lesson.assets.backingTracks.findIndex(
            (bt) => bt.bpm === track.bpm
          );
          if (existingIdx >= 0) {
            lesson.assets.backingTracks[existingIdx] = track;
          } else {
            lesson.assets.backingTracks.push(track);
          }
          // Sort by BPM
          lesson.assets.backingTracks.sort((a, b) => a.bpm - b.bpm);
          applyTitleDefaults(lesson, file.fileName);
          processedFiles.push(file.filePath);
          break;
        }
      }
    }

    // Merge into global knowledge
    for (const c of lesson.knowledge.chords) {
      if (!db.globalKnowledge.chords.includes(c)) db.globalKnowledge.chords.push(c);
    }
    for (const t of lesson.knowledge.techniques) {
      if (!db.globalKnowledge.techniques.includes(t)) db.globalKnowledge.techniques.push(t);
    }
    for (const r of lesson.knowledge.rhythms) {
      if (!db.globalKnowledge.rhythms.includes(r)) db.globalKnowledge.rhythms.push(r);
    }
    for (const s of lesson.knowledge.strums || []) {
      if (!db.globalKnowledge.strums) db.globalKnowledge.strums = [];
      if (!db.globalKnowledge.strums.includes(s)) db.globalKnowledge.strums.push(s);
    }

    // Generate default checklist if empty
    if (lesson.checklist.length === 0) {
      const items: string[] = [];
      if (lesson.knowledge.chords.length > 0) items.push('Maîtriser les accords');
      if (lesson.knowledge.techniques.length > 0) items.push('Pratiquer les techniques');
      if (lesson.knowledge.rhythms.length > 0) items.push('Travailler les rythmes');
      if (lesson.assets.backingTracks.length > 0) items.push('Jouer avec le backing track');
      if (items.length === 0) items.push('Compléter la leçon');
      lesson.checklist = items.map((label) => ({ label, done: false }));
    }
  }

  // Sort lessons by ID
  db.lessons.sort((a, b) => a.id.localeCompare(b.id));

  // Write updated database
  writeDB(db);
  console.log(`\n✅ database.json updated with ${byLesson.size} lesson(s).`);

  // Clean up processed files from /import
  for (const fp of processedFiles) {
    fs.unlinkSync(fp);
    console.log(`🗑 Deleted: ${path.basename(fp)}`);
  }

  console.log('\n🎉 Ingest complete!\n');
}

// ---- Entry point ----
ingest().catch(console.error);
