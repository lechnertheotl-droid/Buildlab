// src/screens/ProjectList.tsx — Curriculum-Überblick (SCREENS.md §5.1):
// vier Niveau-Sektionen, Statuskarten, Soft-Lock nur als Optik (immer antippbar).

import { Link } from 'react-router-dom';
import { projects, projectStatus, recommendNext, type ProjectMeta, type ProjectStatus } from '../content';
import { useAllProgress, useConceptStates } from '../db/repo';
import type { ProjectProgress } from '../db/types';

const LEVEL_LABELS: Record<number, string> = {
  1: 'Niveau 1 — Grundlagen',
  2: 'Niveau 2 — Aufbau',
  3: 'Niveau 3 — Vertiefung',
  4: 'Niveau 4 — Meisterstück',
};

// Mobil ausgeblendet (SCREENS.md §5.1): auf schmalen Karten zählt der Status.
function Difficulty({ value }: { value?: number }) {
  if (!value) return null;
  return (
    <span className="hidden font-mono text-xs text-ink-faint md:inline" aria-label={`Schwierigkeit ${value} von 5`}>
      {'●'.repeat(value)}
      {'○'.repeat(5 - value)}
    </span>
  );
}

function StatusLine({ status, progress, total }: { status: ProjectStatus; progress?: ProjectProgress; total: number }) {
  switch (status) {
    case 'fertig':
      return <span className="font-mono text-xs text-[color:var(--viz-low)]">✓ fertig</span>;
    case 'begonnen':
      return (
        <span className="flex items-center gap-2">
          <span className="h-1 w-16 rounded bg-paper-sink">
            <span className="block h-full rounded bg-accent" style={{ width: `${((progress?.stepsDone.length ?? 0) / total) * 100}%` }} />
          </span>
          <span className="font-mono text-xs text-ink-2">begonnen</span>
        </span>
      );
    case 'empfohlen':
      return <span className="rounded border border-black/10 bg-paper px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-accent-ink">empfohlen</span>;
    case 'voraussetzung':
      return <span className="font-mono text-xs text-ink-faint">Voraussetzung offen</span>;
    default:
      return <span className="font-mono text-xs text-ink-faint">offen</span>;
  }
}

export default function ProjectList() {
  const allProgress = useAllProgress();
  const conceptStates = useConceptStates();
  if (!allProgress || !conceptStates) {
    return <div className="p-8 font-mono text-sm text-ink-faint">lädt …</div>;
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
      <h1 className="mb-6 font-display text-2xl">Projekte</h1>
      {[...byLevel.entries()].map(([level, list]) => (
        <section key={level} aria-label={LEVEL_LABELS[level]} className="mb-8">
          <h2 className="mb-3 border-b border-black/10 pb-1 font-mono text-xs uppercase tracking-widest text-ink-2">
            {LEVEL_LABELS[level] ?? `Niveau ${level}`}
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {list.map((p) => {
              const status = projectStatus(p, allProgress, recommended);
              const soft = status === 'voraussetzung';
              return (
                <Link
                  key={p.id}
                  to={`/projekt/${p.id}`}
                  className={`rounded border border-black/10 bg-paper-2 p-4 shadow outline-none transition hover:border-ink-2 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper active:translate-y-px ${
                    soft ? 'opacity-60' : ''
                  }`}
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
