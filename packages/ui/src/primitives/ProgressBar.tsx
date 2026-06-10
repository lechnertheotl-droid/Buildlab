// ProgressBar.tsx — Fortschrittsbalken mit Motion „fuellen" (DESIGN.md §8):
// füllt beim ersten Rendern zur Ist-Position, danach keine Animation.

export interface ProgressBarProps {
  /** Anteil 0–1 oder Wert relativ zu max. */
  value: number;
  max?: number;
  label: string;
  className?: string;
}

export function ProgressBar({ value, max = 1, label, className = '' }: ProgressBarProps) {
  const frac = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label={label}
      className={`h-1.5 overflow-hidden rounded-full bg-paper-deep ${className}`}
    >
      <div
        className="bl-fuellen h-full rounded-full bg-accent"
        style={{ width: `${frac * 100}%` }}
      />
    </div>
  );
}
