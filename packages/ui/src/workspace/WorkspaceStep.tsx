// WorkspaceStep — der Kern-Screen (SCREENS.md §6): genau EIN Schritt,
// Lektion links (38 %), Canvas rechts (62 %, sticky), sanftes Gating,
// Auffrisch-Karten für Quereinsteiger, Meilenstein-Inszenierung.
// Persistenz-agnostisch: Zustand kommt als Props, Ergebnisse gehen über
// Callbacks nach draußen (src/db verdrahtet das in der App).

import { useEffect, useMemo, useRef, useState } from 'react';
import { evaluateFormula } from '@buildlab/engine';
import { explodePoint, shade } from '@buildlab/iso';
import { BlockRenderer } from '../blocks';
import { Latex } from '../Latex';
import { useContent } from '../content-context';
import { useCountUp } from '../useCountUp';
import { useWorkspaceStore } from '../store';
import { formatUnit } from '../units';
import { CadBuild } from '../build/CadBuild';
import { buttonClass } from '../primitives/Button';
import { focusRing } from '../primitives/focus';
import { reducedMotionActive } from '../primitives/motion';
import type { Block, Layer, Project, Step, TaskResult } from '../types';

export interface WorkspaceStepProps {
  project: Project;
  stepIndex: number;
  /** Anzahl erledigter Schritte (Fußleisten-Label „x/y erledigt"). */
  doneCount: number;
  /** Eindeutiger nächster Schritt (src/dag.ts) — null: zurück zur Projektkarte. */
  nextStepIndex: number | null;
  depth: Layer;
  /** Aufgaben-Zustände des Schritts, Key = Block-Index. */
  taskStates: Record<number, TaskResult>;
  /** Konzepte mit Status ≥ gesehen (für Auffrisch-Karten, LERNMODELL.md §5). */
  seenConcepts: Set<string>;
  /** Bereits gezeigte Auffrisch-Karten (Konzept-IDs, pro Projekt einmal). */
  refreshShown?: Set<string>;
  onTaskResult: (blockIndex: number, result: TaskResult) => void;
  onNavigate: (stepIndex: number) => void;
  /** Zurück zur Projektkarte — dem einzigen Weg zu den Schritten. */
  onExit: () => void;
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
  let result: { name?: string; symbol: string; value: number; unit: string } | null = null;
  if (active) {
    const formula = formulas.get(active.formulaId);
    if (formula) {
      try {
        result = {
          name: formula.result.name,
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
          {result.name && <span className="text-xs text-ink-faint">{result.name} ·</span>}
          <span className="text-ink-2">{result.symbol} =</span>
          <span className="text-accent-ink">
            {new Intl.NumberFormat('de-DE', {
              minimumFractionDigits: decimals,
              maximumFractionDigits: decimals,
            }).format(animated)}
            {result.unit && result.unit !== '-' ? ` ${formatUnit(result.unit)}` : ''}
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
// Nur Geometrie — die Teile-Labels kommen aus dem Content (step.finaleParts),
// damit kein Projekt fremde Teilenamen angedichtet bekommt.
const FINALE_GEOMETRY: { r: number; h: number; color: string }[] = [
  { r: 46, h: 9, color: '#9a9489' },
  { r: 34, h: 12, color: '#a9a294' },
  { r: 22, h: 12, color: '#a9a294' },
  { r: 11, h: 8, color: '#9a9489' },
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
  // Labels aus dem Meilenstein-Step; ohne finaleParts bleibt das Finale
  // unbeschriftet (keine erfundenen Teilenamen). Abschluss-Satz je nachdem,
  // ob das Projekt wirklich etwas baut (build-Block) oder nur abschließt.
  const labels = project.steps.find((s) => s.kind === 'meilenstein')?.finaleParts ?? [];
  const hasBuild = project.steps.some((s) => s.blocks.some((b) => b.type === 'build'));
  const parts = (labels.length ? labels : FINALE_GEOMETRY.map(() => null)).map((label, i) => ({
    label,
    ...FINALE_GEOMETRY[Math.min(i, FINALE_GEOMETRY.length - 1)],
  }));
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
  const placed = parts.map((part) => {
    const assembled = stackY;
    stackY -= part.h + 2;
    const bottomY = explodePoint({ x: 0, y: assembled, z: 0 }, center, factor * 1.4).y;
    return { ...part, bottomY };
  });

  return (
    <div className="bl-einzeichnen rounded-lg border border-black/10 bg-paper-2 p-6 text-center shadow">
      <svg viewBox="0 0 240 190" className="mx-auto w-60" role="img" aria-label="Explosionsansicht des fertigen Bauteils">
        <desc>
          {labels.length
            ? `Die Teile des Bauteils gleiten auseinander; Maßlinien beschriften ${labels.join(', ')}.`
            : 'Die Teile des Bauteils gleiten auseinander.'}
        </desc>
        <ellipse cx={cx} cy={baseY + 8} rx={56} ry={12} fill="#000" opacity={0.1} />
        {placed.map((p, i) => (
          <FinaleDisc key={i} cx={cx} bottomY={p.bottomY} r={p.r} h={p.h} color={p.color} />
        ))}
        {/* Maßlinien (DESIGN.md §3): dünne Akzent-Leader mit Mono-Labels. */}
        {placed.map((p, i) => {
          if (!p.label) return null;
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
      <p className="mt-1 font-mono text-sm text-ink-2">
        {hasBuild
          ? 'Dein Bauteil wartet oben auf deiner Projektkarte.'
          : 'Dein Abschluss leuchtet oben auf deiner Projektkarte.'}
      </p>
    </div>
  );
}

export function WorkspaceStep({
  project,
  stepIndex,
  doneCount,
  nextStepIndex,
  depth,
  taskStates,
  seenConcepts,
  refreshShown,
  onTaskResult,
  onNavigate,
  onExit,
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
  // Bau-Schritte: zusätzlich müssen alle Build-Anforderungen grün sein
  // (CadBuild publiziert den Constraint-Stand in den Store). Solange der
  // build-Block noch nicht gemountet ist (buildOk === null), gilt er als offen.
  const buildOk = useWorkspaceStore((s) => s.buildOk);
  const hasBuildBlock = step.blocks.some((b) => b.type === 'build');
  const stepDone =
    requiredTasks.every((i) => taskStates[i]?.solved) && (!hasBuildBlock || buildOk === true);
  // Weiter führt zum eindeutigen nächsten Schritt — sonst zurück zur
  // Projektkarte (sie ist der Hub; bei parallelen Ästen entscheidet sie).
  const weiterZurKarte = stepDone && nextStepIndex === null;
  const lockHintText =
    hasBuildBlock && buildOk !== true
      ? 'Erst alle Anforderungen in der Bau-Ansicht erfüllen.'
      : 'Noch eine Aufgabe offen — sie ist direkt über mir.';
  // Sichtbarer Hinweis nach Tap auf den gesperrten Weiter-Knopf (blendet sich aus).
  const [lockHint, setLockHint] = useState<string | null>(null);
  useEffect(() => {
    if (!lockHint) return;
    const t = setTimeout(() => setLockHint(null), 4000);
    return () => clearTimeout(t);
  }, [lockHint]);
  useEffect(() => setLockHint(null), [stepIndex, stepDone]);

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

  // Tastatur → (SCREENS.md §6.5) — nur ohne fokussiertes Eingabefeld.
  // Lineares ←-Blättern entfällt: die Projektkarte ist der einzige Weg
  // zwischen den Schritten; → folgt nur dem eindeutigen nächsten Schritt.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT') return;
      if (e.key === 'ArrowRight' && stepDone && nextStepIndex !== null) {
        onNavigate(nextStepIndex);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stepDone, nextStepIndex]);

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
  // Für die Platzhalter-Bühne (B-28): die Formeln des Schritts (max. 2).
  const { formulas: formulaMap } = useContent();
  const stepFormulas = useMemo(
    () =>
      step.blocks
        .filter((b): b is Block & { type: 'formula'; formulaId: string } => b.type === 'formula')
        .map((b) => formulaMap.get(b.formulaId))
        .filter((f): f is NonNullable<typeof f> => !!f)
        .slice(0, 2),
    [step, formulaMap],
  );

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
                {/* key={stepIndex}: Interactives je Schritt neu mounten, damit sie
                    ihre Canvas-Werte nach clearCanvasInputs() neu publizieren —
                    sonst zeigt eine target-Aufgabe „aktuell: —", bis jemand
                    einen Regler bewegt (gleiche Komponente + gleiche Defaults
                    überleben den Schrittwechsel ohne neuen Effect-Lauf). */}
                <div key={stepIndex} className="max-h-[45vh] overflow-auto md:max-h-none">
                  {canvasBlock ? (
                    canvasBlock.type === 'build' ? (
                      <CadBuild block={canvasBlock} onExport={onExport} />
                    ) : (
                      <BlockRenderer block={canvasBlock} depth={depth} />
                    )
                  ) : step.kind === 'meilenstein' ? (
                    <MilestoneFinale project={project} />
                  ) : (
                    <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded border border-black/10 bg-paper-2 p-6 text-center shadow">
                      <p className="font-display text-xl text-ink-2">
                        <span aria-hidden className="mr-2 font-mono">{project.icon}</span>
                        {project.title}
                      </p>
                      {/* Schritte ohne Interactive: die Formeln des Schritts geben
                          der Bühne Inhalt, statt sie leer wirken zu lassen (B-28). */}
                      {stepFormulas.length > 0 && (
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
                            In diesem Schritt
                          </span>
                          {stepFormulas.map((f) => (
                            <Latex key={f.id} className="text-lg text-ink-2" src={f.latex} />
                          ))}
                        </div>
                      )}
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

          {/* Navigation (Hub-Modell): die Projektkarte ist der einzige Weg zu
              den Schritten — links zurück zum Baum, rechts der eindeutige
              nächste Schritt (oder ebenfalls die Karte). Mobil fixe Leiste,
              Desktop inline am Lektion-Ende. */}
          <nav
            aria-label="Schritt-Navigation"
            className="fixed bottom-0 left-0 right-0 z-30 flex items-center gap-2 border-t border-black/10 bg-paper-2 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:static md:mt-8 md:gap-3 md:border-t md:bg-transparent md:px-0 md:pb-0 md:pt-4"
          >
            <button
              type="button"
              onClick={onExit}
              className={`${buttonClass({ variant: 'secondary' })} whitespace-nowrap !px-2.5 md:!px-4`}
            >
              ‹ Projektkarte
            </button>
            <p className="flex-1 text-center font-mono text-xs text-ink-faint">
              {doneCount}/{project.steps.length} erledigt
            </p>
            {/* aria-disabled statt disabled: bleibt antippbar/fokussierbar, ein Tap
                zeigt den Grund sichtbar an (title allein ist auf Touch unsichtbar, B-09). */}
            <button
              type="button"
              aria-disabled={!stepDone}
              onClick={() => {
                if (!stepDone) {
                  setLockHint(lockHintText);
                } else if (nextStepIndex !== null) {
                  onNavigate(nextStepIndex);
                } else {
                  onExit();
                }
              }}
              title={stepDone ? undefined : lockHintText}
              className={`${buttonClass()} whitespace-nowrap !px-2.5 md:!px-4 ${
                stepDone ? '' : 'cursor-not-allowed opacity-40 active:translate-y-0'
              }`}
            >
              {weiterZurKarte ? 'Zur Projektkarte ›' : 'Weiter ›'}
            </button>
            {lockHint && (
              <p
                role="status"
                className="bl-quittung absolute inset-x-3 -top-9 rounded border border-black/10 bg-paper-3 px-3 py-1.5 text-center font-mono text-xs text-ink-2 shadow md:static md:mt-0 md:inline-block md:w-auto md:border-0 md:bg-transparent md:p-0 md:shadow-none"
              >
                {lockHint}
              </p>
            )}
          </nav>
        </section>
      </div>
    </div>
  );
}
