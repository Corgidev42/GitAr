import { NextRequest, NextResponse } from 'next/server';
import { readDatabase, writeDatabase } from '@/lib/database';

export async function GET() {
  const db = readDatabase();
  return NextResponse.json(db);
}

/**
 * DELETE /api/database
 * Body: { type: 'knowledge', category: 'chords'|'techniques'|'rhythms'|'strums', value: string }
 *    or { type: 'lesson', id: string }
 *    or { type: 'reset' }
 */
export async function DELETE(req: NextRequest) {
  const body = await req.json();
  const db = readDatabase();

  if (body.type === 'knowledge') {
    const cat = body.category as 'chords' | 'techniques' | 'rhythms' | 'strums';
    const val = body.value as string;
    if (!cat || !val) {
      return NextResponse.json({ error: 'Missing category or value' }, { status: 400 });
    }
    // Remove from globalKnowledge
    db.globalKnowledge[cat] = (db.globalKnowledge[cat] || []).filter((v) => v !== val);
    // Remove from each lesson's knowledge too
    for (const lesson of db.lessons) {
      lesson.knowledge[cat] = (lesson.knowledge[cat] || []).filter((v) => v !== val);
    }
    writeDatabase(db);
    return NextResponse.json({ ok: true, globalKnowledge: db.globalKnowledge });
  }

  if (body.type === 'lesson') {
    const id = body.id as string;
    if (!id) {
      return NextResponse.json({ error: 'Missing lesson id' }, { status: 400 });
    }
    db.lessons = db.lessons.filter((l) => l.id !== id);
    // Rebuild globalKnowledge from remaining lessons
    db.globalKnowledge = { chords: [], techniques: [], rhythms: [], strums: [] };
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
      const acc = db.globalKnowledge.strums || (db.globalKnowledge.strums = []);
      for (const strum of lesson.knowledge.strums || []) {
        if (!acc.includes(strum)) acc.push(strum);
      }
    }
    writeDatabase(db);
    return NextResponse.json({ ok: true });
  }

  if (body.type === 'reset') {
    const empty = { lessons: [], globalKnowledge: { chords: [], techniques: [], rhythms: [], strums: [] }, techniqueDetails: {} };
    writeDatabase(empty);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown delete type' }, { status: 400 });
}
