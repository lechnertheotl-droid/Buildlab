// TapExplain.tsx — die „Antippen erklärt"-Mechanik (SCREENS.md §8).
// Ein antippbarer Begriff/Variablensymbol öffnet ein kleines Popover:
// Symbol + Einheit, 1–2 Sätze, Voraussetzung, Link „tiefer eintauchen".

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Latex } from './Latex';
import { useContent } from './content-context';
import type { Concept, FormulaVariable } from './types';

function TapExplain({ label, children }: { label: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
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
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={[
          'cursor-pointer rounded-[3px] px-[1px] underline decoration-dotted decoration-ink-faint underline-offset-2 transition-colors',
          open ? 'text-accent-ink decoration-accent' : 'hover:text-accent-ink',
        ].join(' ')}
      >
        {label}
      </button>
      {open && (
        <span
          role="dialog"
          className="animate-fade absolute left-0 top-full z-20 mt-2 block w-64 rounded border border-black/10 bg-paper-2 p-3 text-left shadow"
        >
          {children}
        </span>
      )}
    </span>
  );
}

function PopoverHead({ title, symbol, unit }: { title: string; symbol?: string; unit?: string }) {
  return (
    <span className="mb-1 flex items-baseline gap-2">
      <span className="font-display text-sm font-medium text-ink">{title}</span>
      {symbol && <Latex className="text-sm text-accent-ink" src={symbol} />}
      {unit && unit !== '-' && (
        <span className="font-mono text-xs text-ink-faint">[{unit}]</span>
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
      <span className="block">
        <PopoverHead title={c.name} symbol={c.symbol} unit={c.unit} />
        <span className="block text-sm leading-snug text-ink-2">{c.short}</span>
        <Prerequisites concept={c} />
        <DeepDive />
      </span>
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
    <TapExplain label={<Latex src={v.symbol} />}>
      <VariablePopoverBody v={v} />
    </TapExplain>
  );
}

function Prerequisites({ concept }: { concept: Concept }) {
  const { concepts } = useContent();
  if (!concept.prerequisites.length) return null;
  return (
    <span className="mt-2 block text-xs text-ink-faint">
      ↳ baut auf:{' '}
      {concept.prerequisites.map((pid, idx) => {
        const p = concepts.get(pid);
        return (
          <span key={pid}>
            {idx > 0 && ', '}
            <span className="text-ink-2">{p ? p.name : pid}</span>
          </span>
        );
      })}
    </span>
  );
}

function DeepDive() {
  // Konzept-Seite folgt in Phase 6; der Link ist hier bereits als Affordance da.
  return (
    <span
      className="mt-2 block cursor-default font-mono text-xs text-accent-ink/70"
      title="Konzept-Seite folgt in einer späteren Phase"
    >
      tiefer eintauchen →
    </span>
  );
}

function fmt(n: number): string {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 4 }).format(n);
}
