'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import type { Database, GuitarLesson, BackingTrack, TabAsset } from '@/types';
import {
  IconBook, IconCheck, IconChevronDown, IconChevronUp, IconGamme, IconGuitar, IconHeart, IconLayoutGrid, IconLink, IconMusic,
  IconPencil, IconPlus, IconRefresh, IconRhythm, IconTarget,
  IconPause, IconPlay, IconTrash, IconUpload, IconX,
} from '@/components/Icons';
import { ChordDiagramView } from '@/components/ChordDiagramView';
import { ChordEditorModal, type ChordEditorOpen } from '@/components/ChordEditorModal';
import { resolveChordDiagram } from '@/lib/chordDiagrams';
import { parseArpeggioPattern } from '@/lib/arpeggioCodec';
import { parseGammePattern } from '@/lib/gammeCodec';
import { useRhythmPlayback } from '@/hooks/useRhythmPlayback';
import { ArpeggioMenuCard, ArpeggioPatternEditor } from '@/components/ArpeggioPatternEditor';
import { GammeMenuCard, GammePatternEditor } from '@/components/GammePatternEditor';

type KnowledgeListCategory = 'chords' | 'techniques' | 'rhythms' | 'strums' | 'arpeggios' | 'gammes';

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

function mergeTechniqueForDisplay(name: string, dbDetails?: Database['techniqueDetails']) {
  const key = name.toLowerCase();
  const fromDb = dbDetails?.[key];
  const fromStatic = TECHNIQUE_DETAILS[key];
  const summary = fromDb?.summary ?? fromStatic?.summary ?? 'Pas de détail disponible pour cette technique.';
  const steps = fromDb?.steps?.length ? fromDb.steps : fromStatic?.steps;
  return {
    title: fromDb?.title ?? fromStatic?.title ?? name,
    summary,
    steps,
    image: fromDb?.image,
  };
}

// ─── Helpers rythmiques (éditeur en 4/4, grille en doubles-croches) ───

const RHYTHM_V2_PREFIX = 'RHYTHM_V2:';
const STEPS_PER_MEASURE = 8; // 8 croches par mesure en 4/4

type RhythmFigureId = 'whole' | 'half' | 'quarter' | 'eighth' | 'rest_half' | 'rest_quarter' | 'rest_eighth';
type RhythmItem = { id: string; start: number; length: number; symbol: string; isRest: boolean; syncToStart?: number; syncopated?: boolean };
type RhythmPatternV2 = { v: 2; name: string; measures: number; items: RhythmItem[] };

const RHYTHM_FIGURES: Array<{ id: RhythmFigureId; label: string; symbol: string; length: number; isRest: boolean }> = [
  { id: 'whole', label: 'Ronde', symbol: '𝅝', length: 8, isRest: false },
  { id: 'half', label: 'Blanche', symbol: '𝅗𝅥', length: 4, isRest: false },
  { id: 'quarter', label: 'Noire', symbol: '♩', length: 2, isRest: false },
  { id: 'eighth', label: 'Croche', symbol: '♪', length: 1, isRest: false },
  { id: 'rest_half', label: 'Silence blanche', symbol: '𝄼', length: 4, isRest: true },
  { id: 'rest_quarter', label: 'Silence noire', symbol: '𝄽', length: 2, isRest: true },
  { id: 'rest_eighth', label: 'Silence croche', symbol: '𝄾', length: 1, isRest: true },
];

function makeEmptyRhythmPattern(): RhythmPatternV2 {
  return { v: 2, name: 'Rythmique perso', measures: 1, items: [] };
}

function getRhythmSlots(pattern: RhythmPatternV2): number {
  return pattern.measures * STEPS_PER_MEASURE;
}

function parseRhythmPattern(raw: string): RhythmPatternV2 | null {
  if (!raw.startsWith(RHYTHM_V2_PREFIX)) return null;
  try {
    const encoded = raw.slice(RHYTHM_V2_PREFIX.length);
    const parsed = JSON.parse(decodeURIComponent(encoded)) as RhythmPatternV2;
    if (parsed.v !== 2 || !parsed.name || !Array.isArray(parsed.items) || !Number.isInteger(parsed.measures) || parsed.measures < 1 || parsed.measures > 16) return null;
    const maxSlots = parsed.measures * STEPS_PER_MEASURE;
    const validItems = parsed.items
      .filter((it) => Number.isInteger(it.start) && Number.isInteger(it.length) && it.start >= 0 && it.length > 0 && it.start + it.length <= maxSlots)
      .map((it) => ({
        id: String(it.id || `${it.start}-${it.length}`),
        start: it.start,
        length: it.length,
        symbol: String(it.symbol || '♩'),
        isRest: !!it.isRest,
        syncToStart: Number.isInteger((it as { syncToStart?: unknown }).syncToStart) ? Number((it as { syncToStart?: unknown }).syncToStart) : undefined,
        syncopated: !!it.syncopated,
      }))
      .sort((a, b) => a.start - b.start);
    return { v: 2, name: parsed.name, measures: parsed.measures, items: validItems };
  } catch {
    return null;
  }
}

function serializeRhythmPattern(pattern: RhythmPatternV2): string {
  return `${RHYTHM_V2_PREFIX}${encodeURIComponent(JSON.stringify(pattern))}`;
}

function rhythmDisplayName(value: string): string {
  const parsed = parseRhythmPattern(value);
  return parsed?.name ?? value;
}

function formatRhythmMeta(pattern: RhythmPatternV2): string {
  const syncCount = getSyncopePairs(pattern.items).length;
  return `${pattern.measures} mesure${pattern.measures > 1 ? 's' : ''} · 4/4 · ${pattern.items.length} figure${pattern.items.length > 1 ? 's' : ''} · ${syncCount} syncope${syncCount > 1 ? 's' : ''}`;
}

function overlaps(aStart: number, aLength: number, bStart: number, bLength: number): boolean {
  const aEnd = aStart + aLength;
  const bEnd = bStart + bLength;
  return aStart < bEnd && bStart < aEnd;
}

function uid(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getSyncopePairs(items: RhythmItem[]): Array<{ from: RhythmItem; to: RhythmItem }> {
  const notes = items.filter((it) => !it.isRest).sort((a, b) => a.start - b.start);
  return notes.flatMap((from) => {
    let target: RhythmItem | undefined;
    if (Number.isInteger(from.syncToStart)) {
      target = notes.find((n) => n.start === from.syncToStart);
    } else if (from.syncopated) {
      // Compat anciens motifs: "syncopated: true" => liaison vers la note suivante
      target = notes.find((n) => n.start > from.start);
    }
    if (!target || target.start <= from.start) return [];
    return [{ from, to: target }];
  });
}

function rhythmFigureKind(length: number): 'whole' | 'half' | 'quarter' | 'eighth' {
  if (length >= 8) return 'whole';
  if (length >= 4) return 'half';
  if (length >= 2) return 'quarter';
  return 'eighth';
}

function RhythmMeasureSvg({
  measureItems,
  measurePairs,
  measureBase,
  selectedItemId,
  compact = false,
  onItemClick,
  playbackHighlightSlot,
}: {
  measureItems: RhythmItem[];
  measurePairs: Array<{ from: RhythmItem; to: RhythmItem }>;
  measureBase: number;
  selectedItemId?: string | null;
  compact?: boolean;
  onItemClick?: (itemId: string) => void;
  /** Case courante 0–7 pendant la lecture (aperçu visuel). */
  playbackHighlightSlot?: number | null;
}) {
  const unit = compact ? 24 : 30; // largeur d'une croche
  const headY = compact ? 42 : 48;
  const stemTopY = compact ? 20 : 22;
  // Pas de marge horizontale : même repère que la grille HTML (8 colonnes = 8 × unit)
  const svgW = unit * STEPS_PER_MEASURE;
  const svgH = compact ? 70 : 86;
  const lineYs = compact ? [22, 28, 34, 40, 46, 52] : [24, 30, 36, 42, 48, 54]; // style tablature

  const eighthNotes = measureItems
    .filter((it) => !it.isRest && it.length === 1)
    .sort((a, b) => a.start - b.start);
  const beams: Array<{ a: RhythmItem; b: RhythmItem }> = [];
  for (let i = 0; i < eighthNotes.length - 1; i += 1) {
    const a = eighthNotes[i];
    const b = eighthNotes[i + 1];
    if (b.start === a.start + 1 && Math.floor((a.start - measureBase) / 2) === Math.floor((b.start - measureBase) / 2)) {
      beams.push({ a, b });
      i += 1;
    }
  }

  const syncopeTargetIds = new Set(measurePairs.map((p) => p.to.id));

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto rounded-md bg-[var(--background)]/60">
      {/* Lignes de tablature */}
      {lineYs.map((y, i) => (
        <line key={`l-${i}`} x1="0" y1={y} x2={svgW} y2={y} stroke="var(--muted)" strokeWidth="0.8" opacity="0.65" />
      ))}

      {/* Barres de temps et de mesure */}
      {Array.from({ length: STEPS_PER_MEASURE + 1 }).map((_, i) => {
        const x = i * unit;
        const isBeat = i % 2 === 0;
        return (
          <line
            key={`g-${i}`}
            x1={x}
            y1={lineYs[0] - 4}
            x2={x}
            y2={lineYs[lineYs.length - 1] + 4}
            stroke="var(--surface-light)"
            strokeWidth={isBeat ? 1 : 0.5}
            opacity={isBeat ? 0.55 : 0.35}
          />
        );
      })}

      {playbackHighlightSlot !== null &&
        playbackHighlightSlot !== undefined &&
        playbackHighlightSlot >= 0 &&
        playbackHighlightSlot < STEPS_PER_MEASURE && (
          <rect
            x={playbackHighlightSlot * unit}
            y={lineYs[0] - 4}
            width={unit}
            height={lineYs[lineYs.length - 1] - lineYs[0] + 8}
            fill="var(--accent)"
            opacity={0.14}
            style={{ pointerEvents: 'none' }}
          />
        )}

      {/* Notes et silences */}
      {measureItems.map((it) => {
        const start = it.start - measureBase;
        const xStart = start * unit;
        // Silences : symbole centré sur toute la durée occupée
        const xRestCenter = (start + it.length / 2) * unit;
        // Notes : tête alignée sur le milieu de la case cliquée (1 croche = 1 case), pas le milieu de la noire/blanche entière
        const xNoteHead = (start + 0.5) * unit;
        const kind = rhythmFigureKind(it.length);
        const selected = selectedItemId === it.id;

        if (it.isRest) {
          return (
            <g key={it.id} onClick={() => onItemClick?.(it.id)} className={onItemClick ? 'cursor-pointer' : undefined}>
              <rect
                x={xStart + 2}
                y={headY - 10}
                width={Math.max(14, it.length * unit - 4)}
                height="18"
                rx="3"
                fill="transparent"
                stroke={selected ? 'var(--accent-light)' : 'transparent'}
                strokeWidth="1.5"
              />
              <text x={xRestCenter} y={headY + 2} textAnchor="middle" fontSize={compact ? 12 : 14} fill="var(--warning)">
                {it.symbol}
              </text>
            </g>
          );
        }

        const fillHead = kind === 'quarter' || kind === 'eighth';
        const hasStem = kind !== 'whole';
        const hasFlag = kind === 'eighth' && !beams.some((b) => b.a.id === it.id || b.b.id === it.id);
        const headStroke = selected ? 'var(--accent-light)' : 'var(--foreground)';
        const headFill = fillHead ? 'var(--foreground)' : 'transparent';
        const strokeWidth = 1.4;
        const isSyncopeTarget = syncopeTargetIds.has(it.id);
        const ghostSyncopeEnd = isSyncopeTarget && !selected;

        return (
          <g
            key={it.id}
            onClick={() => onItemClick?.(it.id)}
            className={onItemClick ? 'cursor-pointer' : undefined}
            opacity={ghostSyncopeEnd ? 0.38 : 1}
          >
            <ellipse cx={xNoteHead} cy={headY} rx="4.5" ry="3.4" fill={headFill} stroke={headStroke} strokeWidth={strokeWidth} />
            {hasStem && <line x1={xNoteHead + 4.5} y1={headY} x2={xNoteHead + 4.5} y2={stemTopY} stroke={headStroke} strokeWidth="1.3" />}
            {hasFlag && <path d={`M ${xNoteHead + 4.5} ${stemTopY} q 6 2 5 8`} fill="none" stroke={headStroke} strokeWidth="1.3" />}
          </g>
        );
      })}

      {/* Barres pour paires de croches */}
      {beams.map((beam, i) => {
        const aX = (beam.a.start - measureBase + 0.5) * unit + 4.5;
        const bX = (beam.b.start - measureBase + 0.5) * unit + 4.5;
        return <line key={`beam-${i}`} x1={aX} y1={stemTopY} x2={bX} y2={stemTopY} stroke="var(--foreground)" strokeWidth="3" />;
      })}

      {/* Liaisons de syncope */}
      {measurePairs.map((p, i) => {
        const fromX = (p.from.start - measureBase + 0.5) * unit;
        const toX = (p.to.start - measureBase + 0.5) * unit;
        const cx = (fromX + toX) / 2;
        return (
          <path
            key={`sync-${i}`}
            d={`M ${fromX} ${headY + 10} Q ${cx} ${headY + 18} ${toX} ${headY + 10}`}
            stroke="var(--accent)"
            strokeWidth="1.6"
            fill="none"
            opacity="0.95"
          />
        );
      })}
    </svg>
  );
}

function RhythmPatternPreview({ pattern, globalPlayhead = null }: { pattern: RhythmPatternV2; globalPlayhead?: number | null }) {
  const pairs = getSyncopePairs(pattern.items);
  return (
    <div className="mt-2 rounded-lg border border-[var(--surface-light)] bg-[var(--background)]/70 p-2">
      {Array.from({ length: pattern.measures }).map((_, measureIdx) => {
        const base = measureIdx * STEPS_PER_MEASURE;
        const measureItems = pattern.items.filter((it) => it.start >= base && it.start < base + STEPS_PER_MEASURE);
        const measurePairs = pairs.filter(
          (p) => Math.floor(p.from.start / STEPS_PER_MEASURE) === measureIdx && Math.floor(p.to.start / STEPS_PER_MEASURE) === measureIdx,
        );
        const localHighlight =
          globalPlayhead !== null && globalPlayhead >= base && globalPlayhead < base + STEPS_PER_MEASURE
            ? globalPlayhead - base
            : null;
        return (
          <div key={`prev-${measureIdx}`} className="mb-2 last:mb-0">
            <RhythmMeasureSvg
              measureItems={measureItems}
              measurePairs={measurePairs}
              measureBase={base}
              compact
              playbackHighlightSlot={localHighlight}
            />
          </div>
        );
      })}
    </div>
  );
}

/** Carte rythmique dans la liste (hors éditeur) : écoute + tempo. */
function StrumRhythmMenuCard({ pattern }: { pattern: RhythmPatternV2 }) {
  const [audioErr, setAudioErr] = useState('');
  const pb = useRhythmPlayback(pattern, { onAudioError: setAudioErr });

  return (
    <div className="px-4 py-3 bg-[var(--surface)] rounded-lg border border-[var(--surface-light)] hover:border-[var(--accent)] transition-colors min-w-[260px]">
      <div className="text-sm font-medium">{pattern.name}</div>
      <p className="text-[11px] text-[var(--muted)] mt-1">{formatRhythmMeta(pattern)}</p>
      <div className="flex flex-wrap items-center gap-2 mt-2 rounded-md border border-[var(--surface-light)] bg-[var(--background)]/50 px-2 py-1.5">
        <span className="text-[10px] text-[var(--muted)] shrink-0">Lecture</span>
        <label className="flex items-center gap-1 text-[10px] text-[var(--muted)]">
          <span>BPM</span>
          <input
            type="number"
            min={40}
            max={220}
            value={pb.bpm}
            disabled={pb.playing}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10);
              pb.setBpm(Number.isFinite(n) ? Math.min(220, Math.max(40, n)) : 96);
            }}
            className="w-14 px-1.5 py-0.5 rounded bg-[var(--background)] border border-[var(--surface-light)] text-xs text-[var(--foreground)]"
          />
        </label>
        <label className="inline-flex items-center gap-1 text-[10px] text-[var(--muted)] cursor-pointer select-none">
          <input type="checkbox" checked={pb.loop} disabled={pb.playing} onChange={(e) => pb.setLoop(e.target.checked)} className="rounded" />
          Boucle
        </label>
        {!pb.playing ? (
          <button
            type="button"
            onClick={() => void pb.start()}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--accent)] text-white text-[10px] font-medium"
          >
            <IconPlay className="w-3 h-3" />
            Écouter
          </button>
        ) : (
          <button
            type="button"
            onClick={pb.stop}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--surface-light)] text-[var(--foreground)] text-[10px] border border-[var(--surface-light)]"
          >
            <IconPause className="w-3 h-3" />
            Arrêter
          </button>
        )}
      </div>
      {audioErr ? <p className="text-[10px] text-red-400 mt-1">{audioErr}</p> : null}
      <RhythmPatternPreview pattern={pattern} globalPlayhead={pb.playing ? pb.playhead : null} />
    </div>
  );
}

function RhythmPatternEditor({
  editMode,
  source,
  onSave,
  onCancelEdit,
}: {
  editMode: boolean;
  source: string | null;
  onSave: (payload: { encoded: string; source: string | null }) => void;
  onCancelEdit: () => void;
}) {
  const [pattern, setPattern] = useState<RhythmPatternV2>(makeEmptyRhythmPattern());
  const [selectedFigureId, setSelectedFigureId] = useState<RhythmFigureId>('quarter');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [syncopeBrushMode, setSyncopeBrushMode] = useState(false);
  const [error, setError] = useState('');
  const rhythmPb = useRhythmPlayback(pattern, { onAudioError: setError });

  useEffect(() => {
    if (!editMode) return;
    if (!source) {
      setPattern(makeEmptyRhythmPattern());
      setSelectedItemId(null);
      setSyncopeBrushMode(false);
      setError('');
      return;
    }
    const parsed = parseRhythmPattern(source);
    if (parsed) {
      setPattern(parsed);
      setSelectedItemId(null);
      setSyncopeBrushMode(false);
      setError('');
      return;
    }
    setPattern(makeEmptyRhythmPattern());
    setSelectedItemId(null);
    setSyncopeBrushMode(false);
    setError('Impossible de charger ce motif (ancien format non éditable directement).');
  }, [editMode, source]);

  if (!editMode) return null;

  const totalSlots = getRhythmSlots(pattern);
  const selectedFigure = RHYTHM_FIGURES.find((f) => f.id === selectedFigureId) ?? RHYTHM_FIGURES[2];
  const selectedItem = selectedItemId ? pattern.items.find((i) => i.id === selectedItemId) || null : null;
  const syncopePairs = getSyncopePairs(pattern.items);

  const setMeasures = (nextMeasures: number) => {
    const maxSlots = nextMeasures * STEPS_PER_MEASURE;
    setPattern((prev) => ({
      ...prev,
      measures: nextMeasures,
      items: prev.items.filter((it) => it.start + it.length <= maxSlots),
    }));
    setSelectedItemId(null);
    setSyncopeBrushMode(false);
  };

  const placeFigureAt = (slot: number) => {
    const figure = selectedFigure;
    if (slot + figure.length > totalSlots) {
      setError('La figure dépasse la fin des mesures.');
      return;
    }
    setError('');
    const nextItem: RhythmItem = {
      id: uid(),
      start: slot,
      length: figure.length,
      symbol: figure.symbol,
      isRest: figure.isRest,
    };
    setPattern((prev) => ({
      ...prev,
      items: [...prev.items.filter((it) => !overlaps(it.start, it.length, nextItem.start, nextItem.length)), nextItem].sort((a, b) => a.start - b.start),
    }));
    setSelectedItemId(nextItem.id);
  };

  const removeSelected = () => {
    if (!selectedItemId) return;
    setPattern((prev) => ({
      ...prev,
      items: prev.items
        .filter((x) => x.id !== selectedItemId)
        .map((x) => (x.syncToStart === selectedItem?.start ? { ...x, syncToStart: undefined, syncopated: false } : x)),
    }));
    setSelectedItemId(null);
    setSyncopeBrushMode(false);
  };

  const clearSyncopeFromSelected = () => {
    if (!selectedItem) return;
    setPattern((prev) => ({
      ...prev,
      items: prev.items.map((it) => (it.id === selectedItem.id ? { ...it, syncToStart: undefined, syncopated: false } : it)),
    }));
    setError('');
  };

  const connectSyncope = (fromId: string, toId: string) => {
    if (fromId === toId) {
      setError('A et B doivent être deux notes différentes.');
      return;
    }
    const from = pattern.items.find((it) => it.id === fromId);
    const to = pattern.items.find((it) => it.id === toId);
    if (!from || !to || from.isRest || to.isRest) {
      setError('La syncope A→B se fait uniquement entre deux notes.');
      return;
    }
    if (to.start <= from.start) {
      setError('B doit être placé après A.');
      return;
    }
    const fromMeasure = Math.floor(from.start / STEPS_PER_MEASURE);
    const toMeasure = Math.floor(to.start / STEPS_PER_MEASURE);
    if (fromMeasure !== toMeasure) {
      setError('Pour l’instant, la syncope A→B doit rester dans la même mesure.');
      return;
    }
    setPattern((prev) => ({
      ...prev,
      items: prev.items.map((it) => (it.id === from.id ? { ...it, syncToStart: to.start, syncopated: true } : it)),
    }));
    setSelectedItemId(from.id);
    setError('');
  };

  const paintSyncopeAtGap = (slot: number) => {
    const measureIdx = Math.floor(slot / STEPS_PER_MEASURE);
    const base = measureIdx * STEPS_PER_MEASURE;
    const notes = pattern.items
      .filter((it) => !it.isRest && it.start >= base && it.start < base + STEPS_PER_MEASURE)
      .sort((a, b) => a.start - b.start);
    if (notes.length < 2) {
      setError('Ajoute au moins deux notes dans la mesure pour créer une syncope.');
      return;
    }
    // slot = indice global de la colonne cliquée (0…7 par mesure) : frontière « à droite » = note avec start >= slot
    const left = [...notes].reverse().find((n) => n.start < slot);
    const right = notes.find((n) => n.start >= slot);
    if (!left || !right || left.id === right.id) {
      setError('Clique entre deux notes (colonne à droite de la première note, à gauche de la seconde).');
      return;
    }
    connectSyncope(left.id, right.id);
  };

  const handleSave = () => {
    const trimmed = pattern.name.trim();
    if (!trimmed) {
      setError('Donne un nom à la rythmique.');
      return;
    }
    if (pattern.items.length === 0) {
      setError('Ajoute au moins une figure rythmique.');
      return;
    }
    const clean: RhythmPatternV2 = {
      ...pattern,
      name: trimmed,
      items: [...pattern.items].sort((a, b) => a.start - b.start),
    };
    onSave({ encoded: serializeRhythmPattern(clean), source });
    setSelectedItemId(null);
  };

  return (
    <div className="mb-10 p-5 rounded-xl border-2 border-dashed border-[var(--accent)]/40 bg-[var(--surface)]/50">
      <h3 className="text-sm font-bold text-[var(--accent-light)] mb-3 inline-flex items-center gap-2">
        <IconRhythm className="w-4 h-4" />
        {source ? 'Éditer une rythmique' : 'Créer une rythmique'}
      </h3>
      <p className="text-xs text-[var(--muted)] mb-4">
        Clique une case (grille en croches) pour placer la figure sélectionnée. Pour la syncope, active le pinceau puis clique entre deux notes.
      </p>

      <div className="grid md:grid-cols-[1fr_auto] gap-3 mb-3">
        <input
          value={pattern.name}
          onChange={(e) => setPattern((prev) => ({ ...prev, name: e.target.value }))}
          placeholder="Nom de la rythmique"
          className="px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--surface-light)] text-sm"
        />
        <div className="inline-flex items-center gap-2">
          <span className="text-xs text-[var(--muted)]">Mesures</span>
          <select
            value={pattern.measures}
            onChange={(e) => setMeasures(parseInt(e.target.value, 10))}
            className="px-2 py-2 rounded-lg bg-[var(--background)] border border-[var(--surface-light)] text-sm"
          >
            {[1, 2, 3, 4, 6, 8].map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {RHYTHM_FIGURES.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setSelectedFigureId(f.id)}
            className={`px-3 py-1.5 rounded-lg border text-xs ${selectedFigureId === f.id ? 'bg-[var(--accent)]/20 text-[var(--accent-light)] border-[var(--accent)]/60' : 'bg-[var(--background)] text-[var(--muted)] border-[var(--surface-light)] hover:text-[var(--foreground)]'}`}
          >
            {f.symbol} {f.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4 rounded-lg border border-[var(--surface-light)] bg-[var(--background)]/60 px-3 py-2">
        <span className="text-xs font-medium text-[var(--accent-light)] shrink-0 inline-flex items-center gap-1.5">
          <IconMusic className="w-4 h-4" />
          Aperçu audio
        </span>
        <label className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
          <span className="whitespace-nowrap">Tempo</span>
          <input
            type="number"
            min={40}
            max={220}
            value={rhythmPb.bpm}
            disabled={rhythmPb.playing}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10);
              rhythmPb.setBpm(Number.isFinite(n) ? Math.min(220, Math.max(40, n)) : 96);
            }}
            className="w-[4.25rem] px-2 py-1 rounded-md bg-[var(--background)] border border-[var(--surface-light)] text-sm text-[var(--foreground)]"
          />
          <span>BPM</span>
        </label>
        <label className="inline-flex items-center gap-2 text-xs text-[var(--muted)] cursor-pointer select-none">
          <input type="checkbox" checked={rhythmPb.loop} disabled={rhythmPb.playing} onChange={(e) => rhythmPb.setLoop(e.target.checked)} className="rounded" />
          Boucle
        </label>
        {!rhythmPb.playing ? (
          <button
            type="button"
            onClick={() => void rhythmPb.start()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white text-xs font-medium hover:opacity-95"
          >
            <IconPlay className="w-3.5 h-3.5" />
            Écouter le motif
          </button>
        ) : (
          <button
            type="button"
            onClick={rhythmPb.stop}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--surface-light)] text-[var(--foreground)] text-xs font-medium border border-[var(--surface-light)]"
          >
            <IconPause className="w-3.5 h-3.5" />
            Arrêter
          </button>
        )}
        <span className="text-[10px] text-[var(--muted)] max-w-md">
          Un bref « bip » par attaque ; la 2ᵉ note d’une syncope (tenue) ne sonne pas. Coche Boucle pour répéter le motif.
        </span>
      </div>

      <div className="mb-4 rounded-lg border border-[var(--surface-light)] bg-[var(--background)]/80 p-3 overflow-x-auto">
        {Array.from({ length: pattern.measures }).map((_, measureIdx) => {
          const base = measureIdx * STEPS_PER_MEASURE;
          const measureItems = pattern.items.filter((it) => it.start >= base && it.start < base + STEPS_PER_MEASURE);
          const measurePairs = syncopePairs.filter(
            (p) => Math.floor(p.from.start / STEPS_PER_MEASURE) === measureIdx && Math.floor(p.to.start / STEPS_PER_MEASURE) === measureIdx,
          );
          const localPlaybackSlot =
            rhythmPb.playing && rhythmPb.playhead !== null && rhythmPb.playhead >= base && rhythmPb.playhead < base + STEPS_PER_MEASURE
              ? rhythmPb.playhead - base
              : null;
          return (
            <div key={measureIdx} className="mb-3 last:mb-0">
              <div className="text-[10px] text-[var(--muted)] mb-1">Mesure {measureIdx + 1}</div>
              <div className="relative min-w-[360px] rounded-md border border-[var(--surface-light)] bg-[var(--background)]/50">
                <RhythmMeasureSvg
                  measureItems={measureItems}
                  measurePairs={measurePairs}
                  measureBase={base}
                  selectedItemId={selectedItemId}
                  playbackHighlightSlot={localPlaybackSlot}
                  onItemClick={(itemId) => {
                    if (syncopeBrushMode) {
                      setError('En mode pinceau syncope, clique dans l’espace entre deux notes.');
                      return;
                    }
                    setSelectedItemId(itemId);
                    setError('');
                  }}
                />
                <div className="absolute inset-0 grid grid-cols-8">
                  {Array.from({ length: STEPS_PER_MEASURE }).map((__, slot) => {
                    const playheadHere = rhythmPb.playing && rhythmPb.playhead === base + slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => {
                          const globalSlot = base + slot;
                          if (syncopeBrushMode) {
                            paintSyncopeAtGap(globalSlot);
                            return;
                          }
                          placeFigureAt(globalSlot);
                        }}
                        className={`border-r border-transparent hover:bg-[var(--accent)]/10 ${slot % 2 === 0 ? 'bg-[var(--surface)]/10' : ''} ${playheadHere ? 'ring-1 ring-inset ring-[var(--accent)]/45 bg-[var(--accent)]/12' : ''}`}
                        title={syncopeBrushMode ? 'Pinceau syncope: clique entre deux notes' : `Placer ${selectedFigure.label}`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={removeSelected} disabled={!selectedItem} className="px-3 py-1.5 rounded-lg bg-red-500/15 text-red-300 text-xs disabled:opacity-40">
          Supprimer la figure sélectionnée
        </button>
        <button
          type="button"
          onClick={() => { setSyncopeBrushMode((v) => !v); setError(''); }}
          className={`px-3 py-1.5 rounded-lg text-xs ${syncopeBrushMode ? 'bg-[var(--accent)]/25 text-[var(--accent-light)] border border-[var(--accent)]/60' : 'bg-[var(--surface-light)] text-[var(--muted)]'}`}
        >
          {syncopeBrushMode ? 'Pinceau syncope: ON' : 'Pinceau syncope'}
        </button>
        <button type="button" onClick={clearSyncopeFromSelected} disabled={!selectedItem || !selectedItem.syncToStart} className="px-3 py-1.5 rounded-lg bg-[var(--surface-light)] text-[var(--muted)] text-xs disabled:opacity-40">
          Retirer syncope
        </button>
        {syncopeBrushMode && (
          <span className="text-[11px] text-amber-300">Pinceau actif: clique sur un espace entre deux notes pour créer la liaison.</span>
        )}
        {syncopePairs.length > 0 && !syncopeBrushMode && (
          <span className="text-[11px] text-[var(--muted)]">{syncopePairs.length} syncope{syncopePairs.length > 1 ? 's' : ''}</span>
        )}
        <button
          type="button"
          onClick={() => {
            setPattern((prev) => ({
              ...prev,
              items: prev.items.map((it) => ({ ...it, syncToStart: undefined, syncopated: false })),
            }));
            setSyncopeBrushMode(false);
          }}
          disabled={syncopePairs.length === 0}
          className="px-3 py-1.5 rounded-lg bg-[var(--surface-light)] text-[var(--muted)] text-xs disabled:opacity-40"
        >
          Retirer toutes les syncopes
        </button>
        <button type="button" onClick={() => { setPattern(makeEmptyRhythmPattern()); setSelectedItemId(null); setSyncopeBrushMode(false); setError(''); }} className="px-3 py-1.5 rounded-lg bg-[var(--surface-light)] text-[var(--muted)] text-xs">
          Nouveau motif
        </button>
        {source && (
          <button type="button" onClick={onCancelEdit} className="px-3 py-1.5 rounded-lg bg-[var(--surface-light)] text-[var(--muted)] text-xs">
            Quitter l’édition
          </button>
        )}
        <button type="button" onClick={handleSave} className="ml-auto px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white text-xs">
          {source ? 'Mettre à jour la rythmique' : 'Enregistrer la rythmique'}
        </button>
      </div>

      <p className="text-[11px] text-[var(--muted)] mt-3">{formatRhythmMeta(pattern)}</p>
      {error ? <p className="text-xs text-red-400 mt-2">{error}</p> : null}
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

function Section({ title, icon, items, renderItem, editMode, onDelete, onEdit, onAdd, addPlaceholder, orderable, onMoveItem, extraEditActions }: {
  title: string; icon?: ReactNode; items: string[];
  renderItem: (item: string) => React.ReactNode;
  editMode?: boolean; onDelete?: (item: string) => void; onEdit?: (item: string) => void;
  onAdd?: (value: string) => void; addPlaceholder?: string;
  /** Mode Éditer : flèches pour réordonner (swap avec le voisin) */
  orderable?: boolean;
  onMoveItem?: (index: number, direction: -1 | 1) => void;
  extraEditActions?: (item: string) => React.ReactNode;
}) {
  const [addValue, setAddValue] = useState('');
  const showReorder = editMode && orderable && onMoveItem && items.length > 0;
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
      <div className="flex flex-wrap gap-3 items-start">
        {items.length === 0 && !editMode ? (
          <div className="text-sm text-[var(--muted)] py-4">Aucun élément. Passe en mode Éditer pour en ajouter.</div>
        ) : null}
        {items.map((item, idx) => (
          <div key={item} className="relative group flex items-start gap-1">
            {showReorder && (
              <div className="flex flex-col gap-0.5 shrink-0 pt-1">
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={() => onMoveItem!(idx, -1)}
                  className="w-7 h-7 rounded-md flex items-center justify-center bg-[var(--surface-light)] text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-25 disabled:pointer-events-none"
                  title="Monter"
                >
                  <IconChevronUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={idx >= items.length - 1}
                  onClick={() => onMoveItem!(idx, 1)}
                  className="w-7 h-7 rounded-md flex items-center justify-center bg-[var(--surface-light)] text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-25 disabled:pointer-events-none"
                  title="Descendre"
                >
                  <IconChevronDown className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="flex flex-col gap-1.5 w-fit max-w-full">
              {renderItem(item)}
              {editMode && (onDelete || onEdit || extraEditActions) && (
                <div className="flex gap-1 justify-end flex-wrap shrink-0 z-10">
                  {extraEditActions?.(item)}
                  {onEdit && (<button type="button" onClick={() => onEdit(item)} className="w-6 h-6 rounded-full bg-[var(--surface)] border border-[var(--surface-light)] text-[var(--muted)] flex items-center justify-center hover:text-[var(--foreground)] shadow-lg" title={`Renommer ${item}`}><IconPencil className="w-3.5 h-3.5" /></button>)}
                  {onDelete && (<button type="button" onClick={() => onDelete(item)} className="w-6 h-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center hover:bg-red-400 shadow-lg" title={`Supprimer ${item}`}><IconTrash className="w-3.5 h-3.5" /></button>)}
                </div>
              )}
            </div>
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
  const [gammes, setGammes] = useState('');
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
        gammes: split(gammes),
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

          <div>
            <label className="text-xs text-[var(--muted)] mb-1 block">Gammes (séparées par des virgules)</label>
            <input value={gammes} onChange={(e) => setGammes(e.target.value)} placeholder="pentatonique mineure, majeure" className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--surface-light)] text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--muted)] mb-1 block">Rythmes</label>
              <input value={rhythms} onChange={(e) => setRhythms(e.target.value)} placeholder="croche, noire" className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--surface-light)] text-sm" />
            </div>
            <div>
              <label className="text-xs text-[var(--muted)] mb-1 block">Rythmiques</label>
              <input value={strums} onChange={(e) => setStrums(e.target.value)} placeholder="Nom libre (optionnel, format legacy)" className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--surface-light)] text-sm" />
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
  const [editingRhythmSource, setEditingRhythmSource] = useState<string | null>(null);
  const [editingArpeggioSource, setEditingArpeggioSource] = useState<string | null>(null);
  const [editingGammeSource, setEditingGammeSource] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [favFilter, setFavFilter] = useState(false);
  const [editProgression, setEditProgression] = useState<{
    lessonId: string; progressionIndex: number; chordsLine: string; notes: string;
  } | null>(null);
  const [editKnowledge, setEditKnowledge] = useState<{
    category: 'chords' | 'techniques' | 'rhythms' | 'strums' | 'gammes'; from: string; to: string;
  } | null>(null);
  const [editLessonTitle, setEditLessonTitle] = useState<{ id: string; title: string } | null>(null);
  const [editTechnique, setEditTechnique] = useState<{
    name: string; title: string; summary: string; stepsText: string; image: string | null;
  } | null>(null);
  const [techniqueImageUploading, setTechniqueImageUploading] = useState(false);
  const [chordEditor, setChordEditor] = useState<ChordEditorOpen>(null);
  const lastReloadAt = useRef(0);

  const reload = useCallback(() => fetch('/api/database', { cache: 'no-store' }).then((r) => r.json()).then(setDb), []);
  const safeReload = useCallback(() => {
    const now = Date.now();
    if (now - lastReloadAt.current < 800) return;
    lastReloadAt.current = now;
    reload();
  }, [reload]);

  const saveRhythmPattern = useCallback(async ({ encoded, source }: { encoded: string; source: string | null }) => {
    const add = await fetch('/api/database', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'knowledge_add', category: 'strums', value: encoded }),
    });
    if (!add.ok) return;
    if (source && source !== encoded) {
      await fetch('/api/database', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'knowledge', category: 'strums', value: source }),
      });
    }
    setEditingRhythmSource(null);
    safeReload();
  }, [safeReload]);

  const saveArpeggioPattern = useCallback(async ({ encoded, source }: { encoded: string; source: string | null }) => {
    const add = await fetch('/api/database', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'knowledge_add', category: 'arpeggios', value: encoded }),
    });
    if (!add.ok) return;
    if (source && source !== encoded) {
      await fetch('/api/database', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'knowledge', category: 'arpeggios', value: source }),
      });
    }
    setEditingArpeggioSource(null);
    safeReload();
  }, [safeReload]);

  const saveGammePattern = useCallback(async ({ encoded, source }: { encoded: string; source: string | null }) => {
    const add = await fetch('/api/database', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'knowledge_add', category: 'gammes', value: encoded }),
    });
    if (!add.ok) return;
    if (source && source !== encoded) {
      await fetch('/api/database', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'knowledge', category: 'gammes', value: source }),
      });
    }
    setEditingGammeSource(null);
    safeReload();
  }, [safeReload]);

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

  const addItem = async (category: KnowledgeListCategory, value: string) => {
    const res = await fetch('/api/database', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'knowledge_add', category, value: value.trim() }) });
    if (res.ok) safeReload();
  };

  const deleteItem = async (category: KnowledgeListCategory, value: string) => {
    const res = await fetch('/api/database', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'knowledge', category, value }) });
    if (res.ok) { const updated = await fetch('/api/database').then((r) => r.json()); setDb(updated); }
  };

  const renameItem = async (category: KnowledgeListCategory, from: string, to: string) => {
    const res = await fetch('/api/database', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'knowledge_rename', category, from, to }) });
    if (res.ok) safeReload();
  };

  const reorderKnowledgeItem = useCallback(async (category: KnowledgeListCategory, items: string[], index: number, direction: -1 | 1) => {
    const j = index + direction;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[index], next[j]] = [next[j], next[index]];
    const res = await fetch('/api/database', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'knowledge_reorder', category, items: next }) });
    if (res.ok) safeReload();
  }, [safeReload]);

  const swapLessonsById = useCallback(async (lessonIdA: string, lessonIdB: string) => {
    const res = await fetch('/api/database', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'lessons_swap', lessonIdA, lessonIdB }) });
    if (res.ok) safeReload();
  }, [safeReload]);

  const moveProgression = useCallback(async (lessonId: string, progressionIndex: number, direction: -1 | 1) => {
    if (!db) return;
    const lesson = db.lessons.find((l) => l.id === lessonId);
    const progs = [...(lesson?.progressions || [])];
    if (progs.length < 2) return;
    const to = progressionIndex + direction;
    if (to < 0 || to >= progs.length) return;
    [progs[progressionIndex], progs[to]] = [progs[to], progs[progressionIndex]];
    const res = await fetch(`/api/lessons/${encodeURIComponent(lessonId)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ progressions: progs }) });
    if (res.ok) safeReload();
  }, [db, safeReload]);

  const openEditTechnique = useCallback((techName: string) => {
    if (!db) return;
    const key = techName.toLowerCase();
    const fromDb = db.techniqueDetails?.[key];
    const fromStatic = TECHNIQUE_DETAILS[key];
    setEditTechnique({
      name: techName,
      title: fromDb?.title ?? fromStatic?.title ?? '',
      summary: fromDb?.summary ?? fromStatic?.summary ?? '',
      stepsText: (fromDb?.steps?.length ? fromDb.steps : fromStatic?.steps ?? []).join('\n'),
      image: fromDb?.image ?? null,
    });
  }, [db]);

  const uploadTechniqueImage = async (file: File) => {
    if (!editTechnique) return;
    setTechniqueImageUploading(true);
    try {
      const fd = new FormData();
      fd.append('type', 'technique');
      fd.append('techniqueKey', editTechnique.name.toLowerCase().replace(/[^a-z0-9_-]+/gi, '_').slice(0, 64));
      fd.append('files', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload échoué');
      const paths = data.paths as string[];
      if (paths?.[0]) setEditTechnique((prev) => (prev ? { ...prev, image: paths[0] } : null));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Upload impossible');
    } finally {
      setTechniqueImageUploading(false);
    }
  };

  const saveTechniqueDetail = async () => {
    if (!editTechnique) return;
    const { name, title, summary, stepsText, image } = editTechnique;
    const steps = stepsText.split('\n').map((s) => s.trim()).filter(Boolean);
    const res = await fetch('/api/database', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'technique_detail',
        key: name.toLowerCase(),
        detail: {
          title: title.trim() || undefined,
          summary: summary.trim(),
          steps: steps.length ? steps : undefined,
          image: image === null ? null : image,
        },
      }),
    });
    if (res.ok) {
      setEditTechnique(null);
      safeReload();
    }
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
    { key: 'techniques' as const, label: 'Techniques', count: k.techniques.length + (k.gammes?.length ?? 0), icon: <IconTarget className="w-5 h-5" /> },
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
        <>
          {editMode && (
            <div className="mb-6 p-5 rounded-xl border-2 border-dashed border-[var(--accent)]/40 bg-[var(--surface)]/50">
              <h3 className="text-sm font-bold text-[var(--accent-light)] mb-2 inline-flex items-center gap-2">
                <IconLayoutGrid className="w-4 h-4" />
                Accords personnalisés
              </h3>
              <p className="text-xs text-[var(--muted)] mb-3">
                Crée un accord avec diagramme et doigté ; il sera enregistré dans la base. Les accords des leçons continuent d’être ajoutés automatiquement à la liste.
              </p>
              <button
                type="button"
                onClick={() => setChordEditor({ mode: 'create' })}
                className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm inline-flex items-center gap-2 hover:bg-[var(--accent-light)]"
              >
                <IconPlus className="w-4 h-4" />
                Créer un accord manuellement
              </button>
            </div>
          )}
          <Section
            title="Accords"
            icon={<IconMusic className="w-5 h-5" />}
            items={k.chords}
            editMode={editMode}
            onDelete={(v) => deleteItem('chords', v)}
            onEdit={(v) => setEditKnowledge({ category: 'chords', from: v, to: v })}
            onAdd={(v) => addItem('chords', v)}
            addPlaceholder="Ex: Cm7, F#m"
            orderable
            onMoveItem={(idx, dir) => reorderKnowledgeItem('chords', k.chords, idx, dir)}
            extraEditActions={(chord) => (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setChordEditor({ mode: 'edit', name: chord });
                }}
                className="w-6 h-6 rounded-full bg-[var(--surface)] border border-[var(--surface-light)] text-[var(--muted)] flex items-center justify-center hover:text-[var(--accent)] hover:bg-[var(--accent)]/15 shadow-lg"
                title="Diagramme & doigté"
              >
                <IconLayoutGrid className="w-3.5 h-3.5 pointer-events-none" />
              </button>
            )}
            renderItem={(chord) => (
              <ChordDiagramView name={chord} diagram={resolveChordDiagram(chord, db?.chordDiagrams ?? null)} />
            )}
          />
        </>
      )}

      {tab === 'techniques' && (
        <>
          <Section title="Techniques" icon={<IconTarget className="w-5 h-5" />} items={k.techniques} editMode={editMode}
            onDelete={(v) => deleteItem('techniques', v)} onEdit={(v) => setEditKnowledge({ category: 'techniques', from: v, to: v })}
            onAdd={(v) => addItem('techniques', v)} addPlaceholder="Ex: hammer-on, pull-off, tapping"
            orderable
            onMoveItem={(idx, dir) => reorderKnowledgeItem('techniques', k.techniques, idx, dir)}
            renderItem={(tech) => (
              <div className="px-4 py-3 bg-[var(--surface)] rounded-lg border border-[var(--surface-light)] hover:border-[var(--accent)] transition-colors min-w-[160px]">
                <button type="button" onClick={() => setTechInfo(tech)} className="w-full text-left">
                  <span className="text-sm font-medium capitalize">{tech}</span>
                  {editMode && <span className="block text-[10px] text-[var(--muted)] mt-0.5">Clic = fiche</span>}
                </button>
                {editMode && (
                  <button
                    type="button"
                    onClick={() => openEditTechnique(tech)}
                    className="mt-2 w-full text-xs px-2 py-1.5 rounded-lg bg-[var(--surface-light)] text-[var(--accent-light)] hover:bg-[var(--accent)]/20 inline-flex items-center justify-center gap-1.5"
                  >
                    <IconPencil className="w-3.5 h-3.5" />
                    Éditer la fiche
                  </button>
                )}
              </div>
            )} />
          <div className="mt-10">
            <GammePatternEditor
              editMode={editMode}
              source={editingGammeSource}
              onSave={saveGammePattern}
              onCancelEdit={() => setEditingGammeSource(null)}
            />
            <Section
              title="Gammes"
              icon={<IconGamme className="w-5 h-5" />}
              items={k.gammes || []}
              editMode={editMode}
              onDelete={(v) => deleteItem('gammes', v)}
              onEdit={(v) => {
                if (parseGammePattern(v)) setEditingGammeSource(v);
                else setEditKnowledge({ category: 'gammes', from: v, to: v });
              }}
              onAdd={(v) => addItem('gammes', v)}
              addPlaceholder="Nom libre ou crée une tab avec l’éditeur ci-dessus"
              orderable
              onMoveItem={(idx, dir) => reorderKnowledgeItem('gammes', k.gammes || [], idx, dir)}
              renderItem={(g) => {
                const parsed = parseGammePattern(g);
                if (parsed) return <GammeMenuCard pattern={parsed} />;
                return (
                  <div className="px-4 py-3 bg-[var(--surface)] rounded-lg border border-[var(--surface-light)] min-w-[160px]">
                    <span className="text-sm font-medium">{g}</span>
                  </div>
                );
              }}
            />
          </div>
        </>
      )}

      {tab === 'rhythms' && (
        <>
          <RhythmPatternEditor
            editMode={editMode}
            source={editingRhythmSource}
            onSave={saveRhythmPattern}
            onCancelEdit={() => setEditingRhythmSource(null)}
          />
          <ArpeggioPatternEditor
            editMode={editMode}
            source={editingArpeggioSource}
            onSave={saveArpeggioPattern}
            onCancelEdit={() => setEditingArpeggioSource(null)}
          />
          <Section
            title="Rythmiques"
            icon={<IconRhythm className="w-5 h-5" />}
            items={k.strums || []}
            editMode={editMode}
            onDelete={(v) => deleteItem('strums', v)}
            orderable
            onMoveItem={(idx, dir) => reorderKnowledgeItem('strums', k.strums || [], idx, dir)}
            extraEditActions={(value) => (
              <button
                type="button"
                onClick={() => setEditingRhythmSource(value)}
                className="w-6 h-6 rounded-full bg-[var(--surface)] border border-[var(--surface-light)] text-[var(--muted)] flex items-center justify-center hover:text-[var(--accent)] shadow-lg"
                title="Éditer la rythmique"
              >
                <IconPencil className="w-3.5 h-3.5" />
              </button>
            )}
            renderItem={(value) => {
              const parsed = parseRhythmPattern(value);
              if (!parsed) {
                return (
                  <div className="px-4 py-3 bg-[var(--surface)] rounded-lg border border-[var(--surface-light)] min-w-[240px]">
                    <div className="text-sm font-medium">{value}</div>
                    <p className="text-[11px] text-amber-300 mt-1">Ancien format (lecture seule). Recrée-le via l’éditeur ci-dessus.</p>
                  </div>
                );
              }
              return <StrumRhythmMenuCard pattern={parsed} />;
            }}
          />
          <Section
            title="Arpèges"
            icon={<IconRhythm className="w-5 h-5" />}
            items={k.arpeggios || []}
            editMode={editMode}
            onDelete={(v) => deleteItem('arpeggios', v)}
            orderable
            onMoveItem={(idx, dir) => reorderKnowledgeItem('arpeggios', k.arpeggios || [], idx, dir)}
            extraEditActions={(value) => (
              <button
                type="button"
                onClick={() => setEditingArpeggioSource(value)}
                className="w-6 h-6 rounded-full bg-[var(--surface)] border border-[var(--surface-light)] text-[var(--muted)] flex items-center justify-center hover:text-teal-300 shadow-lg"
                title="Éditer l’arpège"
              >
                <IconPencil className="w-3.5 h-3.5" />
              </button>
            )}
            renderItem={(value) => {
              const parsed = parseArpeggioPattern(value);
              if (!parsed) {
                return (
                  <div className="px-4 py-3 bg-[var(--surface)] rounded-lg border border-[var(--surface-light)] min-w-[240px]">
                    <div className="text-sm font-medium truncate max-w-[220px]" title={value}>
                      {value.length > 52 ? `${value.slice(0, 52)}…` : value}
                    </div>
                    <p className="text-[11px] text-amber-300 mt-1">Format non reconnu.</p>
                  </div>
                );
              }
              return <ArpeggioMenuCard pattern={parsed} />;
            }}
          />
          <Section title="Rythmes" icon={<IconRhythm className="w-5 h-5" />} items={k.rhythms} editMode={editMode}
            onDelete={(v) => deleteItem('rhythms', v)} onEdit={(v) => setEditKnowledge({ category: 'rhythms', from: v, to: v })}
            onAdd={(v) => addItem('rhythms', v)} addPlaceholder="Ex: blanche, ronde"
            orderable
            onMoveItem={(idx, dir) => reorderKnowledgeItem('rhythms', k.rhythms, idx, dir)}
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
              {filteredProgressions.map((p) => {
                const progCount = db.lessons.find((l) => l.id === p.lessonId)?.progressions?.length ?? 0;
                return (
                <div key={`${p.lessonId}-${p.progressionIndex}`} className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--surface-light)] flex gap-2">
                  {editMode && progCount > 1 && (
                    <div className="flex flex-col gap-0.5 shrink-0 pt-0.5">
                      <button type="button" disabled={p.progressionIndex <= 0} onClick={() => moveProgression(p.lessonId, p.progressionIndex, -1)}
                        className="w-7 h-7 rounded-md flex items-center justify-center bg-[var(--surface-light)] text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-25 disabled:pointer-events-none" title="Monter dans la leçon">
                        <IconChevronUp className="w-4 h-4" />
                      </button>
                      <button type="button" disabled={p.progressionIndex >= progCount - 1} onClick={() => moveProgression(p.lessonId, p.progressionIndex, 1)}
                        className="w-7 h-7 rounded-md flex items-center justify-center bg-[var(--surface-light)] text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-25 disabled:pointer-events-none" title="Descendre dans la leçon">
                        <IconChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
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
                </div>
                );
              })}
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
              {filteredSongs.map((s, idx) => (
                <div key={s.id} className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--surface-light)] hover:border-[var(--accent)] transition-colors flex gap-2">
                  {editMode && filteredSongs.length > 1 && (
                    <div className="flex flex-col gap-0.5 shrink-0 pt-0.5">
                      <button type="button" disabled={idx === 0} onClick={() => swapLessonsById(s.id, filteredSongs[idx - 1].id)}
                        className="w-7 h-7 rounded-md flex items-center justify-center bg-[var(--surface-light)] text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-25 disabled:pointer-events-none" title="Monter dans la liste">
                        <IconChevronUp className="w-4 h-4" />
                      </button>
                      <button type="button" disabled={idx >= filteredSongs.length - 1} onClick={() => swapLessonsById(s.id, filteredSongs[idx + 1].id)}
                        className="w-7 h-7 rounded-md flex items-center justify-center bg-[var(--surface-light)] text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-25 disabled:pointer-events-none" title="Descendre dans la liste">
                        <IconChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
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
              {lessons.map((l, idx) => (
                <div key={l.id} className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--surface-light)] hover:border-[var(--accent)] transition-colors flex gap-2">
                  {editMode && lessons.length > 1 && (
                    <div className="flex flex-col gap-0.5 shrink-0 pt-0.5">
                      <button type="button" disabled={idx === 0} onClick={() => swapLessonsById(l.id, lessons[idx - 1].id)}
                        className="w-7 h-7 rounded-md flex items-center justify-center bg-[var(--surface-light)] text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-25 disabled:pointer-events-none" title="Monter dans la liste">
                        <IconChevronUp className="w-4 h-4" />
                      </button>
                      <button type="button" disabled={idx >= lessons.length - 1} onClick={() => swapLessonsById(l.id, lessons[idx + 1].id)}
                        className="w-7 h-7 rounded-md flex items-center justify-center bg-[var(--surface-light)] text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-25 disabled:pointer-events-none" title="Descendre dans la liste">
                        <IconChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
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
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Modals */}
      {showCreate && <CreateLessonModal onClose={() => setShowCreate(false)} onCreated={safeReload} />}
      <ChordEditorModal
        open={chordEditor != null}
        payload={chordEditor}
        chordDiagrams={db?.chordDiagrams}
        onClose={() => setChordEditor(null)}
        onSaved={safeReload}
      />

      {techInfo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setTechInfo(null)}>
          <div className="bg-[var(--surface)] rounded-xl p-6 w-full max-w-md border border-[var(--surface-light)]" onClick={(e) => e.stopPropagation()}>
            {(() => {
              const info = mergeTechniqueForDisplay(techInfo, db.techniqueDetails);
              return (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold">{info.title}</h3>
                    <button onClick={() => setTechInfo(null)} className="text-[var(--muted)] hover:text-[var(--foreground)]">×</button>
                  </div>
                  {info.image && (
                    <div className="mb-4 rounded-lg overflow-hidden border border-[var(--surface-light)] bg-[var(--background)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={info.image} alt="" className="w-full max-h-72 object-contain mx-auto" />
                    </div>
                  )}
                  <p className="text-sm">{info.summary}</p>
                  {info.steps && info.steps.length > 0 && (
                    <ul className="text-sm mt-3 space-y-1 list-disc pl-5">
                      {info.steps.map((s, i) => (<li key={i}>{s}</li>))}
                    </ul>
                  )}
                  {editMode && (
                    <div className="mt-4 pt-4 border-t border-[var(--surface-light)]">
                      <button
                        type="button"
                        onClick={() => { const t = techInfo; setTechInfo(null); openEditTechnique(t); }}
                        className="w-full px-3 py-2 rounded-lg bg-[var(--accent)] text-white text-sm inline-flex items-center justify-center gap-2 hover:bg-[var(--accent-light)]"
                      >
                        <IconPencil className="w-4 h-4" />
                        Modifier la fiche
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {editTechnique && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setEditTechnique(null)}>
          <div className="bg-[var(--surface)] rounded-xl p-6 w-full max-w-lg border border-[var(--surface-light)] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Éditer la technique</h3>
              <button type="button" onClick={() => setEditTechnique(null)} className="text-[var(--muted)] hover:text-[var(--foreground)]">×</button>
            </div>
            <p className="text-xs text-[var(--muted)] mb-3">Technique : <span className="font-mono text-[var(--foreground)]">{editTechnique.name}</span> (renommer via le bouton ✏️ sur la carte)</p>
            <div className="space-y-3">
              <div>
                <div className="text-xs text-[var(--muted)] mb-1">Titre affiché (optionnel)</div>
                <input value={editTechnique.title} onChange={(e) => setEditTechnique({ ...editTechnique, title: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--surface-light)] text-sm" placeholder="Ex. Hammer-on" />
              </div>
              <div>
                <div className="text-xs text-[var(--muted)] mb-1">Description</div>
                <textarea value={editTechnique.summary} onChange={(e) => setEditTechnique({ ...editTechnique, summary: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--surface-light)] text-sm min-h-24" />
              </div>
              <div>
                <div className="text-xs text-[var(--muted)] mb-1">Étapes (une par ligne, optionnel)</div>
                <textarea value={editTechnique.stepsText} onChange={(e) => setEditTechnique({ ...editTechnique, stepsText: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--surface-light)] text-sm min-h-28 font-mono text-xs" placeholder="Étape 1&#10;Étape 2" />
              </div>
              <div>
                <div className="text-xs text-[var(--muted)] mb-1">Image (JPEG, PNG, GIF, WebP, SVG)</div>
                <div className="flex flex-wrap items-start gap-3">
                  <label className={`px-3 py-2 rounded-lg text-sm cursor-pointer inline-flex items-center gap-2 ${techniqueImageUploading ? 'bg-[var(--surface-light)] text-[var(--muted)]' : 'bg-[var(--accent)] text-white hover:bg-[var(--accent-light)]'}`}>
                    <IconUpload className="w-4 h-4" />
                    {techniqueImageUploading ? 'Envoi…' : 'Choisir une image'}
                    <input type="file" accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml" className="hidden" disabled={techniqueImageUploading}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadTechniqueImage(f); e.target.value = ''; }} />
                  </label>
                  {editTechnique.image && (
                    <button type="button" onClick={() => setEditTechnique({ ...editTechnique, image: null })} className="px-3 py-2 text-sm rounded-lg text-red-400 hover:bg-red-500/20">
                      Retirer l&apos;image
                    </button>
                  )}
                </div>
                {editTechnique.image && (
                  <div className="mt-3 rounded-lg overflow-hidden border border-[var(--surface-light)] max-w-xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={editTechnique.image} alt="" className="w-full max-h-48 object-contain bg-[var(--background)]" />
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" onClick={() => setEditTechnique(null)} className="px-3 py-1.5 text-sm rounded-lg bg-[var(--surface-light)] text-[var(--muted)] hover:text-[var(--foreground)]">Annuler</button>
              <button type="button" onClick={saveTechniqueDetail} className="px-3 py-1.5 text-sm rounded-lg bg-[var(--accent)] text-white">Enregistrer</button>
            </div>
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

      {k.chords.length === 0 && k.techniques.length === 0 && (k.gammes || []).length === 0 && k.rhythms.length === 0 && db.lessons.length === 0 && (
        <div className="text-center py-20 text-[var(--muted)]">
          <p>Aucune connaissance enregistrée pour le moment.</p>
          <p className="text-sm mt-2">Crée ta première leçon pour commencer.</p>
        </div>
      )}
    </div>
  );
}
