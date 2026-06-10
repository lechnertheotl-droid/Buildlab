// src/screens/SkillMap.tsx — Concept-Graph als geschichtete Karte
// (SCREENS.md §8). V1: statisches SVG-Layout aus content/skillmap.layout.json,
// Knoten-Zustand aus conceptState; mobile: vertikal scrollende Gruppen-Listen.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { conceptById, conceptIndex, concepts, projectById, skillmapLayout } from '../content';
import { useConceptStates } from '../db/repo';
import type { ConceptStateEntry } from '../db/types';

const today = () => new Date().toISOString();

function nodeState(s?: ConceptStateEntry) {
  const status = s?.status ?? 'neu';
  const due = s?.due !== null && s?.due !== undefined && s.due <= today();
  return { status, due };
}

const STATUS_LABEL: Record<string, string> = {
  neu: 'neu',
  gesehen: 'gesehen',
  angewendet: 'angewendet',
  sicher: 'sicher',
};

function NodeCircle({ status }: { status: string }) {
  switch (status) {
    case 'sicher':
      return <circle r="14" fill="var(--accent)" stroke="var(--ink)" strokeOpacity="0.3" />;
    case 'angewendet':
      return (
        <>
          <circle r="14" fill="var(--paper-2)" stroke="var(--accent)" strokeWidth="2" />
          <path d="M -14 0 A 14 14 0 0 1 14 0 Z" fill="var(--accent)" opacity="0.5" />
        </>
      );
    case 'gesehen':
      return <circle r="14" fill="var(--paper-2)" stroke="var(--accent)" strokeWidth="2" />;
    default:
      return <circle r="14" fill="var(--paper-2)" stroke="var(--ink-faint)" strokeDasharray="3 3" />;
  }
}

export default function SkillMap() {
  const states = useConceptStates();
  const [selected, setSelected] = useState<string | null>(null);
  if (!states) return <div className="p-8 font-mono text-sm text-ink-faint">lädt …</div>;

  const anySeen = Object.values(states).some((s) => s.status !== 'neu');
  const nodePos = new Map(skillmapLayout.nodes.map((n) => [n.conceptId, n]));
  const sel = selected ? conceptById.get(selected) : undefined;
  const selState = selected ? nodeState(states[selected]) : null;
  const selIndex = selected ? conceptIndex[selected] : undefined;

  const edges = concepts.flatMap((c) =>
    c.prerequisites
      .filter((p) => nodePos.has(p) && nodePos.has(c.id))
      .map((p) => ({ from: nodePos.get(p)!, to: nodePos.get(c.id)! })),
  );

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="mb-2 font-display text-2xl">Skill-Map</h1>
      {!anySeen && (
        <p className="mb-4 rounded border border-black/10 bg-paper-2 p-3 text-sm text-ink-2 shadow">
          Deine Karte ist noch unbeschriftet — das erste Projekt zeichnet die ersten Knoten ein.
        </p>
      )}

      {/* Desktop: SVG-Karte */}
      <div className="hidden md:block">
        <svg viewBox="0 0 1000 600" className="w-full rounded border border-black/10 bg-paper-2 shadow" role="img" aria-label="Skill-Map: Konzepte und ihre Voraussetzungen">
          {skillmapLayout.groups.map((g) => (
            <text key={g.id} x={g.x} y={g.y} className="fill-[color:var(--ink-faint)] font-mono" fontSize="13" style={{ textTransform: 'uppercase', letterSpacing: '0.15em' }}>
              {g.label}
            </text>
          ))}
          {edges.map((e, i) => (
            <line key={i} x1={e.from.x} y1={e.from.y} x2={e.to.x} y2={e.to.y} stroke="var(--ink-faint)" strokeOpacity="0.4" />
          ))}
          {skillmapLayout.nodes.map((n) => {
            const c = conceptById.get(n.conceptId);
            if (!c) return null;
            const { status, due } = nodeState(states[n.conceptId]);
            return (
              <g key={n.conceptId} transform={`translate(${n.x} ${n.y})`}>
                <g
                  role="button"
                  tabIndex={0}
                  aria-label={`${c.name}: ${STATUS_LABEL[status]}${due ? ', auffrischen' : ''}`}
                  className="cursor-pointer outline-none [&:focus-visible>circle:first-of-type]:stroke-[var(--accent)]"
                  onClick={() => setSelected(n.conceptId)}
                  onKeyDown={(ev) => (ev.key === 'Enter' || ev.key === ' ') && setSelected(n.conceptId)}
                >
                  <circle r="22" fill="transparent" />
                  <NodeCircle status={status} />
                  {due && (
                    <g transform="translate(11 -11)">
                      <circle r="7" fill="var(--paper)" stroke="var(--accent)" />
                      <text textAnchor="middle" dy="3.5" fontSize="9" fill="var(--accent-ink)">⟳</text>
                    </g>
                  )}
                </g>
                <text textAnchor="middle" y="30" fontSize="11" className="fill-[color:var(--ink-2)] font-mono">
                  {c.name.length > 18 ? `${c.name.slice(0, 17)}…` : c.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Mobile: Gruppen-Listen */}
      <div className="space-y-6 md:hidden">
        {skillmapLayout.groups.map((g) => (
          <section key={g.id} aria-label={g.label}>
            <h2 className="mb-2 border-b border-black/10 pb-1 font-mono text-xs uppercase tracking-widest text-ink-2">{g.label}</h2>
            <ul className="space-y-1">
              {concepts.filter((c) => c.group === g.id).map((c) => {
                const { status, due } = nodeState(states[c.id]);
                return (
                  <li key={c.id}>
                    <button
                      onClick={() => setSelected(c.id)}
                      className="flex min-h-11 w-full items-center gap-3 rounded px-2 text-left outline-none hover:bg-paper-2 focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      <svg viewBox="-16 -16 32 32" className="h-6 w-6"><NodeCircle status={status} /></svg>
                      <span>{c.name}</span>
                      <span className="ml-auto font-mono text-xs text-ink-faint">
                        {due ? 'auffrischen' : STATUS_LABEL[status]}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      {/* Auswahl-Karte */}
      {sel && (
        <div role="dialog" aria-label={sel.name} className="mt-4 rounded border border-black/10 bg-paper-2 p-4 shadow">
          <div className="flex items-baseline gap-3">
            <h2 className="font-display text-lg">{sel.name}</h2>
            {sel.symbol && <span className="font-mono text-sm text-ink-2">{sel.symbol}</span>}
            {sel.unit && sel.unit !== '-' && <span className="font-mono text-xs text-ink-faint">[{sel.unit}]</span>}
            <span className="ml-auto font-mono text-xs text-ink-2">{STATUS_LABEL[selState!.status]}{selState!.due ? ' · auffrischen' : ''}</span>
          </div>
          <p className="mt-2 text-sm text-ink-2">{sel.short}</p>
          {sel.prerequisites.length > 0 && (
            <p className="mt-2 text-sm">
              <span className="font-mono text-xs uppercase tracking-wider text-ink-faint">braucht: </span>
              {sel.prerequisites.map((p, i) => (
                <span key={p}>
                  {i > 0 && ' · '}
                  <button onClick={() => setSelected(p)} className="text-accent-ink underline decoration-black/20 underline-offset-2 outline-none hover:decoration-current focus-visible:ring-2 focus-visible:ring-accent">
                    {conceptById.get(p)?.name ?? p}
                  </button>
                </span>
              ))}
            </p>
          )}
          {selIndex && (selIndex.introducedIn || selIndex.usedIn.length > 0) && (
            <p className="mt-1 text-sm">
              <span className="font-mono text-xs uppercase tracking-wider text-ink-faint">kommt vor in: </span>
              {[selIndex.introducedIn, ...selIndex.usedIn]
                .filter((r): r is { project: string; step: string } => r !== null)
                .filter((r, i, arr) => arr.findIndex((x) => x.project === r.project) === i)
                .map((r, i) => (
                  <span key={r.project}>
                    {i > 0 && ' · '}
                    <Link to={`/projekt/${r.project}`} className="text-accent-ink underline decoration-black/20 underline-offset-2 outline-none hover:decoration-current focus-visible:ring-2 focus-visible:ring-accent">
                      {projectById.get(r.project)?.title ?? r.project}
                    </Link>
                  </span>
                ))}
            </p>
          )}
          <div className="mt-3 flex gap-3">
            <Link
              to={`/konzept/${sel.id}`}
              className="inline-flex min-h-11 items-center rounded border border-black/10 px-4 text-sm outline-none hover:border-ink-2 focus-visible:ring-2 focus-visible:ring-accent active:translate-y-px"
            >
              Konzept öffnen →
            </Link>
            <button onClick={() => setSelected(null)} className="min-h-11 text-sm text-ink-2 outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-accent">
              schließen
            </button>
          </div>
        </div>
      )}

      <details className="mt-4 text-xs text-ink-faint">
        <summary className="cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-accent">Legende</summary>
        <p className="mt-1">blass gestrichelt = neu · Ring = gesehen · halb gefüllt = angewendet · gefüllt = sicher · ⟳ = auffrischen fällig</p>
      </details>
    </div>
  );
}
