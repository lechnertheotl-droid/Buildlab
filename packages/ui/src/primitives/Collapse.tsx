// Collapse.tsx — Höhen-Expansion „aufklappen" (DESIGN.md §8):
// display:grid + grid-template-rows 1fr↔0fr, Kind min-height:0 + overflow:hidden.
// Inhalt bleibt im DOM (SSR, ARIA-Verweise); zugeklappt ist er per
// visibility:hidden unfokussierbar (CSS-Regel in index.css).

import type { ReactNode } from 'react';

export interface CollapseProps {
  open: boolean;
  children: ReactNode;
  id?: string;
  className?: string;
}

export function Collapse({ open, children, id, className = '' }: CollapseProps) {
  return (
    <div
      id={id}
      data-open={open}
      className={`bl-aufklappen grid ${className}`}
      style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
    >
      <div aria-hidden={!open} className="min-h-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
