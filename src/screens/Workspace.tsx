// src/screens/Workspace.tsx — der Kern-Screen (SCREENS.md §6), verdrahtet mit
// der Persistenz (DATENMODELL.md §2.3): Schritt-Fortschritt, Aufgaben-Zustand,
// Mastery, Auffrisch-Karten, Werkstatt-Einträge.

import { useEffect } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  ContentProvider, WorkspaceStep,
  type Concept, type Formula, type Project, type TaskBlock, type TaskResult,
} from '@buildlab/ui';
import { componentIds, concepts, formulas, projectById } from '../content';
import {
  addBuild, completeStep, enterStep, markRefreshShown, setTaskResult,
  useConceptStates, useProgress, useSettings, useTaskStates,
} from '../db/repo';
import { taskKey } from '../db/types';
import NotFound from './NotFound';

export default function Workspace() {
  const { id, n } = useParams();
  const navigate = useNavigate();
  const project = id ? (projectById.get(id) as unknown as Project | undefined) : undefined;
  const progress = useProgress(id ?? '');
  const taskStates = useTaskStates(id ?? '');
  const conceptStates = useConceptStates();
  const settings = useSettings();
  const requested = Math.max(1, Number.parseInt(n ?? '1', 10) || 1);
  const stepIndex = Math.min(requested, project?.steps.length ?? 1) - 1;

  useEffect(() => {
    if (project) void enterStep(project.id, stepIndex);
  }, [project, stepIndex]);

  if (!project) return <NotFound />;
  if (!taskStates || !conceptStates || !settings || progress === undefined) {
    return <div className="p-8 font-mono text-sm text-ink-faint">lädt …</div>;
  }

  // Kein Vorspulen per URL: höchstens bis zum höchsten erreichten Schritt + 1.
  const maxStepReached = Math.max(progress?.maxStepReached ?? 0, stepIndex);
  const allowed = (progress?.maxStepReached ?? 0) + 1;
  if (requested > project.steps.length || requested > allowed + 1) {
    return (
      <Navigate
        to={`/projekt/${project.id}/schritt/${Math.min(allowed, project.steps.length)}`}
        replace
      />
    );
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
    >
      <div className="border-b border-black/10 px-4 py-2 md:px-6">
        <p className="mx-auto max-w-6xl font-mono text-xs uppercase tracking-widest text-ink-faint">
          <span aria-hidden className="mr-1">{project.icon}</span>
          {project.title} · Schritt {stepIndex + 1}/{project.steps.length} „{step.title}“
        </p>
      </div>
      <WorkspaceStep
        project={project}
        stepIndex={stepIndex}
        maxStepReached={maxStepReached}
        depth={settings.depth === 'playful' ? 'intuitive' : settings.depth}
        taskStates={statesForStep}
        seenConcepts={seenConcepts}
        refreshShown={refreshShown}
        onTaskResult={(blockIndex, result) => {
          const block = step.blocks[blockIndex] as TaskBlock;
          void setTaskResult(project.id, step.id, blockIndex, result, block.concepts ?? []);
        }}
        onNavigate={(i) => navigate(`/projekt/${project.id}/schritt/${i + 1}`)}
        onStepComplete={(i) => {
          const s = project.steps[i];
          const introduced = s.blocks.flatMap((b) =>
            b.type === 'text' ? (b.introduces ?? []) : [],
          );
          void completeStep(project.id, s.id, introduced, i === project.steps.length - 1);
        }}
        onMilestone={() => {
          // Werkstatt-Laufzettel entsteht über completedAt; Bau-Einträge kommen
          // aus dem STL-Export (onExport).
        }}
        onOpenConcept={(conceptId) => navigate(`/konzept/${conceptId}`)}
        onRefreshShown={(conceptId) => void markRefreshShown(conceptId, project.id)}
        onExport={(params, label) =>
          void addBuild({ projectId: project.id, cadModel: 'gear', params, label })
        }
      />
    </ContentProvider>
  );
}
