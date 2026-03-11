'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { GuitarLesson, ChecklistItem } from '@/types';
import { IconCheck, IconDocument, IconLink, IconMusic, IconPause, IconPencil, IconPlay, IconRefresh, IconRhythm, IconTarget, IconTrash } from '@/components/Icons';

// ---- Audio Player Component ----
function AudioPlayer({ tracks }: { tracks: GuitarLesson['assets']['backingTracks'] }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const currentTrack = tracks[selectedIdx];

  const selectTrack = (idx: number) => {
    if (audioRef.current) audioRef.current.pause();
    setSelectedIdx(idx);
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (tracks.length === 0) {
    return (
      <div className="p-4 bg-[var(--surface)] rounded-xl text-center text-[var(--muted)]">
        Aucun backing track disponible
      </div>
    );
  }

  return (
    <div className="bg-[var(--surface)] rounded-xl p-4 audio-player">
      <h3 className="text-sm font-semibold mb-3 text-[var(--accent-light)] inline-flex items-center gap-2">
        <IconMusic className="w-4 h-4" />
        Backing Tracks
      </h3>

      {/* BPM Selector */}
      <div className="flex gap-2 mb-4">
        {tracks.map((track, idx) => (
          <button
            key={track.bpm}
            onClick={() => selectTrack(idx)}
            className={`px-3 py-1.5 rounded-lg text-sm font-mono transition-colors ${
              idx === selectedIdx
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--surface-light)] text-[var(--muted)] hover:text-[var(--foreground)]'
            }`}
          >
            {track.bpm} BPM
          </button>
        ))}
      </div>

      {/* Audio element */}
      <audio
        ref={audioRef}
        src={currentTrack?.path}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--accent)] hover:bg-[var(--accent-light)] transition-colors text-white"
        >
          {isPlaying ? <IconPause className="w-4 h-4" /> : <IconPlay className="w-4 h-4" />}
        </button>
        <div className="flex-1">
          <input
            type="range"
            min={0}
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-[var(--muted)] mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- PDF Viewer Component ----
function PDFViewer({ path }: { path: string }) {
  if (!path) {
    return (
      <div className="flex items-center justify-center h-96 bg-[var(--surface)] rounded-xl text-[var(--muted)]">
        Aucune tablature disponible
      </div>
    );
  }

  return (
    <div className="bg-[var(--surface)] rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--surface-light)]">
        <h3 className="text-sm font-semibold text-[var(--accent-light)] inline-flex items-center gap-2">
          <IconDocument className="w-4 h-4" />
          Tablature
        </h3>
        <a
          href={path}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[var(--muted)] hover:text-[var(--accent-light)] transition-colors"
        >
          Ouvrir ↗
        </a>
      </div>
      <iframe
        src={path}
        className="w-full h-[600px] border-0"
        title="Tablature PDF"
      />
    </div>
  );
}

// ---- Checklist Component ----
function Checklist({
  items,
  onToggle,
}: {
  items: ChecklistItem[];
  onToggle: (idx: number) => void;
}) {
  const completed = items.filter((i) => i.done).length;
  const progress = items.length > 0 ? (completed / items.length) * 100 : 0;

  return (
    <div className="bg-[var(--surface)] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[var(--accent-light)] inline-flex items-center gap-2">
          <IconCheck className="w-4 h-4" />
          Checklist
        </h3>
        <span className="text-xs text-[var(--muted)]">
          {completed}/{items.length}
        </span>
      </div>
      <div className="w-full bg-[var(--background)] rounded-full h-1.5 mb-4">
        <div
          className="bg-[var(--success)] h-1.5 rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="space-y-2">
        {items.map((item, idx) => (
          <label
            key={idx}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--surface-light)] cursor-pointer transition-colors"
          >
            <input
              type="checkbox"
              checked={item.done}
              onChange={() => onToggle(idx)}
              className="w-4 h-4 rounded border-[var(--surface-light)] accent-[var(--accent)]"
            />
            <span className={`text-sm ${item.done ? 'line-through text-[var(--muted)]' : ''}`}>
              {item.label}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

// ---- Progressions Component ----
function Progressions({
  progressions,
  onAdd,
  onEdit,
  onDelete,
  editMode,
}: {
  progressions: NonNullable<GuitarLesson['progressions']>;
  onAdd: (name: string, chordsLine: string, notes?: string) => void;
  onEdit: (idx: number, name: string, chordsLine: string, notes?: string) => void;
  onDelete: (idx: number) => void;
  editMode?: boolean;
}) {
  const [name, setName] = useState('');
  const [line, setLine] = useState('');
  const [notes, setNotes] = useState('');
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  return (
    <div className="bg-[var(--surface)] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[var(--accent-light)] inline-flex items-center gap-2">
          <IconLink className="w-4 h-4" />
          Suites d&apos;accords
        </h3>
        <span className="text-xs text-[var(--muted)]">{progressions.length}</span>
      </div>
      {progressions.length === 0 ? (
        <div className="text-sm text-[var(--muted)] mb-4">Aucune suite enregistrée</div>
      ) : (
        <div className="space-y-2 mb-4">
          {progressions.map((p, i) => (
            <div key={i} className="p-2 rounded-lg border border-[var(--surface-light)]">
              <div className="flex items-start justify-between gap-3">
                <div className="text-sm font-medium">{p.name}</div>
                {editMode && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingIdx(i);
                        setName(p.name || '');
                        setLine((p.chords || []).join(' → '));
                        setNotes(p.notes || '');
                      }}
                      className="text-[var(--muted)] hover:text-[var(--foreground)]"
                      title="Modifier"
                    >
                      <IconPencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(i)}
                      className="text-[var(--muted)] hover:text-red-400"
                      title="Supprimer"
                    >
                      <IconTrash className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              <div className="text-xs mt-1">
                {p.chords.join(' → ')}
              </div>
              {p.notes && <div className="text-xs text-[var(--muted)] mt-1">{p.notes}</div>}
            </div>
          ))}
        </div>
      )}
      <div className="space-y-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom (ex: 4 accords magiques #1)"
            className="w-full px-3 py-2 rounded-lg bg-[var(--surface-light)] text-sm min-w-0"
          />
          <input
            value={line}
            onChange={(e) => setLine(e.target.value)}
            placeholder="Accords (ex: D - A - Bm - G)"
            className="w-full px-3 py-2 rounded-lg bg-[var(--surface-light)] text-sm min-w-0"
          />
        </div>
        <div className="flex flex-col md:flex-row gap-2">
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optionnel)"
            className="w-full flex-1 px-3 py-2 rounded-lg bg-[var(--surface-light)] text-sm min-w-0"
          />
          <button
            onClick={() => {
              if (!name || !line) return;
              if (editingIdx !== null) {
                onEdit(editingIdx, name, line, notes || undefined);
                setEditingIdx(null);
              } else {
                onAdd(name, line, notes || undefined);
              }
              setName('');
              setLine('');
              setNotes('');
            }}
            className="w-full md:w-auto px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm"
          >
            {editingIdx !== null ? 'Enregistrer' : 'Ajouter'}
          </button>
          {editingIdx !== null && (
            <button
              onClick={() => {
                setEditingIdx(null);
                setName('');
                setLine('');
                setNotes('');
              }}
              className="w-full md:w-auto px-4 py-2 rounded-lg bg-[var(--surface-light)] text-[var(--muted)] hover:text-[var(--foreground)] text-sm"
            >
              Annuler
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Main Lesson Page ----
export default function LessonPage() {
  const params = useParams();
  const router = useRouter();
  const lessonId = params.id as string;

  const [lesson, setLesson] = useState<GuitarLesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftKnowledge, setDraftKnowledge] = useState<GuitarLesson['knowledge'] | null>(null);
  const [draftChecklist, setDraftChecklist] = useState<ChecklistItem[] | null>(null);
  const [addCat, setAddCat] = useState<'chords' | 'techniques' | 'rhythms' | 'strums'>('chords');
  const [addValue, setAddValue] = useState('');
  const lastReloadAt = useRef(0);

  const loadLesson = useCallback(() => {
    const now = Date.now();
    if (now - lastReloadAt.current < 800) return;
    lastReloadAt.current = now;
    fetch(`/api/lessons/${encodeURIComponent(lessonId)}`, { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then((data: GuitarLesson) => {
        setLesson(data);
        setDraftTitle(data.title);
        setDraftKnowledge(data.knowledge);
        setDraftChecklist(data.checklist);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [lessonId]);

  useEffect(() => {
    loadLesson();
  }, [loadLesson]);

  useEffect(() => {
    const onFocus = () => loadLesson();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') loadLesson();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [loadLesson]);

  const handleChecklistToggle = async (idx: number) => {
    if (!lesson) return;
    const newChecklist = lesson.checklist.map((item, i) =>
      i === idx ? { ...item, done: !item.done } : item
    );
    const res = await fetch(`/api/lessons/${encodeURIComponent(lesson.id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checklist: newChecklist }),
    });
    if (res.ok) {
      const updated = await res.json();
      setLesson(updated);
    }
  };

  const saveEdits = async () => {
    if (!lesson || !draftKnowledge || !draftChecklist) return;
    const res = await fetch(`/api/lessons/${encodeURIComponent(lesson.id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: draftTitle, knowledge: draftKnowledge, checklist: draftChecklist }),
    });
    if (res.ok) {
      const updated = await res.json();
      setLesson(updated);
      setDraftTitle(updated.title);
      setDraftKnowledge(updated.knowledge);
      setDraftChecklist(updated.checklist);
      setEditMode(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
        <div className="text-[var(--muted)] animate-pulse">Chargement...</div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-3.5rem)] gap-4">
        <IconDocument className="w-12 h-12 text-[var(--muted)]" />
        <p className="text-[var(--muted)]">Leçon introuvable</p>
        <button
          onClick={() => router.push('/')}
          className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm"
        >
          Retour au Dashboard
        </button>
      </div>
    );
  }

  const statusConfig = {
    lock: { label: 'Verrouillé', color: 'bg-gray-600 text-gray-200' },
    'in-progress': { label: 'En cours', color: 'bg-amber-600 text-amber-100' },
    completed: { label: 'Complété', color: 'bg-green-600 text-green-100' },
  };
  const st = statusConfig[lesson.status];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <button
            onClick={() => router.push('/')}
            className="text-sm text-[var(--muted)] hover:text-[var(--accent-light)] mb-2 transition-colors"
          >
            ← Retour au Skill Tree
          </button>
          <div className="flex items-center gap-3">
            <span className="text-sm font-mono text-[var(--accent)] bg-[var(--surface)] px-2 py-1 rounded">
              {lesson.id}
            </span>
            {editMode ? (
              <input
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                className="text-2xl font-bold bg-transparent border-b border-[var(--surface-light)] focus:outline-none focus:border-[var(--accent)]"
              />
            ) : (
              <h1 className="text-2xl font-bold">{lesson.title}</h1>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadLesson}
            className="px-3 py-1.5 rounded-lg text-xs border bg-[var(--surface)] text-[var(--muted)] border-[var(--surface-light)] hover:text-[var(--foreground)] transition-colors"
            title="Actualiser"
          >
            <span className="inline-flex items-center gap-2">
              <IconRefresh className="w-4 h-4" />
              Actualiser
            </span>
          </button>
          <button
            onClick={async () => {
              const res = await fetch(`/api/lessons/${encodeURIComponent(lesson.id)}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isSong: !lesson.isSong }),
              });
              if (res.ok) {
                const updated = await res.json();
                setLesson(updated);
              }
            }}
            className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
              lesson.isSong
                ? 'bg-[var(--accent)] text-white border-transparent'
                : 'bg-[var(--surface)] text-[var(--muted)] border-[var(--surface-light)] hover:text-[var(--foreground)]'
            }`}
          >
            Morceau
          </button>
          <button
            onClick={() => {
              if (!editMode) {
                setDraftTitle(lesson.title);
                setDraftKnowledge(lesson.knowledge);
                setDraftChecklist(lesson.checklist);
              }
              setEditMode(!editMode);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
              editMode
                ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                : 'bg-[var(--surface)] text-[var(--muted)] border-[var(--surface-light)] hover:text-[var(--foreground)]'
            }`}
          >
            <span className="inline-flex items-center gap-2">
              {editMode ? <IconCheck className="w-4 h-4" /> : <IconPencil className="w-4 h-4" />}
              {editMode ? 'Terminé' : 'Éditer'}
            </span>
          </button>
          {editMode && (
            <button
              onClick={saveEdits}
              className="px-3 py-1.5 rounded-lg text-xs border bg-[var(--accent)] text-white border-transparent hover:bg-[var(--accent-light)] transition-colors"
            >
              Sauvegarder
            </button>
          )}
          <span className={`px-3 py-1.5 rounded-lg text-xs ${st.color}`}>
            {st.label}
          </span>
        </div>
      </div>

      {/* Knowledge tags */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(editMode ? draftKnowledge?.chords || [] : lesson.knowledge.chords).map((c) => (
          <span key={`chord-${c}`} className="text-xs px-2 py-1 rounded-lg bg-violet-900/50 text-violet-300">
            <span className="inline-flex items-center gap-1.5">
              <IconMusic className="w-3.5 h-3.5" />
              {c}
            </span>
            {editMode && draftKnowledge && (
              <button
                onClick={() => setDraftKnowledge({ ...draftKnowledge, chords: draftKnowledge.chords.filter((x) => x !== c) })}
                className="ml-2 text-violet-200/70 hover:text-white"
                title="Retirer"
              >
                ×
              </button>
            )}
          </span>
        ))}
        {(editMode ? draftKnowledge?.techniques || [] : lesson.knowledge.techniques).map((t) => (
          <span key={`tech-${t}`} className="text-xs px-2 py-1 rounded-lg bg-blue-900/50 text-blue-300">
            <span className="inline-flex items-center gap-1.5">
              <IconTarget className="w-3.5 h-3.5" />
              {t}
            </span>
            {editMode && draftKnowledge && (
              <button
                onClick={() => setDraftKnowledge({ ...draftKnowledge, techniques: draftKnowledge.techniques.filter((x) => x !== t) })}
                className="ml-2 text-blue-200/70 hover:text-white"
                title="Retirer"
              >
                ×
              </button>
            )}
          </span>
        ))}
        {(editMode ? draftKnowledge?.rhythms || [] : lesson.knowledge.rhythms).map((r) => (
          <span key={`rhythm-${r}`} className="text-xs px-2 py-1 rounded-lg bg-amber-900/50 text-amber-300">
            <span className="inline-flex items-center gap-1.5">
              <IconRhythm className="w-3.5 h-3.5" />
              {r}
            </span>
            {editMode && draftKnowledge && (
              <button
                onClick={() => setDraftKnowledge({ ...draftKnowledge, rhythms: draftKnowledge.rhythms.filter((x) => x !== r) })}
                className="ml-2 text-amber-200/70 hover:text-white"
                title="Retirer"
              >
                ×
              </button>
            )}
          </span>
        ))}
        {(editMode ? draftKnowledge?.strums || [] : lesson.knowledge.strums || []).map((s) => (
          <span key={`strum-${s}`} className="text-xs px-2 py-1 rounded-lg bg-teal-900/50 text-teal-300">
            <span className="inline-flex items-center gap-1.5">
              <IconRhythm className="w-3.5 h-3.5" />
              {s}
            </span>
            {editMode && draftKnowledge && (
              <button
                onClick={() => setDraftKnowledge({ ...draftKnowledge, strums: (draftKnowledge.strums || []).filter((x) => x !== s) })}
                className="ml-2 text-teal-200/70 hover:text-white"
                title="Retirer"
              >
                ×
              </button>
            )}
          </span>
        ))}
      </div>

      {editMode && draftKnowledge && (
        <div className="flex flex-col md:flex-row gap-2 mb-6">
          <select
            value={addCat}
            onChange={(e) => setAddCat(e.target.value as typeof addCat)}
            className="px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--surface-light)] text-sm"
          >
            <option value="chords">Accord</option>
            <option value="techniques">Technique</option>
            <option value="rhythms">Rythme</option>
            <option value="strums">Rythmique</option>
          </select>
          <input
            value={addValue}
            onChange={(e) => setAddValue(e.target.value)}
            placeholder="Ajouter…"
            className="flex-1 px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--surface-light)] text-sm"
          />
          <button
            onClick={() => {
              const v = addValue.trim();
              if (!v) return;
              const current = draftKnowledge[addCat] || [];
              if (!current.includes(v)) {
                setDraftKnowledge({ ...draftKnowledge, [addCat]: [...current, v] } as GuitarLesson['knowledge']);
              }
              setAddValue('');
            }}
            className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm"
          >
            Ajouter
          </button>
        </div>
      )}

      {/* Main grid: PDF + sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PDF Viewer - takes 2/3 */}
        <div className="lg:col-span-2">
          <PDFViewer path={lesson.assets.tabPath} />
        </div>

        {/* Sidebar - takes 1/3 */}
        <div className="space-y-6">
          <AudioPlayer tracks={lesson.assets.backingTracks} />
          {editMode && draftChecklist ? (
            <div className="bg-[var(--surface)] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[var(--accent-light)] inline-flex items-center gap-2">
                  <IconCheck className="w-4 h-4" />
                  Checklist
                </h3>
                <button
                  onClick={() => setDraftChecklist([...(draftChecklist || []), { label: 'Nouvelle tâche', done: false }])}
                  className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
                >
                  Ajouter
                </button>
              </div>
              <div className="space-y-2">
                {draftChecklist.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() =>
                        setDraftChecklist(draftChecklist.map((it, i) => (i === idx ? { ...it, done: !it.done } : it)))
                      }
                      className="w-4 h-4 rounded border-[var(--surface-light)] accent-[var(--accent)]"
                    />
                    <input
                      value={item.label}
                      onChange={(e) =>
                        setDraftChecklist(draftChecklist.map((it, i) => (i === idx ? { ...it, label: e.target.value } : it)))
                      }
                      className="flex-1 px-3 py-2 rounded-lg bg-[var(--surface-light)] text-sm"
                    />
                    <button
                      onClick={() => setDraftChecklist(draftChecklist.filter((_, i) => i !== idx))}
                      className="text-[var(--muted)] hover:text-red-400"
                      title="Supprimer"
                    >
                      <IconTrash className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <Checklist items={lesson.checklist} onToggle={handleChecklistToggle} />
          )}
          <Progressions
            progressions={lesson.progressions || []}
            editMode={editMode}
            onAdd={async (name, chordsLine, notes) => {
              if (!lesson) return;
              const chords = chordsLine
                .split(/[-–→>|,]/)
                .map((s) => s.trim())
                .filter(Boolean);
              if (chords.length < 3) return;
              const next = [...(lesson.progressions || []), { name, chords, notes }];
              const res = await fetch(`/api/lessons/${encodeURIComponent(lesson.id)}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ progressions: next }),
              });
              if (res.ok) {
                const updated = await res.json();
                setLesson(updated);
              }
            }}
            onEdit={async (idx, name, chordsLine, notes) => {
              if (!lesson) return;
              const chords = chordsLine
                .split(/[-–→>|,]/)
                .map((s) => s.trim())
                .filter(Boolean);
              if (chords.length < 3) return;
              const next = (lesson.progressions || []).map((p, i) =>
                i === idx ? { ...p, name, chords, notes } : p
              );
              const res = await fetch(`/api/lessons/${encodeURIComponent(lesson.id)}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ progressions: next }),
              });
              if (res.ok) {
                const updated = await res.json();
                setLesson(updated);
              }
            }}
            onDelete={async (idx) => {
              if (!lesson) return;
              const next = (lesson.progressions || []).filter((_, i) => i !== idx);
              const res = await fetch(`/api/lessons/${encodeURIComponent(lesson.id)}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ progressions: next }),
              });
              if (res.ok) {
                const updated = await res.json();
                setLesson(updated);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
