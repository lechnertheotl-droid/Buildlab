// src/screens/Workspace.tsx — der Kern-Screen (SCREENS.md §6), verdrahtet mit
// der Persistenz (DATENMODELL.md §2.3): Schritt-Fortschritt, Aufgaben-Zustand,
// Mastery, Auffrisch-Karten. Erreichbar nur über die Projektkarte (Hub-Modell):
// das Gating läuft über den Schritt-Graphen (src/dag.ts), nicht mehr linear.

import { useEffect } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  ContentProvider, ScreenSkeleton, WorkspaceStep,
  type BuildBlock, type Concept, type Formula, type Project, type TaskBlock, type TaskResult,
} from '@buildlab/ui';
import { componentIds, concepts, formulas, projectById } from '../content';
import { nextStepIndex as openStepIndex, unlockedStepIds } from '../dag';
import {
  addBuild, completeStep, enterStep, markRefreshShown, setSetting, setTaskResult,
  useConceptStates, useProgress, useSettings, useTaskStates,
} from '../db/repo';
import { taskKey } from '../db/types';
import NotFound from './NotFound';

export default function Workspace() {
  const { id, n } = useParams();
  const navigate = useNavigate();
  const meta = id ? projectById.get(id) : undefined;
  const project = meta as unknown as Project | undefined;
  const progress = useProgress(id ?? '');
  const taskStates = useTaskStates(id ?? '');
  const conceptStates = useConceptStates();
  const settings = useSettings();
  const requested = Math.max(1, Number.parseInt(n ?? '1', 10) || 1);
  const stepIndex = Math.min(requested, project?.steps.length ?? 1) - 1;

  // Gating über den Schritt-Graphen: erreichbar sind erledigte und
  // freigeschaltete Schritte. Alles andere leitet zur Projektkarte um —
  // sie zeigt, was vorher zu erledigen ist.
  const stepsDone = new Set(progress?.stepsDone ?? []);
  const stepId = meta?.steps[stepIndex]?.id;
  const redirecting =
    !!meta &&
    (requested > meta.steps.length ||
      stepId === undefined ||
      (!stepsDone.has(stepId) && !unlockedStepIds(meta, stepsDone).has(stepId)));

  // Schritt-Besuch erst aufzeichnen, wenn der Fortschritt geladen ist und kein
  // Redirect ansteht — sonst schreibt ein bloßer Deep-Link-Versuch
  // Fortschritt, der nie erarbeitet wurde.
  const progressLoading = progress === undefined;
  useEffect(() => {
    if (!meta || progressLoading || redirecting) return;
    void enterStep(meta.id, stepIndex);
  }, [meta, progressLoading, redirecting, stepIndex]);

  // Die Projektkarte zeigt beim nächsten Besuch dieses Projekt (DATENMODELL §2.1).
  useEffect(() => {
    if (!meta || !settings || settings.activeProject === meta.id) return;
    void setSetting('activeProject', meta.id);
  }, [meta, settings]);

  if (!project || !meta) return <NotFound />;
  if (!taskStates || !conceptStates || !settings || progress === undefined) {
    return <ScreenSkeleton layout="workspace" />;
  }

  if (redirecting) {
    return <Navigate to="/" replace />;
  }

  const step = project.steps[stepIndex];
  const seenConcepts = new Set(
    Object.entries(conceptStates)
      .filter(([, s]) => s.status !== 'neu')
      .map(([cid]) => cid),
  );
  const refreshShown = new Set(
    Object.entries(conceptStates)
      .filter(([, s]) => s.refreshShown.includes(project.id))
      .map(([cid]) => cid),
  );
  const statesForStep: Record<number, TaskResult> = {};
  for (const [key, value] of Object.entries(taskStates)) {
    const blockIndex = Number(key.split('/')[2]);
    if (key === taskKey(project.id, step.id, blockIndex)) statesForStep[blockIndex] = value;
  }

  return (
    <ContentProvider
      formulas={formulas as unknown as Formula[]}
      concepts={concepts as unknown as Concept[]}
      componentIds={componentIds}
      onOpenConcept={(conceptId) => navigate(`/konzept/${conceptId}`)}
    >
      <div className="border-b border-black/10 px-4 py-2 md:px-6">
        <p className="mx-auto max-w-6xl font-mono text-xs uppercase tracking-widest text-ink-faint">
          <span className="hidden md:inline">
            <span aria-hidden className="mr-1">{project.icon}</span>
            {project.title} ·{' '}
          </span>
          Schritt {stepIndex + 1}/{project.steps.length} „{step.title}“
        </p>
      </div>
      <WorkspaceStep
        project={project}
        stepIndex={stepIndex}
        doneCount={stepsDone.size}
        // „Weiter" ist nur bei erledigtem Schritt aktiv — deshalb so rechnen,
        // als wäre der aktuelle Schritt schon in stepsDone (der DB-Write nach
        // dem Lösen läuft asynchron hinterher).
        nextStepIndex={openStepIndex(meta, new Set([...stepsDone, step.id]))}
        depth={settings.depth === 'playful' ? 'intuitive' : settings.depth}
        taskStates={statesForStep}
        seenConcepts={seenConcepts}
        refreshShown={refreshShown}
        onTaskResult={(blockIndex, result) => {
          const block = step.blocks[blockIndex] as TaskBlock;
          void setTaskResult(project.id, step.id, blockIndex, result, block.concepts ?? []);
        }}
        onNavigate={(i) => navigate(`/projekt/${project.id}/schritt/${i + 1}`)}
        onExit={() =>
          navigate('/', { state: { fromProject: project.id, fromStep: step.id } })
        }
        onStepComplete={(i) => {
          const s = project.steps[i];
          const introduced = s.blocks.flatMap((b) =>
            b.type === 'text' ? (b.introduces ?? []) : [],
          );
          void completeStep(project.id, s.id, introduced, s.kind === 'meilenstein');
        }}
        onMilestone={() => {
          // Der Produkt-Knoten der Projektkarte entsteht über completedAt;
          // Bau-Einträge kommen aus dem STL-Export (onExport).
        }}
        onOpenConcept={(conceptId) => navigate(`/konzept/${conceptId}`)}
        onRefreshShown={(conceptId) => void markRefreshShown(conceptId, project.id)}
        onExport={(params, label) => {
          // cadModel aus dem build-Block des Schritts — nicht hartkodieren,
          // sonst landet z. B. die Umlenkrolle als „gear" in der Datenbank.
          const buildBlock = step.blocks.find((b): b is BuildBlock => b.type === 'build');
          void addBuild({
            projectId: project.id,
            cadModel: buildBlock?.cadModel ?? 'gear',
            params,
            label,
          });
        }}
      />
    </ContentProvider>
  );
}
