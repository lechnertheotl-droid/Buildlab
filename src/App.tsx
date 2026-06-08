import { evaluateById, type Formula } from '@buildlab/engine';
import formulas from '../content/formulas.json';

// Beweist die Kette „KI schreibt, Engine rechnet": dieser Wert wird nicht im
// Markup hartkodiert, sondern deterministisch aus packages/engine geholt.
const demo = evaluateById(formulas as unknown as Formula[], 'ratio', { z2: 60, z1: 20 });

export default function App() {
  return (
    <main className="min-h-screen bg-paper text-ink font-body antialiased">
      <div className="mx-auto max-w-2xl px-6 py-24">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">
          Phase 0 · Fundament &amp; Sicherheitsnetz
        </p>
        <h1 className="mt-3 font-display text-5xl leading-[1.1] tracking-tight">
          Buildlab
        </h1>
        <p className="mt-4 max-w-prose text-ink-2">
          Maschinenbau zum Anfassen. Das Sicherheitsnetz steht: Schema, Engine,
          Golden Tests und <span className="font-mono">verify</span> laufen, bevor
          es Inhalte gibt.
        </p>

        <div className="mt-10 rounded border border-black/10 bg-paper-2 p-6 shadow">
          <p className="text-sm text-ink-2">
            Beispielrechnung aus der Engine — Übersetzung{' '}
            <span className="font-mono">i = z₂/z₁</span>:
          </p>
          <p className="mt-2 font-mono text-2xl text-accent-ink">
            i = {demo.value} {demo.unit !== '-' ? demo.unit : ''}
          </p>
        </div>
      </div>
    </main>
  );
}
