'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Database, GuitarLesson } from '@/types';

function StatusBadge({ status }: { status: GuitarLesson['status'] }) {
  const config = {
    lock: { label: 'Verrouillé', bg: 'bg-gray-600', text: 'text-gray-300' },
    'in-progress': { label: 'En cours', bg: 'bg-amber-600', text: 'text-amber-100' },
    completed: { label: 'Complété', bg: 'bg-green-600', text: 'text-green-100' },
  };
  const c = config[status];
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

function LessonNode({ lesson }: { lesson: GuitarLesson }) {
  const stateClass =
    lesson.status === 'lock'
      ? 'node-lock'
      : lesson.status === 'in-progress'
        ? 'node-in-progress'
        : '';

  const borderColor =
    lesson.status === 'completed'
      ? 'border-[var(--success)]'
      : lesson.status === 'in-progress'
        ? 'border-[var(--accent)]'
        : 'border-[var(--surface-light)]';

  const checkedCount = lesson.checklist.filter((c) => c.done).length;
  const totalCount = lesson.checklist.length;
  const progress = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0;

  return (
    <Link href={`/lesson/${lesson.id}`}>
      <div
        className={`${stateClass} ${borderColor} border-2 rounded-xl p-4 bg-[var(--surface)] hover:bg-[var(--surface-light)] transition-all cursor-pointer group`}
      >
        <div className="flex items-start justify-between mb-2">
          <span className="text-xs font-mono text-[var(--accent-light)]">
            {lesson.id}
          </span>
          <StatusBadge status={lesson.status} />
        </div>
        <h3 className="font-semibold text-sm mb-3 group-hover:text-[var(--accent-light)] transition-colors">
          {lesson.title}
        </h3>

        {/* Knowledge tags */}
        <div className="flex flex-wrap gap-1 mb-3">
          {lesson.knowledge.chords.slice(0, 4).map((c) => (
            <span key={c} className="text-[10px] px-1.5 py-0.5 rounded bg-violet-900/50 text-violet-300">
              {c}
            </span>
          ))}
          {lesson.knowledge.techniques.slice(0, 2).map((t) => (
            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/50 text-blue-300">
              {t}
            </span>
          ))}
        </div>

        {/* Progress bar */}
        {totalCount > 0 && (
          <div className="w-full bg-[var(--background)] rounded-full h-1.5">
            <div
              className="bg-[var(--accent)] h-1.5 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </Link>
  );
}

function LevelSection({
  title,
  lessons,
  icon,
}: {
  title: string;
  lessons: GuitarLesson[];
  icon: string;
}) {
  if (lessons.length === 0) return null;

  const completed = lessons.filter((l) => l.status === 'completed').length;

  return (
    <section className="mb-10">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">{icon}</span>
        <h2 className="text-xl font-bold">{title}</h2>
        <span className="text-sm text-[var(--muted)]">
          {completed}/{lessons.length} complétées
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {lessons.map((lesson) => (
          <LessonNode key={lesson.id} lesson={lesson} />
        ))}
      </div>
    </section>
  );
}

export default function Dashboard() {
  const [db, setDb] = useState<Database | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/database')
      .then((r) => r.json())
      .then((data: Database) => {
        setDb(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
        <div className="text-[var(--muted)] animate-pulse">Chargement...</div>
      </div>
    );
  }

  if (!db || db.lessons.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-3.5rem)] gap-4">
        <span className="text-6xl">🎸</span>
        <h1 className="text-2xl font-bold">Bienvenue sur GitAr</h1>
        <p className="text-[var(--muted)] text-center max-w-md">
          Aucune leçon trouvée. Dépose tes fichiers (PDF, MP3) dans le dossier{' '}
          <code className="bg-[var(--surface)] px-2 py-0.5 rounded text-sm">/import</code>{' '}
          puis exécute le script d&apos;ingestion :
        </p>
        <pre className="bg-[var(--surface)] px-4 py-2 rounded-lg text-sm text-[var(--accent-light)]">
          npx tsx scripts/ingest.ts
        </pre>
      </div>
    );
  }

  const debutant = db.lessons.filter((l) => l.level === 'debutant');
  const intermediaire = db.lessons.filter((l) => l.level === 'intermediaire');

  const totalCompleted = db.lessons.filter((l) => l.status === 'completed').length;
  const totalInProgress = db.lessons.filter((l) => l.status === 'in-progress').length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Stats bar */}
      <div className="flex items-center gap-6 mb-8 p-4 bg-[var(--surface)] rounded-xl">
        <div className="flex items-center gap-2">
          <span className="text-3xl">🎸</span>
          <div>
            <h1 className="text-xl font-bold">Skill Tree</h1>
            <p className="text-xs text-[var(--muted)]">Progression guitare</p>
          </div>
        </div>
        <div className="h-8 w-px bg-[var(--surface-light)]" />
        <div className="flex gap-6 text-sm">
          <div>
            <span className="text-[var(--success)] font-bold">{totalCompleted}</span>{' '}
            <span className="text-[var(--muted)]">complétées</span>
          </div>
          <div>
            <span className="text-[var(--warning)] font-bold">{totalInProgress}</span>{' '}
            <span className="text-[var(--muted)]">en cours</span>
          </div>
          <div>
            <span className="text-[var(--foreground)] font-bold">{db.lessons.length}</span>{' '}
            <span className="text-[var(--muted)]">total</span>
          </div>
        </div>
      </div>

      <LevelSection title="Débutant" lessons={debutant} icon="🌱" />
      <LevelSection title="Intermédiaire" lessons={intermediaire} icon="🔥" />
    </div>
  );
}
