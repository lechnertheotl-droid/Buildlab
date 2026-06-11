// TapExplain.tsx — die „Antippen erklärt"-Mechanik (SCREENS.md §8).
// Ein antippbarer Begriff/Variablensymbol öffnet ein kleines Popover:
// Symbol + Einheit, 1–2 Sätze, Voraussetzung, Link „tiefer eintauchen".
// Leichtes Popover ohne Fokus-Falle (DESIGN.md §7) — aber Esc gibt den
// Fokus an den Auslöser zurück.

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { formatUnit } from './units';
import { Latex } from './Latex';
import { useContent } from './content-context';
import { focusRing } from './primitives/focus';
import type { Concept, FormulaVariable } from './types';

function TapExplain({
  label,
  ariaLabel,
  children,
}: {
  label: ReactNode;
  /** Expliziter Accessible Name — KaTeX-Labels lesen sich sonst als „η\\etaη". */
  ariaLabel?: string;
  children: ReactNode | ((close: () => void) => ReactNode);
}) {
  const [open, setOpen] = useState(false);
  // Am rechten Bildschirmrand klappt das Popover nach links auf, statt aus dem
  // Viewport zu laufen (Befund B-23, 375-px-Geräte).
  const [alignRight, setAlignRight] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  const toggle = () => {
    if (!open && trigger.current) {
      const r = trigger.current.getBoundingClientRect();
      setAlignRight(r.left + 256 + 12 > window.innerWidth);
    }
    setOpen((o) => !o);
  };

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <span ref={ref} className="relative inline-block">
      <button
        ref={trigger}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label={ariaLabel}
        className={[
          'cursor-pointer rounded-[3px] px-[1px] underline decoration-dotted decoration-ink-faint underline-offset-2 transition-colors',
          focusRing,
          open ? 'text-accent-ink decoration-accent' : 'hover:text-accent-ink',
        ].join(' ')}
      >
        {label}
      </button>
      {open && (
        <span
          role="dialog"
          className={`animate-fade absolute top-full z-20 mt-2 block w-64 max-w-[calc(100vw-1.5rem)] rounded border border-black/10 bg-paper-3 p-3 text-left shadow-2 ${
            alignRight ? 'right-0' : 'left-0'
          }`}
        >
          {typeof children === 'function' ? children(() => setOpen(false)) : children}
        </span>
      )}
    </span>
  );
}

function PopoverHead({ title, symbol, unit }: { title: string; symbol?: string; unit?: string }) {
  return (
    <span className="mb-1 flex items-baseline gap-2">
      <span className="font-display text-base font-semibold text-ink">{title}</span>
      {symbol && <Latex className="text-sm text-accent-ink" src={symbol} />}
      {unit && unit !== '-' && (
        <span className="font-mono text-xs text-ink-faint">[{formatUnit(unit)}]</span>
      )}
    </span>
  );
}

/** Antippbarer Fachbegriff → Kurz-Popover aus concepts.json. */
export function ConceptChip({ id }: { id: string }) {
  const { concepts } = useContent();
  const c = concepts.get(id);
  if (!c) return <span className="font-mono text-xs text-ink-faint">{id}</span>;
  return (
    <TapExplain label={c.name}>
      {(close) => (
        <span className="block">
          <PopoverHead title={c.name} symbol={c.symbol} unit={c.unit} />
          <span className="block text-sm leading-snug text-ink-2">{c.short}</span>
          <Prerequisites concept={c} onNavigate={close} />
          <DeepDive conceptId={id} onNavigate={close} />
        </span>
      )}
    </TapExplain>
  );
}

/** Popover-Inhalt einer Variable (auch vom In-Formel-Antippen genutzt). */
export function VariablePopoverBody({ v }: { v: FormulaVariable }) {
  return (
    <span className="block">
      <PopoverHead title={v.name} symbol={v.symbol} unit={v.unit} />
      <span className="block text-sm leading-snug text-ink-2">{v.explanation}</span>
      {v.typicalRange && (
        <span className="mt-2 block font-mono text-xs text-ink-faint">
          typisch {fmt(v.typicalRange[0])}–{fmt(v.typicalRange[1])}
          {v.unit && v.unit !== '-' ? ` ${v.unit}` : ''}
        </span>
      )}
    </span>
  );
}

/** Antippbares Variablensymbol → Erklärung aus dem Formel-Objekt. */
export function VariableChip({ v }: { v: FormulaVariable }) {
  return (
    <TapExplain label={<Latex src={v.symbol} />} ariaLabel={`${v.name} — erklären`}>
      <VariablePopoverBody v={v} />
    </TapExplain>
  );
}

function Prerequisites({ concept, onNavigate }: { concept: Concept; onNavigate: () => void }) {
  const { concepts, onOpenConcept } = useContent();
  if (!concept.prerequisites.length) return null;
  return (
    <span className="mt-2 block text-xs text-ink-faint">
      ↳ baut auf:{' '}
      {concept.prerequisites.map((pid, idx) => {
        const p = concepts.get(pid);
        const name = p ? p.name : pid;
        return (
          <span key={pid}>
            {idx > 0 && ', '}
            {onOpenConcept ? (
              <button
                type="button"
                onClick={() => {
                  onNavigate();
                  onOpenConcept(pid);
                }}
                className={`text-ink-2 underline decoration-dotted decoration-ink-faint underline-offset-2 hover:text-accent-ink ${focusRing}`}
              >
                {name}
              </button>
            ) : (
              <span className="text-ink-2">{name}</span>
            )}
          </span>
        );
      })}
    </span>
  );
}

/** „tiefer eintauchen" → Konzept-Seite. Ohne Navigation-Callback unsichtbar. */
function DeepDive({ conceptId, onNavigate }: { conceptId: string; onNavigate: () => void }) {
  const { onOpenConcept } = useContent();
  if (!onOpenConcept) return null;
  return (
    <button
      type="button"
      onClick={() => {
        onNavigate();
        onOpenConcept(conceptId);
      }}
      className={`mt-2 block font-mono text-xs text-accent-ink underline decoration-black/20 underline-offset-4 transition-colors hover:text-ink ${focusRing}`}
    >
      tiefer eintauchen →
    </button>
  );
}

function fmt(n: number): string {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 4 }).format(n);
}
