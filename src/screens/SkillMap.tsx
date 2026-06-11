// src/screens/SkillMap.tsx — Concept-Graph als geschichtete Karte
// (SCREENS.md §8). V1: statisches SVG-Layout aus content/skillmap.layout.json,
// Knoten-Zustand aus conceptState; mobile: vertikal scrollende Gruppen-Listen.
// Fokus: expliziter Fokus-Kreis je Knoten; die Auswahl-Karte fängt den Fokus
// beim Öffnen und gibt ihn beim Schließen an den Knoten zurück (DESIGN.md §7).

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatUnit, Button, EmptyState, ScreenSkeleton, buttonClass } from '@buildlab/ui';
import { conceptById, concepts, skillmapLayout } from '../content';
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


// Lange Konzeptnamen am letzten passenden Leerzeichen in zwei Zeilen brechen;
// lange Einzelwörter (Teilkreisdurchmesser …) bleiben einzeilig, aber kleiner —
// nichts wird mehr hart abgeschnitten.
function nodeLabel(name: string): { lines: string[]; size: number } {
  if (name.length <= 18) return { lines: [name], size: 11 };
  const cut = name.lastIndexOf(' ', 18);
  if (cut <= 0) return { lines: [name], size: 9 };
  return { lines: [name.slice(0, cut), name.slice(cut + 1)], size: 11 };
}

export default function SkillMap() {
  const states = useConceptStates();
  const [selected, setSelected] = useState<string | null>(null);
  const cardHeading = useRef<HTMLHeadingElement>(null);
  const triggerEl = useRef<HTMLElement | null>(null);

  // Auswahl-Karte: Fokus hinein beim Öffnen, Esc schließt + Fokus zurück.
  useEffect(() => {
    if (selected) cardHeading.current?.focus();
  }, [selected]);
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [selected]);

  if (!states) return <ScreenSkeleton layout="detail" />;

  const open = (id: string, trigger: HTMLElement) => {
    triggerEl.current = trigger;
    setSelected(id);
  };
  function close() {
    setSelected(null);
    triggerEl.current?.focus();
    triggerEl.current = null;
  }

  const anySeen = Object.values(states).some((s) => s.status !== 'neu');
  const nodePos = new Map(skillmapLayout.nodes.map((n) => [n.conceptId, n]));
  const sel = selected ? conceptById.get(selected) : undefined;
  const selState = selected ? nodeState(states[selected]) : null;
  const groupDelay = new Map(skillmapLayout.groups.map((g, i) => [g.id, Math.min(i, 3)]));

  const edges = concepts.flatMap((c) =>
    c.prerequisites
      .filter((p) => nodePos.has(p) && nodePos.has(c.id))
      .map((p) => ({
        from: nodePos.get(p)!,
        to: nodePos.get(c.id)!,
        // Gruppenfremde Kanten (z. B. Statik → Maschinenelemente) queren weite
        // Strecken — sie werden abgeblendet, damit sie nicht dominieren (B-31).
        crossGroup: conceptById.get(p)?.group !== c.group,
      })),
  );

  // Sanfter Bogen statt Gerade: lange Kanten weichen so fremden Knoten aus,
  // und kollineare Ketten (zahnrad→modul durch zaehnezahl) trennen sich (B-31).
  const edgePath = (e: (typeof edges)[number]) => {
    const dx = e.to.x - e.from.x;
    const dy = e.to.y - e.from.y;
    const len = Math.hypot(dx, dy) || 1;
    const bow = Math.min(0.18 * len, 56);
    const mx = (e.from.x + e.to.x) / 2 - (dy / len) * bow;
    const my = (e.from.y + e.to.y) / 2 + (dx / len) * bow;
    return `M ${e.from.x} ${e.from.y} Q ${mx} ${my} ${e.to.x} ${e.to.y}`;
  };

  const statusCounts = concepts.reduce<Record<string, number>>((acc, c) => {
    const { status } = nodeState(states[c.id]);
    acc[status] = (acc[status] ?? 0) + 1;
    return acc;
  }, {});
  const mapDescription =
    `Karte mit ${concepts.length} Konzepten in ${skillmapLayout.groups.length} Gruppen ` +
    `(${skillmapLayout.groups.map((g) => g.label).join(', ')}). ` +
    `Stand: ${Object.entries(statusCounts).map(([k, v]) => `${v} ${STATUS_LABEL[k]}`).join(', ')}. ` +
    'Linien zeigen Voraussetzungen.';

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="mb-2 font-display text-display-sm text-ink-strong md:text-display">Skill-Map</h1>
      {!anySeen && (
        <div className="mb-4">
          <EmptyState
            title="Deine Karte ist noch unbeschriftet."
            hint="Das erste Projekt zeichnet die ersten Knoten ein."
            action={
              <Link to="/projekte" className={buttonClass()}>
                zu den Projekten →
              </Link>
            }
          />
        </div>
      )}

      {/* Desktop: SVG-Karte */}
      <div className="bl-einzeichnen hidden md:block">
        <svg viewBox="0 0 1000 600" className="w-full rounded border border-black/10 bg-paper-2 shadow" role="img" aria-label="Skill-Map: Konzepte und ihre Voraussetzungen">
          <desc>{mapDescription}</desc>
          {skillmapLayout.groups.map((g) => (
            <text key={g.id} x={g.x} y={g.y} className="fill-[color:var(--ink-faint)] font-mono" fontSize="13" style={{ textTransform: 'uppercase', letterSpacing: '0.15em' }}>
              {g.label}
            </text>
          ))}
          {edges.map((e, i) => (
            <path
              key={i}
              d={edgePath(e)}
              fill="none"
              stroke="var(--ink-faint)"
              strokeOpacity={e.crossGroup ? 0.22 : 0.4}
            />
          ))}
          {skillmapLayout.nodes.map((n) => {
            const c = conceptById.get(n.conceptId);
            if (!c) return null;
            const { status, due } = nodeState(states[n.conceptId]);
            const delay = groupDelay.get(c.group ?? '') ?? 0;
            return (
              <g key={n.conceptId} transform={`translate(${n.x} ${n.y})`}>
                {/* Stagger nur auf der inneren Gruppe — die äußere trägt das
                    transform-Attribut, das eine CSS-Animation überschreiben würde. */}
                <g
                  role="button"
                  tabIndex={0}
                  aria-label={`${c.name}: ${STATUS_LABEL[status]}${due ? ', auffrischen' : ''}`}
                  className={`bl-einzeichnen ${delay ? `bl-einzeichnen-d${delay}` : ''} cursor-pointer outline-none [&:focus-visible>.bl-focusring]:opacity-100`}
                  onClick={(ev) => open(n.conceptId, ev.currentTarget as unknown as HTMLElement)}
                  onKeyDown={(ev) => {
                    if (ev.key === 'Enter' || ev.key === ' ') {
                      ev.preventDefault();
                      open(n.conceptId, ev.currentTarget as unknown as HTMLElement);
                    }
                  }}
                >
                  <circle r="22" fill="transparent" />
                  {/* Expliziter Fokus-Kreis (DESIGN.md §7: Fokus auch auf SVG sichtbar). */}
                  <circle
                    className="bl-focusring opacity-0"
                    r="19"
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="2"
                  />
                  <NodeCircle status={status} />
                  {due && (
                    <g transform="translate(11 -11)">
                      <circle r="7" fill="var(--paper)" stroke="var(--accent)" />
                      <text textAnchor="middle" dy="3.5" fontSize="9" fill="var(--accent-ink)">⟳</text>
                    </g>
                  )}
                  {/* Label gehört zur Klickfläche (Befund B-31: Label-Klick öffnete nichts);
                      lange Namen brechen in zwei Zeilen statt hart abzuschneiden. */}
                  <text textAnchor="middle" y="30" fontSize={nodeLabel(c.name).size} className="fill-[color:var(--ink-2)] font-mono">
                    {nodeLabel(c.name).lines.map((line, li) => (
                      <tspan key={li} x="0" dy={li === 0 ? 0 : 12}>{line}</tspan>
                    ))}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Mobile: Gruppen-Listen */}
      <div className="space-y-6 md:hidden">
        {skillmapLayout.groups.map((g, gi) => (
          <section
            key={g.id}
            aria-label={g.label}
            className={`bl-einzeichnen ${gi ? `bl-einzeichnen-d${Math.min(gi, 3)}` : ''}`}
          >
            <h2 className="mb-2 border-b border-black/10 pb-1 font-mono text-xs uppercase tracking-widest text-ink-2">
              <span aria-hidden className="mr-2 inline-block h-2.5 w-0.5 bg-accent align-[-2px]" />
              {g.label}
            </h2>
            <ul className="space-y-1">
              {concepts.filter((c) => c.group === g.id).map((c) => {
                const { status, due } = nodeState(states[c.id]);
                return (
                  <li key={c.id}>
                    <button
                      onClick={(ev) => open(c.id, ev.currentTarget)}
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
        <div role="dialog" aria-label={sel.name} className="bl-gleiten mt-4 rounded border border-black/10 bg-paper-2 p-4 shadow">
          <div className="flex items-baseline gap-3">
            <h2 ref={cardHeading} tabIndex={-1} className="font-display text-lg font-semibold outline-none">
              {sel.name}
            </h2>
            {sel.symbol && <span className="font-mono text-sm text-ink-2">{sel.symbol}</span>}
            {sel.unit && sel.unit !== '-' && <span className="font-mono text-xs text-ink-faint">[{formatUnit(sel.unit)}]</span>}
            <span className="ml-auto font-mono text-xs text-ink-2">{STATUS_LABEL[selState!.status]}{selState!.due ? ' · auffrischen' : ''}</span>
          </div>
          <p className="mt-2 text-sm text-ink-2">{sel.short}</p>
          {/* Vorschau-Karte (SCREENS.md §8): Voraussetzungen & Vorkommen stehen
              vollständig auf der Konzept-Seite — ein Tap über den CTA. */}
          <div className="mt-3 flex gap-3">
            <Link to={`/konzept/${sel.id}`} className={buttonClass({ variant: 'secondary' })}>
              Konzept öffnen →
            </Link>
            <Button variant="ghost" onClick={close}>
              schließen
            </Button>
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
