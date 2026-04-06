'use client';

import { useEffect, useState, type ComponentProps } from 'react';
import {
  type GammeNote,
  type GammePatternV1,
  type StepsPerMeasure,
  makeEmptyGammePattern,
  parseGammePattern,
  resolveGammeStepsPerMeasure,
  resolveGammeTripletFeel,
  serializeGammePattern,
  tabRhythmLineLabel,
} from '@/lib/gammeCodec';
import { useGammePlayback } from '@/hooks/useGammePlayback';
import {
  makeEmptyWalkingBassPattern,
  parseWalkingBassPattern,
  serializeWalkingBassPattern,
} from '@/lib/walkingBassCodec';
import { IconGamme, IconGuitar, IconMusic, IconPause, IconPlay, IconWalkingBass } from '@/components/Icons';
import { SwingTripletEquationSvg } from '@/components/SwingTripletEquation';

export type GammeEditorVariant = 'gamme' | 'walkingBass' | 'riff';

const ACCENT: Record<GammeEditorVariant, { playhead: string; hoverCell: string; ring: string; btn: string; title: string; dashed: string; menuHover: string }> = {
  gamme: {
    playhead: 'bg-sky-500/15 ring-1 ring-inset ring-sky-500/35',
    hoverCell: 'hover:bg-sky-500/15',
    ring: 'ring-sky-500/50 bg-sky-500/10',
    btn: 'bg-sky-600 hover:bg-sky-500 text-white',
    title: 'text-sky-300',
    dashed: 'border-sky-500/40',
    menuHover: 'hover:border-sky-500/50',
  },
  walkingBass: {
    playhead: 'bg-emerald-500/15 ring-1 ring-inset ring-emerald-500/35',
    hoverCell: 'hover:bg-emerald-500/15',
    ring: 'ring-emerald-500/50 bg-emerald-500/10',
    btn: 'bg-emerald-600 hover:bg-emerald-500 text-white',
    title: 'text-emerald-300',
    dashed: 'border-emerald-500/40',
    menuHover: 'hover:border-emerald-500/50',
  },
  riff: {
    playhead: 'bg-amber-500/15 ring-1 ring-inset ring-amber-500/35',
    hoverCell: 'hover:bg-amber-500/15',
    ring: 'ring-amber-500/50 bg-amber-500/10',
    btn: 'bg-amber-600 hover:bg-amber-500 text-white',
    title: 'text-amber-300',
    dashed: 'border-amber-500/40',
    menuHover: 'hover:border-amber-500/50',
  },
};

/** Mi aigu en haut (e) → Mi grave en bas (E). Clés React : index de corde, pas le caractère affiché. */
const STRING_LABELS = ['e', 'B', 'G', 'D', 'A', 'E'];

function noteAtCell(pattern: GammePatternV1, step: number, stringIndex: number): GammeNote | null {
  return pattern.notes.find((n) => n.step === step && n.string === stringIndex) ?? null;
}

function GammeMeasureStems({ stepsPerMeasure }: { stepsPerMeasure: number }) {
  const n = stepsPerMeasure;
  const w = 80;
  const u = w / n;
  return (
    <svg
      width="100%"
      height={20}
      viewBox={`0 0 ${w} 20`}
      preserveAspectRatio="none"
      className="block text-[var(--foreground)] opacity-75 pointer-events-none"
    >
      {Array.from({ length: n }).map((_, i) => {
        const cx = i * u + u / 2;
        return <line key={i} x1={cx} y1={5} x2={cx} y2={19} stroke="currentColor" strokeWidth={1.1} />;
      })}
      <line x1={3} y1={7} x2={w - 3} y2={7} stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" />
    </svg>
  );
}

function GammeRhythmStemsRow({ stepsPerMeasure, tripletFeel }: { stepsPerMeasure: StepsPerMeasure; tripletFeel: boolean }) {
  return (
    <div className="w-full border-t border-[var(--surface-light)]/30 pt-0.5 flex flex-col gap-1">
      {stepsPerMeasure === 8 && tripletFeel ? (
        <div className="pl-0.5 overflow-x-auto">
          <SwingTripletEquationSvg className="text-[var(--foreground)] opacity-90 max-w-full h-auto" />
        </div>
      ) : null}
      <div className="min-h-[20px] flex items-center gap-2">
        <span
          className="text-[9px] font-semibold text-[var(--muted)] shrink-0 leading-none max-w-[7rem]"
          title="Figure par colonne (mesure en 4/4)"
        >
          {tabRhythmLineLabel(stepsPerMeasure, tripletFeel)}
        </span>
        <div className="flex-1 min-w-0">
          <GammeMeasureStems stepsPerMeasure={stepsPerMeasure} />
        </div>
      </div>
    </div>
  );
}

function FretCell({ fret, root }: { fret: number; root?: boolean }) {
  if (root) {
    return (
      <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded-full border-2 border-current text-[11px] font-bold leading-none">
        {fret}
      </span>
    );
  }
  return <span className="text-xs font-semibold">{fret}</span>;
}

/** Colonne gauche : une seule ligne « TAB » alignée sur la rangée des numéros de mesure, puis 6 lignes = 6 cordes (même hauteur que la grille). */
function GammeTabColumn() {
  return (
    <div className="flex flex-col shrink-0 w-7">
      <div className="h-[1.125rem] min-h-[1.125rem] flex items-center justify-end text-[9px] font-bold text-[var(--muted)] tracking-tight pr-0.5">
        TAB
      </div>
      {STRING_LABELS.map((l, si) => (
        <div key={si} className="h-8 flex items-center justify-end text-[10px] font-medium text-[var(--muted)] pr-0.5">
          {l}
        </div>
      ))}
    </div>
  );
}

function EndBar() {
  return (
    <div className="flex flex-col justify-center shrink-0 pl-1.5 ml-0.5 border-l border-[var(--surface-light)]" title="Fin de phrase" aria-hidden>
      <div className="flex h-[12rem] items-center gap-px">
        <div className="w-px self-stretch my-1 bg-[var(--foreground)]/45" />
        <div className="w-1 self-stretch my-1 bg-[var(--foreground)]/80 rounded-[1px]" />
      </div>
    </div>
  );
}

export function GammeTabPreview({
  pattern,
  globalPlayhead,
  variant = 'gamme',
}: {
  pattern: GammePatternV1;
  globalPlayhead?: number | null;
  variant?: GammeEditorVariant;
}) {
  const a = ACCENT[variant];
  const spm = resolveGammeStepsPerMeasure(pattern);
  const tripletFeel = resolveGammeTripletFeel(pattern);
  return (
    <div className="mt-2 rounded-lg border border-[var(--surface-light)] bg-[var(--background)]/70 p-2 w-full min-w-0">
      <div className="mb-1">
        <div className="text-xs font-bold text-[var(--foreground)]">{pattern.sectionLabel}</div>
        <div className="text-sm font-bold text-[var(--foreground)]">{pattern.name}</div>
      </div>
      <div className="flex gap-2 items-start min-w-0">
        <GammeTabColumn />
        <div className="flex flex-wrap gap-x-3 gap-y-5 flex-1 min-w-0 content-start">
        {Array.from({ length: pattern.measures }).map((_, mi) => {
          const base = mi * spm;
          const measureNo = pattern.firstMeasureNumber + mi;
          const isLast = mi === pattern.measures - 1;
          return (
            <div key={mi} className="flex flex-col gap-1.5 w-fit shrink-0">
              <div className="flex text-[10px] text-[var(--muted)] pl-1 min-h-[1.125rem] items-center">
                {Array.from({ length: spm }).map((__, slot) => (
                  <div key={slot} className="w-9 text-center shrink-0">
                    {slot === 0 ? measureNo : ''}
                  </div>
                ))}
              </div>
              <div className="flex items-stretch gap-0 min-w-max">
                <div className="flex border border-[var(--surface-light)] rounded overflow-hidden">
                  {Array.from({ length: spm }).map((__, slot) => {
                    const step = base + slot;
                    const ph = globalPlayhead !== null && globalPlayhead !== undefined && globalPlayhead === step;
                    return (
                      <div
                        key={slot}
                        className={`flex flex-col border-r border-[var(--surface-light)] last:border-r-0 ${slot % 2 === 0 ? 'bg-[var(--surface)]/10' : ''} ${ph ? a.playhead : ''}`}
                      >
                        {Array.from({ length: 6 }).map((_, si) => {
                          const n = noteAtCell(pattern, step, si);
                          return (
                            <div
                              key={si}
                              className="w-9 h-8 flex items-center justify-center border-b border-[var(--surface-light)]/40 last:border-b-0 text-[var(--foreground)]"
                            >
                              {n ? <FretCell fret={n.fret} root={n.root} /> : null}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
                {isLast ? <EndBar /> : null}
              </div>
              <GammeRhythmStemsRow stepsPerMeasure={spm} tripletFeel={tripletFeel} />
            </div>
          );
        })}
        </div>
      </div>
      <p className="text-[10px] text-[var(--muted)] mt-2">Maj + clic sur une note : tonique (cercle). Une seule tonique à la fois.</p>
    </div>
  );
}

export function GammeMenuCard({ pattern, variant = 'gamme' }: { pattern: GammePatternV1; variant?: GammeEditorVariant }) {
  const [audioErr, setAudioErr] = useState('');
  const pb = useGammePlayback(pattern, { onAudioError: setAudioErr });
  const a = ACCENT[variant];

  return (
    <div className={`px-4 py-3 bg-[var(--surface)] rounded-lg border border-[var(--surface-light)] transition-colors min-w-0 w-full max-w-full ${a.menuHover}`}>
      <div className="text-sm font-medium">{pattern.sectionLabel}</div>
      <div className="text-sm font-semibold text-[var(--foreground)]">{pattern.name}</div>
      <p className="text-[11px] text-[var(--muted)] mt-1">
        {pattern.measures} mesure{pattern.measures > 1 ? 's' : ''} · {pattern.notes.length} note{pattern.notes.length > 1 ? 's' : ''} ·{' '}
        {tabRhythmLineLabel(resolveGammeStepsPerMeasure(pattern), resolveGammeTripletFeel(pattern))}
      </p>
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
              pb.setBpm(Number.isFinite(n) ? Math.min(220, Math.max(40, n)) : 72);
            }}
            className="w-14 px-1.5 py-0.5 rounded bg-[var(--background)] border border-[var(--surface-light)] text-xs"
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
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-white text-[10px] font-medium ${a.btn}`}
          >
            <IconPlay className="w-3 h-3" />
            Écouter
          </button>
        ) : (
          <button
            type="button"
            onClick={pb.stop}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--surface-light)] text-[10px] border border-[var(--surface-light)]"
          >
            <IconPause className="w-3 h-3" />
            Arrêter
          </button>
        )}
      </div>
      {audioErr ? <p className="text-[10px] text-red-400 mt-1">{audioErr}</p> : null}
      <GammeTabPreview pattern={pattern} globalPlayhead={pb.playing ? pb.playhead : null} variant={variant} />
    </div>
  );
}

export function GammePatternEditor({
  editMode,
  source,
  onSave,
  onCancelEdit,
  variant = 'gamme',
}: {
  editMode: boolean;
  source: string | null;
  onSave: (payload: { encoded: string; source: string | null }) => void;
  onCancelEdit: () => void;
  variant?: GammeEditorVariant;
}) {
  const isWb = variant === 'walkingBass';
  const isRiff = variant === 'riff';
  const isWbOrRiff = isWb || isRiff;
  const a = ACCENT[variant];
  const serialize = isWbOrRiff ? serializeWalkingBassPattern : serializeGammePattern;
  const IconHeader = isRiff ? IconGuitar : isWb ? IconWalkingBass : IconGamme;

  const [pattern, setPattern] = useState<GammePatternV1>(() =>
    isWb
      ? makeEmptyWalkingBassPattern()
      : isRiff
        ? { ...makeEmptyWalkingBassPattern(), name: 'Mon riff', sectionLabel: 'Riff' }
        : makeEmptyGammePattern(),
  );
  const [error, setError] = useState('');
  const [paintFret, setPaintFret] = useState(0);
  const pb = useGammePlayback(pattern, { onAudioError: setError });

  useEffect(() => {
    if (!editMode) return;
    const parse = isWbOrRiff ? parseWalkingBassPattern : parseGammePattern;
    const freshEmpty = () =>
      isWb
        ? makeEmptyWalkingBassPattern()
        : isRiff
          ? { ...makeEmptyWalkingBassPattern(), name: 'Mon riff', sectionLabel: 'Riff' }
          : makeEmptyGammePattern();
    if (!source) {
      setPattern(freshEmpty());
      setError('');
      return;
    }
    const parsed = parse(source);
    if (parsed) {
      setPattern(parsed);
      setError('');
      return;
    }
    setPattern(freshEmpty());
    setError(
      isWb ? 'Impossible de charger cette ligne de basse.' : isRiff ? 'Impossible de charger ce riff.' : 'Impossible de charger cette gamme.',
    );
  }, [editMode, source, variant, isWb, isRiff, isWbOrRiff]);

  if (!editMode) return null;

  const spm = resolveGammeStepsPerMeasure(pattern);
  const tripletFeel = resolveGammeTripletFeel(pattern);

  const setMeasures = (m: number) => {
    setPattern((prev) => {
      const s = resolveGammeStepsPerMeasure(prev);
      const maxSlots = m * s;
      return {
        ...prev,
        measures: m,
        notes: prev.notes.filter((n) => n.step < maxSlots),
      };
    });
  };

  const onCellClick = (stringIndex: number, globalStep: number, shiftKey: boolean) => {
    if (shiftKey) {
      setPattern((prev) => {
        const cur = prev.notes.find((n) => n.step === globalStep && n.string === stringIndex);
        if (!cur) return prev;
        const nextRoot = !cur.root;
        if (!nextRoot) {
          return {
            ...prev,
            notes: prev.notes.map((n) => (n.step === globalStep && n.string === stringIndex ? { ...n, root: false } : n)),
          };
        }
        return {
          ...prev,
          notes: prev.notes.map((n) => ({
            ...n,
            root: n.step === globalStep && n.string === stringIndex,
          })),
        };
      });
      return;
    }

    setPattern((prev) => {
      const cur = prev.notes.find((n) => n.step === globalStep && n.string === stringIndex);
      if (cur) {
        return {
          ...prev,
          notes: prev.notes.filter((n) => !(n.step === globalStep && n.string === stringIndex)),
        };
      }
      return {
        ...prev,
        notes: [...prev.notes, { step: globalStep, string: stringIndex, fret: paintFret, root: false }].sort(
          (a, b) => a.step - b.step || a.string - b.string,
        ),
      };
    });
  };

  const handleSave = () => {
    const name = pattern.name.trim();
    if (!name) {
      setError(isWb ? 'Donne un titre à la ligne.' : isRiff ? 'Donne un titre au riff.' : 'Donne un titre à la gamme.');
      return;
    }
    if (pattern.notes.length === 0) {
      setError('Ajoute au moins une note sur la grille.');
      return;
    }
    setError('');
    const sp = resolveGammeStepsPerMeasure(pattern);
    const tf = resolveGammeTripletFeel(pattern);
    const { tripletFeel: _strip, ...restPattern } = pattern;
    const clean: GammePatternV1 = {
      ...restPattern,
      name,
      sectionLabel: pattern.sectionLabel.trim() || (isWb ? 'Walking bass' : isRiff ? 'Riff' : 'Technique'),
      firstMeasureNumber: Math.min(999, Math.max(1, pattern.firstMeasureNumber)),
      stepsPerMeasure: sp,
      ...(tf && sp === 8 ? { tripletFeel: true as const } : {}),
      notes: [...pattern.notes].sort((a, b) => a.step - b.step || a.string - b.string),
    };
    onSave({ encoded: serialize(clean), source });
  };

  return (
    <div className={`mb-10 p-5 rounded-xl border-2 border-dashed bg-[var(--surface)]/50 ${a.dashed}`}>
      <h3 className={`text-sm font-bold mb-3 inline-flex items-center gap-2 ${a.title}`}>
        <IconHeader className="w-4 h-4" />
        {isRiff
          ? source
            ? 'Éditer un riff (tablature)'
            : 'Créer un riff (tablature)'
          : isWb
            ? source
              ? 'Éditer un walking bass (tablature)'
              : 'Créer un walking bass (tablature)'
            : source
              ? 'Éditer une gamme (tablature)'
              : 'Créer une gamme (tablature)'}
      </h3>
      <p className="text-xs text-[var(--muted)] mb-4">
        Choisis la subdivision (noires, croches…). En croches, active le swing/triolet pour le blues (2/3 + 1/3 par temps). Plusieurs notes au même instant : une par corde.{' '}
        <span className={isRiff ? 'text-amber-300/90' : isWb ? 'text-emerald-300/90' : 'text-sky-300/90'}>Maj + clic</span> sur une note : tonique (cercle), une seule à la fois.
      </p>

      <div className="grid md:grid-cols-2 gap-3 mb-3">
        <div className="space-y-2">
          <label className="block text-[10px] text-[var(--muted)]">Section (en-tête)</label>
          <input
            value={pattern.sectionLabel}
            onChange={(e) => setPattern((p) => ({ ...p, sectionLabel: e.target.value }))}
            placeholder={isRiff ? 'Riff' : isWb ? 'Walking bass' : 'Technique'}
            className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--surface-light)] text-sm"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-[10px] text-[var(--muted)]">{isRiff ? 'Titre du riff' : isWb ? 'Titre de la ligne' : 'Titre de la gamme'}</label>
          <input
            value={pattern.name}
            onChange={(e) => setPattern((p) => ({ ...p, name: e.target.value }))}
            placeholder={isRiff ? 'Blues en La' : isWb ? '2-5-1 sur II-V-I' : 'La gamme de Do'}
            className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--surface-light)] text-sm"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-[1fr_auto] gap-3 mb-3">
        <div className="space-y-2">
          <label className="block text-[10px] text-[var(--muted)]">Numéro de la 1ʳᵉ mesure (affichage)</label>
          <input
            type="number"
            min={1}
            max={999}
            value={pattern.firstMeasureNumber}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10);
              setPattern((p) => ({ ...p, firstMeasureNumber: Number.isFinite(n) ? Math.min(999, Math.max(1, n)) : 1 }));
            }}
            className="w-full max-w-[8rem] px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--surface-light)] text-sm"
          />
        </div>
        <div className="inline-flex flex-wrap items-end gap-2 pb-0.5">
          <span className="text-xs text-[var(--muted)]">Mesures</span>
          <select
            value={pattern.measures}
            onChange={(e) => setMeasures(parseInt(e.target.value, 10))}
            className="px-2 py-2 rounded-lg bg-[var(--background)] border border-[var(--surface-light)] text-sm"
          >
            {[1, 2, 3, 4, 6, 8].map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <span className="text-xs text-[var(--muted)]">Grille</span>
          <select
            value={spm}
            onChange={(e) => {
              const next = Number(e.target.value) as StepsPerMeasure;
              setPattern((prev) => {
                const maxSlots = prev.measures * next;
                const base = {
                  ...prev,
                  stepsPerMeasure: next,
                  notes: prev.notes.filter((n) => n.step < maxSlots),
                };
                if (next !== 8 && prev.tripletFeel) {
                  const { tripletFeel: _t, ...rest } = base;
                  return rest;
                }
                return base;
              });
            }}
            className="px-2 py-2 rounded-lg bg-[var(--background)] border border-[var(--surface-light)] text-sm max-w-[11rem]"
          >
            <option value={4}>Noires (4 / mesure)</option>
            <option value={8}>Croches (8 / mesure)</option>
            <option value={16}>Doubles croches (16)</option>
          </select>
        </div>
      </div>

      {spm === 8 ? (
        <label className="flex items-start gap-2 mb-3 text-xs text-[var(--muted)] cursor-pointer select-none max-w-xl">
          <input
            type="checkbox"
            checked={tripletFeel}
            onChange={(e) =>
              setPattern((p) => {
                const on = e.target.checked;
                if (!on) {
                  const { tripletFeel: _x, ...rest } = p;
                  return rest;
                }
                return { ...p, tripletFeel: true };
              })
            }
            className="rounded mt-0.5"
          />
          <span>
            Swing / triolet (shuffle) : chaque temps est joué long–court (♪♪ équivalent au triolet ♩♪ sous le 3). Utile pour blues et lignes binaire ternaire.
          </span>
        </label>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 mb-3">
        <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
          Case à poser
          <input
            type="number"
            min={0}
            max={24}
            value={paintFret}
            onChange={(e) => setPaintFret(Math.min(24, Math.max(0, parseInt(e.target.value, 10) || 0)))}
            className="w-14 px-2 py-1 rounded-md bg-[var(--background)] border border-[var(--surface-light)] text-sm"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4 rounded-lg border border-[var(--surface-light)] bg-[var(--background)]/60 px-3 py-2">
        <span className={`text-xs font-medium shrink-0 inline-flex items-center gap-1.5 ${a.title}`}>
          <IconMusic className="w-4 h-4" />
          Aperçu audio
        </span>
        <label className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
          <span>Tempo</span>
          <input
            type="number"
            min={40}
            max={220}
            value={pb.bpm}
            disabled={pb.playing}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10);
              pb.setBpm(Number.isFinite(n) ? Math.min(220, Math.max(40, n)) : 72);
            }}
            className="w-[4.25rem] px-2 py-1 rounded-md bg-[var(--background)] border border-[var(--surface-light)] text-sm"
          />
          <span>BPM</span>
        </label>
        <label className="inline-flex items-center gap-2 text-xs text-[var(--muted)] cursor-pointer select-none">
          <input type="checkbox" checked={pb.loop} disabled={pb.playing} onChange={(e) => pb.setLoop(e.target.checked)} className="rounded" />
          Boucle
        </label>
        {!pb.playing ? (
          <button
            type="button"
            onClick={() => void pb.start()}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-medium ${a.btn}`}
          >
            <IconPlay className="w-3.5 h-3.5" />
            Écouter
          </button>
        ) : (
          <button type="button" onClick={pb.stop} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--surface-light)] text-xs border border-[var(--surface-light)]">
            <IconPause className="w-3.5 h-3.5" />
            Arrêter
          </button>
        )}
      </div>

      <div className="mb-4 rounded-lg border border-[var(--surface-light)] bg-[var(--background)]/80 p-3 w-full min-w-0 overflow-x-auto">
        <div className="flex gap-2 items-start min-w-0">
          <GammeTabColumn />
          <div className="flex flex-wrap gap-x-3 gap-y-5 flex-1 min-w-0 content-start">
            {Array.from({ length: pattern.measures }).map((_, mi) => {
              const base = mi * spm;
              const measureNo = pattern.firstMeasureNumber + mi;
              const isLast = mi === pattern.measures - 1;
              return (
                <div key={mi} className="flex flex-col gap-1.5 w-fit shrink-0">
                  <div className="flex text-[10px] text-[var(--muted)] pl-1 min-h-[1.125rem] items-center">
                    {Array.from({ length: spm }).map((__, slot) => (
                      <div key={slot} className="w-9 text-center shrink-0">
                        {slot === 0 ? measureNo : ''}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-stretch gap-0 min-w-max">
                    <div className="flex border border-[var(--surface-light)] rounded-md overflow-hidden">
                      {Array.from({ length: spm }).map((__, slot) => {
                        const step = base + slot;
                        const playheadHere = pb.playing && pb.playhead === step;
                        return (
                          <div
                            key={slot}
                            className={`flex flex-col border-r border-[var(--surface-light)] last:border-r-0 ${slot % 2 === 0 ? 'bg-[var(--surface)]/15' : ''}`}
                          >
                            {Array.from({ length: 6 }).map((_, si) => {
                              const n = noteAtCell(pattern, step, si);
                              const active = !!n;
                              return (
                                <button
                                  key={si}
                                  type="button"
                                  onClick={(e) => onCellClick(si, step, e.shiftKey)}
                                  className={`w-9 h-8 text-xs font-semibold flex items-center justify-center border-b border-[var(--surface-light)]/50 last:border-b-0 ${a.hoverCell} ${
                                    active ? 'text-[var(--foreground)]' : 'text-[var(--muted)]'
                                  } ${playheadHere ? `ring-1 ring-inset ${a.ring}` : ''}`}
                                >
                                  {active && n ? <FretCell fret={n.fret} root={n.root} /> : ''}
                                </button>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                    {isLast ? <EndBar /> : null}
                  </div>
                  <GammeRhythmStemsRow stepsPerMeasure={spm} tripletFeel={tripletFeel} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <GammeTabPreview pattern={pattern} globalPlayhead={pb.playing ? pb.playhead : null} variant={variant} />

      <div className="flex flex-wrap items-center gap-2 mt-4">
        <button
          type="button"
          onClick={() =>
            setPattern(
              isWb
                ? makeEmptyWalkingBassPattern()
                : isRiff
                  ? { ...makeEmptyWalkingBassPattern(), name: 'Mon riff', sectionLabel: 'Riff' }
                  : makeEmptyGammePattern(),
            )
          }
          className="px-3 py-1.5 rounded-lg bg-[var(--surface-light)] text-[var(--muted)] text-xs"
        >
          Nouveau motif
        </button>
        {source && (
          <button type="button" onClick={onCancelEdit} className="px-3 py-1.5 rounded-lg bg-[var(--surface-light)] text-[var(--muted)] text-xs">
            Quitter l’édition
          </button>
        )}
        <button type="button" onClick={handleSave} className={`ml-auto px-3 py-1.5 rounded-lg text-white text-xs ${a.btn}`}>
          {isRiff
            ? source
              ? 'Mettre à jour le riff'
              : 'Enregistrer le riff'
            : isWb
              ? source
                ? 'Mettre à jour la ligne'
                : 'Enregistrer la ligne'
              : source
                ? 'Mettre à jour la gamme'
                : 'Enregistrer la gamme'}
        </button>
      </div>
      {error ? <p className="text-xs text-red-400 mt-2">{error}</p> : null}
    </div>
  );
}

export function WalkingBassPatternEditor(
  props: Omit<ComponentProps<typeof GammePatternEditor>, 'variant'>,
) {
  return <GammePatternEditor {...props} variant="walkingBass" />;
}

export function WalkingBassMenuCard({ pattern }: { pattern: GammePatternV1 }) {
  return <GammeMenuCard pattern={pattern} variant="walkingBass" />;
}

export function RiffPatternEditor(props: Omit<ComponentProps<typeof GammePatternEditor>, 'variant'>) {
  return <GammePatternEditor {...props} variant="riff" />;
}

export function RiffMenuCard({ pattern }: { pattern: GammePatternV1 }) {
  return <GammeMenuCard pattern={pattern} variant="riff" />;
}
