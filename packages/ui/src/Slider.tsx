// Slider.tsx — das zentrale Interaktions-Element (DESIGN.md: Tick-Marks an der
// Schiene, aktueller Wert in Mono am Griff, Live-Feedback ohne Verzögerung).

import { useId } from 'react';
import { focusRing, hitArea } from './primitives/focus';

function fmt(n: number): string {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 3 }).format(n);
}

// Sichtbar 28 px, Trefffläche ≥ 44 px (hitArea-Technik, DESIGN.md §4).
const stepperClass = `${hitArea} ${focusRing} h-7 w-7 shrink-0 rounded border border-black/10 font-mono text-xs leading-none text-ink-2 transition-colors hover:border-rule-strong active:translate-y-px`;

export function Slider({
  label,
  symbol,
  value,
  min,
  max,
  step,
  unit,
  ticks = 8,
  onChange,
}: {
  label: string;
  symbol?: React.ReactNode;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  ticks?: number;
  onChange: (v: number) => void;
}) {
  const id = useId();
  const span = max - min || 1;
  const pct = ((value - min) / span) * 100;
  const tickValues = Array.from({ length: ticks + 1 }, (_, i) => min + (span * i) / ticks);

  return (
    <div className="select-none">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="flex items-baseline gap-2 text-sm text-ink-2">
          {symbol && <span className="font-mono text-accent-ink">{symbol}</span>}
          <span>{label}</span>
        </label>
        <span className="font-mono text-sm tabular-nums text-ink">
          {fmt(value)}
          {unit && unit !== '-' ? <span className="text-ink-faint"> {unit}</span> : null}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-1.5">
        {/* −/+-Stepper: Feinjustage für Touch & Tastatur (DESIGN.md §4). */}
        <button
          type="button"
          aria-label={`${label} verringern`}
          onClick={() => onChange(Math.max(min, Math.round((value - step) / step) * step))}
          className={stepperClass}
        >
          −
        </button>
        <div className="relative min-w-0 flex-1">
          {/* Tick-Marks an der Schiene — wie an einem Lineal (DESIGN.md). */}
          <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-between px-[2px]">
            {tickValues.map((_, i) => (
              <span key={i} className="h-2 w-px bg-ink-faint/40" />
            ))}
          </div>
          {/* Aktive Spur bis zum Griff. */}
          <div className="pointer-events-none absolute left-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-accent/70" style={{ width: `${pct}%` }} />
          <input
            id={id}
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            aria-valuetext={`${fmt(value)}${unit && unit !== '-' ? ` ${unit}` : ''}`}
            className="bl-range relative z-10 w-full cursor-pointer appearance-none bg-transparent"
          />
        </div>
        <button
          type="button"
          aria-label={`${label} erhöhen`}
          onClick={() => onChange(Math.min(max, Math.round((value + step) / step) * step))}
          className={stepperClass}
        >
          +
        </button>
      </div>
    </div>
  );
}
