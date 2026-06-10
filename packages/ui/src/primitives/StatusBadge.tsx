// StatusBadge.tsx — Status immer Symbol + Text, nie nur Farbe (DESIGN.md §5).
// Das Symbol trägt die Farbe, der Text bleibt kontraststark in ink-2.

import type { ReactNode } from 'react';

export type BadgeTone = 'ok' | 'warn' | 'fehl' | 'accent' | 'neutral';

const tones: Record<BadgeTone, { symbol: string; symbolClass: string; borderClass: string }> = {
  ok: { symbol: '✓', symbolClass: 'text-ok', borderClass: 'border-ok/40' },
  warn: { symbol: '⚠', symbolClass: 'text-warn', borderClass: 'border-warn/50' },
  fehl: { symbol: '✗', symbolClass: 'text-fehl', borderClass: 'border-fehl/40' },
  accent: { symbol: '▸', symbolClass: 'text-accent-ink', borderClass: 'border-accent/40' },
  neutral: { symbol: '·', symbolClass: 'text-ink-faint', borderClass: 'border-black/10' },
};

export interface StatusBadgeProps {
  tone: BadgeTone;
  children: ReactNode;
  /** Eigenes Symbol statt des Standard-Symbols des Tons. */
  symbol?: string;
  className?: string;
}

export function StatusBadge({ tone, children, symbol, className = '' }: StatusBadgeProps) {
  const t = tones[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm border bg-paper-2 px-2 py-0.5 font-mono text-xs text-ink-2 ${t.borderClass} ${className}`}
    >
      <span aria-hidden="true" className={t.symbolClass}>
        {symbol ?? t.symbol}
      </span>
      {children}
    </span>
  );
}
