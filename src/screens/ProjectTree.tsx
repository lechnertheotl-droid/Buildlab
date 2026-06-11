// src/screens/ProjectTree.tsx — die Projektkarte, das Zentrum der App
// (SCREENS.md „Projektkarte"): der umgekehrte Aufgaben-Baum eines Projekts.
// Das fertige Produkt steht oben, die ersten Schritte unten; Kanten zeigen,
// was wofür gebraucht wird. Knoten antippen öffnet den Schritt im Workspace —
// die Karte ist der EINZIGE Weg zu den Schritten. Gesperrte Knoten erklären
// sich per Karte statt zu blockieren, das Layout kommt deterministisch aus
// src/dag.ts (kein Force-Layout), Zustände nie über Farbe allein.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, ProgressBar, ScreenSkeleton } from '@buildlab/ui';
import { missingPrerequisites, projectById, projects, remainingMinutes, type ProjectMeta } from '../content';
import { layoutTree, stepRequires, unlockedStepIds, type TreeNode } from '../dag';
import { setSetting, useAllProgress, useBuilds, useSettings } from '../db/repo';
import type { BuildEntry, ProjectProgress } from '../db/types';
import { downloadStl, recompileBuild, stlFileName } from '../lib/stl';

const NODE_R = 16;
const PLATE_W = 232;
const PLATE_H = 64;

type StepState = 'erledigt' | 'frei' | 'gesperrt';

const STATE_LABEL: Record<StepState, string> = {
  erledigt: 'erledigt — wieder ansehen',
  frei: 'frei',
  gesperrt: 'gesperrt',
};

// Lange Schritt-Titel am letzten passenden Leerzeichen brechen (wie Skill-Map
// zuvor): nichts wird hart abgeschnitten.
function nodeLabel(title: string): { lines: string[]; size: number } {
  if (title.length <= 16) return { lines: [title], size: 11 };
  const cut = title.lastIndexOf(' ', 16);
  if (cut <= 0) return { lines: [title], size: 9 };
  return { lines: [title.slice(0, cut), title.slice(cut + 1)], size: 11 };
}

export interface ProjectTreeViewProps {
  project: ProjectMeta;
  stepsDone: ReadonlySet<string>;
  /** Frisch freigeschaltete Schritte → Quittungs-Pop (Navigation-State). */
  highlight?: ReadonlySet<string>;
  onOpenStep: (index: number) => void;
}

/** Reiner Baum (SSR-testbar): Zustand kommt als Props, Klicks gehen raus. */
export function ProjectTreeView({ project, stepsDone, highlight, onOpenStep }: ProjectTreeViewProps) {
  const layout = useMemo(() => layoutTree(project), [project]);
  const requires = useMemo(() => stepRequires(project), [project]);
  const unlocked = unlockedStepIds(project, stepsDone);
  const stepByIndex = project.steps;
  const titleOf = new Map(project.steps.map((s) => [s.id, s.title]));
  const nodeById = new Map(layout.nodes.map((n) => [n.stepId, n]));
  const milestoneId = project.steps.find((s) => s.kind === 'meilenstein')?.id;

  const stateOf = (stepId: string): StepState =>
    stepsDone.has(stepId) ? 'erledigt' : unlocked.has(stepId) ? 'frei' : 'gesperrt';

  // Gesperrt-Karte: Fokus hinein beim Öffnen, Esc schließt + Fokus zurück
  // (gleicher Fokus-Tanz wie früher die Skill-Map, DESIGN.md §7).
  const [lockedId, setLockedId] = useState<string | null>(null);
  const cardHeading = useRef<HTMLHeadingElement>(null);
  const triggerEl = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (lockedId) cardHeading.current?.focus();
  }, [lockedId]);
  useEffect(() => {
    if (!lockedId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLocked();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [lockedId]);
  function closeLocked() {
    setLockedId(null);
    triggerEl.current?.focus();
    triggerEl.current = null;
  }

  const activate = (node: TreeNode, trigger: HTMLElement) => {
    if (stateOf(node.stepId) === 'gesperrt') {
      triggerEl.current = trigger;
      setLockedId(node.stepId);
    } else {
      onOpenStep(node.index);
    }
  };

  const nodeAria = (node: TreeNode): string => {
    const step = stepByIndex[node.index];
    const state = stateOf(node.stepId);
    if (state !== 'gesperrt') return `Schritt „${step.title}“: ${STATE_LABEL[state]}`;
    const missing = requires.get(node.stepId)!.filter((r) => !stepsDone.has(r));
    return `Schritt „${step.title}“: gesperrt — vorher: ${missing.map((r) => titleOf.get(r)).join(', ')}`;
  };

  // Kanten: Unterkante des oberen Knotens ↔ Oberkante des unteren — sanfte
  // S-Kurve senkrecht durch die Ebenen-Mitte.
  const edgePath = (from: TreeNode, to: TreeNode) => {
    const y1 = from.y - NODE_R - 5;
    const toHalf = to.stepId === milestoneId ? PLATE_H / 2 : NODE_R;
    const y2 = to.y + toHalf + 5;
    const my = (y1 + y2) / 2;
    return `M ${from.x} ${y1} C ${from.x} ${my} ${to.x} ${my} ${to.x} ${y2}`;
  };

  const counts = { erledigt: 0, frei: 0, gesperrt: 0 };
  for (const s of project.steps) counts[stateOf(s.id)]++;
  const description =
    `${project.steps.length} Schritte: ${counts.erledigt} erledigt, ${counts.frei} frei, ` +
    `${counts.gesperrt} gesperrt. Linien zeigen, was wofür gebraucht wird; ` +
    `das fertige Produkt steht ganz oben.`;
  const lockedStep = lockedId ? stepByIndex[nodeById.get(lockedId)!.index] : null;

  return (
    <div>
      <svg
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        className="w-full"
        role="img"
        aria-label={`Projektkarte „${project.title}“: Aufgaben-Baum`}
      >
        <desc>{description}</desc>
        {layout.edges.map((e) => {
          const from = nodeById.get(e.from)!;
          const to = nodeById.get(e.to)!;
          const satisfied = stepsDone.has(e.from);
          return (
            <path
              key={`${e.from}->${e.to}`}
              d={edgePath(from, to)}
              fill="none"
              stroke={satisfied ? 'var(--accent)' : 'var(--ink-faint)'}
              strokeOpacity={satisfied ? 0.45 : 0.3}
              strokeWidth={satisfied ? 1.6 : 1.2}
              strokeDasharray={satisfied ? undefined : '3 3'}
            />
          );
        })}
        {layout.nodes.map((node) => {
          const step = stepByIndex[node.index];
          const state = stateOf(node.stepId);
          const fresh = highlight?.has(node.stepId) ?? false;
          const isPlate = node.stepId === milestoneId;
          const delay = Math.min(node.layer, 3);
          const label = nodeLabel(step.title);
          return (
            <g key={node.stepId} transform={`translate(${node.x} ${node.y})`}>
              <g
                id={`bl-node-${node.stepId}`}
                role="button"
                tabIndex={0}
                aria-label={nodeAria(node)}
                className={`bl-einzeichnen ${delay ? `bl-einzeichnen-d${delay}` : ''} ${
                  fresh ? 'bl-quittung-pop' : ''
                } cursor-pointer outline-none [&:focus-visible>.bl-focusring]:opacity-100`}
                onClick={(ev) => activate(node, ev.currentTarget as unknown as HTMLElement)}
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter' || ev.key === ' ') {
                    ev.preventDefault();
                    activate(node, ev.currentTarget as unknown as HTMLElement);
                  }
                }}
              >
                {isPlate ? (
                  <>
                    {/* Produkt-Platte: das Ziel des Baums, bewusst größer. */}
                    <rect
                      x={-PLATE_W / 2 - 6}
                      y={-PLATE_H / 2 - 6}
                      width={PLATE_W + 12}
                      height={PLATE_H + 12}
                      rx={14}
                      className="bl-focusring opacity-0"
                      fill="none"
                      stroke="var(--accent)"
                      strokeWidth="2"
                    />
                    <rect
                      x={-PLATE_W / 2}
                      y={-PLATE_H / 2}
                      width={PLATE_W}
                      height={PLATE_H}
                      rx={10}
                      fill={state === 'erledigt' ? 'var(--accent)' : 'var(--paper-2)'}
                      stroke={state === 'gesperrt' ? 'var(--ink-faint)' : 'var(--accent)'}
                      strokeWidth={state === 'gesperrt' ? 1 : 2}
                      strokeDasharray={state === 'gesperrt' ? '4 4' : undefined}
                    />
                    <text x={-PLATE_W / 2 + 18} y={7} fontSize="22" aria-hidden>
                      {project.icon}
                    </text>
                    <text
                      x={-PLATE_W / 2 + 48}
                      y={-4}
                      fontSize="10"
                      className="font-mono"
                      fill={state === 'erledigt' ? 'var(--paper)' : 'var(--ink-faint)'}
                      style={{ textTransform: 'uppercase', letterSpacing: '0.12em' }}
                    >
                      Das Ziel
                    </text>
                    <text
                      x={-PLATE_W / 2 + 48}
                      y={14}
                      fontSize="14"
                      className="font-display"
                      fill={
                        state === 'erledigt'
                          ? 'var(--paper)'
                          : state === 'frei'
                            ? 'var(--ink)'
                            : 'var(--ink-faint)'
                      }
                    >
                      {state === 'erledigt'
                        ? 'Steht. ✓'
                        : state === 'frei'
                          ? 'Finale frei!'
                          : project.title}
                    </text>
                  </>
                ) : (
                  <>
                    <circle r={NODE_R + 12} fill="transparent" />
                    {/* Expliziter Fokus-Kreis (DESIGN.md §7: Fokus auch auf SVG). */}
                    <circle
                      className="bl-focusring opacity-0"
                      r={NODE_R + 6}
                      fill="none"
                      stroke="var(--accent)"
                      strokeWidth="2"
                    />
                    {fresh && (
                      <circle r={NODE_R + 5} fill="none" stroke="var(--accent)" strokeOpacity="0.45" strokeWidth="2" />
                    )}
                    {state === 'erledigt' ? (
                      <>
                        <circle r={NODE_R} fill="var(--accent)" stroke="var(--ink)" strokeOpacity="0.3" />
                        <path d="M -6 0 l 4.5 5 l 8 -10" fill="none" stroke="var(--paper)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </>
                    ) : state === 'frei' ? (
                      <>
                        <circle r={NODE_R} fill="var(--paper-2)" stroke="var(--accent)" strokeWidth="2" />
                        <circle r={3.5} fill="var(--accent)" />
                      </>
                    ) : (
                      <circle r={NODE_R} fill="var(--paper-2)" stroke="var(--ink-faint)" strokeDasharray="3 3" />
                    )}
                    <text
                      textAnchor="middle"
                      y={NODE_R + 16}
                      fontSize={label.size}
                      className="font-mono"
                      fill={state === 'gesperrt' ? 'var(--ink-faint)' : 'var(--ink-2)'}
                    >
                      {label.lines.map((line, li) => (
                        <tspan key={li} x="0" dy={li === 0 ? 0 : 12}>
                          {line}
                        </tspan>
                      ))}
                    </text>
                  </>
                )}
              </g>
            </g>
          );
        })}
      </svg>

      {/* Gesperrt-Karte: erklärt statt zu blockieren (Soft-Feedback). */}
      {lockedStep && (
        <div
          role="dialog"
          aria-label={lockedStep.title}
          className="bl-gleiten mt-3 rounded border border-black/10 bg-paper-2 p-4 shadow"
        >
          <h2 ref={cardHeading} tabIndex={-1} className="font-display text-lg font-semibold outline-none">
            {lockedStep.title}
          </h2>
          <p className="mt-1 text-sm text-ink-2">Dafür brauchst du erst:</p>
          <ul className="mt-1 space-y-0.5">
            {requires.get(lockedStep.id)!.map((r) => (
              <li key={r} className="flex items-center gap-2 text-sm">
                <span aria-hidden className={`font-mono ${stepsDone.has(r) ? 'text-ok' : 'text-ink-faint'}`}>
                  {stepsDone.has(r) ? '✓' : '○'}
                </span>
                <span className={stepsDone.has(r) ? 'text-ink-2' : 'text-ink'}>{titleOf.get(r)}</span>
                <span className="font-mono text-xs text-ink-faint">
                  {stepsDone.has(r) ? 'erledigt' : 'noch offen'}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3">
            <Button variant="ghost" onClick={closeLocked}>
              verstanden
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Produkt-Karte nach dem Meilenstein: Ergebnis + STL-Download ──────────────
function ProductCard({ project, progress, build }: {
  project: ProjectMeta;
  progress: ProjectProgress;
  build?: BuildEntry;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const download = async () => {
    if (!build) return;
    setBusy(true);
    setError(null);
    try {
      downloadStl(await recompileBuild(build), stlFileName(build.label));
    } catch {
      setError('Kompilieren fehlgeschlagen — öffne den Bau-Schritt und exportiere dort.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      aria-label={`${project.title}: fertig`}
      className="bl-einzeichnen mb-4 rounded-lg border border-black/10 bg-paper-2 p-4 shadow"
    >
      <p className="flex items-baseline gap-2">
        <span aria-hidden className="font-mono text-ok">✓</span>
        <span className="font-display text-lg font-semibold text-ink-strong">Steht.</span>
        <span className="ml-auto font-mono text-xs text-ink-2">
          {progress.completedAt && new Date(progress.completedAt).toLocaleDateString('de-DE')}
        </span>
      </p>
      <p className="mt-1 text-sm text-ink-2">{project.buildResult}</p>
      {error && (
        <p role="alert" className="mt-2 text-xs text-fehl">
          <span aria-hidden>✗ </span>
          {error}
        </p>
      )}
      {build && (
        <div className="mt-3">
          <Button variant="secondary" size="sm" onClick={download} disabled={busy}>
            {busy ? 'Fräse läuft …' : 'STL laden'}
          </Button>
        </div>
      )}
    </section>
  );
}

// ── Container: aktives Projekt, Wechsler, Persistenz, Navigation ─────────────
function pickActive(activeId: string | undefined, allProgress: Record<string, ProjectProgress>): ProjectMeta {
  const fromSettings = activeId ? projectById.get(activeId) : undefined;
  if (fromSettings) return fromSettings;
  const started = projects
    .filter((p) => allProgress[p.id] && !allProgress[p.id].completedAt)
    .sort((a, b) => (allProgress[b.id].startedAt < allProgress[a.id].startedAt ? -1 : 1));
  return started[0] ?? projects[0];
}

export default function ProjectTree() {
  const settings = useSettings();
  const allProgress = useAllProgress();
  const builds = useBuilds();
  const navigate = useNavigate();
  const location = useLocation();

  const navState = (location.state ?? null) as { fromProject?: string; fromStep?: string } | null;
  const active = settings && allProgress ? pickActive(settings.activeProject, allProgress) : undefined;
  const stepsDone = useMemo(
    () => new Set(active ? (allProgress?.[active.id]?.stepsDone ?? []) : []),
    [active, allProgress],
  );

  // Beim Einstieg zum nächsten offenen Schritt scrollen — der Baum wächst
  // nach oben, der Anfang liegt unten. Sprung statt Smooth (reduced-motion-fest).
  useEffect(() => {
    if (!active) return;
    const unlocked = unlockedStepIds(active, stepsDone);
    const next = layoutTree(active)
      .nodes.filter((n) => unlocked.has(n.stepId) && !stepsDone.has(n.stepId))
      .sort((a, b) => b.y - a.y)[0];
    if (next) {
      document.getElementById(`bl-node-${next.stepId}`)?.scrollIntoView({ block: 'center' });
    }
  }, [active, stepsDone]);

  if (!settings || !allProgress || !builds || !active) {
    return <ScreenSkeleton layout="detail" />;
  }

  const progress = allProgress[active.id];
  const completed = !!progress?.completedAt;
  const latestBuild = [...builds].reverse().find((b) => b.projectId === active.id);
  const minutesLeft = remainingMinutes(active, progress ?? undefined);
  const softLock = !progress ? missingPrerequisites(active, allProgress) : [];

  // Frisch freigeschaltet: Nachfolger des gerade abgeschlossenen Schritts,
  // die jetzt frei sind (Navigation-State von „Zur Projektkarte").
  const highlight = new Set<string>();
  if (navState?.fromProject === active.id && navState.fromStep && stepsDone.has(navState.fromStep)) {
    const requires = stepRequires(active);
    const unlocked = unlockedStepIds(active, stepsDone);
    for (const s of active.steps) {
      if (
        requires.get(s.id)!.includes(navState.fromStep) &&
        unlocked.has(s.id) &&
        !stepsDone.has(s.id)
      ) {
        highlight.add(s.id);
      }
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-6 md:py-10">
      {/* Projekt-Wechsler: minimale Chips statt eigener Projektliste. */}
      <nav aria-label="Projekt wechseln" className="mb-4 flex flex-wrap gap-2">
        {projects.map((p) => {
          const pp = allProgress[p.id];
          const glyph = pp?.completedAt ? '✓' : pp ? '◔' : '○';
          const isActive = p.id === active.id;
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => void setSetting('activeProject', p.id)}
              className={`flex min-h-11 items-center gap-1.5 rounded border px-3 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                isActive
                  ? 'border-accent bg-paper-2 text-ink shadow'
                  : 'border-black/10 bg-paper text-ink-2 hover:bg-paper-2'
              }`}
            >
              <span aria-hidden>{p.icon}</span>
              <span>{p.title}</span>
              <span aria-hidden className={pp?.completedAt ? 'text-ok' : 'text-ink-faint'}>
                {glyph}
              </span>
            </button>
          );
        })}
      </nav>

      <header className="mb-4">
        <h1 className="font-display text-display-sm text-ink-strong">
          <span aria-hidden className="mr-2">{active.icon}</span>
          {active.title}
        </h1>
        <p className="mt-1 text-sm text-ink-2">{active.challenge}</p>
        {softLock.length > 0 && (
          <p className="mt-2 rounded border border-black/10 bg-paper-sink/70 px-3 py-2 font-mono text-xs text-ink-2">
            Empfohlen vorher: {softLock.map((p) => p.title).join(', ')} — du kannst aber
            jederzeit hier loslegen.
          </p>
        )}
        <div className="mt-3 flex items-center gap-3">
          <ProgressBar
            value={stepsDone.size}
            max={active.steps.length}
            label={`${stepsDone.size} von ${active.steps.length} Schritten erledigt`}
            className="flex-1"
          />
          <span className="whitespace-nowrap font-mono text-xs text-ink-faint">
            {stepsDone.size}/{active.steps.length}
            {!completed && minutesLeft > 0 && ` · ~${minutesLeft} min`}
          </span>
        </div>
      </header>

      {completed && progress && (
        <ProductCard project={active} progress={progress} build={latestBuild} />
      )}

      <ProjectTreeView
        project={active}
        stepsDone={stepsDone}
        highlight={highlight}
        onOpenStep={(index) => navigate(`/projekt/${active.id}/schritt/${index + 1}`)}
      />
    </div>
  );
}
