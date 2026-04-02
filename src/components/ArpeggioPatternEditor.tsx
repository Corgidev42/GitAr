'use client';

import { useEffect, useState } from 'react';
import {
  type ArpeggioPatternV2,
  type ArpeggioStepsPerMeasure,
  makeEmptyArpeggioPattern,
  parseArpeggioPattern,
  resolveArpeggioStepsPerMeasure,
  serializeArpeggioPattern,
} from '@/lib/arpeggioCodec';
import { useArpeggioPlayback } from '@/hooks/useArpeggioPlayback';
import { tabRhythmSubdivisionLabel } from '@/lib/gammeCodec';
import { IconMusic, IconPause, IconPlay, IconRhythm } from '@/components/Icons';

const STRING_LABELS = ['e', 'B', 'G', 'D', 'A', 'E'];

function noteAtCell(pattern: ArpeggioPatternV2, step: number, stringIndex: number) {
  return pattern.notes.find((n) => n.step === step && n.string === stringIndex) ?? null;
}

function ArpeggioTabColumn() {
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

function ArpeggioEndBar() {
  return (
    <div className="flex flex-col justify-center shrink-0 pl-1.5 ml-0.5 border-l border-[var(--surface-light)]" title="Fin de phrase" aria-hidden>
      <div className="flex h-[12rem] items-center gap-px">
        <div className="w-px self-stretch my-1 bg-[var(--foreground)]/45" />
        <div className="w-1 self-stretch my-1 bg-[var(--foreground)]/80 rounded-[1px]" />
      </div>
    </div>
  );
}

function ArpeggioMeasureStems({ stepsPerMeasure }: { stepsPerMeasure: number }) {
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

function ArpeggioRhythmStemsRow({ stepsPerMeasure }: { stepsPerMeasure: ArpeggioStepsPerMeasure }) {
  return (
    <div className="w-full min-h-[20px] border-t border-[var(--surface-light)]/30 pt-0.5 flex items-center gap-2">
      <span
        className="text-[9px] font-semibold text-[var(--muted)] shrink-0 leading-none"
        title="Figure par colonne (mesure en 4/4)"
      >
        {tabRhythmSubdivisionLabel(stepsPerMeasure)}
      </span>
      <div className="flex-1 min-w-0">
        <ArpeggioMeasureStems stepsPerMeasure={stepsPerMeasure} />
      </div>
    </div>
  );
}

function ArpeggioTabPreview({
  pattern,
  globalPlayhead,
}: {
  pattern: ArpeggioPatternV2;
  globalPlayhead?: number | null;
}) {
  const spm = resolveArpeggioStepsPerMeasure(pattern);
  return (
    <div className="mt-2 rounded-lg border border-[var(--surface-light)] bg-[var(--background)]/70 p-2 w-full min-w-0">
      <div className="flex gap-2 items-start min-w-0">
        <ArpeggioTabColumn />
        <div className="flex flex-wrap gap-x-3 gap-y-5 flex-1 min-w-0 content-start">
          {Array.from({ length: pattern.measures }).map((_, mi) => {
            const base = mi * spm;
            const measureNo = mi + 1;
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
                          className={`flex flex-col border-r border-[var(--surface-light)] last:border-r-0 ${slot % 2 === 0 ? 'bg-[var(--surface)]/10' : ''} ${ph ? 'bg-[var(--accent)]/15 ring-1 ring-inset ring-[var(--accent)]/35' : ''}`}
                        >
                          {Array.from({ length: 6 }).map((_, si) => {
                            const n = noteAtCell(pattern, step, si);
                            return (
                              <div
                                key={si}
                                className="w-9 h-8 flex items-center justify-center text-xs font-semibold border-b border-[var(--surface-light)]/40 last:border-b-0 text-[var(--foreground)]"
                              >
                                {n ? n.fret : ''}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                  {isLast ? <ArpeggioEndBar /> : null}
                </div>
                <ArpeggioRhythmStemsRow stepsPerMeasure={spm} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function ArpeggioMenuCard({ pattern }: { pattern: ArpeggioPatternV2 }) {
  const [audioErr, setAudioErr] = useState('');
  const pb = useArpeggioPlayback(pattern, { onAudioError: setAudioErr });

  return (
    <div className="px-4 py-3 bg-[var(--surface)] rounded-lg border border-[var(--surface-light)] hover:border-[var(--accent)] transition-colors min-w-0 w-full max-w-full">
      <div className="text-sm font-medium">{pattern.name}</div>
      <p className="text-[11px] text-[var(--muted)] mt-1">
        {pattern.measures} mesure{pattern.measures > 1 ? 's' : ''} · {pattern.notes.length} note{pattern.notes.length > 1 ? 's' : ''} ·{' '}
        {tabRhythmSubdivisionLabel(resolveArpeggioStepsPerMeasure(pattern))}
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
              pb.setBpm(Number.isFinite(n) ? Math.min(220, Math.max(40, n)) : 96);
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
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--accent)] text-white text-[10px] font-medium"
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
      <ArpeggioTabPreview pattern={pattern} globalPlayhead={pb.playing ? pb.playhead : null} />
    </div>
  );
}

export function ArpeggioPatternEditor({
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
  const [pattern, setPattern] = useState<ArpeggioPatternV2>(makeEmptyArpeggioPattern());
  const [error, setError] = useState('');
  const [paintFret, setPaintFret] = useState(0);
  const pb = useArpeggioPlayback(pattern, { onAudioError: setError });

  useEffect(() => {
    if (!editMode) return;
    if (!source) {
      setPattern(makeEmptyArpeggioPattern());
      setError('');
      return;
    }
    const parsed = parseArpeggioPattern(source);
    if (parsed) {
      setPattern(parsed);
      setError('');
      return;
    }
    setPattern(makeEmptyArpeggioPattern());
    setError('Impossible de charger cet arpège.');
  }, [editMode, source]);

  if (!editMode) return null;

  const spm = resolveArpeggioStepsPerMeasure(pattern);

  const setMeasures = (m: number) => {
    setPattern((prev) => {
      const s = resolveArpeggioStepsPerMeasure(prev);
      const maxSlots = m * s;
      return {
        ...prev,
        measures: m,
        notes: prev.notes.filter((n) => n.step < maxSlots),
      };
    });
  };

  const onCellClick = (stringIndex: number, globalStep: number) => {
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
        notes: [...prev.notes, { step: globalStep, string: stringIndex, fret: paintFret }].sort(
          (a, b) => a.step - b.step || a.string - b.string,
        ),
      };
    });
  };

  const handleSave = () => {
    const name = pattern.name.trim();
    if (!name) {
      setError('Donne un nom à l’arpège.');
      return;
    }
    if (pattern.notes.length === 0) {
      setError('Ajoute au moins une note sur la grille.');
      return;
    }
    setError('');
    const clean: ArpeggioPatternV2 = {
      ...pattern,
      name,
      notes: [...pattern.notes].sort((a, b) => a.step - b.step || a.string - b.string),
    };
    onSave({ encoded: serializeArpeggioPattern(clean), source });
  };

  return (
    <div className="mb-10 p-5 rounded-xl border-2 border-dashed border-teal-500/40 bg-[var(--surface)]/50">
      <h3 className="text-sm font-bold text-teal-300 mb-3 inline-flex items-center gap-2">
        <IconRhythm className="w-4 h-4" />
        {source ? 'Éditer un arpège' : 'Créer un arpège (tablature)'}
      </h3>
      <p className="text-xs text-[var(--muted)] mb-4">
        Subdivision au choix (noires, croches…). Plusieurs notes au même instant : une par corde. Clic : pose ou efface la case sur cette corde.
      </p>

      <div className="grid md:grid-cols-[1fr_auto] gap-3 mb-3">
        <input
          value={pattern.name}
          onChange={(e) => setPattern((p) => ({ ...p, name: e.target.value }))}
          placeholder="Nom de l’arpège"
          className="px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--surface-light)] text-sm"
        />
        <div className="inline-flex flex-wrap items-center gap-2">
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
              const next = Number(e.target.value) as ArpeggioStepsPerMeasure;
              setPattern((prev) => {
                const maxSlots = prev.measures * next;
                return {
                  ...prev,
                  stepsPerMeasure: next,
                  notes: prev.notes.filter((n) => n.step < maxSlots),
                };
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
        <span className="text-xs font-medium text-teal-300 shrink-0 inline-flex items-center gap-1.5">
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
              pb.setBpm(Number.isFinite(n) ? Math.min(220, Math.max(40, n)) : 96);
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-medium"
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
          <ArpeggioTabColumn />
          <div className="flex flex-wrap gap-x-3 gap-y-5 flex-1 min-w-0 content-start">
            {Array.from({ length: pattern.measures }).map((_, mi) => {
              const base = mi * spm;
              const measureNo = mi + 1;
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
                                  onClick={() => onCellClick(si, step)}
                                  className={`w-9 h-8 text-xs font-semibold flex items-center justify-center border-b border-[var(--surface-light)]/50 last:border-b-0 hover:bg-[var(--accent)]/15 ${
                                    active ? 'text-[var(--foreground)]' : 'text-[var(--muted)]'
                                  } ${playheadHere ? 'ring-1 ring-inset ring-teal-500/50 bg-teal-500/10' : ''}`}
                                >
                                  {active && n ? n.fret : ''}
                                </button>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                    {isLast ? <ArpeggioEndBar /> : null}
                  </div>
                  <ArpeggioRhythmStemsRow stepsPerMeasure={spm} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <ArpeggioTabPreview pattern={pattern} globalPlayhead={pb.playing ? pb.playhead : null} />

      <div className="flex flex-wrap items-center gap-2 mt-4">
        <button type="button" onClick={() => setPattern(makeEmptyArpeggioPattern())} className="px-3 py-1.5 rounded-lg bg-[var(--surface-light)] text-[var(--muted)] text-xs">
          Nouveau motif
        </button>
        {source && (
          <button type="button" onClick={onCancelEdit} className="px-3 py-1.5 rounded-lg bg-[var(--surface-light)] text-[var(--muted)] text-xs">
            Quitter l’édition
          </button>
        )}
        <button type="button" onClick={handleSave} className="ml-auto px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs">
          {source ? 'Mettre à jour l’arpège' : 'Enregistrer l’arpège'}
        </button>
      </div>
      {error ? <p className="text-xs text-red-400 mt-2">{error}</p> : null}
    </div>
  );
}
