// src/screens/ProjectList.tsx — Curriculum-Überblick (SCREENS.md §5.1):
// vier Niveau-Sektionen, Statuskarten, Soft-Lock nur als Optik (immer antippbar).

import { Link } from 'react-router-dom';
import { ScreenSkeleton, StatusBadge } from '@buildlab/ui';
import { projects, projectStatus, recommendNext, type ProjectMeta, type ProjectStatus } from '../content';
import { useAllProgress, useConceptStates } from '../db/repo';
import type { ProjectProgress } from '../db/types';

const LEVEL_LABELS: Record<number, string> = {
  1: 'Niveau 1 — Grundlagen',
  2: 'Niveau 2 — Aufbau',
  3: 'Niveau 3 — Vertiefung',
  4: 'Niveau 4 — Meisterstück',
};

// Lineal-Ticks (DESIGN.md §3) — mobil kompakter, aber sichtbar (SCREENS.md §5.1).
function Difficulty({ value }: { value?: number }) {
  if (!value) return null;
  return (
    <span
      className="font-mono text-[10px] text-ink-faint md:text-xs"
      aria-label={`Schwierigkeit ${value} von 5`}
    >
      {'●'.repeat(value)}
      {'○'.repeat(5 - value)}
    </span>
  );
}

// Hinweis-Dreieck (gezeichnet, kein Emoji — DESIGN.md §9) für den Soft-Lock:
// ein Schloss würde „gesperrt" signalisieren, dabei ist es nur eine Empfehlung.
function HintGlyph() {
  return (
    <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden="true">
      <path d="M6 1.8 L11 10.2 H1 Z" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
      <line x1="6" y1="5" x2="6" y2="7.2" stroke="currentColor" strokeWidth="1.1" />
      <circle cx="6" cy="8.8" r="0.55" fill="currentColor" stroke="none" />
    </svg>
  );
}

function StatusLine({ status, progress, total }: { status: ProjectStatus; progress?: ProjectProgress; total: number }) {
  switch (status) {
    case 'fertig':
      return <span className="font-mono text-xs text-ok">✓ fertig</span>;
    case 'begonnen':
      return (
        <span className="flex items-center gap-2">
          <span className="h-1 w-16 rounded bg-paper-deep">
            <span className="block h-full rounded bg-accent" style={{ width: `${((progress?.stepsDone.length ?? 0) / total) * 100}%` }} />
          </span>
          <span className="font-mono text-xs text-ink-2">begonnen</span>
        </span>
      );
    case 'empfohlen':
      return (
        <StatusBadge tone="accent" className="uppercase tracking-wider">
          empfohlen
        </StatusBadge>
      );
    case 'voraussetzung':
      return (
        <span className="inline-flex items-center gap-1.5 font-mono text-xs text-warn">
          <HintGlyph />
          Voraussetzung offen
        </span>
      );
    default:
      return <span className="font-mono text-xs text-ink-faint">offen</span>;
  }
}

export default function ProjectList() {
  const allProgress = useAllProgress();
  const conceptStates = useConceptStates();
  if (!allProgress || !conceptStates) {
    return <ScreenSkeleton layout="list" />;
  }

  const mastered = new Set(
    Object.entries(conceptStates)
      .filter(([, s]) => s.status === 'angewendet' || s.status === 'sicher')
      .map(([id]) => id),
  );
  const recommended = recommendNext(allProgress, mastered)?.id ?? null;

  const byLevel = new Map<number, ProjectMeta[]>();
  for (const p of projects) {
    byLevel.set(p.level, [...(byLevel.get(p.level) ?? []), p]);
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-6 font-display text-display-sm text-ink-strong md:text-display">Projekte</h1>
      {[...byLevel.entries()].map(([level, list], si) => (
        <section
          key={level}
          aria-label={LEVEL_LABELS[level]}
          className={`bl-einzeichnen mb-8 ${si > 0 ? `bl-einzeichnen-d${Math.min(si, 3)}` : ''}`}
        >
          <h2 className="mb-3 border-b border-black/10 pb-1 font-mono text-xs uppercase tracking-widest text-ink-2">
            <span aria-hidden className="mr-2 inline-block h-2.5 w-0.5 bg-accent align-[-2px]" />
            {LEVEL_LABELS[level] ?? `Niveau ${level}`}
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {list.map((p) => {
              const status = projectStatus(p, allProgress, recommended);
              return (
                <Link
                  key={p.id}
                  to={`/projekt/${p.id}`}
                  className={`rounded border border-black/10 bg-paper-2 p-4 shadow outline-none transition hover:-translate-y-px hover:border-rule-strong focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper active:translate-y-px active:shadow-none`}
                >
                  <p className="font-display">
                    <span aria-hidden className="mr-2 font-mono">{p.icon}</span>
                    {p.title}
                  </p>
                  <p className="mt-1 flex items-center gap-3 font-mono text-xs text-ink-2">
                    ~{p.durationMin ?? '?'} min
                    <Difficulty value={p.difficulty} />
                  </p>
                  <p className="mt-2">
                    <StatusLine status={status} progress={allProgress[p.id]} total={p.steps.length} />
                  </p>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
