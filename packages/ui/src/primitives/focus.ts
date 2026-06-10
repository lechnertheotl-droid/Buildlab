// focus.ts — kanonischer Fokus-Ring + Fokus-Rückgabe/-Falle (DESIGN.md §4/§7).
// Der Ring ist DIE eine Quelle: 2-px-Akzent-Ring mit 2 px Offset, überall gleich.

import { useEffect, useRef, type RefObject } from 'react';

/** Der eine kanonische Fokus-Ring (DESIGN.md §4) — nie ad-hoc nachbauen. */
export const focusRing =
  'outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper';

/**
 * Trefffläche-Technik (DESIGN.md §4): Element bleibt visuell klein, die
 * unsichtbare Trefffläche wächst auf ≥ 44 px (Pseudo-Element, kein Layout-Shift).
 */
export const hitArea = "relative after:absolute after:-inset-2 after:content-['']";

/**
 * Merkt sich beim Öffnen das fokussierte Element und gibt den Fokus beim
 * Schließen dorthin zurück (Popover, Dialog, Drawer — DESIGN.md §7).
 */
export function useFocusReturn(open: boolean): void {
  const previous = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!open) return;
    previous.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return () => {
      previous.current?.focus();
      previous.current = null;
    };
  }, [open]);
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]';

/**
 * Hält den Fokus im Container — NUR für modale Dialoge (DESIGN.md §7:
 * leichte Popovers bekommen keine Falle). Beim Aktivieren springt der Fokus
 * hinein, Tab/Shift-Tab zirkulieren.
 */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const node = ref.current;
    if (!node) return;
    const focusables = () =>
      Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
    (focusables()[0] ?? node).focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        node.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement;
      if (e.shiftKey && (current === first || current === node)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && current === last) {
        e.preventDefault();
        first.focus();
      }
    };
    node.addEventListener('keydown', onKeyDown);
    return () => node.removeEventListener('keydown', onKeyDown);
  }, [ref, active]);
}
