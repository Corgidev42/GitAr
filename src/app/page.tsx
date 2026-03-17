'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import type { Database, GuitarLesson, BackingTrack, TabAsset } from '@/types';
import {
  IconCheck, IconGuitar, IconHeart, IconLink, IconMusic, IconPause,
  IconPencil, IconPlay, IconPlus, IconRefresh, IconRhythm, IconTarget,
  IconTrash, IconUpload, IconX, IconBook,
} from '@/components/Icons';

// Accordage standard guitare (E2 A2 D3 G3 B3 E4) en Hz
const GUITAR_TUNING = [82.41, 110, 146.83, 196, 246.94, 329.63];

function freqFromFret(stringIndex: number, fret: number): number {
  return GUITAR_TUNING[stringIndex] * Math.pow(2, fret / 12);
}

// ─── Chord diagrams dictionary ───
const CHORD_DIAGRAMS: Record<string, { frets: number[]; barres?: number[]; position?: number }> = {
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
  'Dm6':    { frets: [-1, 0, 0, 2, 0, 1] },
  'Cmaj9':  { frets: [0, 3, 2, 0, 3, 3] },
  'Em9':    { frets: [0, 2, 0, 0, 0, 2] },
  'Fmaj9':  { frets: [-1, 0, 3, 0, 1, 0] },
  'Dm9':    { frets: [-1, 0, 0, 2, 1, 0] },
  'C5':     { frets: [-1, 3, 5, 5, -1, -1] },
  'D5':     { frets: [-1, 5, 7, 7, -1, -1], position: 5 },
  'E5':     { frets: [0, 2, 2, -1, -1, -1] },
  'F5':     { frets: [1, 3, 3, -1, -1, -1] },
  'G5':     { frets: [3, 5, 5, -1, -1, -1], position: 3 },
  'A5':     { frets: [-1, 0, 2, 2, -1, -1] },
  'B5':     { frets: [-1, 2, 4, 4, -1, -1], position: 2 },
};

// Symboles : ronde/blanche en SVG pour lisibilité, autres en Unicode
const RHYTHM_VISUALS: Record<string, { label: string; beats: number; symbol: string; symbolSvg?: boolean; description: string }> = {
  'ronde':          { label: 'Ronde', beats: 4, symbol: 'ronde', symbolSvg: true, description: '4 temps — la note la plus longue courante' },
  'blanche':        { label: 'Blanche', beats: 2, symbol: 'blanche', symbolSvg: true, description: '2 temps — moitié d\'une ronde' },
  'noire':          { label: 'Noire', beats: 1, symbol: '♩', description: '1 temps — l\'unité de base en 4/4' },
  'croche':         { label: 'Croche', beats: 0.5, symbol: '♪', description: '½ temps — 2 par temps' },
  'croches':        { label: 'Croches', beats: 0.5, symbol: '♫', description: '½ temps — croches groupées par 2' },
  'double croche':  { label: 'Double croche', beats: 0.25, symbol: '𝅘𝅥𝅯', description: '¼ de temps — 4 par temps' },
  'triolet':        { label: 'Triolet', beats: 0.33, symbol: '♫³', description: '3 notes dans l\'espace de 2' },
  'pointée':        { label: 'Pointée', beats: 1.5, symbol: '♩·', description: 'Ajoute la moitié de la durée' },
  'syncope':        { label: 'Syncope', beats: 1, symbol: '‿♩', description: 'Accent sur un temps faible — note liée décalée' },
  'syncopes':       { label: 'Syncopes', beats: 1, symbol: '‿♪', description: 'Syncope en croche' },
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
    summary: 'Variations courtes autour de l\u2019accord de D, ajoutant des notes de passage et suspensions.',
    steps: [
      'Basculer entre D, Dsus2 et Dsus4',
      'Ajouter la basse A (D/A) pour varier la couleur',
      'Utiliser des hammer-on sur la corde de mi aigu (2\u21923) et pull-off (3\u21922)',
    ],
  },
};

// ─── Helpers ───

// Durées en temps par coup (noire=1, croche=0.5, etc.) — motifs connus
const STRUM_PATTERNS: Record<string, number[]> = {
  'feu de camp': [1, 1, 0.5, 0.5, 1], // noire, noire, croche, syncope, croche, noire → 4 temps
  'bas bas haut haut bas': [1, 1, 0.5, 0.5, 1],
};

function getStrumSteps(label: string): Array<'Bas' | 'Haut'> {
  const matches = label.match(/\b(Bas|Haut)\b/gi) || [];
  if (matches.length >= 2) {
    return matches.map((m) => (m.toLowerCase() === 'bas' ? 'Bas' : 'Haut')) as Array<'Bas' | 'Haut'>;
  }
  if (label.toLowerCase().includes('feu de camp')) {
    return ['Bas', 'Bas', 'Haut', 'Haut', 'Bas'];
  }
  return [];
}

function getStrumDurations(label: string, steps: Array<'Bas' | 'Haut'>): { durations: number[]; totalBeats: number; measureInfo: string } {
  const key = normalizeForKey(label);
  const patternKey = Object.keys(STRUM_PATTERNS).find((k) => key.includes(normalizeForKey(k)));
  let durations: number[];
  if (patternKey && steps.length === STRUM_PATTERNS[patternKey].length) {
    durations = STRUM_PATTERNS[patternKey];
  } else {
    // Fallback : répartir 4 temps équitablement
    const totalBeats = 4;
    durations = steps.map(() => totalBeats / steps.length);
  }
  const totalBeats = durations.reduce((a, b) => a + b, 0);
  const measures = Math.ceil(totalBeats / 4);
  const beatsPerMeasure = totalBeats <= 4 ? totalBeats : 4;
  const measureInfo = `${measures} mesure${measures > 1 ? 's' : ''} de ${beatsPerMeasure} temps`;
  return { durations, totalBeats, measureInfo };
}

function normalizeForKey(raw: string): string {
  return raw.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[']/g, "'").replace(/[^a-z0-9]+/g, ' ').trim();
}

// ─── Visual Rhythm Staff (notation type tablature) ───
function VisualRhythmStaff({
  steps,
  onStepsChange,
  isPlaying,
  playingStep,
}: {
  steps: Array<'Bas' | 'Haut'>;
  onStepsChange: (s: Array<'Bas' | 'Haut'>) => void;
  isPlaying: boolean;
  playingStep: number;
}) {
  const staffY = 24;
  const stemLen = 8;
  const noteR = 2.5;
  const padding = 20;
  const totalW = 320;
  const n = Math.max(steps.length, 1);
  const stepW = (totalW - 2 * padding) / Math.max(n, 8);

  const addStroke = (step: 'Bas' | 'Haut') => onStepsChange([...steps, step]);
  const removeAt = (i: number) => onStepsChange(steps.filter((_, j) => j !== i));

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${totalW} 50`} className="w-full min-w-[280px] max-w-[400px] h-14" style={{ color: 'var(--foreground)' }}>
        {/* Zone cliquable pour ajouter (en arrière-plan) */}
        <rect x={padding} y={8} width={totalW - 2 * padding} height={34} fill="transparent" onClick={() => addStroke('Bas')} onContextMenu={(e) => { e.preventDefault(); addStroke('Haut'); }} className="cursor-crosshair" />
        {/* Ligne de portée */}
        <line x1={padding} y1={staffY} x2={totalW - padding} y2={staffY} stroke="currentColor" strokeWidth="1" opacity="0.5" />
        {/* Repères de temps (1, 2, 3, 4) */}
        {[1, 2, 3, 4].map((b) => {
          const x = padding + (b - 1) * (totalW - 2 * padding) / 4;
          return (
            <line key={b} x1={x} y1={staffY - 4} x2={x} y2={staffY + 4} stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
          );
        })}
        {/* Notes (au-dessus pour intercepter les clics) */}
        {steps.map((step, i) => {
          const x = padding + (i + 0.5) * stepW;
          const isDown = step === 'Bas';
          const stemY = isDown ? staffY + stemLen : staffY - stemLen;
          const isActive = isPlaying && i === playingStep;
          return (
            <g key={i} className="cursor-pointer" onClick={(e) => { e.stopPropagation(); removeAt(i); }}>
              {/* Tête de note */}
              <circle cx={x} cy={staffY} r={noteR} fill={isActive ? 'var(--accent)' : 'currentColor'} stroke={isActive ? 'var(--accent)' : 'currentColor'} strokeWidth="0.5" opacity={isActive ? 1 : 0.9} />
              {/* Hampe (vers le bas = Bas, vers le haut = Haut) */}
              <line x1={x + noteR} y1={staffY} x2={x + noteR} y2={stemY} stroke={isActive ? 'var(--accent)' : 'currentColor'} strokeWidth="1" opacity={isActive ? 1 : 0.9} />
              {/* Liaison (barre) pour paires de croches */}
              {i < steps.length - 1 && i % 2 === 0 && (
                <line x1={x + noteR} y1={staffY - 2} x2={padding + (i + 1.5) * stepW + noteR} y2={staffY - 2} stroke="currentColor" strokeWidth="1.5" opacity="0.7" />
              )}
            </g>
          );
        })}
      </svg>
      <p className="text-[10px] text-[var(--muted)] mt-1">Clic sur la portée = ajouter · Clic sur une note = supprimer · Clic droit = coup vers le haut</p>
    </div>
  );
}

// ─── Rhythm Editor (create & play rythmiques) ───
function RhythmEditor({
  steps,
  onStepsChange,
  onSave,
  onPlay,
  onStop,
  isPlaying,
  playingStep,
  editMode,
}: {
  steps: Array<'Bas' | 'Haut'>;
  onStepsChange: (s: Array<'Bas' | 'Haut'>) => void;
  onSave: (label: string) => void;
  onPlay: () => void;
  onStop: () => void;
  isPlaying: boolean;
  playingStep: number;
  editMode: boolean;
}) {
  const [saveName, setSaveName] = useState('');

  const addStep = (step: 'Bas' | 'Haut') => onStepsChange([...steps, step]);
  const removeLast = () => steps.length > 0 && onStepsChange(steps.slice(0, -1));
  const clearAll = () => onStepsChange([]);
  const canPlay = steps.length >= 4;

  if (!editMode) return null;

  return (
    <div className="mb-10 p-5 rounded-xl border-2 border-dashed border-[var(--accent)]/40 bg-[var(--surface)]/50">
      <h3 className="text-sm font-bold text-[var(--accent-light)] mb-3 inline-flex items-center gap-2">
        <IconRhythm className="w-4 h-4" />Créer une rythmique
      </h3>
      <p className="text-xs text-[var(--muted)] mb-4">Construis ton motif en cliquant sur la portée. Hampe vers le bas = coup vers le bas, hampe vers le haut = coup vers le haut.</p>

      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={() => addStep('Bas')} className="px-4 py-2 rounded-lg bg-amber-900/40 text-amber-300 border border-amber-600/50 hover:bg-amber-900/60 transition-colors font-medium">
          ♩ Coup vers le bas
        </button>
        <button onClick={() => addStep('Haut')} className="px-4 py-2 rounded-lg bg-emerald-900/40 text-emerald-300 border border-emerald-600/50 hover:bg-emerald-900/60 transition-colors font-medium">
          ♪ Coup vers le haut
        </button>
        <button onClick={removeLast} disabled={steps.length === 0} className="px-3 py-2 rounded-lg bg-[var(--surface-light)] text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-40" title="Retirer le dernier">
          ← Retirer
        </button>
        <button onClick={clearAll} disabled={steps.length === 0} className="px-3 py-2 rounded-lg text-red-400 hover:bg-red-500/20 disabled:opacity-40" title="Effacer tout">
          Effacer
        </button>
      </div>

      <div className="mb-4 p-4 rounded-lg bg-[var(--background)]/80 border border-[var(--surface-light)]">
        <VisualRhythmStaff steps={steps} onStepsChange={onStepsChange} isPlaying={isPlaying} playingStep={playingStep} />
      </div>

      {steps.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <button onClick={canPlay ? (isPlaying ? onStop : onPlay) : undefined} disabled={!canPlay}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${canPlay ? (isPlaying ? 'bg-red-500 text-white' : 'bg-[var(--accent)] text-white hover:bg-[var(--accent-light)]') : 'bg-[var(--surface-light)] text-[var(--muted)] opacity-50 cursor-not-allowed'}`}
            title={canPlay ? (isPlaying ? 'Stop' : 'Jouer') : 'Ajoute au moins 4 temps'}>
            {isPlaying ? <IconPause className="w-5 h-5" /> : <IconPlay className="w-5 h-5" />}
          </button>
          <span className="text-xs text-[var(--muted)]">BPM 92</span>
          <div className="flex gap-2 ml-4">
            <input value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder="Nom (ex: rythme perso)"
              className="px-3 py-1.5 rounded-lg bg-[var(--background)] border border-[var(--surface-light)] text-sm w-40" />
            <button onClick={() => { const label = saveName.trim() ? `${saveName} (${steps.join(' ')})` : steps.join(' '); onSave(label); setSaveName(''); clearAll(); }}
              className="px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white text-sm hover:bg-[var(--accent-light)]">
              Enregistrer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───

function RhythmSymbolSvg({ type }: { type: 'ronde' | 'blanche' }) {
  return (
    <span className="inline-block align-middle" style={{ width: 56, height: 40 }}>
      <svg viewBox="0 0 28 20" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="1.5">
        <ellipse cx="10" cy="10" rx="6" ry="5" />
        {type === 'blanche' && (
          <line x1="16" y1="10" x2="16" y2="0" strokeLinecap="round" />
        )}
      </svg>
    </span>
  );
}

function RhythmCard({ name, expanded, onToggle }: { name: string; expanded: boolean; onToggle: () => void }) {
  const rhythm = RHYTHM_VISUALS[name.toLowerCase()];
  return (
    <button onClick={onToggle} className={`text-left transition-all rounded-lg border ${expanded ? 'bg-[var(--accent)]/10 border-[var(--accent)] p-4 min-w-[200px]' : 'bg-[var(--surface)] border-[var(--surface-light)] hover:border-[var(--accent)] px-4 py-3'}`}>
      <span className="text-sm font-medium capitalize">{name}</span>
      {expanded && rhythm && (
        <div className="mt-3 space-y-2">
          <div className="text-5xl text-center py-2 font-serif flex items-center justify-center" style={{ fontVariant: 'normal' }}>
            {rhythm.symbolSvg && (rhythm.symbol === 'ronde' || rhythm.symbol === 'blanche') ? (
              <RhythmSymbolSvg type={rhythm.symbol as 'ronde' | 'blanche'} />
            ) : (
              rhythm.symbol
            )}
          </div>
          <div className="text-xs text-[var(--muted)] text-center">{rhythm.description}</div>
          <div className="flex justify-center">
            <svg viewBox="0 0 120 40" className="w-full max-w-[180px] h-10">
              <line x1="10" y1="20" x2="110" y2="20" stroke="var(--muted)" strokeWidth="0.5" />
              {Array.from({ length: 5 }).map((_, i) => (<line key={i} x1={10 + i * 25} y1="15" x2={10 + i * 25} y2="25" stroke="var(--muted)" strokeWidth="0.3" />))}
              <rect x="10" y="17" width={Math.min(rhythm.beats * 25, 100)} height="6" rx="2" fill="var(--accent)" opacity="0.7" />
              {[1, 2, 3, 4].map((b) => (<text key={b} x={10 + (b - 1) * 25} y="35" textAnchor="middle" fontSize="6" fill="var(--muted)">{b}</text>))}
            </svg>
          </div>
        </div>
      )}
      {expanded && !rhythm && (<div className="mt-2 text-xs text-[var(--muted)]">Pas de visuel disponible</div>)}
    </button>
  );
}

function ChordDiagram({ name, onPlay }: { name: string; onPlay?: (name: string) => void }) {
  const chord = CHORD_DIAGRAMS[name];
  const canPlay = chord && chord.frets.some((f) => f >= 0);
  return (
    <div className="flex flex-col items-center p-3 bg-[var(--surface)] rounded-lg border border-[var(--surface-light)] relative group">
      <div className="flex items-center gap-2 w-full justify-center">
        <span className="text-sm font-bold text-[var(--accent-light)]">{name}</span>
        {canPlay && onPlay && (
          <button
            onClick={(e) => { e.stopPropagation(); onPlay(name); }}
            className="w-7 h-7 rounded-lg flex items-center justify-center bg-[var(--surface-light)] text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/20 transition-colors"
            title="Écouter l'accord"
          >
            <IconPlay className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <svg viewBox="0 0 50 60" className="w-16 h-20 mt-1">
        <rect x="5" y="5" width="40" height="3" fill="var(--foreground)" />
        {[0,1,2,3,4,5].map((s) => (<line key={`s${s}`} x1={5+s*8} y1="5" x2={5+s*8} y2="55" stroke="var(--muted)" strokeWidth="0.5" />))}
        {[1,2,3,4].map((f) => (<line key={`f${f}`} x1="5" y1={5+f*12.5} x2="45" y2={5+f*12.5} stroke="var(--muted)" strokeWidth="0.5" />))}
        {chord?.frets.map((fret, string) => {
          if (fret === 0) return <text key={string} x={5+string*8} y="3" textAnchor="middle" fontSize="4" fill="var(--foreground)">O</text>;
          if (fret === -1) return <text key={string} x={5+string*8} y="3" textAnchor="middle" fontSize="4" fill="var(--muted)">×</text>;
          return <circle key={string} cx={5+string*8} cy={fret*12.5-1.25} r="3.5" fill="var(--foreground)" stroke="var(--accent)" strokeWidth="0.7" />;
        })}
        {!chord && <text x="25" y="35" textAnchor="middle" fontSize="5" fill="var(--muted)">?</text>}
      </svg>
    </div>
  );
}

function Section({ title, icon, items, renderItem, editMode, onDelete, onEdit, onAdd, addPlaceholder }: {
  title: string; icon?: ReactNode; items: string[];
  renderItem: (item: string) => React.ReactNode;
  editMode?: boolean; onDelete?: (item: string) => void; onEdit?: (item: string) => void;
  onAdd?: (value: string) => void; addPlaceholder?: string;
}) {
  const [addValue, setAddValue] = useState('');
  return (
    <section className="mb-10">
      <div className="flex items-center gap-2 mb-4">
        {icon && <span className="text-[var(--accent-light)]">{icon}</span>}
        <h2 className="text-lg font-bold">{title}</h2>
        <span className="text-sm text-[var(--muted)]">({items.length})</span>
      </div>
      {editMode && onAdd && addPlaceholder && (
        <div className="flex gap-2 mb-4">
          <input value={addValue} onChange={(e) => setAddValue(e.target.value)} placeholder={addPlaceholder}
            className="flex-1 max-w-xs px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--surface-light)] text-sm"
            onKeyDown={(e) => { if (e.key === 'Enter') { const v = addValue.trim(); if (v) { onAdd(v); setAddValue(''); } } }} />
          <button onClick={() => { const v = addValue.trim(); if (v) { onAdd(v); setAddValue(''); } }}
            className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm inline-flex items-center gap-1.5">
            <IconPlus className="w-4 h-4" />Ajouter
          </button>
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        {items.length === 0 && !editMode ? (
          <div className="text-sm text-[var(--muted)] py-4">Aucun élément. Passe en mode Éditer pour en ajouter.</div>
        ) : null}
        {items.map((item) => (
          <div key={item} className="relative group">
            {renderItem(item)}
            {editMode && (onDelete || onEdit) && (
              <div className="absolute -top-2 -right-2 flex gap-1">
                {onEdit && (<button onClick={() => onEdit(item)} className="w-6 h-6 rounded-full bg-[var(--surface)] border border-[var(--surface-light)] text-[var(--muted)] flex items-center justify-center hover:text-[var(--foreground)] shadow-lg" title={`Renommer ${item}`}><IconPencil className="w-3.5 h-3.5" /></button>)}
                {onDelete && (<button onClick={() => onDelete(item)} className="w-6 h-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center hover:bg-red-400 shadow-lg" title={`Supprimer ${item}`}><IconTrash className="w-3.5 h-3.5" /></button>)}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Create Lesson Modal ───

function CreateLessonModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [id, setId] = useState('');
  const [title, setTitle] = useState('');
  const [level, setLevel] = useState<'debutant' | 'intermediaire'>('debutant');
  const [isSong, setIsSong] = useState(false);
  const [tabFiles, setTabFiles] = useState<{ name: string; file: File }[]>([]);
  const [audioFiles, setAudioFiles] = useState<File[]>([]);
  const [chords, setChords] = useState('');
  const [techniques, setTechniques] = useState('');
  const [rhythms, setRhythms] = useState('');
  const [strums, setStrums] = useState('');
  const [saving, setSaving] = useState(false);
  const [tabName, setTabName] = useState('Tablature');

  const handleAddTab = (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      setTabFiles((prev) => [...prev, { name: tabName || file.name, file }]);
    }
    setTabName('Tablature');
  };

  const handleAddAudio = (files: FileList | null) => {
    if (!files) return;
    setAudioFiles((prev) => [...prev, ...Array.from(files)]);
  };

  const handleSave = async () => {
    if (!id.trim() || !title.trim()) return;
    setSaving(true);

    const tabs: TabAsset[] = [];
    const backingTracks: BackingTrack[] = [];

    // Upload tab files
    if (tabFiles.length > 0) {
      const fd = new FormData();
      fd.append('lessonId', id.trim());
      fd.append('type', 'tab');
      for (const t of tabFiles) fd.append('files', t.file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      if (res.ok) {
        const { paths } = await res.json();
        tabFiles.forEach((t, i) => tabs.push({ name: t.name, path: paths[i] }));
      }
    }

    // Upload audio files
    if (audioFiles.length > 0) {
      const fd = new FormData();
      fd.append('lessonId', id.trim());
      fd.append('type', 'audio');
      for (const f of audioFiles) fd.append('files', f);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      if (res.ok) {
        const { paths } = await res.json();
        audioFiles.forEach((f, i) => {
          const bpmMatch = f.name.match(/(\d+)\s*bpm/i);
          backingTracks.push({ bpm: bpmMatch ? parseInt(bpmMatch[1], 10) : 120, path: paths[i] });
        });
      }
    }

    const split = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);

    await fetch('/api/lessons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: id.trim(),
        title: title.trim(),
        level,
        isSong,
        chords: split(chords),
        techniques: split(techniques),
        rhythms: split(rhythms),
        strums: split(strums),
        tabs,
        backingTracks,
      }),
    });

    setSaving(false);
    onCreated();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[var(--surface)] rounded-2xl p-6 w-full max-w-2xl border border-[var(--surface-light)] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold">Nouvelle leçon</h2>
          <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--foreground)]"><IconX className="w-5 h-5" /></button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--muted)] mb-1 block">ID</label>
              <input value={id} onChange={(e) => setId(e.target.value)} placeholder="ex: D104" className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--surface-light)] text-sm" />
            </div>
            <div>
              <label className="text-xs text-[var(--muted)] mb-1 block">Titre</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ex: Nouveaux accords" className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--surface-light)] text-sm" />
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-[var(--muted)] mb-1 block">Niveau</label>
              <select value={level} onChange={(e) => setLevel(e.target.value as 'debutant' | 'intermediaire')} className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--surface-light)] text-sm">
                <option value="debutant">Débutant</option>
                <option value="intermediaire">Intermédiaire</option>
              </select>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isSong} onChange={(e) => setIsSong(e.target.checked)} className="w-4 h-4 accent-[var(--accent)]" />
                <span className="text-sm">Morceau</span>
              </label>
            </div>
          </div>

          <div>
            <label className="text-xs text-[var(--muted)] mb-1 block">Accords (séparés par des virgules)</label>
            <input value={chords} onChange={(e) => setChords(e.target.value)} placeholder="G, D, Em, C" className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--surface-light)] text-sm" />
          </div>

          <div>
            <label className="text-xs text-[var(--muted)] mb-1 block">Techniques (séparées par des virgules)</label>
            <input value={techniques} onChange={(e) => setTechniques(e.target.value)} placeholder="hammer-on, pull-off" className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--surface-light)] text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--muted)] mb-1 block">Rythmes</label>
              <input value={rhythms} onChange={(e) => setRhythms(e.target.value)} placeholder="croche, noire" className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--surface-light)] text-sm" />
            </div>
            <div>
              <label className="text-xs text-[var(--muted)] mb-1 block">Rythmiques</label>
              <input value={strums} onChange={(e) => setStrums(e.target.value)} placeholder="Bas Bas Haut Haut Bas" className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--surface-light)] text-sm" />
            </div>
          </div>

          {/* Tab uploads */}
          <div>
            <label className="text-xs text-[var(--muted)] mb-1 block">Tablatures / Paroles (PDF)</label>
            <div className="flex gap-2 mb-2">
              <input value={tabName} onChange={(e) => setTabName(e.target.value)} placeholder="Nom du document" className="flex-1 px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--surface-light)] text-sm" />
              <label className="px-3 py-2 rounded-lg bg-[var(--accent)] text-white text-sm cursor-pointer inline-flex items-center gap-1.5 hover:bg-[var(--accent-light)] transition-colors">
                <IconUpload className="w-4 h-4" />
                PDF
                <input type="file" accept=".pdf" multiple className="hidden" onChange={(e) => handleAddTab(e.target.files)} />
              </label>
            </div>
            {tabFiles.length > 0 && (
              <div className="space-y-1">
                {tabFiles.map((t, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm px-3 py-1.5 bg-[var(--background)] rounded-lg">
                    <span className="flex-1 truncate">{t.name} — {t.file.name}</span>
                    <button onClick={() => setTabFiles((prev) => prev.filter((_, j) => j !== i))} className="text-[var(--muted)] hover:text-red-400"><IconX className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Audio uploads */}
          <div>
            <label className="text-xs text-[var(--muted)] mb-1 block">Backing Tracks (MP3)</label>
            <label className="px-3 py-2 rounded-lg bg-[var(--accent)] text-white text-sm cursor-pointer inline-flex items-center gap-1.5 hover:bg-[var(--accent-light)] transition-colors">
              <IconUpload className="w-4 h-4" />
              MP3
              <input type="file" accept=".mp3,audio/*" multiple className="hidden" onChange={(e) => handleAddAudio(e.target.files)} />
            </label>
            {audioFiles.length > 0 && (
              <div className="space-y-1 mt-2">
                {audioFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm px-3 py-1.5 bg-[var(--background)] rounded-lg">
                    <span className="flex-1 truncate">{f.name}</span>
                    <button onClick={() => setAudioFiles((prev) => prev.filter((_, j) => j !== i))} className="text-[var(--muted)] hover:text-red-400"><IconX className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg bg-[var(--surface-light)] text-[var(--muted)] hover:text-[var(--foreground)]">Annuler</button>
          <button onClick={handleSave} disabled={saving || !id.trim() || !title.trim()} className="px-4 py-2 text-sm rounded-lg bg-[var(--accent)] text-white disabled:opacity-50">
            {saving ? 'Création...' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───

export default function KnowledgePage() {
  const [db, setDb] = useState<Database | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'chords' | 'techniques' | 'rhythms' | 'progressions' | 'songs' | 'lessons'>('chords');
  const [expandedRhythm, setExpandedRhythm] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [techInfo, setTechInfo] = useState<string | null>(null);
  const [playingStrumKey, setPlayingStrumKey] = useState<string | null>(null);
  const [playingStrumStep, setPlayingStrumStep] = useState<number>(-1);
  const [showCreate, setShowCreate] = useState(false);
  const [favFilter, setFavFilter] = useState(false);
  const [editProgression, setEditProgression] = useState<{
    lessonId: string; progressionIndex: number; chordsLine: string; notes: string;
  } | null>(null);
  const [editKnowledge, setEditKnowledge] = useState<{
    category: 'chords' | 'techniques' | 'rhythms' | 'strums'; from: string; to: string;
  } | null>(null);
  const [editLessonTitle, setEditLessonTitle] = useState<{ id: string; title: string } | null>(null);
  const [draftStrumSteps, setDraftStrumSteps] = useState<Array<'Bas' | 'Haut'>>([]);
  const [editorPlaying, setEditorPlaying] = useState(false);
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
    if (strumTimerRef.current != null) { window.clearTimeout(strumTimerRef.current); strumTimerRef.current = null; }
    playingStepsRef.current = [];
    setPlayingStrumKey(null);
    setPlayingStrumStep(-1);
    setEditorPlaying(false);
  }, []);

  const playStrum = useCallback(async (label: string) => {
    const key = normalizeForKey(label);
    if (playingStrumKey === key) { stopStrum(); return; }
    const steps = getStrumSteps(label);
    if (steps.length === 0) return;
    setEditorPlaying(false);
    const bpm = 92;
    const beatMs = 60000 / bpm;
    const { durations } = getStrumDurations(label, steps);
    stopStrum();
    setPlayingStrumKey(key);
    playingStepsRef.current = steps;
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    if (audioCtxRef.current.state === 'suspended') await audioCtxRef.current.resume();

    const playStep = (idx: number) => {
      const current = playingStepsRef.current;
      if (current.length === 0) return;
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
    };

    const scheduleLoop = (stepIdx: number) => {
      const current = playingStepsRef.current;
      if (current.length === 0) return;
      const idx = stepIdx % current.length;
      const dur = durations[idx] ?? 1;
      const delayMs = dur * beatMs;
      playStep(idx);
      const id = window.setTimeout(() => {
        if (playingStepsRef.current.length === 0) return;
        scheduleLoop(stepIdx + 1);
      }, delayMs);
      strumTimerRef.current = id;
    };
    scheduleLoop(0);
  }, [playingStrumKey, stopStrum]);

  const playEditorStrum = useCallback(() => {
    if (draftStrumSteps.length < 4) return;
    if (editorPlaying) { stopStrum(); setEditorPlaying(false); return; }
    stopStrum();
    setEditorPlaying(true);
    setPlayingStrumKey('__editor__');
    playingStepsRef.current = [...draftStrumSteps];
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    const bpm = 92;
    const beatMs = 60000 / bpm;
    const steps = draftStrumSteps;
    const durations = steps.map(() => 4 / steps.length);

    const playStep = (idx: number) => {
      const current = playingStepsRef.current;
      if (current.length === 0) return;
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
    };

    const scheduleLoop = (stepIdx: number) => {
      const current = playingStepsRef.current;
      if (current.length === 0) return;
      const idx = stepIdx % current.length;
      const dur = durations[idx] ?? 1;
      const delayMs = dur * beatMs;
      playStep(idx);
      const id = window.setTimeout(() => {
        if (playingStepsRef.current.length === 0) return;
        scheduleLoop(stepIdx + 1);
      }, delayMs);
      strumTimerRef.current = id;
    };
    scheduleLoop(0);
  }, [draftStrumSteps, editorPlaying, stopStrum]);

  const stopEditorStrum = useCallback(() => {
    stopStrum();
    setEditorPlaying(false);
  }, [stopStrum]);

  const saveEditorStrum = useCallback((label: string) => {
    fetch('/api/database', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'knowledge_add', category: 'strums', value: label }) })
      .then(() => safeReload());
    setDraftStrumSteps([]);
  }, [safeReload]);

  const playChord = useCallback(async (name: string) => {
    const chord = CHORD_DIAGRAMS[name];
    if (!chord) return;
    const frets = chord.frets;
    const playable = frets.map((f, s) => (f >= 0 ? { string: s, fret: f } : null)).filter(Boolean) as { string: number; fret: number }[];
    if (playable.length === 0) return;
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    if (audioCtxRef.current.state === 'suspended') await audioCtxRef.current.resume();
    const ctx = audioCtxRef.current;
    const now = ctx.currentTime;
    const duration = 1.2;
    playable.forEach(({ string, fret }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freqFromFret(string, fret), now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration);
    });
  }, []);

  const toggleFavorite = async (lessonId: string, current: boolean) => {
    const res = await fetch(`/api/lessons/${encodeURIComponent(lessonId)}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ favorite: !current }),
    });
    if (res.ok) safeReload();
  };

  const toggleProgressionFavorite = async (lessonId: string, progressions: GuitarLesson['progressions'], idx: number) => {
    if (!progressions) return;
    const next = progressions.map((p, i) => i === idx ? { ...p, favorite: !p.favorite } : p);
    const res = await fetch(`/api/lessons/${encodeURIComponent(lessonId)}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ progressions: next }),
    });
    if (res.ok) safeReload();
  };

  const addItem = async (category: 'chords' | 'techniques' | 'rhythms' | 'strums', value: string) => {
    const res = await fetch('/api/database', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'knowledge_add', category, value: value.trim() }) });
    if (res.ok) safeReload();
  };

  const deleteItem = async (category: 'chords' | 'techniques' | 'rhythms' | 'strums', value: string) => {
    const res = await fetch('/api/database', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'knowledge', category, value }) });
    if (res.ok) { const updated = await fetch('/api/database').then((r) => r.json()); setDb(updated); }
  };

  const renameItem = async (category: 'chords' | 'techniques' | 'rhythms' | 'strums', from: string, to: string) => {
    const res = await fetch('/api/database', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'knowledge_rename', category, from, to }) });
    if (res.ok) safeReload();
  };

  const deleteLesson = async (id: string) => {
    const res = await fetch('/api/database', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'lesson', id }) });
    if (res.ok) safeReload();
  };

  const saveLessonTitle = async () => {
    if (!editLessonTitle) return;
    const res = await fetch(`/api/lessons/${encodeURIComponent(editLessonTitle.id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: editLessonTitle.title }) });
    if (res.ok) { setEditLessonTitle(null); safeReload(); }
  };

  const deleteProgression = async (lessonId: string, progressionIndex: number) => {
    if (!db) return;
    const lesson = db.lessons.find((l) => l.id === lessonId);
    if (!lesson) return;
    const next = (lesson.progressions || []).filter((_, i) => i !== progressionIndex);
    const res = await fetch(`/api/lessons/${encodeURIComponent(lessonId)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ progressions: next }) });
    if (res.ok) safeReload();
  };

  const saveProgression = async () => {
    if (!db || !editProgression) return;
    const { lessonId, progressionIndex, chordsLine, notes } = editProgression;
    const lesson = db.lessons.find((l) => l.id === lessonId);
    if (!lesson) return;
    const chords = chordsLine.replace(/[-–→>|,]/g, ' ').split(/\s+/).map((s) => s.trim()).filter(Boolean);
    if (chords.length < 3) return;
    const next = (lesson.progressions || []).map((p, i) => i === progressionIndex ? { ...p, chords, notes: notes.trim() || undefined } : p);
    const res = await fetch(`/api/lessons/${encodeURIComponent(lessonId)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ progressions: next }) });
    if (res.ok) { setEditProgression(null); safeReload(); }
  };

  useEffect(() => {
    fetch('/api/database').then((r) => r.json()).then((data: Database) => { setDb(data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onFocus = () => safeReload();
    const onVisibility = () => { if (document.visibilityState === 'visible') safeReload(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => { window.removeEventListener('focus', onFocus); document.removeEventListener('visibilitychange', onVisibility); };
  }, [safeReload]);

  useEffect(() => () => stopStrum(), [stopStrum]);

  if (loading) return <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]"><div className="text-[var(--muted)] animate-pulse">Chargement...</div></div>;
  if (!db) return null;

  const k = db.globalKnowledge;
  const progressions = db.lessons.flatMap((lesson) =>
    (lesson.progressions || []).filter((p) => (p.chords || []).length >= 3).map((p, progressionIndex) => ({
      ...p, lessonId: lesson.id, lessonTitle: lesson.title, progressionIndex,
    }))
  );
  const songs = db.lessons.filter((l) => l.isSong);
  const lessons = db.lessons.filter((l) => !l.isSong);

  const filteredSongs = favFilter ? songs.filter((s) => s.favorite) : songs;
  const filteredProgressions = favFilter ? progressions.filter((p) => p.favorite) : progressions;

  const tabs = [
    { key: 'chords' as const, label: 'Accords', count: k.chords.length, icon: <IconMusic className="w-5 h-5" /> },
    { key: 'techniques' as const, label: 'Techniques', count: k.techniques.length, icon: <IconTarget className="w-5 h-5" /> },
    { key: 'rhythms' as const, label: 'Rythmes', count: k.rhythms.length, icon: <IconRhythm className="w-5 h-5" /> },
    { key: 'progressions' as const, label: 'Suites', count: progressions.length, icon: <IconLink className="w-5 h-5" /> },
    { key: 'songs' as const, label: 'Morceaux', count: songs.length, icon: <IconGuitar className="w-5 h-5" /> },
    { key: 'lessons' as const, label: 'Leçons', count: lessons.length, icon: <IconBook className="w-5 h-5" /> },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div>
          <h1 className="text-2xl font-bold">Knowledge Base</h1>
          <p className="text-sm text-[var(--muted)]">Stock de connaissances guitare</p>
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={() => setShowCreate(true)} className="px-3 py-1.5 text-sm rounded-lg bg-[var(--accent)] text-white inline-flex items-center gap-2 hover:bg-[var(--accent-light)] transition-colors">
            <IconPlus className="w-4 h-4" />
            Nouvelle leçon
          </button>
          <button onClick={safeReload} className="px-3 py-1.5 text-sm rounded-lg transition-all bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)] border border-[var(--surface-light)]" title="Actualiser">
            <span className="inline-flex items-center gap-2"><IconRefresh className="w-4 h-4" />Actualiser</span>
          </button>
          <button onClick={() => setEditMode(!editMode)} className={`px-3 py-1.5 text-sm rounded-lg transition-all ${editMode ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)] border border-[var(--surface-light)]'}`}>
            <span className="inline-flex items-center gap-2">
              {editMode ? <IconCheck className="w-4 h-4" /> : <IconPencil className="w-4 h-4" />}
              {editMode ? 'Terminé' : 'Éditer'}
            </span>
          </button>
        </div>
      </div>

      {/* Tab cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => { setTab(t.key); setFavFilter(false); }} className={`p-4 rounded-xl text-left transition-all ${tab === t.key ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface)] hover:bg-[var(--surface-light)]'}`}>
            <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg ${tab === t.key ? 'bg-white/15' : 'bg-[var(--surface-light)] text-[var(--accent-light)]'}`}>{t.icon}</div>
            <div className="mt-2 text-2xl font-bold">{t.count}</div>
            <div className={`text-sm ${tab === t.key ? 'text-white/80' : 'text-[var(--muted)]'}`}>{t.label}</div>
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'chords' && (
        <Section title="Accords" icon={<IconMusic className="w-5 h-5" />} items={k.chords} editMode={editMode}
          onDelete={(v) => deleteItem('chords', v)} onEdit={(v) => setEditKnowledge({ category: 'chords', from: v, to: v })}
          onAdd={(v) => addItem('chords', v)} addPlaceholder="Ex: Cm7, F#m"
          renderItem={(chord) => <ChordDiagram name={chord} onPlay={playChord} />} />
      )}

      {tab === 'techniques' && (
        <Section title="Techniques" icon={<IconTarget className="w-5 h-5" />} items={k.techniques} editMode={editMode}
          onDelete={(v) => deleteItem('techniques', v)} onEdit={(v) => setEditKnowledge({ category: 'techniques', from: v, to: v })}
          renderItem={(tech) => (
            <button onClick={() => setTechInfo(tech)} className="px-4 py-3 bg-[var(--surface)] rounded-lg border border-[var(--surface-light)] hover:border-[var(--accent)] transition-colors text-left">
              <span className="text-sm font-medium capitalize">{tech}</span>
            </button>
          )} />
      )}

      {tab === 'rhythms' && (
        <>
          <RhythmEditor
            steps={draftStrumSteps}
            onStepsChange={setDraftStrumSteps}
            onSave={saveEditorStrum}
            onPlay={playEditorStrum}
            onStop={stopEditorStrum}
            isPlaying={editorPlaying}
            playingStep={playingStrumStep}
            editMode={editMode}
          />
          <Section title="Rythmiques" icon={<IconRhythm className="w-5 h-5" />} items={k.strums || []} editMode={editMode}
            onDelete={(v) => deleteItem('strums', v)} onEdit={(v) => setEditKnowledge({ category: 'strums', from: v, to: v })}
            onAdd={(v) => addItem('strums', v)} addPlaceholder="Ex: Bas Bas Haut Haut Bas"
            renderItem={(strum) => {
              const steps = getStrumSteps(strum);
              const { measureInfo } = getStrumDurations(strum, steps);
              const key = normalizeForKey(strum);
              const isPlaying = playingStrumKey === key;
              const disabled = steps.length === 0;
              return (
                <div className="px-4 py-3 bg-[var(--surface)] rounded-lg border border-[var(--surface-light)] hover:border-[var(--accent)] transition-colors min-w-[240px]">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium capitalize">{strum}</span>
                    <button onClick={() => playStrum(strum)} disabled={disabled}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors ${disabled ? 'opacity-40 cursor-not-allowed border-[var(--surface-light)] text-[var(--muted)]' : isPlaying ? 'bg-[var(--accent)] border-transparent text-white' : 'bg-[var(--surface-light)] border-[var(--surface-light)] text-[var(--muted)] hover:text-[var(--foreground)]'}`}
                      title={disabled ? 'Motif indisponible' : isPlaying ? 'Stop' : 'Jouer'}>
                      {isPlaying ? <IconPause className="w-4 h-4" /> : <IconPlay className="w-4 h-4" />}
                    </button>
                  </div>
                  {steps.length > 0 && (
                    <>
                      <p className="text-[11px] text-[var(--muted)] mt-1.5">{measureInfo}</p>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {steps.map((s, i) => (
                          <span key={`${s}-${i}`} className={`text-xs px-2 py-1 rounded-md border ${isPlaying && i === playingStrumStep ? 'bg-[var(--accent)] text-white border-transparent' : 'bg-[var(--surface-light)] text-[var(--muted)] border-[var(--surface-light)]'}`}>{s}</span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            }} />
          <Section title="Rythmes" icon={<IconRhythm className="w-5 h-5" />} items={k.rhythms} editMode={editMode}
            onDelete={(v) => deleteItem('rhythms', v)} onEdit={(v) => setEditKnowledge({ category: 'rhythms', from: v, to: v })}
            onAdd={(v) => addItem('rhythms', v)} addPlaceholder="Ex: blanche, ronde"
            renderItem={(rhythm) => (
              <RhythmCard name={rhythm} expanded={expandedRhythm === rhythm} onToggle={() => setExpandedRhythm(expandedRhythm === rhythm ? null : rhythm)} />
            )} />
        </>
      )}

      {tab === 'progressions' && (
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[var(--accent-light)]"><IconLink className="w-5 h-5" /></span>
            <h2 className="text-lg font-bold">Suites d&apos;accords</h2>
            <span className="text-sm text-[var(--muted)]">({filteredProgressions.length})</span>
            <button onClick={() => setFavFilter(!favFilter)} className={`ml-auto px-3 py-1 text-sm rounded-lg inline-flex items-center gap-1.5 transition-colors ${favFilter ? 'bg-pink-500/20 text-pink-400 border border-pink-500/50' : 'bg-[var(--surface)] text-[var(--muted)] border border-[var(--surface-light)] hover:text-[var(--foreground)]'}`}>
              <IconHeart className="w-4 h-4" />{favFilter ? 'Tous' : 'Favoris'}
            </button>
          </div>
          {filteredProgressions.length === 0 ? (
            <div className="text-sm text-[var(--muted)]">{favFilter ? 'Aucun favori pour le moment.' : 'Aucune suite détectée pour le moment.'}</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProgressions.map((p, idx) => (
                <div key={`${p.lessonId}-${idx}`} className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--surface-light)]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-sm font-semibold">{p.chords.join(' → ')}</div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleProgressionFavorite(p.lessonId, db.lessons.find((l) => l.id === p.lessonId)?.progressions, p.progressionIndex)}
                        className={`transition-colors ${p.favorite ? 'text-pink-400' : 'text-[var(--muted)] hover:text-pink-400'}`} title="Favori">
                        <IconHeart className="w-4 h-4" style={p.favorite ? { fill: 'currentColor' } : {}} />
                      </button>
                      {editMode && (
                        <>
                          <button onClick={() => setEditProgression({ lessonId: p.lessonId, progressionIndex: p.progressionIndex, chordsLine: (p.chords || []).join(' → '), notes: p.notes || '' })}
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-[var(--surface-light)] text-[var(--muted)] hover:text-[var(--foreground)]"><IconPencil className="w-4 h-4" /></button>
                          <button onClick={() => deleteProgression(p.lessonId, p.progressionIndex)}
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-red-500/20 text-red-300 hover:text-red-200"><IconTrash className="w-4 h-4" /></button>
                        </>
                      )}
                      <Link href={`/lesson/${encodeURIComponent(p.lessonId)}`} className="text-xs text-[var(--accent-light)] hover:text-[var(--foreground)]">Voir</Link>
                    </div>
                  </div>
                  <div className="text-xs text-[var(--muted)] mt-2">{p.lessonId} — {p.lessonTitle}</div>
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
            <span className="text-sm text-[var(--muted)]">({filteredSongs.length})</span>
            <button onClick={() => setFavFilter(!favFilter)} className={`ml-auto px-3 py-1 text-sm rounded-lg inline-flex items-center gap-1.5 transition-colors ${favFilter ? 'bg-pink-500/20 text-pink-400 border border-pink-500/50' : 'bg-[var(--surface)] text-[var(--muted)] border border-[var(--surface-light)] hover:text-[var(--foreground)]'}`}>
              <IconHeart className="w-4 h-4" />{favFilter ? 'Tous' : 'Favoris'}
            </button>
          </div>
          {filteredSongs.length === 0 ? (
            <div className="text-sm text-[var(--muted)]">{favFilter ? 'Aucun favori pour le moment.' : 'Aucun morceau pour le moment.'}</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSongs.map((s) => (
                <div key={s.id} className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--surface-light)] hover:border-[var(--accent)] transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs text-[var(--muted)] font-mono">{s.id}</div>
                      <div className="text-sm font-semibold mt-1">{s.title}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => toggleFavorite(s.id, !!s.favorite)} className={`transition-colors ${s.favorite ? 'text-pink-400' : 'text-[var(--muted)] hover:text-pink-400'}`} title="Favori">
                        <IconHeart className="w-4 h-4" style={s.favorite ? { fill: 'currentColor' } : {}} />
                      </button>
                      {editMode && (
                        <>
                          <button onClick={() => setEditLessonTitle({ id: s.id, title: s.title })} className="text-[var(--muted)] hover:text-[var(--foreground)]" title="Renommer"><IconPencil className="w-4 h-4" /></button>
                          <button onClick={() => deleteLesson(s.id)} className="text-red-400 hover:text-red-300" title="Supprimer"><IconTrash className="w-4 h-4" /></button>
                        </>
                      )}
                    </div>
                  </div>
                  <Link href={`/lesson/${encodeURIComponent(s.id)}`} className="inline-block text-xs text-[var(--accent-light)] hover:text-[var(--foreground)] mt-2">Ouvrir</Link>
                  {s.progressions && s.progressions.length > 0 && (
                    <div className="text-xs text-[var(--muted)] mt-2">{s.progressions[0].chords.join(' → ')}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'lessons' && (
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[var(--accent-light)]"><IconBook className="w-5 h-5" /></span>
            <h2 className="text-lg font-bold">Leçons</h2>
            <span className="text-sm text-[var(--muted)]">({lessons.length})</span>
          </div>
          {lessons.length === 0 ? (
            <div className="text-sm text-[var(--muted)]">Aucune leçon pour le moment.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lessons.map((l) => (
                <div key={l.id} className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--surface-light)] hover:border-[var(--accent)] transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs text-[var(--muted)] font-mono">{l.id}</div>
                      <div className="text-sm font-semibold mt-1">{l.title}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      {editMode && (
                        <>
                          <button onClick={() => setEditLessonTitle({ id: l.id, title: l.title })} className="text-[var(--muted)] hover:text-[var(--foreground)]" title="Renommer"><IconPencil className="w-4 h-4" /></button>
                          <button onClick={() => deleteLesson(l.id)} className="text-red-400 hover:text-red-300" title="Supprimer"><IconTrash className="w-4 h-4" /></button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {l.knowledge.chords.slice(0, 4).map((c) => (
                      <span key={c} className="text-[10px] px-1.5 py-0.5 rounded bg-violet-900/50 text-violet-300">{c}</span>
                    ))}
                    {l.knowledge.chords.length > 4 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface-light)] text-[var(--muted)]">+{l.knowledge.chords.length - 4}</span>}
                  </div>
                  <Link href={`/lesson/${encodeURIComponent(l.id)}`} className="inline-block text-xs text-[var(--accent-light)] hover:text-[var(--foreground)] mt-2">Ouvrir</Link>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Modals */}
      {showCreate && <CreateLessonModal onClose={() => setShowCreate(false)} onCreated={safeReload} />}

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
              <div><div className="text-xs text-[var(--muted)] mb-1">Accords</div><input value={editProgression.chordsLine} onChange={(e) => setEditProgression({ ...editProgression, chordsLine: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--surface-light)] text-sm" placeholder="D - A - Bm - G" /></div>
              <div><div className="text-xs text-[var(--muted)] mb-1">Notes (optionnel)</div><textarea value={editProgression.notes} onChange={(e) => setEditProgression({ ...editProgression, notes: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--surface-light)] text-sm min-h-20" /></div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setEditProgression(null)} className="px-3 py-1.5 text-sm rounded-lg bg-[var(--surface-light)] text-[var(--muted)] hover:text-[var(--foreground)]">Annuler</button>
              <button onClick={saveProgression} className="px-3 py-1.5 text-sm rounded-lg bg-[var(--accent)] text-white">Enregistrer</button>
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
              <div><div className="text-xs text-[var(--muted)] mb-1">Ancien</div><input value={editKnowledge.from} disabled className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--surface-light)] text-sm opacity-70" /></div>
              <div><div className="text-xs text-[var(--muted)] mb-1">Nouveau</div><input value={editKnowledge.to} onChange={(e) => setEditKnowledge({ ...editKnowledge, to: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--surface-light)] text-sm" /></div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setEditKnowledge(null)} className="px-3 py-1.5 text-sm rounded-lg bg-[var(--surface-light)] text-[var(--muted)] hover:text-[var(--foreground)]">Annuler</button>
              <button onClick={() => renameItem(editKnowledge.category, editKnowledge.from, editKnowledge.to)} className="px-3 py-1.5 text-sm rounded-lg bg-[var(--accent)] text-white">Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {editLessonTitle && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditLessonTitle(null)}>
          <div className="bg-[var(--surface)] rounded-xl p-6 w-full max-w-lg border border-[var(--surface-light)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Renommer</h3>
              <button onClick={() => setEditLessonTitle(null)} className="text-[var(--muted)] hover:text-[var(--foreground)]">×</button>
            </div>
            <div><div className="text-xs text-[var(--muted)] mb-1">Titre</div><input value={editLessonTitle.title} onChange={(e) => setEditLessonTitle({ ...editLessonTitle, title: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--surface-light)] text-sm" /></div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setEditLessonTitle(null)} className="px-3 py-1.5 text-sm rounded-lg bg-[var(--surface-light)] text-[var(--muted)] hover:text-[var(--foreground)]">Annuler</button>
              <button onClick={saveLessonTitle} className="px-3 py-1.5 text-sm rounded-lg bg-[var(--accent)] text-white">Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {k.chords.length === 0 && k.techniques.length === 0 && k.rhythms.length === 0 && db.lessons.length === 0 && (
        <div className="text-center py-20 text-[var(--muted)]">
          <p>Aucune connaissance enregistrée pour le moment.</p>
          <p className="text-sm mt-2">Crée ta première leçon pour commencer.</p>
        </div>
      )}
    </div>
  );
}
