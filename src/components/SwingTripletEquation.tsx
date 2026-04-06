'use client';

/** Équivalence swing : (deux croches) = triolet noire + croche avec « 3 » — réf. partitions blues / shuffle. */
export function SwingTripletEquationSvg({ className }: { className?: string }) {
  return (
    <svg
      width={152}
      height={32}
      viewBox="0 0 152 32"
      className={className ?? 'text-[var(--foreground)] opacity-[0.92]'}
      aria-hidden
    >
      <text x={2} y={22} fontSize={14} fill="currentColor" fontFamily="system-ui, sans-serif">
        (
      </text>
      {/* Deux croches liées (simplifié) */}
      <line x1={12} y1={10} x2={28} y2={10} stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" />
      <line x1={14} y1={10} x2={14} y2={24} stroke="currentColor" strokeWidth={1.1} />
      <line x1={26} y1={10} x2={26} y2={24} stroke="currentColor" strokeWidth={1.1} />
      <ellipse cx={14} cy={26} rx={3.2} ry={2.2} fill="currentColor" />
      <ellipse cx={26} cy={26} rx={3.2} ry={2.2} fill="currentColor" />
      <text x={40} y={22} fontSize={14} fill="currentColor" fontFamily="system-ui, sans-serif">
        =
      </text>
      {/* Triolet : noire + croche sous le 3 */}
      <path
        d="M 54 6 Q 72 2 90 6"
        fill="none"
        stroke="currentColor"
        strokeWidth={1}
      />
      <text x={68} y={14} fontSize={11} fontWeight={600} fill="currentColor" textAnchor="middle" fontFamily="system-ui, sans-serif">
        3
      </text>
      <line x1={62} y1={18} x2={62} y2={26} stroke="currentColor" strokeWidth={1.1} />
      <ellipse cx={62} cy={28} rx={3.5} ry={2.3} fill="currentColor" />
      <line x1={78} y1={22} x2={78} y2={28} stroke="currentColor" strokeWidth={1.1} />
      <ellipse cx={78} cy={29.5} rx={2.8} ry={2} fill="currentColor" />
      <line x1={84} y1={12} x2={84} y2={28} stroke="currentColor" strokeWidth={1.1} />
      <text x={132} y={22} fontSize={14} fill="currentColor" fontFamily="system-ui, sans-serif">
        )
      </text>
    </svg>
  );
}
