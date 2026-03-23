'use client';

import type { ChordDiagramData } from '@/types';

function fingerLabel(f: number | string | null | undefined): string {
  if (f === null || f === undefined) return '';
  if (f === 'T') return 'T';
  return String(f);
}

export function ChordDiagramView({
  name,
  diagram,
  size = 'md',
}: {
  name: string;
  diagram: ChordDiagramData | null;
  size?: 'sm' | 'md' | 'lg';
}) {
  const fingers = diagram?.fingers;
  const labelFr = diagram?.labelFr;
  const svgClass = size === 'lg' ? 'w-28 h-36 mt-2' : size === 'sm' ? 'w-12 h-16 mt-1' : 'w-16 h-20 mt-1';

  return (
    <div className="flex flex-col items-center p-3 bg-[var(--surface)] rounded-lg border border-[var(--surface-light)] group">
      <div className="flex items-center gap-2 w-full justify-center flex-wrap">
        <span className="text-sm font-bold text-[var(--accent-light)] text-center">{name}</span>
      </div>
      {labelFr ? <span className="text-[10px] text-[var(--muted)] text-center leading-tight mt-0.5">{labelFr}</span> : null}
      <svg viewBox="0 0 50 72" className={svgClass}>
        <title>{name}</title>
        {/* Sillet */}
        <rect x="5" y="5" width="40" height="3" fill="var(--foreground)" />
        {/* Cordes */}
        {[0, 1, 2, 3, 4, 5].map((s) => (
          <line key={`s${s}`} x1={5 + s * 8} y1="5" x2={5 + s * 8} y2="55" stroke="var(--muted)" strokeWidth="0.5" />
        ))}
        {/* Frettes (4 cases visibles) */}
        {[1, 2, 3, 4].map((f) => (
          <line key={`f${f}`} x1="5" y1={5 + f * 12.5} x2="45" y2={5 + f * 12.5} stroke="var(--muted)" strokeWidth="0.5" />
        ))}
        {diagram?.frets.map((fret, string) => {
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
          const fy = fret * 12.5 - 1.25;
          const mark = fingers?.[string];
          const showDigit = mark !== undefined && mark !== null && fret > 0;
          return (
            <g key={string}>
              <circle
                cx={5 + string * 8}
                cy={fy}
                r="3.5"
                fill="var(--accent)"
                stroke="var(--accent-light)"
                strokeWidth="0.6"
              />
              {showDigit ? (
                <text
                  x={5 + string * 8}
                  y={fy + 1.4}
                  textAnchor="middle"
                  fontSize="3.8"
                  fontWeight="700"
                  fill="white"
                  style={{ fontFamily: 'system-ui, sans-serif' }}
                >
                  {fingerLabel(mark)}
                </text>
              ) : null}
            </g>
          );
        })}
        {!diagram && <text x="25" y="35" textAnchor="middle" fontSize="5" fill="var(--muted)">?</text>}
        {/* Noms des cordes */}
        {['E', 'A', 'D', 'G', 'B', 'E'].map((note, i) => (
          <text key={`n${i}`} x={5 + i * 8} y="62" textAnchor="middle" fontSize="3.2" fill="var(--muted)">
            {note}
          </text>
        ))}
      </svg>
    </div>
  );
}
