// SegmentedControl.tsx — die eine segmentierte Auswahl (DESIGN.md §4:
// Tiefen-Umschalter-Muster). Echte Radiogroup-Semantik mit Roving-Tabindex:
// genau ein Tab-Stopp, ←/→ bewegen Auswahl und Fokus gemeinsam
// (selection follows focus).

import { useRef } from 'react';
import { focusRing } from './focus';

export interface SegmentedOption<T extends string> {
  id: T;
  label: string;
  title?: string;
}

export interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (id: T) => void;
  options: SegmentedOption<T>[];
  ariaLabel: string;
  /** Aktiver Tab als Outline statt Füllung (lokale Abweichung, DESIGN.md §4). */
  outlineActive?: boolean;
  size?: 'md' | 'sm';
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  outlineActive = false,
  size = 'md',
}: SegmentedControlProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const hasActive = options.some((o) => o.id === value);
  const move = (from: number, delta: number) => {
    const next = (from + delta + options.length) % options.length;
    refs.current[next]?.focus();
    onChange(options[next].id);
  };
  const sizeClass = size === 'sm' ? 'min-h-9 px-3 text-xs' : 'min-h-11 px-4 text-sm';
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex divide-x divide-black/10 overflow-hidden rounded border border-black/10 bg-paper-2"
    >
      {options.map((o, i) => {
        const active = o.id === value;
        const tabbable = active || (!hasActive && i === 0);
        return (
          <button
            key={o.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={tabbable ? 0 : -1}
            title={o.title}
            onClick={() => onChange(o.id)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                move(i, 1);
              } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                move(i, -1);
              }
            }}
            className={`${focusRing} ${sizeClass} font-mono transition-colors duration-150 ${
              active
                ? outlineActive
                  ? 'shadow-[inset_0_0_0_2px_var(--accent)] text-accent-ink'
                  : 'bg-accent text-paper'
                : 'text-ink-2 hover:bg-paper-3 hover:text-ink'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
