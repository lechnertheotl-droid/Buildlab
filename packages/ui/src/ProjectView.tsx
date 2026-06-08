// ProjectView.tsx — rendert ein Projekt-JSON statisch (Phase 1).
// Der echte „eine-Aufgabe-pro-Screen"-Workspace (SCREENS.md §5) kommt mit der
// Interaktivität in Phase 2; hier zeigen wir die Schritte gestapelt als Beleg,
// dass die Block-Renderer ein vollständiges Projekt korrekt darstellen.

import { BlockRenderer } from './blocks';
import type { Project, Step } from './types';

function StepView({ step, index, total }: { step: Step; index: number; total: number }) {
  return (
    <section className="border-t border-black/10 pt-10">
      <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">
        Schritt {index + 1} / {total}
        {step.estMinutes ? ` · ~${step.estMinutes} min` : ''}
      </p>
      <h2 className="mt-2 font-display text-2xl tracking-tight text-ink">{step.title}</h2>
      <p className="mt-1 max-w-prose text-sm italic text-ink-2">{step.goal}</p>

      <div className="mt-6 flex flex-col gap-6">
        {step.blocks.map((block, i) => (
          <BlockRenderer key={i} block={block} />
        ))}
      </div>
    </section>
  );
}

export function ProjectView({ project }: { project: Project }) {
  return (
    <article className="flex flex-col gap-12">
      <header>
        <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">
          Projekt · Level {project.level}
        </p>
        <h1 className="mt-2 font-display text-4xl leading-[1.1] tracking-tight text-ink">
          {project.title}
        </h1>
        <p className="mt-4 max-w-prose leading-relaxed text-ink-2">
          <span className="font-medium text-ink">Challenge:</span> {project.challenge}
        </p>
        <p className="mt-1 max-w-prose leading-relaxed text-ink-2">
          <span className="font-medium text-ink">Am Ende hast du:</span> {project.buildResult}
        </p>
      </header>

      {project.steps.map((step, i) => (
        <StepView key={step.id} step={step} index={i} total={project.steps.length} />
      ))}
    </article>
  );
}
