// WorkspaceStep — der Kern-Screen (SCREENS.md §6): genau EIN Schritt,
// Lektion links (38 %), Canvas rechts (62 %, sticky), sanftes Gating,
// Auffrisch-Karten für Quereinsteiger, Meilenstein-Inszenierung.
// Persistenz-agnostisch: Zustand kommt als Props, Ergebnisse gehen über
// Callbacks nach draußen (src/db verdrahtet das in der App).

import { useEffect, useMemo, useRef, useState } from 'react';
import { evaluateFormula } from '@buildlab/engine';
import { explodePoint, shade } from '@buildlab/iso';
import { BlockRenderer } from '../blocks';
import { useContent } from '../content-context';
import { useCountUp } from '../useCountUp';
import { useWorkspaceStore } from '../store';
import { CadBuild } from '../build/CadBuild';
import { buttonClass } from '../primitives/Button';
import { focusRing } from '../primitives/focus';
import { reducedMotionActive } from '../primitives/motion';
import type { Block, Layer, Project, Step, TaskResult } from '../types';

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

/** 64-px-Ergebniszeile der eingeklappten Mobile-Canvas (SCREENS.md §6.4):
    zeigt das Live-Ergebnis der aktiven Formel (Engine rechnet, Eiserne Regel 1). */
function CanvasResultLine({ project, step }: { project: Project; step: Step }) {
  const { formulas } = useContent();
  const active = useWorkspaceStore((s) => s.active);
  let result: { symbol: string; value: number; unit: string } | null = null;
  if (active) {
    const formula = formulas.get(active.formulaId);
    if (formula) {
      try {
        result = {
          symbol: formula.result.symbol,
          value: evaluateFormula(formula, active.values),
          unit: formula.result.unit,
        };
      } catch {
        result = null;
      }
    }
  }
  // Motion „zaehlen" (DESIGN.md §8): der Wert zählt zum neuen Ergebnis.
  // Stellenzahl des Ziels beibehalten — keine Layout-Verschiebung beim Zählen.
  const animated = useCountUp(result?.value ?? 0);
  const decimals = result ? Math.min(4, (`${result.value}`.split('.')[1] ?? '').length) : 0;
  return (
    <p
      className="flex h-16 items-center justify-center gap-2 rounded-t border border-b-0 border-black/10 bg-paper-2 px-4 font-mono text-sm"
      aria-live="polite"
    >
      {result ? (
        <>
          <span className="text-ink-2">{result.symbol} =</span>
          <span className="text-accent-ink">
            {new Intl.NumberFormat('de-DE', {
              minimumFractionDigits: decimals,
              maximumFractionDigits: decimals,
            }).format(animated)}
            {result.unit && result.unit !== '-' ? ` ${result.unit}` : ''}
          </span>
        </>
      ) : (
        <span className="truncate text-ink-2">
          <span aria-hidden className="mr-2">{project.icon}</span>
          {step.title}
        </span>
      )}
    </p>
  );
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
            className={`min-h-11 text-accent-ink underline decoration-black/20 underline-offset-2 hover:decoration-current ${focusRing}`}
          >
            tiefer eintauchen →
          </button>
        )}
        <button
          type="button"
          onClick={() => setOpen(false)}
          className={`min-h-11 rounded px-2 text-ink-faint hover:bg-paper-sink hover:text-ink-2 ${focusRing}`}
        >
          zuklappen
        </button>
      </div>
    </aside>
  );
}

// Explosionsansicht (SCREENS.md §6.3 / DESIGN.md §6): die Teile des Bauteils
// gleiten per `packages/iso`-explode auseinander (one-shot rAF, 900 ms),
// Maßlinien beschriften sie. Reduzierte Bewegung → sofort explodiert.
const FINALE_PARTS: { label: string; r: number; h: number; color: string }[] = [
  { label: 'Grundplatte', r: 46, h: 9, color: '#9a9489' },
  { label: 'Rad 1', r: 34, h: 12, color: '#a9a294' },
  { label: 'Rad 2', r: 22, h: 12, color: '#a9a294' },
  { label: 'Deckel', r: 11, h: 8, color: '#9a9489' },
];

function FinaleDisc({ cx, bottomY, r, h, color }: { cx: number; bottomY: number; r: number; h: number; color: string }) {
  const ry = r * 0.42;
  return (
    <g>
      <ellipse cx={cx} cy={bottomY} rx={r} ry={ry} fill={shade(color, -0.24)} stroke="var(--ink)" strokeOpacity={0.3} strokeWidth={0.6} />
      <rect x={cx - r} y={bottomY - h} width={r * 2} height={h} fill={shade(color, -0.1)} />
      <ellipse cx={cx} cy={bottomY - h} rx={r} ry={ry} fill={shade(color, 0.22)} stroke="var(--ink)" strokeOpacity={0.35} strokeWidth={0.7} />
      <ellipse cx={cx} cy={bottomY - h} rx={r * 0.22} ry={ry * 0.22} fill="none" stroke="var(--ink)" strokeOpacity={0.3} strokeWidth={0.6} />
    </g>
  );
}

function MilestoneFinale({ project }: { project: Project }) {
  const [factor, setFactor] = useState(0);
  useEffect(() => {
    if (reducedMotionActive()) {
      setFactor(1);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / 900);
      setFactor(1 - (1 - t) ** 3);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Montierte Unterkanten der Teile (Bildschirm-y), Explosion vom Boden aus.
  const cx = 92;
  const baseY = 168;
  const center = { x: 0, y: baseY, z: 0 };
  let stackY = baseY;
  const placed = FINALE_PARTS.map((part) => {
    const assembled = stackY;
    stackY -= part.h + 2;
    const bottomY = explodePoint({ x: 0, y: assembled, z: 0 }, center, factor * 1.4).y;
    return { ...part, bottomY };
  });

  return (
    <div className="bl-einzeichnen rounded-lg border border-black/10 bg-paper-2 p-6 text-center shadow">
      <svg viewBox="0 0 240 190" className="mx-auto w-60" role="img" aria-label="Explosionsansicht des fertigen Bauteils">
        <desc>Die Teile des Bauteils gleiten auseinander; Maßlinien beschriften {FINALE_PARTS.map((p) => p.label).join(', ')}.</desc>
        <ellipse cx={cx} cy={baseY + 8} rx={56} ry={12} fill="#000" opacity={0.1} />
        {placed.map((p) => (
          <FinaleDisc key={p.label} cx={cx} bottomY={p.bottomY} r={p.r} h={p.h} color={p.color} />
        ))}
        {/* Maßlinien (DESIGN.md §3): dünne Akzent-Leader mit Mono-Labels. */}
        {placed.map((p, i) => {
          const y = p.bottomY - p.h / 2;
          return (
            <g key={p.label} className={`bl-einzeichnen ${i ? `bl-einzeichnen-d${Math.min(i, 3)}` : ''}`}>
              <line x1={cx + p.r + 5} y1={y} x2={172} y2={y} stroke="var(--accent)" strokeWidth={0.8} strokeDasharray="3 2" />
              <circle cx={cx + p.r + 5} cy={y} r={1.4} fill="var(--accent)" />
              <text x={176} y={y + 3} fontSize={10} className="fill-[color:var(--ink-2)] font-mono">
                {p.label}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="mt-3 font-display text-display-sm text-ink-strong">Steht.</p>
      <p className="mt-1 font-display text-lg text-ink">{project.buildResult}</p>
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

  // Mobile: Canvas per Griff-Leiste auf die Ergebniszeile kollabierbar
  // (SCREENS.md §6.4). Flüchtiger UI-Zustand, Desktop unberührt.
  const [canvasCollapsed, setCanvasCollapsed] = useState(false);

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
    setCanvasCollapsed(false);
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
          <div className="sticky top-0 z-10 bg-paper md:static md:bg-transparent">
            {canvasCollapsed && (
              <div className="bl-wechsel md:hidden">
                <CanvasResultLine project={project} step={step} />
              </div>
            )}
            {/* Motion „aufklappen" (DESIGN.md §8): grid-rows 1fr↔0fr statt
                hartem hidden. Ab md immer offen (Toggle existiert nur mobil). */}
            <div
              id="canvas-inhalt"
              data-open={!canvasCollapsed}
              className={`bl-aufklappen bl-md-offen grid ${
                canvasCollapsed
                  ? '[grid-template-rows:0fr] md:[grid-template-rows:1fr]'
                  : '[grid-template-rows:1fr]'
              }`}
            >
              <div className="min-h-0 overflow-hidden">
                <div className="max-h-[45vh] overflow-auto md:max-h-none">
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
              </div>
            </div>
            {/* Griff-Leiste (Doppel-Strich): klappt die Ansicht auf die Ergebniszeile. */}
            <button
              type="button"
              onClick={() => setCanvasCollapsed((c) => !c)}
              aria-expanded={!canvasCollapsed}
              aria-controls="canvas-inhalt"
              aria-label={canvasCollapsed ? 'Ansicht ausklappen' : 'Ansicht einklappen'}
              className="flex min-h-11 w-full items-center justify-center rounded-b border border-t-0 border-black/10 bg-paper-2 outline-none hover:bg-paper-sink/60 focus-visible:ring-2 focus-visible:ring-accent md:hidden"
            >
              <span aria-hidden className="flex w-10 flex-col gap-1">
                <span className="h-px bg-ink-faint" />
                <span className="h-px bg-ink-faint" />
              </span>
            </button>
          </div>
        </section>

        {/* Lektion */}
        <section aria-label="Lektion" className="order-2 min-w-0 md:order-1">
          <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">
            <span aria-hidden className="mr-2 inline-block h-2.5 w-0.5 bg-accent align-[-2px]" />
            Ziel · Schritt {stepIndex + 1}/{project.steps.length} · {step.kind}
          </p>
          <h2 className="mt-1 font-display text-title text-ink-strong">{step.goal}</h2>

          <div key={stepIndex} className="bl-wechsel mt-5 space-y-6">
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
            className="fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom))] left-0 right-0 z-30 flex items-center gap-2 border-t border-black/10 bg-paper-2 px-3 py-2 md:static md:mt-8 md:gap-3 md:border-t md:bg-transparent md:px-0 md:pt-4"
          >
            <button
              type="button"
              onClick={() => onNavigate(stepIndex - 1)}
              disabled={stepIndex === 0}
              className={`${buttonClass({ variant: 'secondary' })} whitespace-nowrap !px-2.5 md:!px-4`}
            >
              ‹ Zurück
            </button>
            <div className="flex flex-1 items-center justify-center md:gap-1" role="list">
              {project.steps.map((s, i) => {
                const reachable = i <= maxStepReached;
                const current = i === stepIndex;
                const done = i < maxStepReached;
                return (
                  <button
                    key={s.id}
                    type="button"
                    role="listitem"
                    aria-label={`Schritt ${i + 1}: ${s.title}${current ? ' (aktuell)' : ''}`}
                    aria-current={current ? 'step' : undefined}
                    disabled={!reachable}
                    onClick={() => onNavigate(i)}
                    className={`group relative flex h-11 w-5 items-center justify-center rounded ${focusRing} disabled:cursor-not-allowed md:w-7`}
                  >
                    <span
                      aria-hidden
                      className={`block h-3.5 w-3.5 rounded-full transition-[transform,background-color] duration-200 ${
                        current
                          ? 'scale-125 bg-accent ring-2 ring-accent/30'
                          : reachable
                            ? 'bg-ink-faint/60 group-hover:bg-ink-2'
                            : 'bg-paper-deep'
                      }`}
                    />
                    {/* Lineal-Tick unter erledigten Schritten (DESIGN.md §3). */}
                    {done && (
                      <span aria-hidden className="absolute bottom-1.5 h-1 w-px bg-ink-faint" />
                    )}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => onNavigate(stepIndex + 1)}
              disabled={!stepDone || stepIndex >= project.steps.length - 1}
              title={stepDone ? undefined : 'Noch eine Aufgabe offen — sie ist direkt über mir.'}
              className={`${buttonClass()} whitespace-nowrap !px-2.5 md:!px-4`}
            >
              Weiter ›
            </button>
          </nav>
        </section>
      </div>
    </div>
  );
}
