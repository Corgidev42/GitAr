'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { GuitarLesson, ChecklistItem } from '@/types';

// ---- Audio Player Component ----
function AudioPlayer({ tracks }: { tracks: GuitarLesson['assets']['backingTracks'] }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const currentTrack = tracks[selectedIdx];

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
  }, [selectedIdx]);

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
      <h3 className="text-sm font-semibold mb-3 text-[var(--accent-light)]">
        🎵 Backing Tracks
      </h3>

      {/* BPM Selector */}
      <div className="flex gap-2 mb-4">
        {tracks.map((track, idx) => (
          <button
            key={track.bpm}
            onClick={() => setSelectedIdx(idx)}
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
          {isPlaying ? '⏸' : '▶'}
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
        <h3 className="text-sm font-semibold text-[var(--accent-light)]">📑 Tablature</h3>
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
        <h3 className="text-sm font-semibold text-[var(--accent-light)]">✅ Checklist</h3>
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

// ---- Main Lesson Page ----
export default function LessonPage() {
  const params = useParams();
  const router = useRouter();
  const lessonId = params.id as string;

  const [lesson, setLesson] = useState<GuitarLesson | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/lessons/${encodeURIComponent(lessonId)}`)
      .then((r) => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then((data: GuitarLesson) => {
        setLesson(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [lessonId]);

  const handleStatusChange = async (newStatus: GuitarLesson['status']) => {
    if (!lesson) return;
    const res = await fetch(`/api/lessons/${encodeURIComponent(lesson.id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      const updated = await res.json();
      setLesson(updated);
    }
  };

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
        <span className="text-4xl">❌</span>
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

  const statusOptions: { value: GuitarLesson['status']; label: string; color: string }[] = [
    { value: 'lock', label: '🔒 Verrouillé', color: 'bg-gray-600' },
    { value: 'in-progress', label: '🎯 En cours', color: 'bg-amber-600' },
    { value: 'completed', label: '✅ Complété', color: 'bg-green-600' },
  ];

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
            <h1 className="text-2xl font-bold">{lesson.title}</h1>
          </div>
        </div>

        {/* Status selector */}
        <div className="flex gap-2">
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleStatusChange(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                lesson.status === opt.value
                  ? `${opt.color} text-white`
                  : 'bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Knowledge tags */}
      <div className="flex flex-wrap gap-2 mb-6">
        {lesson.knowledge.chords.map((c) => (
          <span key={c} className="text-xs px-2 py-1 rounded-lg bg-violet-900/50 text-violet-300">
            🎵 {c}
          </span>
        ))}
        {lesson.knowledge.techniques.map((t) => (
          <span key={t} className="text-xs px-2 py-1 rounded-lg bg-blue-900/50 text-blue-300">
            🎯 {t}
          </span>
        ))}
        {lesson.knowledge.rhythms.map((r) => (
          <span key={r} className="text-xs px-2 py-1 rounded-lg bg-amber-900/50 text-amber-300">
            🥁 {r}
          </span>
        ))}
      </div>

      {/* Main grid: PDF + sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PDF Viewer - takes 2/3 */}
        <div className="lg:col-span-2">
          <PDFViewer path={lesson.assets.tabPath} />
        </div>

        {/* Sidebar - takes 1/3 */}
        <div className="space-y-6">
          <AudioPlayer tracks={lesson.assets.backingTracks} />
          <Checklist items={lesson.checklist} onToggle={handleChecklistToggle} />
        </div>
      </div>
    </div>
  );
}
