'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ChordDiagramData, ChordFingerMark } from '@/types';
import { ChordDiagramView } from '@/components/ChordDiagramView';
import { IconX } from '@/components/Icons';
import { resolveChordDiagram } from '@/lib/chordDiagrams';
import type { Database } from '@/types';

const STRING_NAMES = ['E', 'A', 'D', 'G', 'B', 'E'];
const STRING_SOLFEGE = ['Mi', 'La', 'Ré', 'Sol', 'Si', 'Mi'];

function emptyFrets(): number[] {
  return [-1, -1, -1, -1, -1, -1];
}

function emptyFingers(): (ChordFingerMark | null)[] {
  return [null, null, null, null, null, null];
}

function diagramToState(d: ChordDiagramData): { frets: number[]; fingers: (ChordFingerMark | null)[]; labelFr: string; barres: string; position: string } {
  const fingers = emptyFingers();
  if (d.fingers) {
    for (let i = 0; i < 6; i++) {
      const x = d.fingers[i];
      if (x === 1 || x === 2 || x === 3 || x === 4 || x === 'T') fingers[i] = x;
    }
  }
  return {
    frets: [...d.frets],
    fingers,
    labelFr: d.labelFr ?? '',
    barres: d.barres?.length ? d.barres.join(',') : '',
    position: d.position != null ? String(d.position) : '',
  };
}

export type ChordEditorOpen =
  | null
  | { mode: 'create' }
  | { mode: 'edit'; name: string };

export function ChordEditorModal({
  open,
  payload,
  chordDiagrams,
  onClose,
  onSaved,
}: {
  open: boolean;
  payload: ChordEditorOpen;
  chordDiagrams?: Database['chordDiagrams'];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [chordName, setChordName] = useState('');
  const [labelFr, setLabelFr] = useState('');
  const [frets, setFrets] = useState(emptyFrets);
  const [fingers, setFingers] = useState<(ChordFingerMark | null)[]>(emptyFingers);
  const [barres, setBarres] = useState('');
  const [position, setPosition] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const resolved = useMemo(() => {
    if (!open || !payload) return null;
    if (payload.mode === 'create') {
      return { name: chordName.trim(), diagram: null as ChordDiagramData | null };
    }
    const merged = resolveChordDiagram(payload.name, chordDiagrams);
    return { name: payload.name, diagram: merged };
  }, [open, payload, chordDiagrams, chordName]);

  useEffect(() => {
    if (!open || !payload) return;
    setError('');
    if (payload.mode === 'create') {
      setChordName('');
      setLabelFr('');
      setFrets(emptyFrets());
      setFingers(emptyFingers());
      setBarres('');
      setPosition('');
      return;
    }
    const d = resolveChordDiagram(payload.name, chordDiagrams);
    setChordName(payload.name);
    if (d) {
      const s = diagramToState(d);
      setLabelFr(s.labelFr);
      setFrets(s.frets);
      setFingers(s.fingers);
      setBarres(s.barres);
      setPosition(s.position);
    } else {
      setLabelFr('');
      setFrets(emptyFrets());
      setFingers(emptyFingers());
      setBarres('');
      setPosition('');
    }
  }, [open, payload, chordDiagrams]);

  const previewDiagram: ChordDiagramData | null = useMemo(() => {
    const name = payload?.mode === 'edit' ? payload.name : chordName.trim();
    if (!name) return null;
    const barresArr = barres
      .split(',')
      .map((x) => parseInt(x.trim(), 10))
      .filter((n) => Number.isFinite(n) && n >= 0);
    const pos = parseInt(position, 10);
    const diagram: ChordDiagramData = { frets: [...frets] };
    if (fingers.some((f) => f !== null)) diagram.fingers = [...fingers];
    if (labelFr.trim()) diagram.labelFr = labelFr.trim();
    if (barresArr.length) diagram.barres = barresArr;
    if (Number.isFinite(pos) && pos >= 1) diagram.position = pos;
    return diagram;
  }, [payload, chordName, frets, fingers, labelFr, barres, position]);

  const previewName = payload?.mode === 'edit' ? payload.name : chordName.trim() || '…';

  const setFret = (i: number, v: number) => {
    setFrets((prev) => {
      const next = [...prev];
      next[i] = v;
      return next;
    });
    if (v <= 0) {
      setFingers((prev) => {
        const next = [...prev];
        next[i] = null;
        return next;
      });
    }
  };

  const handleSave = async () => {
    setError('');
    const name = payload?.mode === 'edit' ? payload.name : chordName.trim();
    if (!name) {
      setError('Indique un nom d’accord.');
      return;
    }
    if (frets.length !== 6) {
      setError('Erreur interne frets.');
      return;
    }
    const playable = frets.some((f) => f >= 0);
    const hasOpen = frets.some((f) => f === 0);
    if (!playable && !hasOpen) {
      setError('Au moins une corde à vide (O) ou une case frettée.');
      return;
    }

    setSaving(true);
    try {
      const diagram: ChordDiagramData = { frets: [...frets] };
      if (fingers.some((f) => f !== null)) diagram.fingers = [...fingers];
      if (labelFr.trim()) diagram.labelFr = labelFr.trim();
      const barresArr = barres
        .split(',')
        .map((x) => parseInt(x.trim(), 10))
        .filter((n) => Number.isFinite(n) && n >= 0);
      if (barresArr.length) diagram.barres = barresArr;
      const pos = parseInt(position, 10);
      if (Number.isFinite(pos) && pos >= 1) diagram.position = pos;

      const ensureInKnowledge = payload?.mode === 'create';

      const res = await fetch('/api/database', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'chord_diagram',
          name,
          diagram,
          ensureInKnowledge,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError((j as { error?: string }).error || 'Sauvegarde impossible');
        setSaving(false);
        return;
      }
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleResetBuiltin = async () => {
    if (payload?.mode !== 'edit') return;
    if (!confirm(`Supprimer la surcharge pour « ${payload.name} » et revenir au diagramme intégré (si disponible) ?`)) return;
    setSaving(true);
    try {
      await fetch('/api/database', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'chord_diagram_delete', name: payload.name }),
      });
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!open || !payload) return null;

  const hasCustomOverride = payload.mode === 'edit' && chordDiagrams && Object.prototype.hasOwnProperty.call(chordDiagrams, payload.name);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-[var(--surface)] rounded-2xl p-6 w-full max-w-2xl border border-[var(--surface-light)] max-h-[92vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">{payload.mode === 'create' ? 'Créer un accord' : 'Éditer le diagramme'}</h2>
          <button type="button" onClick={onClose} className="text-[var(--muted)] hover:text-[var(--foreground)] p-1">
            <IconX className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-[var(--muted)] mb-4">
          Cordes de gauche à droite : Mi grave → Mi aigu. × = sourdine, O = à vide, puis choisis la case (1–12). Doigté optionnel dans la
          pastille (1–4 ou T).
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            {payload.mode === 'create' ? (
              <div>
                <label className="text-xs text-[var(--muted)] mb-1 block">Nom de l’accord</label>
                <input
                  value={chordName}
                  onChange={(e) => setChordName(e.target.value)}
                  placeholder="ex: Asus2, Cmaj9"
                  className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--surface-light)] text-sm"
                />
              </div>
            ) : (
              <div className="text-sm">
                <span className="text-[var(--muted)]">Accord : </span>
                <span className="font-bold text-[var(--accent-light)]">{payload.name}</span>
                {resolved?.diagram && !hasCustomOverride ? (
                  <span className="block text-[10px] text-[var(--muted)] mt-1">Basé sur le catalogue intégré — enregistrer crée ta propre version.</span>
                ) : null}
              </div>
            )}

            <div>
              <label className="text-xs text-[var(--muted)] mb-1 block">Libellé FR (optionnel)</label>
              <input
                value={labelFr}
                onChange={(e) => setLabelFr(e.target.value)}
                placeholder="ex: LA sus2"
                className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--surface-light)] text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-[var(--muted)] mb-1 block">Barres (cases, optionnel)</label>
                <input
                  value={barres}
                  onChange={(e) => setBarres(e.target.value)}
                  placeholder="ex: 1"
                  className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--surface-light)] text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--muted)] mb-1 block">Position 1ʳᵉ case (optionnel)</label>
                <input
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="ex: 3"
                  className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--surface-light)] text-sm"
                />
              </div>
            </div>

            <div className="rounded-xl border border-[var(--surface-light)] overflow-hidden">
              <div className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto_auto] gap-1 px-2 py-1.5 bg-[var(--background)] text-[10px] text-[var(--muted)] font-semibold">
                <span>Corde</span>
                <span className="text-center">×</span>
                <span className="text-center">O</span>
                <span className="text-center">Case</span>
                <span className="text-center">Doigt</span>
              </div>
              {STRING_NAMES.map((note, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto_auto] gap-1 items-center px-2 py-1.5 border-t border-[var(--surface-light)] text-xs"
                >
                  <span className="text-[var(--foreground)]">
                    {note} <span className="text-[var(--muted)]">({STRING_SOLFEGE[i]})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setFret(i, -1)}
                    className={`px-2 py-1 rounded-md text-[10px] font-bold ${frets[i] === -1 ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface-light)] text-[var(--muted)]'}`}
                  >
                    ×
                  </button>
                  <button
                    type="button"
                    onClick={() => setFret(i, 0)}
                    className={`px-2 py-1 rounded-md text-[10px] font-bold ${frets[i] === 0 ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface-light)] text-[var(--muted)]'}`}
                  >
                    O
                  </button>
                  <select
                    value={frets[i] > 0 ? frets[i] : ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFret(i, v === '' ? -1 : parseInt(v, 10));
                    }}
                    className="min-w-[3.5rem] px-1 py-1 rounded-md bg-[var(--background)] border border-[var(--surface-light)] text-[11px]"
                  >
                    <option value="">—</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                  <select
                    value={fingers[i] ?? ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFingers((prev) => {
                        const next = [...prev];
                        next[i] = v === '' ? null : v === 'T' ? 'T' : (parseInt(v, 10) as ChordFingerMark);
                        return next;
                      });
                    }}
                    disabled={frets[i] <= 0}
                    className="min-w-[3rem] px-1 py-1 rounded-md bg-[var(--background)] border border-[var(--surface-light)] text-[11px] disabled:opacity-40"
                  >
                    <option value="">—</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="T">T</option>
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col items-center gap-3">
            <p className="text-xs text-[var(--muted)] self-start">Aperçu</p>
            <ChordDiagramView name={previewName} diagram={previewDiagram} size="lg" />
            {error ? <p className="text-sm text-red-400 text-center">{error}</p> : null}
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2 mt-6 pt-4 border-t border-[var(--surface-light)]">
          {payload.mode === 'edit' && hasCustomOverride ? (
            <button
              type="button"
              onClick={handleResetBuiltin}
              disabled={saving}
              className="px-4 py-2 text-sm rounded-lg bg-[var(--surface-light)] text-[var(--muted)] hover:text-orange-300 mr-auto"
            >
              Revenir au catalogue
            </button>
          ) : null}
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg bg-[var(--surface-light)] text-[var(--muted)]">
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm rounded-lg bg-[var(--accent)] text-white disabled:opacity-50"
          >
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}
