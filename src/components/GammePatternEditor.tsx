'use client';

import { useEffect, useState, type ComponentProps } from 'react';
import {
  GAMME_STEPS_PER_MEASURE,
  type GammeNote,
  type GammePatternV1,
  makeEmptyGammePattern,
  parseGammePattern,
  serializeGammePattern,
} from '@/lib/gammeCodec';
import { useGammePlayback } from '@/hooks/useGammePlayback';
import {
  makeEmptyWalkingBassPattern,
  parseWalkingBassPattern,
  serializeWalkingBassPattern,
} from '@/lib/walkingBassCodec';
import { IconGamme, IconMusic, IconPause, IconPlay, IconWalkingBass } from '@/components/Icons';

export type GammeEditorVariant = 'gamme' | 'walkingBass';

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
};

/** Mi aigu en haut (e) → Mi grave en bas (E). Clés React : index de corde, pas le caractère affiché. */
const STRING_LABELS = ['e', 'B', 'G', 'D', 'A', 'E'];

function noteAtStep(pattern: GammePatternV1, step: number): GammeNote | null {
  return pattern.notes.find((n) => n.step === step) ?? null;
}

function GammeMeasureStems() {
  const n = GAMME_STEPS_PER_MEASURE;
  const u = 20;
  const w = n * u;
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
      <line x1={4} y1={7} x2={w - 4} y2={7} stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" />
    </svg>
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
          const base = mi * GAMME_STEPS_PER_MEASURE;
          const measureNo = pattern.firstMeasureNumber + mi;
          const isLast = mi === pattern.measures - 1;
          return (
            <div key={mi} className="flex flex-col gap-1.5 w-fit shrink-0">
              <div className="flex text-[10px] text-[var(--muted)] pl-1 min-h-[1.125rem] items-center">
                {Array.from({ length: GAMME_STEPS_PER_MEASURE }).map((__, slot) => (
                  <div key={slot} className="w-9 text-center shrink-0">
                    {slot === 0 ? measureNo : ''}
                  </div>
                ))}
              </div>
              <div className="flex items-stretch gap-0 min-w-max">
                <div className="flex border border-[var(--surface-light)] rounded overflow-hidden">
                  {Array.from({ length: GAMME_STEPS_PER_MEASURE }).map((__, slot) => {
                    const step = base + slot;
                    const n = noteAtStep(pattern, step);
                    const ph = globalPlayhead !== null && globalPlayhead !== undefined && globalPlayhead === step;
                    return (
                      <div
                        key={slot}
                        className={`flex flex-col border-r border-[var(--surface-light)] last:border-r-0 ${slot % 2 === 0 ? 'bg-[var(--surface)]/10' : ''} ${ph ? a.playhead : ''}`}
                      >
                        {Array.from({ length: 6 }).map((_, si) => (
                          <div
                            key={si}
                            className="w-9 h-8 flex items-center justify-center border-b border-[var(--surface-light)]/40 last:border-b-0 text-[var(--foreground)]"
                          >
                            {n?.string === si ? <FretCell fret={n.fret} root={n.root} /> : null}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
                {isLast ? <EndBar /> : null}
              </div>
              <div className="w-full min-h-[20px] border-t border-[var(--surface-light)]/30 pt-0.5">
                <GammeMeasureStems />
              </div>
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
        {pattern.measures} mesure{pattern.measures > 1 ? 's' : ''} · {pattern.notes.length} note{pattern.notes.length > 1 ? 's' : ''}
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
  const a = ACCENT[variant];
  const serialize = isWb ? serializeWalkingBassPattern : serializeGammePattern;
  const IconHeader = isWb ? IconWalkingBass : IconGamme;

  const [pattern, setPattern] = useState<GammePatternV1>(() =>
    variant === 'walkingBass' ? makeEmptyWalkingBassPattern() : makeEmptyGammePattern(),
  );
  const [error, setError] = useState('');
  const [paintFret, setPaintFret] = useState(0);
  const pb = useGammePlayback(pattern, { onAudioError: setError });

  useEffect(() => {
    if (!editMode) return;
    const parse = variant === 'walkingBass' ? parseWalkingBassPattern : parseGammePattern;
    const freshEmpty = variant === 'walkingBass' ? makeEmptyWalkingBassPattern : makeEmptyGammePattern;
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
    setError(variant === 'walkingBass' ? 'Impossible de charger cette ligne de basse.' : 'Impossible de charger cette gamme.');
  }, [editMode, source, variant]);

  if (!editMode) return null;

  const setMeasures = (m: number) => {
    const maxSlots = m * GAMME_STEPS_PER_MEASURE;
    setPattern((prev) => ({
      ...prev,
      measures: m,
      notes: prev.notes.filter((n) => n.step < maxSlots),
    }));
  };

  const onCellClick = (stringIndex: number, globalStep: number, shiftKey: boolean) => {
    if (shiftKey) {
      setPattern((prev) => {
        const cur = noteAtStep(prev, globalStep);
        if (!cur || cur.string !== stringIndex) return prev;
        const nextRoot = !cur.root;
        if (!nextRoot) {
          return {
            ...prev,
            notes: prev.notes.map((n) => (n.step === globalStep ? { ...n, root: false } : n)),
          };
        }
        return {
          ...prev,
          notes: prev.notes.map((n) => ({
            ...n,
            root: n.step === globalStep,
          })),
        };
      });
      return;
    }

    setPattern((prev) => {
      const cur = noteAtStep(prev, globalStep);
      if (cur) {
        if (cur.string === stringIndex) {
          return { ...prev, notes: prev.notes.filter((n) => n.step !== globalStep) };
        }
        return {
          ...prev,
          notes: prev.notes.map((n) => (n.step === globalStep ? { ...n, string: stringIndex } : n)),
        };
      }
      return {
        ...prev,
        notes: [
          ...prev.notes.filter((n) => n.step !== globalStep),
          { step: globalStep, string: stringIndex, fret: paintFret, root: false },
        ].sort((a, b) => a.step - b.step),
      };
    });
  };

  const handleSave = () => {
    const name = pattern.name.trim();
    if (!name) {
      setError(isWb ? 'Donne un titre à la ligne.' : 'Donne un titre à la gamme.');
      return;
    }
    if (pattern.notes.length === 0) {
      setError('Ajoute au moins une note sur la grille.');
      return;
    }
    setError('');
    const clean: GammePatternV1 = {
      ...pattern,
      name,
      sectionLabel: pattern.sectionLabel.trim() || (isWb ? 'Walking bass' : 'Technique'),
      firstMeasureNumber: Math.min(999, Math.max(1, pattern.firstMeasureNumber)),
      notes: [...pattern.notes].sort((a, b) => a.step - b.step),
    };
    onSave({ encoded: serialize(clean), source });
  };

  return (
    <div className={`mb-10 p-5 rounded-xl border-2 border-dashed bg-[var(--surface)]/50 ${a.dashed}`}>
      <h3 className={`text-sm font-bold mb-3 inline-flex items-center gap-2 ${a.title}`}>
        <IconHeader className="w-4 h-4" />
        {isWb
          ? source
            ? 'Éditer un walking bass (tablature)'
            : 'Créer un walking bass (tablature)'
          : source
            ? 'Éditer une gamme (tablature)'
            : 'Créer une gamme (tablature)'}
      </h3>
      <p className="text-xs text-[var(--muted)] mb-4">
        Une note par temps (noire), 4 temps par mesure. Clic : place la case choisie ; reclic sur la même corde efface.{' '}
        <span className={isWb ? 'text-emerald-300/90' : 'text-sky-300/90'}>Maj + clic</span> sur une note : marque la tonique (cercle).
      </p>

      <div className="grid md:grid-cols-2 gap-3 mb-3">
        <div className="space-y-2">
          <label className="block text-[10px] text-[var(--muted)]">Section (en-tête)</label>
          <input
            value={pattern.sectionLabel}
            onChange={(e) => setPattern((p) => ({ ...p, sectionLabel: e.target.value }))}
            placeholder={isWb ? 'Walking bass' : 'Technique'}
            className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--surface-light)] text-sm"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-[10px] text-[var(--muted)]">{isWb ? 'Titre de la ligne' : 'Titre de la gamme'}</label>
          <input
            value={pattern.name}
            onChange={(e) => setPattern((p) => ({ ...p, name: e.target.value }))}
            placeholder={isWb ? '2-5-1 sur II-V-I' : 'La gamme de Do'}
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
        <div className="inline-flex items-end gap-2 pb-0.5">
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
        </div>
      </div>

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
              const base = mi * GAMME_STEPS_PER_MEASURE;
              const measureNo = pattern.firstMeasureNumber + mi;
              const isLast = mi === pattern.measures - 1;
              return (
                <div key={mi} className="flex flex-col gap-1.5 w-fit shrink-0">
                  <div className="flex text-[10px] text-[var(--muted)] pl-1 min-h-[1.125rem] items-center">
                    {Array.from({ length: GAMME_STEPS_PER_MEASURE }).map((__, slot) => (
                      <div key={slot} className="w-9 text-center shrink-0">
                        {slot === 0 ? measureNo : ''}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-stretch gap-0 min-w-max">
                    <div className="flex border border-[var(--surface-light)] rounded-md overflow-hidden">
                      {Array.from({ length: GAMME_STEPS_PER_MEASURE }).map((__, slot) => {
                        const step = base + slot;
                        const playheadHere = pb.playing && pb.playhead === step;
                        return (
                          <div
                            key={slot}
                            className={`flex flex-col border-r border-[var(--surface-light)] last:border-r-0 ${slot % 2 === 0 ? 'bg-[var(--surface)]/15' : ''}`}
                          >
                            {Array.from({ length: 6 }).map((_, si) => {
                              const n = noteAtStep(pattern, step);
                              const active = n?.string === si;
                              return (
                                <button
                                  key={si}
                                  type="button"
                                  onClick={(e) => onCellClick(si, step, e.shiftKey)}
                                  className={`w-9 h-8 text-xs font-semibold flex items-center justify-center border-b border-[var(--surface-light)]/50 last:border-b-0 ${a.hoverCell} ${
                                    active ? 'text-[var(--foreground)]' : 'text-[var(--muted)]'
                                  } ${playheadHere ? `ring-1 ring-inset ${a.ring}` : ''}`}
                                >
                                  {active ? <FretCell fret={n!.fret} root={n!.root} /> : ''}
                                </button>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                    {isLast ? <EndBar /> : null}
                  </div>
                  <div className="w-full min-h-[20px] border-t border-[var(--surface-light)]/30 pt-0.5">
                    <GammeMeasureStems />
                  </div>
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
            setPattern(variant === 'walkingBass' ? makeEmptyWalkingBassPattern() : makeEmptyGammePattern())
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
          {isWb ? (source ? 'Mettre à jour la ligne' : 'Enregistrer la ligne') : source ? 'Mettre à jour la gamme' : 'Enregistrer la gamme'}
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
