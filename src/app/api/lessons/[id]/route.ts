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

  // Only allow updating status and checklist
  if (updates.status) {
    db.lessons[idx].status = updates.status;
  }
  if (updates.checklist) {
    db.lessons[idx].checklist = updates.checklist;
  }

  writeDatabase(db);
  return NextResponse.json(db.lessons[idx]);
}
