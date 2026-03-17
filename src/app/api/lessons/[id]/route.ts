import { NextRequest, NextResponse } from 'next/server';
import { readDatabase, writeDatabase } from '@/lib/database';
import type { TabAsset, BackingTrack } from '@/types';

export const dynamic = 'force-dynamic';

function rebuildGlobalKnowledge(db: ReturnType<typeof readDatabase>) {
  db.globalKnowledge = { chords: [], techniques: [], rhythms: [], strums: [] };
  const strumsAcc = db.globalKnowledge.strums || (db.globalKnowledge.strums = []);
  for (const lesson of db.lessons) {
    for (const chord of lesson.knowledge.chords) {
      if (!db.globalKnowledge.chords.includes(chord)) db.globalKnowledge.chords.push(chord);
    }
    for (const tech of lesson.knowledge.techniques) {
      if (!db.globalKnowledge.techniques.includes(tech)) db.globalKnowledge.techniques.push(tech);
    }
    for (const rhythm of lesson.knowledge.rhythms) {
      if (!db.globalKnowledge.rhythms.includes(rhythm)) db.globalKnowledge.rhythms.push(rhythm);
    }
    for (const strum of lesson.knowledge.strums || []) {
      if (!strumsAcc.includes(strum)) strumsAcc.push(strum);
    }
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = readDatabase();
  const lesson = db.lessons.find((l) => l.id === id);
  if (!lesson) {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
  }
  return NextResponse.json(lesson);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = readDatabase();
  const idx = db.lessons.findIndex((l) => l.id === id);
  if (idx === -1) {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
  }

  const updates = await req.json();

  if (typeof updates.title === 'string') {
    const nextTitle = updates.title.trim();
    if (nextTitle) db.lessons[idx].title = nextTitle;
  }

  if (updates.knowledge && typeof updates.knowledge === 'object') {
    const k = updates.knowledge as Partial<{
      chords: string[];
      techniques: string[];
      rhythms: string[];
      strums: string[];
    }>;
    if (Array.isArray(k.chords)) db.lessons[idx].knowledge.chords = k.chords;
    if (Array.isArray(k.techniques)) db.lessons[idx].knowledge.techniques = k.techniques;
    if (Array.isArray(k.rhythms)) db.lessons[idx].knowledge.rhythms = k.rhythms;
    if (Array.isArray(k.strums)) db.lessons[idx].knowledge.strums = k.strums;
  }

  if (updates.progressions) {
    db.lessons[idx].progressions = updates.progressions;
  }

  if (typeof updates.isSong === 'boolean') {
    db.lessons[idx].isSong = updates.isSong;
  }

  if (typeof updates.favorite === 'boolean') {
    db.lessons[idx].favorite = updates.favorite;
  }

  if (Array.isArray(updates.tabs)) {
    db.lessons[idx].assets.tabs = updates.tabs as TabAsset[];
  }

  if (Array.isArray(updates.backingTracks)) {
    db.lessons[idx].assets.backingTracks = updates.backingTracks as BackingTrack[];
  }

  rebuildGlobalKnowledge(db);
  writeDatabase(db);
  return NextResponse.json(db.lessons[idx]);
}
