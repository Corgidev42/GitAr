import { NextRequest, NextResponse } from 'next/server';
import { readDatabase, upsertLesson } from '@/lib/database';
import type { GuitarLesson } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json();

  const id = (body.id as string || '').trim();
  const title = (body.title as string || '').trim();

  if (!id || !title) {
    return NextResponse.json({ error: 'Missing id or title' }, { status: 400 });
  }

  const db = readDatabase();
  if (db.lessons.some((l) => l.id === id)) {
    return NextResponse.json({ error: 'Lesson with this ID already exists' }, { status: 409 });
  }

  const lesson: GuitarLesson = {
    id,
    title,
    level: body.level === 'intermediaire' ? 'intermediaire' : 'debutant',
    knowledge: {
      chords: Array.isArray(body.chords) ? body.chords : [],
      techniques: Array.isArray(body.techniques) ? body.techniques : [],
      rhythms: Array.isArray(body.rhythms) ? body.rhythms : [],
      strums: Array.isArray(body.strums) ? body.strums : [],
    },
    assets: {
      backingTracks: Array.isArray(body.backingTracks) ? body.backingTracks : [],
      tabs: Array.isArray(body.tabs) ? body.tabs : [],
    },
    progressions: Array.isArray(body.progressions) ? body.progressions : [],
    isSong: body.isSong === true,
    favorite: false,
  };

  upsertLesson(lesson);

  return NextResponse.json(lesson, { status: 201 });
}
