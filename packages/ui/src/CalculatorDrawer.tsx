// CalculatorDrawer.tsx — der Rechner-Griff + Drawer (SCREENS.md §1 & §7).
//
// Auf jedem Screen über die Lasche am rechten Rand erreichbar. Fährt als Drawer
// herein (angedockt) und lässt sich zu einem frei beweglichen, schwebenden
// Fenster herausziehen. Schiebt sich über die Canvas, nie über die Lektion.

import { useRef, useState } from 'react';
import { Calculator, type CalculatorProps } from './Calculator';

export function CalculatorDrawer(calcProps: CalculatorProps = {}) {
  const [open, setOpen] = useState(false);
  const [floating, setFloating] = useState(false);
  const [pos, setPos] = useState({ x: 80, y: 80 });
  const drag = useRef<{ dx: number; dy: number } | null>(null);

  // Geschlossen: nur die vertikale Lasche am rechten Rand.
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Rechner öffnen"
        className="fixed bottom-20 right-0 z-40 flex flex-col items-center gap-2 rounded-l border border-r-0 border-black/10 bg-paper-2 px-2 py-4 shadow transition-colors hover:bg-paper-sink md:bottom-auto md:top-1/2 md:-translate-y-1/2"
      >
        <span className="text-lg" aria-hidden>🧮</span>
        <span className="font-mono text-[10px] uppercase tracking-widest text-ink-2 [writing-mode:vertical-rl]">
          Rechner
        </span>
      </button>
    );
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (!floating) return;
    drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
    (e.target as Element).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    setPos({ x: e.clientX - drag.current.dx, y: e.clientY - drag.current.dy });
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  // Angedockt: Desktop = Seiten-Drawer; mobil = Bottom-Sheet (SCREENS.md §12).
  const shellClass = floating
    ? 'fixed z-40 w-[320px] rounded border border-black/10 shadow'
    : 'fixed inset-x-0 bottom-0 z-40 flex max-h-[70vh] w-full flex-col border-t border-black/10 shadow md:inset-x-auto md:right-0 md:top-0 md:h-screen md:max-h-none md:w-[340px] md:border-l md:border-t-0';
  const shellStyle = floating
    ? { left: pos.x, top: pos.y, maxHeight: '80vh' }
    : undefined;

  return (
    <aside className={`${shellClass} bg-paper-2`} style={shellStyle}>
      <header
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className={`flex items-center justify-between border-b border-black/10 px-3 py-2 ${
          floating ? 'cursor-move' : ''
        }`}
      >
        <span className="flex items-center gap-2 font-display text-sm text-ink">
          <span aria-hidden>🧮</span> Rechner
        </span>
        <span className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setFloating((f) => !f)}
            aria-label={floating ? 'andocken' : 'herauslösen'}
            title={floating ? 'andocken' : 'herauslösen'}
            className="rounded px-1.5 py-0.5 font-mono text-sm text-ink-2 hover:text-accent-ink"
          >
            ⤢
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Rechner schließen"
            className="rounded px-1.5 py-0.5 font-mono text-sm text-ink-2 hover:text-accent-ink"
          >
            ×
          </button>
        </span>
      </header>
      <div className={floating ? 'max-h-[70vh] overflow-auto' : 'flex-1 overflow-auto'}>
        <Calculator {...calcProps} />
      </div>
    </aside>
  );
}
