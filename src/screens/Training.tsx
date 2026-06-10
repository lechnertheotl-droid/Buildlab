// src/screens/Training.tsx — Wiederholungsmodus (SCREENS.md §10, LERNMODELL §6):
// Karten-Stapel für fällige Konzepte; Aufgaben aus den Trainings-Pools und aus
// abgeschlossenen Projekten; Leitner-Buchung (Box ±1).

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ContentProvider, TaskView,
  type Concept, type Formula, type TaskBlock, type TaskResult,
} from '@buildlab/ui';
import {
  componentIds, conceptById, concepts, formulas, projects, trainingPools,
} from '../content';
import { applyTrainingOutcome, dueConcepts, useAllProgress, useConceptStates } from '../db/repo';

/** Aufgaben-Quellen je Konzept (LERNMODELL §6.2): Pools zuerst, dann Projekte. */
function tasksForConcept(conceptId: string, completedProjects: Set<string>): TaskBlock[] {
  const fromPools = trainingPools.flatMap((pool) =>
    (pool.tasks as unknown as TaskBlock[]).filter((t) => t.concepts.includes(conceptId)),
  );
  const fromProjects = projects
    .filter((p) => completedProjects.has(p.id))
    .flatMap((p) =>
      p.steps.flatMap((s) =>
        (s.blocks as unknown as { type: string }[]).filter(
          (b): b is TaskBlock =>
            b.type === 'task' && (b as TaskBlock).concepts.includes(conceptId),
        ),
      ),
    );
  return [...fromPools, ...fromProjects];
}

export default function Training() {
  const states = useConceptStates();
  const allProgress = useAllProgress();
  const [sessionIndex, setSessionIndex] = useState(0);
  const [results, setResults] = useState<Record<string, boolean>>({});

  // Session-Auswahl einmal einfrieren (max. 10, am längsten fällig zuerst).
  const session = useMemo(() => {
    if (!states || !allProgress) return null;
    const completedProjects = new Set(
      Object.entries(allProgress)
        .filter(([, p]) => p.completedAt)
        .map(([pid]) => pid),
    );
    return dueConcepts(states)
      .slice(0, 10)
      .map((conceptId) => {
        const pool = tasksForConcept(conceptId, completedProjects);
        return {
          conceptId,
          task: pool.length ? pool[Math.floor(Math.random() * pool.length)] : null,
        };
      })
      .filter((e): e is { conceptId: string; task: TaskBlock } => e.task !== null);
    // bewusst nur beim ersten erfolgreichen Laden einfrieren
    // (sonst rutscht der Stapel unter dem Lernenden weg)
  }, [states === undefined, allProgress === undefined]);

  if (!states || !allProgress || session === null) {
    return <div className="p-8 font-mono text-sm text-ink-faint">lädt …</div>;
  }

  const done = sessionIndex >= session.length;
  const current = done ? null : session[sessionIndex];

  const onResult = (conceptId: string, result: TaskResult) => {
    // LERNMODELL §3.1/§7.4: 1. Versuch ohne Hilfe → Box +1; mit Hilfe → Box −1;
    // gelöst im 2. Versuch → kein Box-Effekt (zählt aber als bearbeitet).
    const success = result.solved && !result.usedHelp && result.attempts <= 1;
    setResults((prev) => ({ ...prev, [conceptId]: success }));
    if (success || result.usedHelp) void applyTrainingOutcome(conceptId, success);
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-2 font-display text-2xl">Training</h1>

      {session.length === 0 ? (
        <div className="mt-4 rounded border border-black/10 bg-paper-2 p-6 text-center shadow">
          <p className="font-display text-lg">Nichts fällig. Dein Kopf ist auf Stand — bau lieber was.</p>
          <Link
            to="/projekte"
            className="mt-4 inline-flex min-h-11 items-center rounded bg-accent px-5 text-sm text-paper outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper active:translate-y-px"
          >
            zu den Projekten →
          </Link>
        </div>
      ) : done ? (
        <div className="mt-4 rounded border border-black/10 bg-paper-2 p-6 shadow">
          <p className="font-display text-lg">
            Heute gefestigt:{' '}
            {session.map((e) => conceptById.get(e.conceptId)?.name ?? e.conceptId).join(' · ')}
          </p>
          <ul className="mt-3 space-y-1 font-mono text-sm">
            {session.map((e) => (
              <li key={e.conceptId} className="flex items-center gap-2">
                <span className={results[e.conceptId] ? 'text-[color:var(--ok)]' : 'text-[color:var(--warn)]'}>
                  {results[e.conceptId] ? '▲ Box rauf' : '▼ nochmal bald'}
                </span>
                <span className="text-ink-2">{conceptById.get(e.conceptId)?.name}</span>
              </li>
            ))}
          </ul>
          <Link
            to="/"
            className="mt-4 inline-flex min-h-11 items-center rounded border border-black/10 px-4 text-sm outline-none hover:border-ink-2 focus-visible:ring-2 focus-visible:ring-accent"
          >
            zum Start →
          </Link>
        </div>
      ) : current ? (
        <ContentProvider
          formulas={formulas as unknown as Formula[]}
          concepts={concepts as unknown as Concept[]}
          componentIds={componentIds}
        >
          <p className="mb-4 font-mono text-xs uppercase tracking-widest text-ink-faint">
            Auffrischen · {sessionIndex + 1} von {session.length} ·{' '}
            <Link
              to={`/konzept/${current.conceptId}`}
              className="text-accent-ink underline decoration-black/20 underline-offset-2 outline-none hover:decoration-current focus-visible:ring-2 focus-visible:ring-accent"
            >
              {conceptById.get(current.conceptId)?.name}
            </Link>{' '}
            <span aria-hidden>⟳</span> Box {states[current.conceptId]?.box ?? 1}
          </p>
          <div key={`${current.conceptId}-${sessionIndex}`} className="bl-wechsel">
            <TaskView
              block={current.task}
              onResult={(r) => onResult(current.conceptId, r)}
            />
          </div>
          <div className="mt-4 flex justify-between">
            <button
              onClick={() => setSessionIndex((i) => i + 1)}
              className="min-h-11 rounded px-3 text-sm text-ink-faint outline-none hover:text-ink-2 focus-visible:ring-2 focus-visible:ring-accent"
            >
              überspringen
            </button>
            {results[current.conceptId] !== undefined && (
              <button
                onClick={() => setSessionIndex((i) => i + 1)}
                className="min-h-11 rounded bg-accent px-5 text-sm text-paper outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper active:translate-y-px"
              >
                nächste Karte ›
              </button>
            )}
          </div>
        </ContentProvider>
      ) : null}
    </div>
  );
}
