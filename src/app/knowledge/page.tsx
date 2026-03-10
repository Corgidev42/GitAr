'use client';

import { useEffect, useState } from 'react';
import type { Database } from '@/types';

// Common open chord shapes for visual rendering
const CHORD_DIAGRAMS: Record<string, { frets: number[]; barres?: number[]; position?: number }> = {
  'C': { frets: [0, 3, 2, 0, 1, 0] },
  'D': { frets: [-1, 0, 0, 2, 3, 2] },
  'Dm': { frets: [-1, 0, 0, 2, 3, 1] },
  'E': { frets: [0, 2, 2, 1, 0, 0] },
  'Em': { frets: [0, 2, 2, 0, 0, 0] },
  'F': { frets: [1, 1, 2, 3, 3, 1], barres: [1] },
  'G': { frets: [3, 2, 0, 0, 0, 3] },
  'A': { frets: [0, 0, 2, 2, 2, 0] },
  'Am': { frets: [0, 0, 2, 2, 1, 0] },
  'Am7': { frets: [0, 0, 2, 0, 1, 0] },
  'B7': { frets: [-1, 2, 1, 2, 0, 2] },
};

function ChordDiagram({ name }: { name: string }) {
  const chord = CHORD_DIAGRAMS[name];

  return (
    <div className="flex flex-col items-center p-3 bg-[var(--surface)] rounded-lg border border-[var(--surface-light)]">
      <span className="text-sm font-bold text-[var(--accent-light)] mb-2">{name}</span>
      <svg viewBox="0 0 50 60" className="w-16 h-20">
        {/* Nut */}
        <rect x="5" y="5" width="40" height="2" fill="var(--foreground)" />
        {/* Strings */}
        {[0, 1, 2, 3, 4, 5].map((s) => (
          <line key={`s${s}`} x1={5 + s * 8} y1="5" x2={5 + s * 8} y2="55" stroke="var(--muted)" strokeWidth="0.5" />
        ))}
        {/* Frets */}
        {[1, 2, 3, 4].map((f) => (
          <line key={`f${f}`} x1="5" y1={5 + f * 12.5} x2="45" y2={5 + f * 12.5} stroke="var(--muted)" strokeWidth="0.5" />
        ))}
        {/* Finger positions */}
        {chord?.frets.map((fret, string) => {
          if (fret === 0) {
            return (
              <circle key={string} cx={5 + string * 8} cy="2" r="1.5" fill="none" stroke="var(--foreground)" strokeWidth="0.5" />
            );
          }
          if (fret === -1) {
            return (
              <text key={string} x={5 + string * 8} y="3" textAnchor="middle" fontSize="4" fill="var(--muted)">
                ×
              </text>
            );
          }
          return (
            <circle key={string} cx={5 + string * 8} cy={fret * 12.5 - 1.25} r="3" fill="var(--accent)" />
          );
        })}
        {/* If no chord diagram available */}
        {!chord && (
          <text x="25" y="35" textAnchor="middle" fontSize="5" fill="var(--muted)">
            ?
          </text>
        )}
      </svg>
    </div>
  );
}

function Section({
  title,
  icon,
  items,
  renderItem,
}: {
  title: string;
  icon: string;
  items: string[];
  renderItem: (item: string) => React.ReactNode;
}) {
  if (items.length === 0) return null;

  return (
    <section className="mb-10">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">{icon}</span>
        <h2 className="text-lg font-bold">{title}</h2>
        <span className="text-sm text-[var(--muted)]">({items.length})</span>
      </div>
      <div className="flex flex-wrap gap-3">
        {items.map((item) => (
          <div key={item}>{renderItem(item)}</div>
        ))}
      </div>
    </section>
  );
}

export default function KnowledgePage() {
  const [db, setDb] = useState<Database | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'chords' | 'techniques' | 'rhythms'>('chords');

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

  if (!db) return null;

  const k = db.globalKnowledge;

  const tabs = [
    { key: 'chords' as const, label: 'Accords', icon: '🎵', count: k.chords.length },
    { key: 'techniques' as const, label: 'Techniques', icon: '🎯', count: k.techniques.length },
    { key: 'rhythms' as const, label: 'Rythmes', icon: '🥁', count: k.rhythms.length },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <span className="text-3xl">📚</span>
        <div>
          <h1 className="text-2xl font-bold">Knowledge Base</h1>
          <p className="text-sm text-[var(--muted)]">
            Dictionnaire des connaissances acquises
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`p-4 rounded-xl text-left transition-all ${
              tab === t.key
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--surface)] hover:bg-[var(--surface-light)]'
            }`}
          >
            <span className="text-2xl">{t.icon}</span>
            <div className="mt-2 text-2xl font-bold">{t.count}</div>
            <div className={`text-sm ${tab === t.key ? 'text-white/80' : 'text-[var(--muted)]'}`}>
              {t.label}
            </div>
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'chords' && (
        <Section
          title="Accords"
          icon="🎵"
          items={k.chords}
          renderItem={(chord) => <ChordDiagram name={chord} />}
        />
      )}

      {tab === 'techniques' && (
        <Section
          title="Techniques"
          icon="🎯"
          items={k.techniques}
          renderItem={(tech) => (
            <div className="px-4 py-3 bg-[var(--surface)] rounded-lg border border-[var(--surface-light)] hover:border-[var(--accent)] transition-colors">
              <span className="text-sm font-medium capitalize">{tech}</span>
            </div>
          )}
        />
      )}

      {tab === 'rhythms' && (
        <Section
          title="Rythmes"
          icon="🥁"
          items={k.rhythms}
          renderItem={(rhythm) => (
            <div className="px-4 py-3 bg-[var(--surface)] rounded-lg border border-[var(--surface-light)] hover:border-[var(--accent)] transition-colors">
              <span className="text-sm font-medium">{rhythm}</span>
            </div>
          )}
        />
      )}

      {k.chords.length === 0 && k.techniques.length === 0 && k.rhythms.length === 0 && (
        <div className="text-center py-20 text-[var(--muted)]">
          <span className="text-4xl block mb-4">📭</span>
          <p>Aucune connaissance enregistrée pour le moment.</p>
          <p className="text-sm mt-2">Importe des leçons pour remplir ta base de connaissances.</p>
        </div>
      )}
    </div>
  );
}
