import { NextRequest, NextResponse } from 'next/server';
import { readDatabase, writeDatabase } from '@/lib/database';

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

  if (updates.checklist) {
    db.lessons[idx].checklist = updates.checklist;
    // Auto-compute status from checklist
    const checked = updates.checklist.filter((c: { done: boolean }) => c.done).length;
    const total = updates.checklist.length;
    if (total === 0 || checked === 0) {
      db.lessons[idx].status = 'lock';
    } else if (checked === total) {
      db.lessons[idx].status = 'completed';
    } else {
      db.lessons[idx].status = 'in-progress';
    }
  }

  if (updates.progressions) {
    db.lessons[idx].progressions = updates.progressions;
  }

  writeDatabase(db);
  return NextResponse.json(db.lessons[idx]);
}
