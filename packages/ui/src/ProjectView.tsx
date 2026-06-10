// ProjectView.tsx — dünner Wrapper um den Schritt-Workspace (SCREENS.md §6)
// mit In-Memory-Zustand. Die App verdrahtet WorkspaceStep direkt mit der
// Persistenz (src/db); dieser Wrapper dient als eigenständige Vorschau
// (Tests, Storybook-artige Nutzung) ohne Speicher.

import { useState } from 'react';
import { WorkspaceStep } from './workspace/WorkspaceStep';
import type { Layer, Project, TaskResult } from './types';

export function ProjectView({ project, depth = 'practical' }: { project: Project; depth?: Layer }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [maxStepReached, setMaxStepReached] = useState(0);
  const [taskStates, setTaskStates] = useState<Record<string, TaskResult>>({});

  const stepKey = (i: number, blockIndex: number) => `${i}/${blockIndex}`;
  const statesFor = (i: number): Record<number, TaskResult> => {
    const out: Record<number, TaskResult> = {};
    for (const [key, value] of Object.entries(taskStates)) {
      const [s, b] = key.split('/');
      if (Number(s) === i) out[Number(b)] = value;
    }
    return out;
  };

  return (
    <article>
      <header className="mx-auto max-w-6xl px-4 md:px-6">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">
          <span aria-hidden className="mr-1">{project.icon}</span>
          {project.title} · Schritt {stepIndex + 1}/{project.steps.length} „
          {project.steps[stepIndex].title}“
        </p>
      </header>
      <WorkspaceStep
        project={project}
        stepIndex={stepIndex}
        maxStepReached={maxStepReached}
        depth={depth}
        taskStates={statesFor(stepIndex)}
        seenConcepts={new Set(project.conceptsIntroduced ?? [])}
        onTaskResult={(blockIndex, result) =>
          setTaskStates((prev) => ({ ...prev, [stepKey(stepIndex, blockIndex)]: result }))
        }
        onNavigate={(i) => {
          const clamped = Math.max(0, Math.min(project.steps.length - 1, i));
          setStepIndex(clamped);
          setMaxStepReached((m) => Math.max(m, clamped));
        }}
        onStepComplete={(i) => setMaxStepReached((m) => Math.max(m, Math.min(i + 1, project.steps.length - 1)))}
      />
    </article>
  );
}
