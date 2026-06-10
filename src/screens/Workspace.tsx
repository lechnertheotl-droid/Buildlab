// src/screens/Workspace.tsx — Route-Anbindung des Kern-Screens (SCREENS.md §6).
// ÜBERGANGSSTAND (Phase R4-Wiring folgt): rendert ProjectView; die
// Schritt-Persistenz (enterStep) läuft bereits über src/db.

import { useEffect } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { ContentProvider, ProjectView, type Concept, type Formula, type Project } from '@buildlab/ui';
import { componentIds, concepts, formulas, projectById } from '../content';
import { enterStep, useProgress } from '../db/repo';
import NotFound from './NotFound';

export default function Workspace() {
  const { id, n } = useParams();
  const project = id ? projectById.get(id) : undefined;
  const progress = useProgress(id ?? '');
  const requested = Math.max(1, Number.parseInt(n ?? '1', 10) || 1);

  useEffect(() => {
    if (project) void enterStep(project.id, Math.min(requested, project.steps.length) - 1);
  }, [project, requested]);

  if (!project) return <NotFound />;

  // Kein Vorspulen per URL: höchstens bis zum höchsten erreichten Schritt + 1.
  const maxAllowed = (progress?.maxStepReached ?? 0) + 1;
  if (requested > project.steps.length || requested > maxAllowed + 1) {
    return <Navigate to={`/projekt/${project.id}/schritt/${Math.min(maxAllowed, project.steps.length)}`} replace />;
  }

  return (
    <ContentProvider
      formulas={formulas as unknown as Formula[]}
      concepts={concepts as unknown as Concept[]}
      componentIds={componentIds}
    >
      <div className="mx-auto max-w-3xl px-6 py-10">
        <ProjectView project={project as unknown as Project} />
      </div>
    </ContentProvider>
  );
}
