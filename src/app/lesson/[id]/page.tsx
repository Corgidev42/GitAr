'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { GuitarLesson, TabAsset, BackingTrack } from '@/types';
import {
  IconDocument, IconHeart, IconLink, IconMusic, IconPause,
  IconPencil, IconPlay, IconRefresh, IconRhythm, IconTarget,
  IconTrash, IconUpload, IconX,
} from '@/components/Icons';

// ─── Audio Player ───
function AudioPlayer({ tracks, editMode, onRemoveTrack }: { tracks: BackingTrack[]; editMode?: boolean; onRemoveTrack?: (idx: number) => void }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    return () => {
      if (audioRef.current) audioRef.current.pause();
    };
  }, []);

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
    if (isPlaying) audio.pause(); else audio.play();
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (tracks.length === 0) {
    return <div className="p-4 bg-[var(--surface)] rounded-xl text-center text-[var(--muted)]">Aucun backing track disponible</div>;
  }

  return (
    <div className="bg-[var(--surface)] rounded-xl p-4 audio-player">
      <h3 className="text-sm font-semibold mb-3 text-[var(--accent-light)] inline-flex items-center gap-2">
        <IconMusic className="w-4 h-4" />Backing Tracks
      </h3>
      <div className="flex flex-wrap gap-2 mb-4">
        {tracks.map((track, idx) => (
          <div key={`${track.bpm}-${idx}`} className="relative group">
            <button onClick={() => selectTrack(idx)}
              className={`px-3 py-1.5 rounded-lg text-sm font-mono transition-colors ${idx === selectedIdx ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface-light)] text-[var(--muted)] hover:text-[var(--foreground)]'}`}>
              {track.bpm} BPM
            </button>
            {editMode && onRemoveTrack && (
              <button onClick={(e) => { e.stopPropagation(); onRemoveTrack(idx); }} className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center hover:bg-red-400" title="Supprimer">×</button>
            )}
          </div>
        ))}
      </div>
      <audio ref={audioRef} src={currentTrack?.path}
        onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
        onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)}
        onEnded={() => setIsPlaying(false)} />
      <div className="flex items-center gap-3">
        <button onClick={togglePlay}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--accent)] hover:bg-[var(--accent-light)] transition-colors text-white">
          {isPlaying ? <IconPause className="w-4 h-4" /> : <IconPlay className="w-4 h-4" />}
        </button>
        <div className="flex-1">
          <input type="range" min={0} max={duration || 0} value={currentTime}
            onChange={(e) => { const t = Number(e.target.value); if (audioRef.current) { audioRef.current.currentTime = t; setCurrentTime(t); } }}
            className="w-full" />
          <div className="flex justify-between text-xs text-[var(--muted)] mt-1">
            <span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Multi-Tab PDF Viewer ───
function PDFViewer({ tabs, onAddTab, onRemoveTab, editMode }: { tabs: TabAsset[]; onAddTab?: (name: string, file: File) => void; onRemoveTab?: (idx: number) => void; editMode?: boolean }) {
  const [activeTab, setActiveTab] = useState(0);
  const [addName, setAddName] = useState('');

  if (tabs.length === 0 && !onAddTab) {
    return (
      <div className="flex items-center justify-center h-96 bg-[var(--surface)] rounded-xl text-[var(--muted)]">
        Aucune tablature disponible
      </div>
    );
  }

  return (
    <div className="bg-[var(--surface)] rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-[var(--surface-light)] overflow-x-auto">
        {tabs.map((t, i) => (
          <div key={i} className="relative group">
            <button onClick={() => setActiveTab(i)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${i === activeTab ? 'bg-[var(--accent)] text-white' : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-light)]'}`}>
              <IconDocument className="inline-block w-3.5 h-3.5 mr-1.5 align-[-2px]" />{t.name}
            </button>
            {editMode && onRemoveTab && (
              <button onClick={(e) => { e.stopPropagation(); onRemoveTab(i); }} className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center hover:bg-red-400" title="Supprimer">×</button>
            )}
          </div>
        ))}
        {onAddTab && (
          <div className="flex items-center gap-1 ml-auto">
            <input value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="Nom…"
              className="px-2 py-1 rounded-lg bg-[var(--background)] border border-[var(--surface-light)] text-xs w-24" />
            <label className="px-2 py-1.5 rounded-lg bg-[var(--accent)] text-white text-xs cursor-pointer inline-flex items-center gap-1 hover:bg-[var(--accent-light)] transition-colors">
              <IconUpload className="w-3.5 h-3.5" />PDF
              <input type="file" accept=".pdf" className="hidden" onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) { onAddTab(addName || 'Tablature', f); setAddName(''); }
                e.target.value = '';
              }} />
            </label>
          </div>
        )}
        {tabs[activeTab] && (
          <a href={tabs[activeTab].path} target="_blank" rel="noopener noreferrer"
            className="text-xs text-[var(--muted)] hover:text-[var(--accent-light)] transition-colors ml-auto whitespace-nowrap">
            Ouvrir ↗
          </a>
        )}
      </div>
      {tabs[activeTab] ? (
        <iframe src={tabs[activeTab].path} className="w-full h-[600px] border-0" title={tabs[activeTab].name} />
      ) : (
        <div className="flex items-center justify-center h-96 text-[var(--muted)]">
          Ajoute une tablature ou des paroles
        </div>
      )}
    </div>
  );
}

// ─── Progressions ───
function Progressions({ progressions, onAdd, onEdit, onDelete, editMode }: {
  progressions: NonNullable<GuitarLesson['progressions']>;
  onAdd: (chordsLine: string, notes?: string) => void;
  onEdit: (idx: number, chordsLine: string, notes?: string) => void;
  onDelete: (idx: number) => void;
  editMode?: boolean;
}) {
  const [line, setLine] = useState('');
  const [notes, setNotes] = useState('');
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  return (
    <div className="bg-[var(--surface)] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[var(--accent-light)] inline-flex items-center gap-2">
          <IconLink className="w-4 h-4" />Suites d&apos;accords
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
                <div className="text-sm font-medium">{p.chords.join(' → ')}</div>
                {editMode && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setEditingIdx(i); setLine((p.chords || []).join(' → ')); setNotes(p.notes || ''); }}
                      className="text-[var(--muted)] hover:text-[var(--foreground)]" title="Modifier"><IconPencil className="w-4 h-4" /></button>
                    <button onClick={() => onDelete(i)} className="text-[var(--muted)] hover:text-red-400" title="Supprimer"><IconTrash className="w-4 h-4" /></button>
                  </div>
                )}
              </div>
              {p.notes && <div className="text-xs text-[var(--muted)] mt-1">{p.notes}</div>}
            </div>
          ))}
        </div>
      )}
      <div className="space-y-2">
        <div className="flex flex-col md:flex-row gap-2">
          <input value={line} onChange={(e) => setLine(e.target.value)} placeholder="Accords (ex: D - A - Bm - G)" className="flex-1 px-3 py-2 rounded-lg bg-[var(--surface-light)] text-sm min-w-0" />
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optionnel)" className="flex-1 px-3 py-2 rounded-lg bg-[var(--surface-light)] text-sm min-w-0" />
          <button onClick={() => {
            if (!line.trim()) return;
            const chords = line.split(/[-–→>|,]/).map((s) => s.trim()).filter(Boolean);
            if (chords.length < 3) return;
            if (editingIdx !== null) { onEdit(editingIdx, line, notes || undefined); setEditingIdx(null); }
            else { onAdd(line, notes || undefined); }
            setLine(''); setNotes('');
          }} className="w-full md:w-auto px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm">
            {editingIdx !== null ? 'Enregistrer' : 'Ajouter'}
          </button>
          {editingIdx !== null && (
            <button onClick={() => { setEditingIdx(null); setLine(''); setNotes(''); }}
              className="w-full md:w-auto px-4 py-2 rounded-lg bg-[var(--surface-light)] text-[var(--muted)] hover:text-[var(--foreground)] text-sm">Annuler</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Lesson Page ───
export default function LessonPage() {
  const params = useParams();
  const router = useRouter();
  const lessonId = params.id as string;

  const [lesson, setLesson] = useState<GuitarLesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftKnowledge, setDraftKnowledge] = useState<GuitarLesson['knowledge'] | null>(null);
  const [addCat, setAddCat] = useState<'chords' | 'techniques' | 'rhythms' | 'strums'>('chords');
  const [addValue, setAddValue] = useState('');
  const lastReloadAt = useRef(0);

  const loadLesson = useCallback(() => {
    const now = Date.now();
    if (now - lastReloadAt.current < 800) return;
    lastReloadAt.current = now;
    fetch(`/api/lessons/${encodeURIComponent(lessonId)}`, { cache: 'no-store' })
      .then((r) => { if (!r.ok) throw new Error('Not found'); return r.json(); })
      .then((data: GuitarLesson) => { setLesson(data); setDraftTitle(data.title); setDraftKnowledge(data.knowledge); setLoading(false); })
      .catch(() => setLoading(false));
  }, [lessonId]);

  useEffect(() => { loadLesson(); }, [loadLesson]);

  useEffect(() => {
    const onFocus = () => loadLesson();
    const onVisibility = () => { if (document.visibilityState === 'visible') loadLesson(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => { window.removeEventListener('focus', onFocus); document.removeEventListener('visibilitychange', onVisibility); };
  }, [loadLesson]);

  const saveEdits = async () => {
    if (!lesson || !draftKnowledge) return;
    const res = await fetch(`/api/lessons/${encodeURIComponent(lesson.id)}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: draftTitle, knowledge: draftKnowledge }),
    });
    if (res.ok) { const updated = await res.json(); setLesson(updated); setDraftTitle(updated.title); setDraftKnowledge(updated.knowledge); setEditMode(false); }
  };

  const toggleFavorite = async () => {
    if (!lesson) return;
    const res = await fetch(`/api/lessons/${encodeURIComponent(lesson.id)}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ favorite: !lesson.favorite }),
    });
    if (res.ok) { const updated = await res.json(); setLesson(updated); }
  };

  const handleAddTab = async (name: string, file: File) => {
    if (!lesson) return;
    const fd = new FormData();
    fd.append('lessonId', lesson.id);
    fd.append('type', 'tab');
    fd.append('files', file);
    const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd });
    if (!uploadRes.ok) return;
    const { paths } = await uploadRes.json();
    const newTabs = [...lesson.assets.tabs, { name, path: paths[0] }];
    const res = await fetch(`/api/lessons/${encodeURIComponent(lesson.id)}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tabs: newTabs }),
    });
    if (res.ok) { const updated = await res.json(); setLesson(updated); }
  };

  const handleRemoveTab = async (idx: number) => {
    if (!lesson) return;
    const newTabs = lesson.assets.tabs.filter((_, i) => i !== idx);
    const res = await fetch(`/api/lessons/${encodeURIComponent(lesson.id)}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tabs: newTabs }),
    });
    if (res.ok) { const updated = await res.json(); setLesson(updated); }
  };

  const handleRemoveTrack = async (idx: number) => {
    if (!lesson) return;
    const newTracks = lesson.assets.backingTracks.filter((_, i) => i !== idx);
    const res = await fetch(`/api/lessons/${encodeURIComponent(lesson.id)}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ backingTracks: newTracks }),
    });
    if (res.ok) { const updated = await res.json(); setLesson(updated); }
  };

  const handleAddAudio = async (files: FileList) => {
    if (!lesson) return;
    const fd = new FormData();
    fd.append('lessonId', lesson.id);
    fd.append('type', 'audio');
    for (const f of Array.from(files)) fd.append('files', f);
    const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd });
    if (!uploadRes.ok) return;
    const { paths } = await uploadRes.json();
    const newTracks: BackingTrack[] = Array.from(files).map((f, i) => {
      const bpmMatch = f.name.match(/(\d+)\s*bpm/i);
      return { bpm: bpmMatch ? parseInt(bpmMatch[1], 10) : 120, path: paths[i] };
    });
    const allTracks = [...lesson.assets.backingTracks, ...newTracks].sort((a, b) => a.bpm - b.bpm);
    const res = await fetch(`/api/lessons/${encodeURIComponent(lesson.id)}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ backingTracks: allTracks }),
    });
    if (res.ok) { const updated = await res.json(); setLesson(updated); }
  };

  if (loading) return <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]"><div className="text-[var(--muted)] animate-pulse">Chargement...</div></div>;

  if (!lesson) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-3.5rem)] gap-4">
        <IconDocument className="w-12 h-12 text-[var(--muted)]" />
        <p className="text-[var(--muted)]">Leçon introuvable</p>
        <button onClick={() => router.push('/')} className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm">Retour</button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <button onClick={() => router.push('/')} className="text-sm text-[var(--muted)] hover:text-[var(--accent-light)] mb-2 transition-colors">← Retour</button>
          <div className="flex items-center gap-3">
            <span className="text-sm font-mono text-[var(--accent)] bg-[var(--surface)] px-2 py-1 rounded">{lesson.id}</span>
            {editMode ? (
              <input value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)}
                className="text-2xl font-bold bg-transparent border-b border-[var(--surface-light)] focus:outline-none focus:border-[var(--accent)]" />
            ) : (
              <h1 className="text-2xl font-bold">{lesson.title}</h1>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleFavorite}
            className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${lesson.favorite ? 'bg-pink-500/20 text-pink-400 border-pink-500/50' : 'bg-[var(--surface)] text-[var(--muted)] border-[var(--surface-light)] hover:text-pink-400'}`}>
            <IconHeart className="w-4 h-4" style={lesson.favorite ? { fill: 'currentColor' } : {}} />
          </button>
          <button onClick={loadLesson}
            className="px-3 py-1.5 rounded-lg text-xs border bg-[var(--surface)] text-[var(--muted)] border-[var(--surface-light)] hover:text-[var(--foreground)] transition-colors" title="Actualiser">
            <span className="inline-flex items-center gap-2"><IconRefresh className="w-4 h-4" />Actualiser</span>
          </button>
          <button onClick={async () => {
            const res = await fetch(`/api/lessons/${encodeURIComponent(lesson.id)}`, {
              method: 'PATCH', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ isSong: !lesson.isSong }),
            });
            if (res.ok) { const updated = await res.json(); setLesson(updated); }
          }} className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${lesson.isSong ? 'bg-[var(--accent)] text-white border-transparent' : 'bg-[var(--surface)] text-[var(--muted)] border-[var(--surface-light)] hover:text-[var(--foreground)]'}`}>
            Morceau
          </button>
          <button onClick={() => { if (!editMode) { setDraftTitle(lesson.title); setDraftKnowledge(lesson.knowledge); } setEditMode(!editMode); }}
            className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${editMode ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'bg-[var(--surface)] text-[var(--muted)] border-[var(--surface-light)] hover:text-[var(--foreground)]'}`}>
            <span className="inline-flex items-center gap-2">
              {editMode ? <IconX className="w-4 h-4" /> : <IconPencil className="w-4 h-4" />}
              {editMode ? 'Annuler' : 'Éditer'}
            </span>
          </button>
          {editMode && (
            <button onClick={saveEdits} className="px-3 py-1.5 rounded-lg text-xs border bg-[var(--accent)] text-white border-transparent hover:bg-[var(--accent-light)] transition-colors">
              Sauvegarder
            </button>
          )}
          {lesson.isSong && (
            <span className="px-3 py-1.5 rounded-lg text-xs bg-violet-600 text-violet-100">Morceau</span>
          )}
        </div>
      </div>

      {/* Knowledge tags */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(editMode ? draftKnowledge?.chords || [] : lesson.knowledge.chords).map((c) => (
          <span key={`chord-${c}`} className="text-xs px-2 py-1 rounded-lg bg-violet-900/50 text-violet-300">
            <span className="inline-flex items-center gap-1.5"><IconMusic className="w-3.5 h-3.5" />{c}</span>
            {editMode && draftKnowledge && (
              <button onClick={() => setDraftKnowledge({ ...draftKnowledge, chords: draftKnowledge.chords.filter((x) => x !== c) })} className="ml-2 text-violet-200/70 hover:text-white" title="Retirer">×</button>
            )}
          </span>
        ))}
        {(editMode ? draftKnowledge?.techniques || [] : lesson.knowledge.techniques).map((t) => (
          <span key={`tech-${t}`} className="text-xs px-2 py-1 rounded-lg bg-blue-900/50 text-blue-300">
            <span className="inline-flex items-center gap-1.5"><IconTarget className="w-3.5 h-3.5" />{t}</span>
            {editMode && draftKnowledge && (
              <button onClick={() => setDraftKnowledge({ ...draftKnowledge, techniques: draftKnowledge.techniques.filter((x) => x !== t) })} className="ml-2 text-blue-200/70 hover:text-white" title="Retirer">×</button>
            )}
          </span>
        ))}
        {(editMode ? draftKnowledge?.rhythms || [] : lesson.knowledge.rhythms).map((r) => (
          <span key={`rhythm-${r}`} className="text-xs px-2 py-1 rounded-lg bg-amber-900/50 text-amber-300">
            <span className="inline-flex items-center gap-1.5"><IconRhythm className="w-3.5 h-3.5" />{r}</span>
            {editMode && draftKnowledge && (
              <button onClick={() => setDraftKnowledge({ ...draftKnowledge, rhythms: draftKnowledge.rhythms.filter((x) => x !== r) })} className="ml-2 text-amber-200/70 hover:text-white" title="Retirer">×</button>
            )}
          </span>
        ))}
        {(editMode ? draftKnowledge?.strums || [] : lesson.knowledge.strums || []).map((s) => (
          <span key={`strum-${s}`} className="text-xs px-2 py-1 rounded-lg bg-teal-900/50 text-teal-300">
            <span className="inline-flex items-center gap-1.5"><IconRhythm className="w-3.5 h-3.5" />{s}</span>
            {editMode && draftKnowledge && (
              <button onClick={() => setDraftKnowledge({ ...draftKnowledge, strums: (draftKnowledge.strums || []).filter((x) => x !== s) })} className="ml-2 text-teal-200/70 hover:text-white" title="Retirer">×</button>
            )}
          </span>
        ))}
      </div>

      {editMode && draftKnowledge && (
        <div className="flex flex-col md:flex-row gap-2 mb-6">
          <select value={addCat} onChange={(e) => setAddCat(e.target.value as typeof addCat)} className="px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--surface-light)] text-sm">
            <option value="chords">Accord</option>
            <option value="techniques">Technique</option>
            <option value="rhythms">Rythme</option>
            <option value="strums">Rythmique</option>
          </select>
          <input value={addValue} onChange={(e) => setAddValue(e.target.value)} placeholder="Ajouter…" className="flex-1 px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--surface-light)] text-sm" />
          <button onClick={() => {
            const v = addValue.trim();
            if (!v) return;
            const current = draftKnowledge[addCat] || [];
            if (!current.includes(v)) setDraftKnowledge({ ...draftKnowledge, [addCat]: [...current, v] } as GuitarLesson['knowledge']);
            setAddValue('');
          }} className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm">Ajouter</button>
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PDFViewer tabs={lesson.assets.tabs} onAddTab={handleAddTab} onRemoveTab={handleRemoveTab} editMode={editMode} />
        </div>
        <div className="space-y-6">
          <div>
            <AudioPlayer tracks={lesson.assets.backingTracks} editMode={editMode} onRemoveTrack={handleRemoveTrack} />
            <label className="mt-2 px-3 py-1.5 rounded-lg bg-[var(--surface)] text-[var(--muted)] text-xs cursor-pointer inline-flex items-center gap-1.5 border border-[var(--surface-light)] hover:text-[var(--foreground)] transition-colors">
              <IconUpload className="w-3.5 h-3.5" />Ajouter MP3
              <input type="file" accept=".mp3,audio/*" multiple className="hidden" onChange={(e) => { if (e.target.files && e.target.files.length > 0) handleAddAudio(e.target.files); e.target.value = ''; }} />
            </label>
          </div>
          <Progressions
            progressions={lesson.progressions || []} editMode={editMode}
            onAdd={async (chordsLine, notes) => {
              const chords = chordsLine.split(/[-–→>|,]/).map((s) => s.trim()).filter(Boolean);
              if (chords.length < 3) return;
              const next = [...(lesson.progressions || []), { chords, notes }];
              const res = await fetch(`/api/lessons/${encodeURIComponent(lesson.id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ progressions: next }) });
              if (res.ok) { const updated = await res.json(); setLesson(updated); }
            }}
            onEdit={async (idx, chordsLine, notes) => {
              const chords = chordsLine.split(/[-–→>|,]/).map((s) => s.trim()).filter(Boolean);
              if (chords.length < 3) return;
              const next = (lesson.progressions || []).map((p, i) => i === idx ? { ...p, chords, notes } : p);
              const res = await fetch(`/api/lessons/${encodeURIComponent(lesson.id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ progressions: next }) });
              if (res.ok) { const updated = await res.json(); setLesson(updated); }
            }}
            onDelete={async (idx) => {
              const next = (lesson.progressions || []).filter((_, i) => i !== idx);
              const res = await fetch(`/api/lessons/${encodeURIComponent(lesson.id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ progressions: next }) });
              if (res.ok) { const updated = await res.json(); setLesson(updated); }
            }}
          />
        </div>
      </div>
    </div>
  );
}
