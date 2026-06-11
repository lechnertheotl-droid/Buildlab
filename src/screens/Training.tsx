// src/screens/Training.tsx — Wiederholungsmodus (SCREENS.md §10, LERNMODELL §6):
// Karten-Stapel für fällige Konzepte; Aufgaben aus den Trainings-Pools und aus
// abgeschlossenen Projekten; Leitner-Buchung (Box ±1).

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Button, ContentProvider, EmptyState, ScreenSkeleton, TaskView, buttonClass,
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
    const drawn = dueConcepts(states)
      .slice(0, 10)
      .map((conceptId) => {
        const pool = tasksForConcept(conceptId, completedProjects);
        return {
          conceptId,
          task: pool.length ? pool[Math.floor(Math.random() * pool.length)] : null,
        };
      });
    return {
      cards: drawn.filter((e): e is { conceptId: string; task: TaskBlock } => e.task !== null),
      // Fällige Konzepte ohne Trainings-Pool nicht stillschweigend verschlucken —
      // der Screen sagt ehrlich, dass für sie noch Übungen fehlen (B-12).
      missingPool: drawn.filter((e) => e.task === null).map((e) => e.conceptId),
    };
    // bewusst nur beim ersten erfolgreichen Laden einfrieren
    // (sonst rutscht der Stapel unter dem Lernenden weg)
  }, [states === undefined, allProgress === undefined]);

  if (!states || !allProgress || session === null) {
    return <ScreenSkeleton layout="detail" />;
  }

  const { cards, missingPool } = session;
  const done = sessionIndex >= cards.length;
  const current = done ? null : cards[sessionIndex];

  const onResult = (conceptId: string, result: TaskResult) => {
    // LERNMODELL §3.1/§7.4: 1. Versuch ohne Hilfe → Box +1; mit Hilfe → Box −1;
    // gelöst im 2. Versuch → kein Box-Effekt (zählt aber als bearbeitet).
    const success = result.solved && !result.usedHelp && result.attempts <= 1;
    setResults((prev) => ({ ...prev, [conceptId]: success }));
    if (success || result.usedHelp) void applyTrainingOutcome(conceptId, success);
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-2 font-display text-display-sm text-ink-strong md:text-display">Training</h1>

      {missingPool.length > 0 && (
        <p className="mb-4 rounded border border-black/10 bg-paper-sink/60 p-3 text-sm text-ink-2">
          <span className="font-mono text-xs uppercase tracking-wider text-ink-faint">Hinweis · </span>
          {missingPool.length === 1 ? 'Ein fälliges Konzept hat' : `${missingPool.length} fällige Konzepte haben`}{' '}
          noch keine Übungsaufgaben (
          {missingPool.map((id) => conceptById.get(id)?.name ?? id).join(' · ')}
          ) — sie warten auf kommende Trainings-Pools und zählen nicht gegen dich.
        </p>
      )}

      {cards.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title="Nichts fällig. Dein Kopf ist auf Stand — bau lieber was."
            action={
              <Link to="/projekte" className={buttonClass()}>
                zu den Projekten →
              </Link>
            }
          />
        </div>
      ) : done ? (
        <div className="bl-gleiten mt-4 rounded-lg border border-black/10 bg-paper-2 p-6 shadow">
          <p className="font-display text-lead font-medium text-ink">
            Heute gefestigt:{' '}
            {cards.map((e) => conceptById.get(e.conceptId)?.name ?? e.conceptId).join(' · ')}
          </p>
          <ul className="mt-3 space-y-1 font-mono text-sm">
            {cards.map((e) => (
              <li key={e.conceptId} className="flex items-center gap-2">
                {/* Symbol trägt die Farbe, Text bleibt kontraststark (DESIGN.md §5). */}
                <span aria-hidden className={results[e.conceptId] ? 'text-ok' : 'text-warn'}>
                  {results[e.conceptId] ? '▲' : '▼'}
                </span>
                <span>{results[e.conceptId] ? 'Box rauf' : 'nochmal bald'}</span>
                <span className="text-ink-2">· {conceptById.get(e.conceptId)?.name}</span>
              </li>
            ))}
          </ul>
          <Link to="/" className={`mt-4 ${buttonClass({ variant: 'secondary' })}`}>
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
            Auffrischen · {sessionIndex + 1} von {cards.length} ·{' '}
            <Link
              to={`/konzept/${current.conceptId}`}
              className="text-accent-ink underline decoration-black/20 underline-offset-2 outline-none hover:decoration-current focus-visible:ring-2 focus-visible:ring-accent"
            >
              {conceptById.get(current.conceptId)?.name}
            </Link>
          </p>
          <div key={`${current.conceptId}-${sessionIndex}`} className="bl-gleiten">
            <TaskView
              block={current.task}
              onResult={(r) => onResult(current.conceptId, r)}
            />
          </div>
          <div className="mt-4 flex justify-between">
            <Button variant="ghost" onClick={() => setSessionIndex((i) => i + 1)}>
              überspringen
            </Button>
            {results[current.conceptId] !== undefined && (
              <Button onClick={() => setSessionIndex((i) => i + 1)}>nächste Karte ›</Button>
            )}
          </div>
        </ContentProvider>
      ) : null}
    </div>
  );
}
