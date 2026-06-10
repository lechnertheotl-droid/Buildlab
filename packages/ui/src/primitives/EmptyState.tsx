// EmptyState.tsx — der eine leere Zustand (SCREENS.md §2): freundlich,
// nie ein Vorwurf (VOICE.md §3), immer mit nächstem Schritt, wenn es einen gibt.

import type { ReactNode } from 'react';
import { Card } from './Card';

export interface EmptyStateProps {
  title: string;
  hint?: string;
  action?: ReactNode;
  illustration?: ReactNode;
}

export function EmptyState({ title, hint, action, illustration }: EmptyStateProps) {
  return (
    <Card level="hero" className="flex flex-col items-center gap-3 py-10 text-center">
      {illustration && <div aria-hidden="true">{illustration}</div>}
      <p className="font-display text-lead font-medium text-ink">{title}</p>
      {hint && <p className="max-w-sm text-sm leading-relaxed text-ink-2">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </Card>
  );
}
