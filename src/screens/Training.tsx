// src/screens/Training.tsx — Wiederholungsmodus (SCREENS.md §10, LERNMODELL §6).
// ÜBERGANGSSTAND (Phase R4-Wiring folgt): zeigt die fälligen Konzepte als
// Liste; die Inline-Aufgaben kommen mit den Task-Renderern.

import { Link } from 'react-router-dom';
import { conceptById } from '../content';
import { dueConcepts, useConceptStates } from '../db/repo';

export default function Training() {
  const states = useConceptStates();
  if (!states) return <div className="p-8 font-mono text-sm text-ink-faint">lädt …</div>;

  const due = dueConcepts(states).slice(0, 10);

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-6 font-display text-2xl">Training</h1>
      {due.length === 0 ? (
        <div className="rounded border border-black/10 bg-paper-2 p-6 text-center shadow">
          <p className="font-display text-lg">Nichts fällig. Dein Kopf ist auf Stand — bau lieber was.</p>
          <Link
            to="/projekte"
            className="mt-4 inline-flex min-h-11 items-center rounded bg-accent px-5 text-sm text-paper outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper active:translate-y-px"
          >
            zu den Projekten →
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {due.map((id) => {
            const c = conceptById.get(id);
            const s = states[id];
            return (
              <li key={id} className="rounded border border-black/10 bg-paper-2 p-4 shadow">
                <p className="flex items-baseline gap-3">
                  <Link to={`/konzept/${id}`} className="font-display outline-none hover:underline focus-visible:ring-2 focus-visible:ring-accent">
                    {c?.name ?? id}
                  </Link>
                  <span className="ml-auto font-mono text-xs text-ink-2">⟳ Box {s.box}</span>
                </p>
                <p className="mt-1 text-sm text-ink-2">{c?.short}</p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
