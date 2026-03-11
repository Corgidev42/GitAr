'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import type { Database } from '@/types';
import { IconCheck, IconGuitar, IconLink, IconMusic, IconPause, IconPencil, IconPlay, IconRefresh, IconRhythm, IconTarget, IconTrash } from '@/components/Icons';

// Comprehensive guitar chord dictionary
// frets: [E2, A, D, G, B, E4] — 0=open, -1=muted, n=fret number
// position: starting fret for barre chords displayed higher on neck
const CHORD_DIAGRAMS: Record<string, { frets: number[]; barres?: number[]; position?: number }> = {
  // === C family ===
  'C':      { frets: [0, 3, 2, 0, 1, 0] },
  'Cm':     { frets: [-1, 3, 1, 0, 1, -1], position: 3 },
  'C7':     { frets: [0, 3, 2, 3, 1, 0] },
  'Cmaj7':  { frets: [0, 3, 2, 0, 0, 0] },
  'Cm7':    { frets: [-1, 3, 1, 3, 1, -1], position: 3 },
  'Cdim':   { frets: [-1, 3, 4, 2, 4, -1] },
  'Caug':   { frets: [-1, 3, 2, 1, 1, 0] },
  'Csus2':  { frets: [-1, 3, 3, 0, 1, -1] },
  'Csus4':  { frets: [-1, 3, 3, 0, 1, 1] },
  'Cadd9':  { frets: [0, 3, 2, 0, 3, 0] },
  'Cadd2':  { frets: [0, 3, 2, 0, 3, 3] },
  'C6':     { frets: [0, 3, 2, 2, 1, 0] },
  'C9':     { frets: [-1, 3, 2, 3, 3, 0] },
  'C/G':    { frets: [3, 3, 2, 0, 1, 0] },
  'C/E':    { frets: [0, 3, 2, 0, 1, 0] },

  // === D family ===
  'D':      { frets: [-1, 0, 0, 2, 3, 2] },
  'Dm':     { frets: [-1, 0, 0, 2, 3, 1] },
  'D7':     { frets: [-1, 0, 0, 2, 1, 2] },
  'Dmaj7':  { frets: [-1, 0, 0, 2, 2, 2] },
  'Dm7':    { frets: [-1, 0, 0, 2, 1, 1] },
  'Ddim':   { frets: [-1, 0, 0, 1, 3, 1] },
  'Daug':   { frets: [-1, 0, 0, 3, 3, 2] },
  'Dsus2':  { frets: [-1, 0, 0, 2, 3, 0] },
  'Dsus4':  { frets: [-1, 0, 0, 2, 3, 3] },
  'Dadd9':  { frets: [-1, 0, 0, 2, 3, 0] },
  'D6':     { frets: [-1, 0, 0, 2, 0, 2] },
  'D9':     { frets: [-1, 0, 4, 2, 1, 0], position: 1 },
  'D/F#':   { frets: [2, 0, 0, 2, 3, 2] },

  // === E family ===
  'E':      { frets: [0, 2, 2, 1, 0, 0] },
  'Em':     { frets: [0, 2, 2, 0, 0, 0] },
  'E7':     { frets: [0, 2, 0, 1, 0, 0] },
  'Emaj7':  { frets: [0, 2, 1, 1, 0, 0] },
  'Em7':    { frets: [0, 2, 2, 0, 3, 3] },
  'Edim':   { frets: [0, 1, 2, 0, -1, -1] },
  'Eaug':   { frets: [0, 3, 2, 1, 1, 0] },
  'Esus2':  { frets: [0, 2, 4, 4, 0, 0] },
  'Esus4':  { frets: [0, 2, 2, 2, 0, 0] },
  'Eadd9':  { frets: [0, 2, 2, 1, 0, 2] },
  'E6':     { frets: [0, 2, 2, 1, 2, 0] },
  'Em6':    { frets: [0, 2, 2, 0, 2, 0] },
  'E9':     { frets: [0, 2, 0, 1, 0, 2] },

  // === F family ===
  'F':      { frets: [1, 1, 2, 3, 3, 1], barres: [1] },
  'Fm':     { frets: [1, 1, 3, 3, 1, 1], barres: [1] },
  'F7':     { frets: [1, 1, 2, 1, 3, 1], barres: [1] },
  'Fmaj7':  { frets: [-1, 0, 3, 2, 1, 0] },
  'Fm7':    { frets: [1, 1, 1, 1, 1, 1], barres: [1] },
  'Fdim':   { frets: [-1, 0, 1, 2, 1, -1] },
  'Faug':   { frets: [-1, 0, 3, 2, 2, 1] },
  'Fsus2':  { frets: [-1, 0, 3, 0, 1, 1] },
  'Fsus4':  { frets: [-1, 0, 3, 3, 1, 1] },
  'Fadd9':  { frets: [-1, 0, 3, 2, 1, 3] },
  'F6':     { frets: [-1, 0, 0, 2, 1, 1] },
  'F#':     { frets: [2, 2, 3, 4, 4, 2], barres: [2] },
  'F#m':    { frets: [2, 2, 4, 4, 2, 2], barres: [2] },
  'F#7':    { frets: [2, 2, 3, 2, 4, 2], barres: [2] },
  'F#m7':   { frets: [2, 2, 2, 2, 2, 2], barres: [2], position: 2 },

  // === G family ===
  'G':      { frets: [3, 2, 0, 0, 0, 3] },
  'Gm':     { frets: [3, 3, 5, 5, 3, 3], barres: [3], position: 3 },
  'G7':     { frets: [3, 2, 0, 0, 0, 1] },
  'Gmaj7':  { frets: [3, 2, 0, 0, 0, 2] },
  'Gm7':    { frets: [3, 3, 3, 3, 3, 3], barres: [3], position: 3 },
  'Gdim':   { frets: [-1, -1, 5, 3, 2, 0] },
  'Gaug':   { frets: [3, 2, 1, 0, 0, 3] },
  'Gsus2':  { frets: [3, 0, 0, 0, 3, 3] },
  'Gsus4':  { frets: [3, 3, 0, 0, 1, 3] },
  'Gadd9':  { frets: [3, 0, 0, 0, 0, 3] },
  'G6':     { frets: [3, 2, 0, 0, 0, 0] },
  'G/B':    { frets: [-1, 2, 0, 0, 0, 3] },

  // === A family ===
  'A':      { frets: [0, 0, 2, 2, 2, 0] },
  'Am':     { frets: [0, 0, 2, 2, 1, 0] },
  'A7':     { frets: [0, 0, 2, 0, 2, 0] },
  'Amaj7':  { frets: [0, 0, 2, 1, 2, 0] },
  'Am7':    { frets: [0, 0, 2, 0, 1, 0] },
  'Adim':   { frets: [-1, 0, 1, 2, 1, -1] },
  'Aaug':   { frets: [-1, 0, 3, 2, 2, 1] },
  'Asus2':  { frets: [0, 0, 2, 2, 0, 0] },
  'Asus4':  { frets: [0, 0, 2, 2, 3, 0] },
  'Aadd9':  { frets: [0, 0, 2, 4, 2, 0] },
  'A6':     { frets: [0, 0, 2, 2, 2, 2] },
  'Am6':    { frets: [0, 0, 2, 2, 1, 2] },
  'A9':     { frets: [0, 0, 2, 4, 2, 3] },
  'A/C#':   { frets: [-1, 4, 2, 2, 2, 0] },
  'A/E':    { frets: [0, 0, 2, 2, 2, 0] },

  // === B family ===
  'B':      { frets: [-1, 2, 4, 4, 4, 2], barres: [2], position: 2 },
  'Bm':     { frets: [-1, 2, 4, 4, 3, 2], barres: [2], position: 2 },
  'B7':     { frets: [-1, 2, 1, 2, 0, 2] },
  'Bmaj7':  { frets: [-1, 2, 4, 3, 4, 2], barres: [2], position: 2 },
  'Bm7':    { frets: [-1, 2, 0, 2, 0, 2] },
  'Bdim':   { frets: [-1, 2, 3, 4, 3, -1] },
  'Baug':   { frets: [-1, 2, 1, 0, 0, 3] },
  'Bsus2':  { frets: [-1, 2, 4, 4, 2, 2], barres: [2], position: 2 },
  'Bsus4':  { frets: [-1, 2, 4, 4, 5, 2], barres: [2], position: 2 },
  'B6':     { frets: [-1, 2, 4, 4, 4, 4], barres: [2], position: 2 },
  'Bb':     { frets: [-1, 1, 3, 3, 3, 1], barres: [1] },
  'Bbm':    { frets: [-1, 1, 3, 3, 2, 1], barres: [1] },
  'Bb7':    { frets: [-1, 1, 3, 1, 3, 1], barres: [1] },
  'Bbmaj7': { frets: [-1, 1, 3, 2, 3, 1], barres: [1] },
  'Bbm7':   { frets: [-1, 1, 3, 1, 2, 1], barres: [1] },

  // === Sharps / alternate names ===
  'C#m':    { frets: [-1, 4, 2, 1, 2, 0], position: 1 },
  'C#m7':   { frets: [-1, 4, 2, 4, 2, 0], position: 1 },
  'C#':     { frets: [-1, 4, 3, 1, 2, 1], position: 1 },
  'Db':     { frets: [-1, 4, 3, 1, 2, 1], position: 1 },
  'Eb':     { frets: [-1, -1, 1, 3, 4, 3], position: 1 },
  'Ebm':    { frets: [-1, -1, 1, 3, 4, 2], position: 1 },
  'Eb7':    { frets: [-1, -1, 1, 3, 2, 3], position: 1 },
  'Ab':     { frets: [4, 4, 6, 6, 6, 4], barres: [4], position: 4 },
  'Abm':    { frets: [4, 4, 6, 6, 5, 4], barres: [4], position: 4 },
  'G#m':    { frets: [4, 4, 6, 6, 5, 4], barres: [4], position: 4 },

  // === 7th variations ===
  'Dm6':    { frets: [-1, 0, 0, 2, 0, 1] },
  'Cmaj9':  { frets: [0, 3, 2, 0, 3, 3] },
  'Em9':    { frets: [0, 2, 0, 0, 0, 2] },
  'Fmaj9':  { frets: [-1, 0, 3, 0, 1, 0] },
  'Dm9':    { frets: [-1, 0, 0, 2, 1, 0] },

  // === Power chords ===
  'C5':     { frets: [-1, 3, 5, 5, -1, -1] },
  'D5':     { frets: [-1, 5, 7, 7, -1, -1], position: 5 },
  'E5':     { frets: [0, 2, 2, -1, -1, -1] },
  'F5':     { frets: [1, 3, 3, -1, -1, -1] },
  'G5':     { frets: [3, 5, 5, -1, -1, -1], position: 3 },
  'A5':     { frets: [-1, 0, 2, 2, -1, -1] },
  'B5':     { frets: [-1, 2, 4, 4, -1, -1], position: 2 },
};

// Rhythm visual representations with SVG notation
const RHYTHM_VISUALS: Record<string, { label: string; beats: number; symbol: string; description: string }> = {
  'ronde':          { label: 'Ronde', beats: 4, symbol: '𝅝', description: '4 temps — la note la plus longue courante' },
  'blanche':        { label: 'Blanche', beats: 2, symbol: '𝅗𝅥', description: '2 temps — moitié d\'une ronde' },
  'noire':          { label: 'Noire', beats: 1, symbol: '♩', description: '1 temps — l\'unité de base en 4/4' },
  'croche':         { label: 'Croche', beats: 0.5, symbol: '♪', description: '½ temps — 2 par temps' },
  'croches':        { label: 'Croches', beats: 0.5, symbol: '♫', description: '½ temps — croches groupées par 2' },
  'double croche':  { label: 'Double croche', beats: 0.25, symbol: '𝅘𝅥𝅯', description: '¼ de temps — 4 par temps' },
  'triolet':        { label: 'Triolet', beats: 0.33, symbol: '³', description: '3 notes dans l\'espace de 2' },
  'pointée':        { label: 'Pointée', beats: 1.5, symbol: '♩·', description: 'Ajoute la moitié de la durée' },
  'syncope':        { label: 'Syncope', beats: 1, symbol: '𝄾♩', description: 'Accent sur un temps faible' },
  'contretemps':    { label: 'Contretemps', beats: 0.5, symbol: '𝄾♪', description: 'Jouer entre les temps' },
  '4/4':            { label: '4/4', beats: 4, symbol: '𝄴', description: '4 temps par mesure — signature la plus courante' },
  '3/4':            { label: '3/4', beats: 3, symbol: '³⁄₄', description: '3 temps par mesure — valse' },
  '6/8':            { label: '6/8', beats: 6, symbol: '⁶⁄₈', description: '6 croches par mesure — balancement ternaire' },
  '2/4':            { label: '2/4', beats: 2, symbol: '²⁄₄', description: '2 temps par mesure — marche' },
  'shuffle':        { label: 'Shuffle', beats: 1, symbol: '♪³♪', description: 'Croche longue + croche courte (swing)' },
  'binaire':        { label: 'Binaire', beats: 1, symbol: '♫', description: 'Division du temps en 2 parts égales' },
  'ternaire':       { label: 'Ternaire', beats: 1, symbol: '♫³', description: 'Division du temps en 3 parts égales' },
};

const TECHNIQUE_DETAILS: Record<string, { title?: string; summary: string; steps?: string[] }> = {
  'hammer-on': { title: 'Hammer-on', summary: 'Appuyer une note sans regratter, en frappant la corde avec le doigt.' },
  'pull-off': { title: 'Pull-off', summary: 'Relâcher une note vers une autre inférieure en tirant la corde.' },
  'embellissement autour du d': {
    title: 'Embellissement autour du D',
    summary: 'Variations courtes autour de l’accord de D, ajoutant des notes de passage et suspensions.',
    steps: [
      'Basculer entre D, Dsus2 et Dsus4',
      'Ajouter la basse A (D/A) pour varier la couleur',
      'Utiliser des hammer-on sur la corde de mi aigu (2→3) et pull-off (3→2)',
    ],
  },
};

function RhythmCard({ name, expanded, onToggle }: { name: string; expanded: boolean; onToggle: () => void }) {
  const rhythm = RHYTHM_VISUALS[name.toLowerCase()];

  return (
    <button
      onClick={onToggle}
      className={`text-left transition-all rounded-lg border ${
        expanded
          ? 'bg-[var(--accent)]/10 border-[var(--accent)] p-4 min-w-[200px]'
          : 'bg-[var(--surface)] border-[var(--surface-light)] hover:border-[var(--accent)] px-4 py-3'
      }`}
    >
      <span className="text-sm font-medium capitalize">{name}</span>
      {expanded && rhythm && (
        <div className="mt-3 space-y-2">
          <div className="text-4xl text-center py-2">{rhythm.symbol}</div>
          <div className="text-xs text-[var(--muted)] text-center">{rhythm.description}</div>
          <div className="flex justify-center">
            <svg viewBox="0 0 120 40" className="w-full max-w-[180px] h-10">
              {/* Staff line */}
              <line x1="10" y1="20" x2="110" y2="20" stroke="var(--muted)" strokeWidth="0.5" />
              {/* Beat markers */}
              {Array.from({ length: 5 }).map((_, i) => (
                <line key={i} x1={10 + i * 25} y1="15" x2={10 + i * 25} y2="25" stroke="var(--muted)" strokeWidth="0.3" />
              ))}
              {/* Duration bar */}
              <rect
                x="10"
                y="17"
                width={Math.min(rhythm.beats * 25, 100)}
                height="6"
                rx="2"
                fill="var(--accent)"
                opacity="0.7"
              />
              {/* Beat labels */}
              {[1, 2, 3, 4].map((b) => (
                <text key={b} x={10 + (b - 1) * 25} y="35" textAnchor="middle" fontSize="6" fill="var(--muted)">
                  {b}
                </text>
              ))}
            </svg>
          </div>
        </div>
      )}
      {expanded && !rhythm && (
        <div className="mt-2 text-xs text-[var(--muted)]">Pas de visuel disponible</div>
      )}
    </button>
  );
}

function ChordDiagram({ name }: { name: string }) {
  const chord = CHORD_DIAGRAMS[name];

  return (
    <div className="flex flex-col items-center p-3 bg-[var(--surface)] rounded-lg border border-[var(--surface-light)]">
      <span className="text-sm font-bold text-[var(--accent-light)] mb-2">{name}</span>
      <svg viewBox="0 0 50 60" className="w-16 h-20">
        {/* Nut */}
        <rect x="5" y="5" width="40" height="3" fill="var(--foreground)" />
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
              <text key={string} x={5 + string * 8} y="3" textAnchor="middle" fontSize="4" fill="var(--foreground)">
                O
              </text>
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
            <circle key={string} cx={5 + string * 8} cy={fret * 12.5 - 1.25} r="3.5" fill="var(--foreground)" stroke="var(--accent)" strokeWidth="0.7" />
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
  editMode,
  onDelete,
  onEdit,
}: {
  title: string;
  icon?: ReactNode;
  items: string[];
  renderItem: (item: string) => React.ReactNode;
  editMode?: boolean;
  onDelete?: (item: string) => void;
  onEdit?: (item: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <section className="mb-10">
      <div className="flex items-center gap-2 mb-4">
        {icon && <span className="text-[var(--accent-light)]">{icon}</span>}
        <h2 className="text-lg font-bold">{title}</h2>
        <span className="text-sm text-[var(--muted)]">({items.length})</span>
      </div>
      <div className="flex flex-wrap gap-3">
        {items.map((item) => (
          <div key={item} className="relative group">
            {renderItem(item)}
            {editMode && (onDelete || onEdit) && (
              <div className="absolute -top-2 -right-2 flex gap-1">
                {onEdit && (
                  <button
                    onClick={() => onEdit(item)}
                    className="w-6 h-6 rounded-full bg-[var(--surface)] border border-[var(--surface-light)] text-[var(--muted)] flex items-center justify-center hover:text-[var(--foreground)] shadow-lg"
                    title={`Renommer ${item}`}
                  >
                    <IconPencil className="w-3.5 h-3.5" />
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => onDelete(item)}
                    className="w-6 h-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center hover:bg-red-400 shadow-lg"
                    title={`Supprimer ${item}`}
                  >
                    <IconTrash className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function getStrumSteps(label: string): Array<'Bas' | 'Haut'> {
  const lower = label.toLowerCase();
  const matches = label.match(/\b(Bas|Haut)\b/gi) || [];
  if (matches.length >= 2) {
    return matches.map((m) => (m.toLowerCase() === 'bas' ? 'Bas' : 'Haut')) as Array<'Bas' | 'Haut'>;
  }
  if (lower.includes('feu de camp')) {
    return ['Bas', 'Bas', 'Haut', 'Haut', 'Bas'];
  }
  return [];
}

function normalizeForKey(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export default function KnowledgePage() {
  const [db, setDb] = useState<Database | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'chords' | 'techniques' | 'rhythms' | 'progressions' | 'songs'>('chords');
  const [expandedRhythm, setExpandedRhythm] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [techInfo, setTechInfo] = useState<string | null>(null);
  const [playingStrumKey, setPlayingStrumKey] = useState<string | null>(null);
  const [playingStrumStep, setPlayingStrumStep] = useState<number>(-1);
  const [editProgression, setEditProgression] = useState<{
    lessonId: string;
    progressionIndex: number;
    name: string;
    chordsLine: string;
    notes: string;
  } | null>(null);
  const [editKnowledge, setEditKnowledge] = useState<{
    category: 'chords' | 'techniques' | 'rhythms' | 'strums';
    from: string;
    to: string;
  } | null>(null);
  const [editLessonTitle, setEditLessonTitle] = useState<{ id: string; title: string } | null>(null);
  const lastReloadAt = useRef(0);
  const strumTimerRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const playingStepsRef = useRef<Array<'Bas' | 'Haut'>>([]);

  const reload = useCallback(() => fetch('/api/database', { cache: 'no-store' }).then((r) => r.json()).then(setDb), []);
  const safeReload = useCallback(() => {
    const now = Date.now();
    if (now - lastReloadAt.current < 800) return;
    lastReloadAt.current = now;
    reload();
  }, [reload]);

  const stopStrum = useCallback(() => {
    if (strumTimerRef.current) {
      window.clearInterval(strumTimerRef.current);
      strumTimerRef.current = null;
    }
    playingStepsRef.current = [];
    setPlayingStrumKey(null);
    setPlayingStrumStep(-1);
  }, []);

  const playStrum = useCallback(
    async (label: string) => {
      const key = normalizeForKey(label);
      if (playingStrumKey === key) {
        stopStrum();
        return;
      }

      const steps = getStrumSteps(label);
      if (steps.length === 0) return;

      const bpm = 92;
      const intervalMs = Math.round(60000 / bpm / 2);

      stopStrum();
      setPlayingStrumKey(key);
      playingStepsRef.current = steps;

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }
      if (audioCtxRef.current.state === 'suspended') {
        await audioCtxRef.current.resume();
      }

      let idx = -1;
      strumTimerRef.current = window.setInterval(() => {
        const current = playingStepsRef.current;
        if (current.length === 0) return;
        idx = (idx + 1) % current.length;
        setPlayingStrumStep(idx);

        const ctx = audioCtxRef.current;
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const now = ctx.currentTime;
        const step = current[idx];

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(step === 'Bas' ? 220 : 330, now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.12, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
      }, intervalMs);
    },
    [playingStrumKey, stopStrum]
  );

  const deleteItem = async (category: 'chords' | 'techniques' | 'rhythms' | 'strums', value: string) => {
    const res = await fetch('/api/database', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'knowledge', category, value }),
    });
    if (res.ok) {
      const updated = await fetch('/api/database').then((r) => r.json());
      setDb(updated);
    }
  };

  const renameItem = async (category: 'chords' | 'techniques' | 'rhythms' | 'strums', from: string, to: string) => {
    const res = await fetch('/api/database', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'knowledge_rename', category, from, to }),
    });
    if (res.ok) safeReload();
  };

  const deleteLesson = async (id: string) => {
    const res = await fetch('/api/database', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'lesson', id }),
    });
    if (res.ok) safeReload();
  };

  const saveLessonTitle = async () => {
    if (!editLessonTitle) return;
    const res = await fetch(`/api/lessons/${encodeURIComponent(editLessonTitle.id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: editLessonTitle.title }),
    });
    if (res.ok) {
      setEditLessonTitle(null);
      safeReload();
    }
  };

  const deleteProgression = async (lessonId: string, progressionIndex: number) => {
    if (!db) return;
    const lesson = db.lessons.find((l) => l.id === lessonId);
    if (!lesson) return;
    const next = (lesson.progressions || []).filter((_, i) => i !== progressionIndex);
    const res = await fetch(`/api/lessons/${encodeURIComponent(lessonId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ progressions: next }),
    });
    if (res.ok) safeReload();
  };

  const saveProgression = async () => {
    if (!db || !editProgression) return;
    const { lessonId, progressionIndex, name, chordsLine, notes } = editProgression;
    const lesson = db.lessons.find((l) => l.id === lessonId);
    if (!lesson) return;
    const chords = chordsLine
      .replace(/[-–→>|,]/g, ' ')
      .split(/\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (chords.length < 3) return;
    const next = (lesson.progressions || []).map((p, i) =>
      i === progressionIndex
        ? { ...p, name: name.trim() || p.name, chords, notes: notes.trim() || undefined }
        : p
    );
    const res = await fetch(`/api/lessons/${encodeURIComponent(lessonId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ progressions: next }),
    });
    if (res.ok) {
      setEditProgression(null);
      safeReload();
    }
  };

  useEffect(() => {
    fetch('/api/database')
      .then((r) => r.json())
      .then((data: Database) => {
        setDb(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onFocus = () => safeReload();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') safeReload();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [safeReload]);

  useEffect(() => () => stopStrum(), [stopStrum]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
        <div className="text-[var(--muted)] animate-pulse">Chargement...</div>
      </div>
    );
  }

  if (!db) return null;

  const k = db.globalKnowledge;
  const progressions = db.lessons.flatMap((lesson) =>
    (lesson.progressions || [])
      .filter((p) => (p.chords || []).length >= 3)
      .map((p, progressionIndex) => ({
        ...p,
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        progressionIndex,
      }))
  );
  const songs = db.lessons.filter((l) => l.isSong);

  const tabs = [
    { key: 'chords' as const, label: 'Accords', count: k.chords.length, icon: <IconMusic className="w-5 h-5" /> },
    { key: 'techniques' as const, label: 'Techniques', count: k.techniques.length, icon: <IconTarget className="w-5 h-5" /> },
    { key: 'rhythms' as const, label: 'Rythmes', count: k.rhythms.length, icon: <IconRhythm className="w-5 h-5" /> },
    { key: 'progressions' as const, label: 'Suites', count: progressions.length, icon: <IconLink className="w-5 h-5" /> },
    { key: 'songs' as const, label: 'Morceaux', count: songs.length, icon: <IconGuitar className="w-5 h-5" /> },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div>
          <h1 className="text-2xl font-bold">Knowledge Base</h1>
          <p className="text-sm text-[var(--muted)]">
            Dictionnaire des connaissances acquises
          </p>
        </div>
        <button
          onClick={safeReload}
          className="ml-auto px-3 py-1.5 text-sm rounded-lg transition-all bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)] border border-[var(--surface-light)]"
          title="Actualiser"
        >
          <span className="inline-flex items-center gap-2">
            <IconRefresh className="w-4 h-4" />
            Actualiser
          </span>
        </button>
        <button
          onClick={() => setEditMode(!editMode)}
          className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
            editMode
              ? 'bg-red-500/20 text-red-400 border border-red-500/50'
              : 'bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)] border border-[var(--surface-light)]'
          }`}
        >
          <span className="inline-flex items-center gap-2">
            {editMode ? <IconCheck className="w-4 h-4" /> : <IconPencil className="w-4 h-4" />}
            {editMode ? 'Terminé' : 'Éditer'}
          </span>
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
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
            <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg ${
              tab === t.key ? 'bg-white/15' : 'bg-[var(--surface-light)] text-[var(--accent-light)]'
            }`}>
              {t.icon}
            </div>
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
          icon={<IconMusic className="w-5 h-5" />}
          items={k.chords}
          editMode={editMode}
          onDelete={(v) => deleteItem('chords', v)}
          onEdit={(v) => setEditKnowledge({ category: 'chords', from: v, to: v })}
          renderItem={(chord) => <ChordDiagram name={chord} />}
        />
      )}

      {tab === 'techniques' && (
        <Section
          title="Techniques"
          icon={<IconTarget className="w-5 h-5" />}
          items={k.techniques}
          editMode={editMode}
          onDelete={(v) => deleteItem('techniques', v)}
          onEdit={(v) => setEditKnowledge({ category: 'techniques', from: v, to: v })}
          renderItem={(tech) => (
            <button
              onClick={() => setTechInfo(tech)}
              className="px-4 py-3 bg-[var(--surface)] rounded-lg border border-[var(--surface-light)] hover:border-[var(--accent)] transition-colors text-left"
            >
              <span className="text-sm font-medium capitalize">{tech}</span>
            </button>
          )}
        />
      )}

      {tab === 'rhythms' && (
        <>
          <Section
            title="Rythmiques"
            icon={<IconRhythm className="w-5 h-5" />}
            items={k.strums || []}
            editMode={editMode}
            onDelete={(v) => deleteItem('strums', v)}
            onEdit={(v) => setEditKnowledge({ category: 'strums', from: v, to: v })}
            renderItem={(strum) => (
              <div className="px-4 py-3 bg-[var(--surface)] rounded-lg border border-[var(--surface-light)] hover:border-[var(--accent)] transition-colors min-w-[240px]">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium capitalize">{strum}</span>
                  {(() => {
                    const key = normalizeForKey(strum);
                    const steps = getStrumSteps(strum);
                    const isPlaying = playingStrumKey === key;
                    const disabled = steps.length === 0;
                    return (
                      <button
                        onClick={() => playStrum(strum)}
                        disabled={disabled}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors ${
                          disabled
                            ? 'opacity-40 cursor-not-allowed border-[var(--surface-light)] text-[var(--muted)]'
                            : isPlaying
                              ? 'bg-[var(--accent)] border-transparent text-white'
                              : 'bg-[var(--surface-light)] border-[var(--surface-light)] text-[var(--muted)] hover:text-[var(--foreground)]'
                        }`}
                        title={disabled ? 'Motif indisponible' : isPlaying ? 'Stop' : 'Jouer'}
                      >
                        {isPlaying ? <IconPause className="w-4 h-4" /> : <IconPlay className="w-4 h-4" />}
                      </button>
                    );
                  })()}
                </div>
                {(() => {
                  const steps = getStrumSteps(strum);
                  if (steps.length === 0) return null;
                  const isPlaying = playingStrumKey === normalizeForKey(strum);
                  return (
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {steps.map((s, i) => (
                        <span
                          key={`${s}-${i}`}
                          className={`text-xs px-2 py-1 rounded-md border ${
                            isPlaying && i === playingStrumStep
                              ? 'bg-[var(--accent)] text-white border-transparent'
                              : 'bg-[var(--surface-light)] text-[var(--muted)] border-[var(--surface-light)]'
                          }`}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
          />
          <Section
            title="Rythmes"
            icon={<IconRhythm className="w-5 h-5" />}
            items={k.rhythms}
            editMode={editMode}
            onDelete={(v) => deleteItem('rhythms', v)}
            onEdit={(v) => setEditKnowledge({ category: 'rhythms', from: v, to: v })}
            renderItem={(rhythm) => (
              <RhythmCard
                name={rhythm}
                expanded={expandedRhythm === rhythm}
                onToggle={() => setExpandedRhythm(expandedRhythm === rhythm ? null : rhythm)}
              />
            )}
          />
        </>
      )}

      {tab === 'progressions' && (
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[var(--accent-light)]"><IconLink className="w-5 h-5" /></span>
            <h2 className="text-lg font-bold">Suites d’accords</h2>
            <span className="text-sm text-[var(--muted)]">({progressions.length})</span>
          </div>
          {progressions.length === 0 ? (
            <div className="text-sm text-[var(--muted)]">Aucune suite détectée pour le moment.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {progressions.map((p, idx) => (
                <div
                  key={`${p.lessonId}-${idx}`}
                  className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--surface-light)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-sm font-semibold">{p.name}</div>
                    <div className="flex items-center gap-2">
                      {editMode && (
                        <>
                          <button
                            onClick={() =>
                              setEditProgression({
                                lessonId: p.lessonId,
                                progressionIndex: p.progressionIndex,
                                name: p.name || '',
                                chordsLine: (p.chords || []).join(' → '),
                                notes: p.notes || '',
                              })
                            }
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-[var(--surface-light)] text-[var(--muted)] hover:text-[var(--foreground)]"
                          >
                            <IconPencil className="w-4 h-4" /> Modifier
                          </button>
                          <button
                            onClick={() => deleteProgression(p.lessonId, p.progressionIndex)}
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-red-500/20 text-red-300 hover:text-red-200"
                          >
                            <IconTrash className="w-4 h-4" /> Supprimer
                          </button>
                        </>
                      )}
                      <Link
                        href={`/#lesson-${encodeURIComponent(p.lessonId)}`}
                        className="text-xs text-[var(--accent-light)] hover:text-[var(--foreground)]"
                      >
                        Voir
                      </Link>
                    </div>
                  </div>
                  <div className="text-sm mt-2">{p.chords.join(' → ')}</div>
                  <div className="text-xs text-[var(--muted)] mt-2">
                    {p.lessonId} — {p.lessonTitle}
                  </div>
                  {p.notes && <div className="text-xs text-[var(--muted)] mt-2">{p.notes}</div>}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'songs' && (
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[var(--accent-light)]"><IconGuitar className="w-5 h-5" /></span>
            <h2 className="text-lg font-bold">Morceaux</h2>
            <span className="text-sm text-[var(--muted)]">({songs.length})</span>
          </div>
          {songs.length === 0 ? (
            <div className="text-sm text-[var(--muted)]">Aucun morceau pour le moment.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {songs.map((s) => (
                <div
                  key={s.id}
                  className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--surface-light)] hover:border-[var(--accent)] transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs text-[var(--muted)] font-mono">{s.id}</div>
                      <div className="text-sm font-semibold mt-1">{s.title}</div>
                    </div>
                    {editMode && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditLessonTitle({ id: s.id, title: s.title })}
                          className="text-[var(--muted)] hover:text-[var(--foreground)]"
                          title="Renommer"
                        >
                          <IconPencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteLesson(s.id)}
                          className="text-red-400 hover:text-red-300"
                          title="Supprimer"
                        >
                          <IconTrash className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  <Link
                    href={`/#lesson-${encodeURIComponent(s.id)}`}
                    className="inline-block text-xs text-[var(--accent-light)] hover:text-[var(--foreground)] mt-2"
                  >
                    Ouvrir
                  </Link>
                  {s.progressions && s.progressions.length > 0 && (
                    <div className="text-xs text-[var(--muted)] mt-2">
                      {s.progressions[0].chords.join(' → ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {techInfo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setTechInfo(null)}>
          <div className="bg-[var(--surface)] rounded-xl p-6 w-full max-w-md border border-[var(--surface-light)]" onClick={(e) => e.stopPropagation()}>
            {(() => {
              const key = techInfo.toLowerCase();
              const info = db.techniqueDetails?.[key] || TECHNIQUE_DETAILS[key] || { title: techInfo, summary: 'Pas de détail disponible pour cette technique.' };
              return (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold">{info.title || techInfo}</h3>
                    <button onClick={() => setTechInfo(null)} className="text-[var(--muted)] hover:text-[var(--foreground)]">×</button>
                  </div>
                  <p className="text-sm">{info.summary}</p>
                  {info.steps && info.steps.length > 0 && (
                    <ul className="text-sm mt-3 space-y-1 list-disc pl-5">
                      {info.steps.map((s, i) => (<li key={i}>{s}</li>))}
                    </ul>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {editProgression && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditProgression(null)}>
          <div className="bg-[var(--surface)] rounded-xl p-6 w-full max-w-lg border border-[var(--surface-light)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Éditer la suite</h3>
              <button onClick={() => setEditProgression(null)} className="text-[var(--muted)] hover:text-[var(--foreground)]">×</button>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-xs text-[var(--muted)] mb-1">Nom</div>
                <input
                  value={editProgression.name}
                  onChange={(e) => setEditProgression({ ...editProgression, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--surface-light)] text-sm"
                />
              </div>
              <div>
                <div className="text-xs text-[var(--muted)] mb-1">Accords</div>
                <input
                  value={editProgression.chordsLine}
                  onChange={(e) => setEditProgression({ ...editProgression, chordsLine: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--surface-light)] text-sm"
                />
              </div>
              <div>
                <div className="text-xs text-[var(--muted)] mb-1">Notes</div>
                <textarea
                  value={editProgression.notes}
                  onChange={(e) => setEditProgression({ ...editProgression, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--surface-light)] text-sm min-h-20"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setEditProgression(null)}
                className="px-3 py-1.5 text-sm rounded-lg bg-[var(--surface-light)] text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                Annuler
              </button>
              <button
                onClick={saveProgression}
                className="px-3 py-1.5 text-sm rounded-lg bg-[var(--accent)] text-white"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {editKnowledge && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditKnowledge(null)}>
          <div className="bg-[var(--surface)] rounded-xl p-6 w-full max-w-lg border border-[var(--surface-light)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Renommer</h3>
              <button onClick={() => setEditKnowledge(null)} className="text-[var(--muted)] hover:text-[var(--foreground)]">×</button>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-xs text-[var(--muted)] mb-1">Ancien</div>
                <input
                  value={editKnowledge.from}
                  disabled
                  className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--surface-light)] text-sm opacity-70"
                />
              </div>
              <div>
                <div className="text-xs text-[var(--muted)] mb-1">Nouveau</div>
                <input
                  value={editKnowledge.to}
                  onChange={(e) => setEditKnowledge({ ...editKnowledge, to: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--surface-light)] text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setEditKnowledge(null)}
                className="px-3 py-1.5 text-sm rounded-lg bg-[var(--surface-light)] text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                Annuler
              </button>
              <button
                onClick={() => renameItem(editKnowledge.category, editKnowledge.from, editKnowledge.to)}
                className="px-3 py-1.5 text-sm rounded-lg bg-[var(--accent)] text-white"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {editLessonTitle && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditLessonTitle(null)}>
          <div className="bg-[var(--surface)] rounded-xl p-6 w-full max-w-lg border border-[var(--surface-light)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Renommer le morceau</h3>
              <button onClick={() => setEditLessonTitle(null)} className="text-[var(--muted)] hover:text-[var(--foreground)]">×</button>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-xs text-[var(--muted)] mb-1">Titre</div>
                <input
                  value={editLessonTitle.title}
                  onChange={(e) => setEditLessonTitle({ ...editLessonTitle, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--surface-light)] text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setEditLessonTitle(null)}
                className="px-3 py-1.5 text-sm rounded-lg bg-[var(--surface-light)] text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                Annuler
              </button>
              <button
                onClick={saveLessonTitle}
                className="px-3 py-1.5 text-sm rounded-lg bg-[var(--accent)] text-white"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {k.chords.length === 0 && k.techniques.length === 0 && k.rhythms.length === 0 && (
        <div className="text-center py-20 text-[var(--muted)]">
          <p>Aucune connaissance enregistrée pour le moment.</p>
          <p className="text-sm mt-2">Importe des leçons pour remplir ta base de connaissances.</p>
        </div>
      )}
    </div>
  );
}
