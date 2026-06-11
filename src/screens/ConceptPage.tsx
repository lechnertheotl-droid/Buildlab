// src/screens/ConceptPage.tsx — Ruhige Lese-Seite je Konzept (SCREENS.md §7):
// alle drei Tiefen, zugehörige Formeln, „baut auf“-Kette, „kommt vor in“
// (aus content/_index.json), Mastery-Status.

import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BlockRenderer, SegmentedControl } from '@buildlab/ui';
import { conceptById, conceptIndex, projectById } from '../content';
import { useConceptStates, useSettings } from '../db/repo';
import type { Depth } from '../db/types';

const DEPTH_LABELS: { id: Depth; label: string }[] = [
  { id: 'playful', label: 'verspielt' },
  { id: 'practical', label: 'praxis' },
  { id: 'rigorous', label: 'genau' },
];

const DEPTH_KEY: Record<Depth, 'intuitive' | 'practical' | 'rigorous'> = {
  playful: 'intuitive',
  practical: 'practical',
  rigorous: 'rigorous',
};

const STATUS_LABEL: Record<string, string> = {
  neu: 'neu',
  gesehen: 'gesehen',
  angewendet: 'angewendet',
  sicher: 'sicher',
};

export default function ConceptPage() {
  const { id } = useParams();
  const settings = useSettings();
  const states = useConceptStates();
  const concept = id ? conceptById.get(id) : undefined;
  const [depth, setDepth] = useState<Depth | null>(null);

  if (!concept) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <p className="font-display text-xl">Hier ist nichts gezeichnet.</p>
        <Link to="/" className="mt-4 inline-block min-h-11 content-center text-sm text-accent-ink underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-accent">
          zur Projektkarte
        </Link>
      </div>
    );
  }

  const activeDepth = depth ?? settings?.depth ?? 'practical';
  const state = states?.[concept.id];
  const explanation =
    concept.explanation?.[DEPTH_KEY[activeDepth]] ??
    concept.explanation?.intuitive ??
    concept.short;
  const index = conceptIndex[concept.id];
  const occurrences = index
    ? [index.introducedIn, ...index.usedIn]
        .filter((r): r is { project: string; step: string } => r !== null)
        .filter((r, i, arr) => arr.findIndex((x) => x.project === r.project) === i)
    : [];

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="font-display text-display-sm text-ink-strong md:text-display">
          {concept.name}
        </h1>
        {concept.symbol && <span className="font-mono text-xl text-ink-2">{concept.symbol}</span>}
        {concept.unit && concept.unit !== '-' && (
          <span className="font-mono text-sm text-ink-faint">[{concept.unit}]</span>
        )}
        <span className="ml-auto rounded-sm border border-black/10 bg-paper-2 px-2 py-0.5 font-mono text-xs text-ink-2">
          {STATUS_LABEL[state?.status ?? 'neu']}
        </span>
      </div>

      <div className="mt-5">
        <SegmentedControl
          value={activeDepth}
          onChange={setDepth}
          options={DEPTH_LABELS}
          ariaLabel="Erklärtiefe"
        />
      </div>

      <p key={activeDepth} className="bl-wechsel mt-4 leading-relaxed">{explanation}</p>

      {(concept.relatedFormulas?.length ?? 0) > 0 && (
        <section aria-label="Formeln" className="mt-8">
          <h2 className="mb-2 font-mono text-xs uppercase tracking-widest text-ink-2">Formeln</h2>
          <div className="space-y-4">
            {concept.relatedFormulas!.map((fid) => (
              <BlockRenderer key={fid} block={{ type: 'formula', formulaId: fid }} />
            ))}
          </div>
        </section>
      )}

      {concept.prerequisites.length > 0 && (
        <section aria-label="Baut auf" className="mt-8">
          <h2 className="mb-2 font-mono text-xs uppercase tracking-widest text-ink-2">Baut auf</h2>
          <p className="flex flex-wrap gap-2">
            {concept.prerequisites.map((p) => (
              <Link
                key={p}
                to={`/konzept/${p}`}
                className="rounded-sm border border-black/10 bg-paper-2 px-3 py-1.5 text-sm text-accent-ink outline-none transition-colors hover:border-rule-strong focus-visible:ring-2 focus-visible:ring-accent"
              >
                {conceptById.get(p)?.name ?? p}
              </Link>
            ))}
          </p>
        </section>
      )}

      {occurrences.length > 0 && (
        <details className="mt-8">
          <summary className="mb-2 cursor-pointer font-mono text-xs uppercase tracking-widest text-ink-2 outline-none focus-visible:ring-2 focus-visible:ring-accent">
            Kommt vor in ({occurrences.length})
          </summary>
          <ul className="space-y-1">
            {occurrences.map((r) => {
              const project = projectById.get(r.project);
              // Direkt zum Schritt — ist er noch gesperrt, leitet der
              // Workspace zur Projektkarte um (sie erklärt die Sperre).
              const stepIndex = project?.steps.findIndex((s) => s.id === r.step) ?? -1;
              const to =
                stepIndex >= 0 ? `/projekt/${r.project}/schritt/${stepIndex + 1}` : '/';
              return (
                <li key={r.project}>
                  <Link
                    to={to}
                    className="flex min-h-11 items-center gap-2 rounded px-2 outline-none hover:bg-paper-2 focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <span aria-hidden className="font-mono">{project?.icon}</span>
                    <span>{project?.title ?? r.project}</span>
                    {index?.introducedIn?.project === r.project && (
                      <span className="ml-auto font-mono text-xs text-ink-faint">führt ein</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </div>
  );
}
