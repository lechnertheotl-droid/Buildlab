import { ContentProvider, ProjectView, type Concept, type Formula, type Project } from '@buildlab/ui';
import formulas from '../content/formulas.json';
import concepts from '../content/concepts.json';
import demo from '../content/_demo.json';

// Phase 1: ein handgeschriebenes Projekt-JSON wird allein über die Block-Renderer
// dargestellt. Jede Zahl entsteht weiterhin in packages/engine (calc-Blöcke), nie
// im Markup — Eiserne Regel 1.
export default function App() {
  return (
    <ContentProvider
      formulas={formulas as unknown as Formula[]}
      concepts={concepts as unknown as Concept[]}
    >
      <main className="mm-grid min-h-screen bg-paper font-body text-ink antialiased">
        <div className="mx-auto max-w-3xl px-6 py-16 md:py-24">
          <p className="mb-10 font-mono text-xs uppercase tracking-widest text-ink-faint">
            Phase 1 · Block-Renderer
          </p>
          <ProjectView project={demo as unknown as Project} />
        </div>
      </main>
    </ContentProvider>
  );
}
