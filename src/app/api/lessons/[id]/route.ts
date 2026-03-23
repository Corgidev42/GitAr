import { NextRequest, NextResponse } from 'next/server';
import { readDatabase, writeDatabase, syncGlobalKnowledgeFromLessons } from '@/lib/database';
import type { TabAsset, BackingTrack } from '@/types';

export const dynamic = 'force-dynamic';

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
    if (!db.lessons[idx].assets) {
      db.lessons[idx].assets = { backingTracks: [], tabs: [] };
    }
    db.lessons[idx].assets.tabs = updates.tabs as TabAsset[];
  }

  if (Array.isArray(updates.backingTracks)) {
    if (!db.lessons[idx].assets) {
      db.lessons[idx].assets = { backingTracks: [], tabs: [] };
    }
    db.lessons[idx].assets.backingTracks = updates.backingTracks as BackingTrack[];
  }

  syncGlobalKnowledgeFromLessons(db);
  writeDatabase(db);
  return NextResponse.json(db.lessons[idx]);
}
