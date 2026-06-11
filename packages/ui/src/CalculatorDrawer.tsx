// CalculatorDrawer.tsx — der Rechner-Griff + Drawer (SCREENS.md §1 & §7).
//
// Auf jedem Screen über die Lasche am rechten Rand erreichbar. Fährt als Drawer
// herein (angedockt) und lässt sich zu einem frei beweglichen, schwebenden
// Fenster herausziehen. Schiebt sich über die Canvas, nie über die Lektion.
// Nicht modal (keine Fokus-Falle, §7) — aber Esc schließt und gibt den Fokus
// an die Lasche zurück.

import { useEffect, useRef, useState } from 'react';
import { Calculator, type CalculatorProps } from './Calculator';
import { focusRing, hitArea } from './primitives/focus';

// Rechner-Icon in der Linien-Sprache der App (DESIGN.md §6) statt Emoji.
function CalcIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="6" y="3.5" width="12" height="17" rx="1.5" />
      <line x1="8.5" y1="7" x2="15.5" y2="7" />
      {[10.5, 13.5, 16.5].flatMap((y) => [8.5, 12, 15.5].map((x) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="0.6" fill="currentColor" stroke="none" />
      )))}
    </svg>
  );
}

export function CalculatorDrawer(calcProps: CalculatorProps = {}) {
  const [open, setOpen] = useState(false);
  const [floating, setFloating] = useState(false);
  const [pos, setPos] = useState({ x: 80, y: 80 });
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const tab = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  // Nach dem Schließen (×, Esc) landet der Fokus wieder auf der Lasche.
  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      return;
    }
    if (wasOpen.current) {
      wasOpen.current = false;
      tab.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  // Geschlossen: mobil ein kompakter runder Knopf in der Ecke (eine hohe
  // Lasche überdeckt auf 375 px sonst Überschriften, Slider-Skalen und die
  // Skill-Map-Statusspalte); ab md die vertikale Lasche am rechten Rand.
  if (!open) {
    return (
      <button
        ref={tab}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Rechner öffnen"
        className={`fixed bottom-32 right-3 z-40 flex h-12 w-12 flex-col items-center justify-center rounded-full border border-black/10 bg-paper-2 shadow transition-colors hover:bg-paper-sink md:bottom-auto md:right-0 md:top-1/2 md:h-auto md:w-auto md:-translate-y-1/2 md:gap-2 md:rounded-none md:rounded-l md:border-r-0 md:px-2 md:py-4 ${focusRing}`}
      >
        <CalcIcon className="h-5 w-5 text-ink-2" />
        <span className="hidden font-mono text-[10px] uppercase tracking-widest text-ink-2 [writing-mode:vertical-rl] md:block">
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
  // Schwebend = höchste Erhebung (paper-3, DESIGN.md §1).
  const shellClass = floating
    ? 'fixed z-40 w-[320px] rounded-lg border border-black/10 bg-paper-3 shadow-2'
    : 'fixed inset-x-0 bottom-0 z-40 flex max-h-[78vh] w-full flex-col border-t border-black/10 bg-paper-2 pb-[env(safe-area-inset-bottom)] shadow-2 md:inset-x-auto md:right-0 md:top-0 md:h-screen md:max-h-none md:w-[340px] md:border-l md:border-t-0 md:pb-0';
  const shellStyle = floating
    ? { left: pos.x, top: pos.y, maxHeight: '80vh' }
    : undefined;

  const headerButton = `${hitArea} ${focusRing} rounded px-1.5 py-0.5 font-mono text-sm text-ink-2 transition-colors hover:text-accent-ink`;

  return (
    <aside className={`bl-gleiten ${shellClass}`} style={shellStyle}>
      <header
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className={`flex items-center justify-between border-b border-black/10 px-3 py-2 ${
          floating ? 'cursor-move' : ''
        }`}
      >
        <span className="flex items-center gap-2 font-display text-sm text-ink">
          <CalcIcon className="inline h-4 w-4 align-[-2px] text-ink-2" /> Rechner
        </span>
        <span className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setFloating((f) => !f)}
            aria-label={floating ? 'andocken' : 'herauslösen'}
            title={floating ? 'andocken' : 'herauslösen'}
            className={headerButton}
          >
            ⤢
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Rechner schließen"
            className={headerButton}
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
