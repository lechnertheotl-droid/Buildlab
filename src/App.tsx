import {
  CalculatorDrawer,
  ContentProvider,
  ProjectView,
  type Concept,
  type Formula,
  type Project,
} from '@buildlab/ui';
import formulas from '../content/formulas.json';
import concepts from '../content/concepts.json';
import demo from '../content/_demo.json';
import registry from '../components.registry.json';

// Phase 2: pseudo-3D Visual-Layer. interactive-Blöcke rendern echte Komponenten
// (z. B. der Kraft/Hebel-Slider), deren Zahlen weiterhin aus packages/engine
// kommen (Eiserne Regel 1). Der Universal-Rechner ist über die Lasche rechts
// auf jedem Screen erreichbar.
const componentIds = registry.components.map((c) => c.id);

export default function App() {
  return (
    <ContentProvider
      formulas={formulas as unknown as Formula[]}
      concepts={concepts as unknown as Concept[]}
      componentIds={componentIds}
    >
      <main className="mm-grid min-h-screen bg-paper font-body text-ink antialiased">
        <div className="mx-auto max-w-3xl px-6 py-16 md:py-24">
          <p className="mb-10 font-mono text-xs uppercase tracking-widest text-ink-faint">
            Phase 2 · Pseudo-3D & Interaktivität
          </p>
          <ProjectView project={demo as unknown as Project} />
        </div>
        <CalculatorDrawer />
      </main>
    </ContentProvider>
  );
}
