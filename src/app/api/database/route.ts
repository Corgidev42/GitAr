import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { readDatabase, writeDatabase, syncGlobalKnowledgeFromLessons } from '@/lib/database';

export const dynamic = 'force-dynamic';

function unlinkTechniqueImage(publicPath: string | undefined) {
  if (!publicPath || !publicPath.startsWith('/assets/techniques/')) return;
  const rel = publicPath.slice('/assets/techniques/'.length);
  if (!rel || rel.includes('..') || rel.includes('/')) return;
  const full = path.join(process.cwd(), 'public', 'assets', 'techniques', rel);
  try {
    if (fs.existsSync(full)) fs.unlinkSync(full);
  } catch {
    /* ignore */
  }
}

export async function GET() {
  const db = readDatabase();
  return NextResponse.json(db);
}


export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const db = readDatabase();

  if (body.type === 'knowledge_add') {
    const category = body.category as 'chords' | 'techniques' | 'rhythms' | 'strums';
    const value = (body.value as string)?.trim();
    if (!category || !value) {
      return NextResponse.json({ error: 'Missing category or value' }, { status: 400 });
    }
    const arr = db.globalKnowledge[category] || [];
    if (!arr.includes(value)) {
      arr.push(value);
      db.globalKnowledge[category] = arr;
      writeDatabase(db);
    }
    return NextResponse.json({ ok: true, globalKnowledge: db.globalKnowledge });
  }

  if (body.type === 'knowledge_rename') {
    const category = body.category as 'chords' | 'techniques' | 'rhythms' | 'strums';
    const from = (body.from as string) || '';
    const to = (body.to as string) || '';

    if (!category || !from.trim() || !to.trim()) {
      return NextResponse.json({ error: 'Missing category/from/to' }, { status: 400 });
    }

    const nextTo = to.trim();
    const nextFrom = from.trim();

    db.globalKnowledge[category] = (db.globalKnowledge[category] || []).map((v) => (v === nextFrom ? nextTo : v));
    for (const lesson of db.lessons) {
      lesson.knowledge[category] = (lesson.knowledge[category] || []).map((v) => (v === nextFrom ? nextTo : v));
    }

    if (category === 'techniques' && db.techniqueDetails) {
      const fromKey = nextFrom.toLowerCase();
      const toKey = nextTo.toLowerCase();
      if (db.techniqueDetails[fromKey] && !db.techniqueDetails[toKey]) {
        db.techniqueDetails[toKey] = db.techniqueDetails[fromKey];
        delete db.techniqueDetails[fromKey];
      }
    }

    syncGlobalKnowledgeFromLessons(db);
    writeDatabase(db);
    return NextResponse.json({ ok: true, globalKnowledge: db.globalKnowledge });
  }

  if (body.type === 'knowledge_reorder') {
    const category = body.category as 'chords' | 'techniques' | 'rhythms' | 'strums';
    const items = body.items as string[];
    if (!category || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Missing category or items' }, { status: 400 });
    }
    const cur = db.globalKnowledge[category] || [];
    if (items.length !== cur.length) {
      return NextResponse.json({ error: 'La liste doit contenir exactement les mêmes éléments' }, { status: 400 });
    }
    const curSet = new Set(cur);
    for (const x of items) {
      if (!curSet.has(x)) return NextResponse.json({ error: 'Élément inconnu dans la liste' }, { status: 400 });
      curSet.delete(x);
    }
    if (curSet.size > 0) {
      return NextResponse.json({ error: 'Liste incomplète' }, { status: 400 });
    }
    db.globalKnowledge[category] = items;
    writeDatabase(db);
    return NextResponse.json({ ok: true, globalKnowledge: db.globalKnowledge });
  }

  if (body.type === 'lessons_swap') {
    const a = (body.lessonIdA as string)?.trim();
    const b = (body.lessonIdB as string)?.trim();
    if (!a || !b || a === b) {
      return NextResponse.json({ error: 'lessonIdA et lessonIdB requis' }, { status: 400 });
    }
    const ia = db.lessons.findIndex((l) => l.id === a);
    const ib = db.lessons.findIndex((l) => l.id === b);
    if (ia < 0 || ib < 0) {
      return NextResponse.json({ error: 'Leçon introuvable' }, { status: 404 });
    }
    const tmp = db.lessons[ia];
    db.lessons[ia] = db.lessons[ib];
    db.lessons[ib] = tmp;
    writeDatabase(db);
    return NextResponse.json({ ok: true, lessons: db.lessons });
  }

  if (body.type === 'technique_detail') {
    const key = (body.key as string)?.trim().toLowerCase();
    const detail = body.detail as {
      title?: string;
      summary?: string;
      steps?: string[];
      image?: string | null;
    } | undefined;
    if (!key || !detail) {
      return NextResponse.json({ error: 'Missing key or detail' }, { status: 400 });
    }
    if (!db.techniqueDetails) db.techniqueDetails = {};
    const prev = db.techniqueDetails[key] || {};
    const steps = Array.isArray(detail.steps) ? detail.steps.map((s) => String(s).trim()).filter(Boolean) : undefined;

    let nextImage: string | undefined;
    if ('image' in detail) {
      if (detail.image === null || detail.image === '') {
        if (prev.image) unlinkTechniqueImage(prev.image);
        nextImage = undefined;
      } else if (typeof detail.image === 'string' && detail.image.startsWith('/assets/techniques/')) {
        if (prev.image && prev.image !== detail.image) unlinkTechniqueImage(prev.image);
        nextImage = detail.image;
      } else {
        nextImage = prev.image;
      }
    } else {
      nextImage = prev.image;
    }

    const next: typeof prev = {
      title: typeof detail.title === 'string' ? detail.title.trim() || undefined : undefined,
      summary: typeof detail.summary === 'string' ? detail.summary.trim() : '',
      steps: steps && steps.length > 0 ? steps : undefined,
    };
    if (nextImage) next.image = nextImage;
    db.techniqueDetails[key] = next;
    writeDatabase(db);
    return NextResponse.json({ ok: true, techniqueDetails: db.techniqueDetails });
  }

  return NextResponse.json({ error: 'Unknown patch type' }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  const body = await req.json();
  const db = readDatabase();

  if (body.type === 'knowledge') {
    const cat = body.category as 'chords' | 'techniques' | 'rhythms' | 'strums';
    const val = body.value as string;
    if (!cat || !val) {
      return NextResponse.json({ error: 'Missing category or value' }, { status: 400 });
    }
    db.globalKnowledge[cat] = (db.globalKnowledge[cat] || []).filter((v) => v !== val);
    for (const lesson of db.lessons) {
      lesson.knowledge[cat] = (lesson.knowledge[cat] || []).filter((v) => v !== val);
    }
    if (cat === 'techniques' && db.techniqueDetails) {
      const k = val.toLowerCase();
      const d = db.techniqueDetails[k];
      if (d?.image) unlinkTechniqueImage(d.image);
      delete db.techniqueDetails[k];
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
    syncGlobalKnowledgeFromLessons(db);
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
