// Dialog.tsx — das eine modale Muster (DESIGN.md §7): role="dialog",
// Fokus-Falle, Esc schließt, Fokus kehrt zum Auslöser zurück. Elevation 2,
// Eintritt per „gleiten" (§8). Für leichte Popovers NICHT verwenden.

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { useFocusReturn, useFocusTrap } from './focus';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Roter Titel für destruktive Flüsse (z. B. „Alles löschen"). */
  danger?: boolean;
}

export function Dialog({ open, onClose, title, children, danger = false }: DialogProps) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useFocusReturn(open);
  useFocusTrap(panel, open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div className="absolute inset-0 bg-ink/20" onClick={onClose} aria-hidden="true" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="bl-gleiten relative w-full max-w-md rounded-lg border border-black/10 bg-paper-3 p-6 shadow-2"
      >
        <h2
          id={titleId}
          className={`font-display text-title ${danger ? 'text-fehl' : 'text-ink-strong'}`}
        >
          {title}
        </h2>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}
