// WorkspaceStep — der Kern-Screen (SCREENS.md §6): genau EIN Schritt,
// Lektion links (38 %), Canvas rechts (62 %, sticky), sanftes Gating,
// Auffrisch-Karten für Quereinsteiger, Meilenstein-Inszenierung.
// Persistenz-agnostisch: Zustand kommt als Props, Ergebnisse gehen über
// Callbacks nach draußen (src/db verdrahtet das in der App).

import { useEffect, useMemo, useRef, useState } from 'react';
import { BlockRenderer } from '../blocks';
import { useContent } from '../content-context';
import { useWorkspaceStore } from '../store';
import { CadBuild } from '../build/CadBuild';
import type { Block, Layer, Project, TaskResult } from '../types';

export interface WorkspaceStepProps {
  project: Project;
  stepIndex: number;
  maxStepReached: number;
  depth: Layer;
  /** Aufgaben-Zustände des Schritts, Key = Block-Index. */
  taskStates: Record<number, TaskResult>;
  /** Konzepte mit Status ≥ gesehen (für Auffrisch-Karten, LERNMODELL.md §5). */
  seenConcepts: Set<string>;
  /** Bereits gezeigte Auffrisch-Karten (Konzept-IDs, pro Projekt einmal). */
  refreshShown?: Set<string>;
  onTaskResult: (blockIndex: number, result: TaskResult) => void;
  onNavigate: (stepIndex: number) => void;
  onStepComplete: (stepIndex: number) => void;
  onMilestone?: () => void;
  onOpenConcept?: (conceptId: string) => void;
  onRefreshShown?: (conceptId: string) => void;
  onExport?: (params: Record<string, number>, label: string) => void;
}

function isCanvasBlock(block: Block): boolean {
  return block.type === 'interactive' || block.type === 'build';
}

/** Auffrisch-Karte: Quereinsteiger-Netz für ungesehene `uses`-Konzepte. */
function RefreshCard({
  conceptId,
  onOpenConcept,
}: {
  conceptId: string;
  onOpenConcept?: (id: string) => void;
}) {
  const { concepts } = useContent();
  const [open, setOpen] = useState(true);
  const concept = concepts.get(conceptId);
  if (!concept || !open) return null;
  return (
    <aside className="bl-einzeichnen rounded border border-black/10 bg-paper-sink/70 p-3 text-sm" aria-label={`Auffrischung: ${concept.name}`}>
      <p>
        <span className="font-mono text-xs uppercase tracking-wider text-accent-ink">Kurz auffrischen · </span>
        <strong>{concept.name}</strong>
        {concept.symbol && <span className="ml-1 font-mono text-ink-2">{concept.symbol}</span>}
        {' — '}
        {concept.short}
      </p>
      <div className="mt-2 flex gap-3">
        {onOpenConcept && (
          <button
            type="button"
            onClick={() => onOpenConcept(conceptId)}
            className="min-h-9 text-accent-ink underline decoration-black/20 underline-offset-2 outline-none hover:decoration-current focus-visible:ring-2 focus-visible:ring-accent"
          >
            tiefer eintauchen →
          </button>
        )}
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="min-h-9 text-ink-faint outline-none hover:text-ink-2 focus-visible:ring-2 focus-visible:ring-accent"
        >
          zuklappen
        </button>
      </div>
    </aside>
  );
}

/** Meilenstein-Abschluss: Explosions-Inszenierung (rein dekorativ, iso-Stil). */
function MilestoneFinale({ project }: { project: Project }) {
  return (
    <div className="bl-einzeichnen rounded border border-black/10 bg-paper-2 p-5 text-center shadow">
      <svg viewBox="0 0 200 120" className="mx-auto w-48" role="img" aria-label="Explosionsansicht des fertigen Bauteils">
        {[0, 1, 2].map((layer) => (
          <g key={layer} className={`bl-einzeichnen bl-einzeichnen-d${layer + 1}`}>
            <ellipse
              cx={100}
              cy={90 - layer * 28}
              rx={56 - layer * 14}
              ry={20 - layer * 5}
              fill="none"
              stroke="var(--accent)"
              strokeWidth={1.2}
              strokeDasharray={layer === 1 ? '4 3' : undefined}
            />
            <line x1={100} y1={95 - layer * 28} x2={100} y2={78 - layer * 28} stroke="var(--ink-faint)" />
          </g>
        ))}
      </svg>
      <p className="mt-2 font-display text-lg">Steht. {project.buildResult}</p>
      <p className="mt-1 font-mono text-sm text-ink-2">Dein Bauteil wartet in der Werkstatt.</p>
    </div>
  );
}

export function WorkspaceStep({
  project,
  stepIndex,
  maxStepReached,
  depth,
  taskStates,
  seenConcepts,
  refreshShown,
  onTaskResult,
  onNavigate,
  onStepComplete,
  onMilestone,
  onOpenConcept,
  onRefreshShown,
  onExport,
}: WorkspaceStepProps) {
  const step = project.steps[stepIndex];
  const clearCanvasInputs = useWorkspaceStore((s) => s.clearCanvasInputs);

  const canvasIndex = useMemo(() => {
    if (step.canvas !== undefined && step.canvas < step.blocks.length) return step.canvas;
    const i = step.blocks.findIndex(isCanvasBlock);
    return i >= 0 ? i : null;
  }, [step]);

  // Pflicht-Aufgaben: alle task-Blöcke ohne minDepth (LERNMODELL.md §2.3).
  const requiredTasks = useMemo(
    () =>
      step.blocks
        .map((b, i) => ({ b, i }))
        .filter(({ b }) => b.type === 'task' && b.minDepth === undefined)
        .map(({ i }) => i),
    [step],
  );
  const stepDone = requiredTasks.every((i) => taskStates[i]?.solved);

  // Schritt-Abschluss genau einmal melden.
  const completedRef = useRef(false);
  useEffect(() => {
    completedRef.current = false;
  }, [stepIndex]);
  useEffect(() => {
    if (stepDone && !completedRef.current) {
      completedRef.current = true;
      onStepComplete(stepIndex);
      if (step.kind === 'meilenstein') onMilestone?.();
    }
    // onStepComplete/onMilestone bewusst nicht als Deps (Eltern-Identität schwankt).
  }, [stepDone, stepIndex, step.kind]);

  // Canvas-Kontext beim Schrittwechsel räumen (target-Kopplung).
  useEffect(() => () => clearCanvasInputs(), [stepIndex, clearCanvasInputs]);

  // Tastatur ←/→ (SCREENS.md §6.5) — nur ohne fokussiertes Eingabefeld.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT') return;
      if (e.key === 'ArrowLeft' && stepIndex > 0) onNavigate(stepIndex - 1);
      if (e.key === 'ArrowRight' && stepDone && stepIndex < project.steps.length - 1) {
        onNavigate(stepIndex + 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stepIndex, stepDone, project.steps.length]);

  // Auffrisch-Karten je Block vorbereiten (ungesehene uses-Konzepte).
  const refreshFor = (block: Block): string[] => {
    if (block.type !== 'text') return [];
    return (block.uses ?? []).filter(
      (c) => !seenConcepts.has(c) && !(refreshShown?.has(c) ?? false),
    );
  };
  const announcedRefresh = useRef(new Set<string>());

  const renderBlock = (block: Block, i: number) => {
    const refresh = refreshFor(block);
    for (const c of refresh) {
      if (!announcedRefresh.current.has(c)) {
        announcedRefresh.current.add(c);
        onRefreshShown?.(c);
      }
    }
    return (
      <div key={i} className="space-y-3">
        {refresh.map((c) => (
          <RefreshCard key={c} conceptId={c} onOpenConcept={onOpenConcept} />
        ))}
        {block.type === 'build' ? (
          <CadBuild block={block} onExport={onExport} />
        ) : (
          <BlockRenderer
            block={block}
            depth={depth}
            taskState={taskStates[i]}
            onTaskResult={(r) => onTaskResult(i, r)}
          />
        )}
      </div>
    );
  };

  const lessonBlocks = step.blocks
    .map((b, i) => ({ b, i }))
    .filter(({ i }) => i !== canvasIndex);
  const canvasBlock = canvasIndex !== null ? step.blocks[canvasIndex] : null;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-6 md:px-6 md:pb-6">
      <div className="grid gap-6 md:grid-cols-[38fr_62fr]">
        {/* Canvas: mobil zuerst (sticky oben), Desktop rechts */}
        <section
          aria-label="Interaktive Ansicht"
          className="order-1 md:order-2 md:self-start md:sticky md:top-4"
        >
          <div className="sticky top-0 z-10 max-h-[45vh] overflow-auto md:static md:max-h-none">
            {canvasBlock ? (
              canvasBlock.type === 'build' ? (
                <CadBuild block={canvasBlock} onExport={onExport} />
              ) : (
                <BlockRenderer block={canvasBlock} depth={depth} />
              )
            ) : step.kind === 'meilenstein' ? (
              <MilestoneFinale project={project} />
            ) : (
              <div className="flex min-h-40 items-center justify-center rounded border border-black/10 bg-paper-2 p-6 text-center shadow">
                <p className="font-display text-xl text-ink-2">
                  <span aria-hidden className="mr-2 font-mono">{project.icon}</span>
                  {project.title}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Lektion */}
        <section aria-label="Lektion" className="order-2 min-w-0 md:order-1">
          <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">Ziel</p>
          <h2 className="mt-1 font-display text-xl leading-snug">{step.goal}</h2>

          <div key={stepIndex} className="bl-wechsel mt-5 space-y-5">
            {lessonBlocks.map(({ b, i }) => renderBlock(b, i))}
            {step.kind === 'meilenstein' && stepDone && canvasBlock !== null && (
              <MilestoneFinale project={project} />
            )}
            {stepDone && step.kind !== 'meilenstein' && (
              <p className="bl-quittung font-mono text-sm text-ok" aria-live="polite">
                Schritt {stepIndex + 1} ✓ · {step.title}
              </p>
            )}
          </div>

          {/* Navigation: mobil fixe Leiste über der Bottom-Bar (SCREENS.md §6.4),
              Desktop inline am Lektion-Ende. */}
          <nav
            aria-label="Schritte"
            className="fixed bottom-14 left-0 right-0 z-30 flex items-center gap-3 border-t border-black/10 bg-paper-2 px-4 py-2 md:static md:mt-8 md:border-t md:bg-transparent md:px-0 md:pt-4"
          >
            <button
              type="button"
              onClick={() => onNavigate(stepIndex - 1)}
              disabled={stepIndex === 0}
              className="min-h-11 whitespace-nowrap rounded border border-black/10 px-3 text-sm outline-none hover:border-ink-2 focus-visible:ring-2 focus-visible:ring-accent active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40 md:px-4"
            >
              ‹ Zurück
            </button>
            <div className="flex flex-1 items-center justify-center gap-1.5 md:gap-2" role="list">
              {project.steps.map((s, i) => {
                const reachable = i <= maxStepReached;
                const current = i === stepIndex;
                return (
                  <button
                    key={s.id}
                    type="button"
                    role="listitem"
                    aria-label={`Schritt ${i + 1}: ${s.title}${current ? ' (aktuell)' : ''}`}
                    aria-current={current ? 'step' : undefined}
                    disabled={!reachable}
                    onClick={() => onNavigate(i)}
                    className={`h-3.5 w-3.5 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper ${
                      current
                        ? 'bg-accent ring-2 ring-accent/30'
                        : reachable
                          ? 'bg-ink-faint/60 hover:bg-ink-2'
                          : 'bg-paper-sink'
                    }`}
                  />
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => onNavigate(stepIndex + 1)}
              disabled={!stepDone || stepIndex >= project.steps.length - 1}
              title={stepDone ? undefined : 'Noch eine Aufgabe offen — sie ist direkt über mir.'}
              className="min-h-11 whitespace-nowrap rounded bg-accent px-3 text-sm text-paper outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40 md:px-4"
            >
              Weiter ›
            </button>
          </nav>
        </section>
      </div>
    </div>
  );
}
