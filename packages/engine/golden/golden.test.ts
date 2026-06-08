// Golden Tests — das Herz der Prüfungsgenauigkeit (siehe VERIFICATION.md).
// Klausur-/Lehrbuchaufgaben mit bekannter Lösung. Bricht die Engine, bricht hier.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { evaluateFormula, type Formula } from '@buildlab/engine';

interface GoldenCase {
  id: string;
  formulaId: string;
  inputs: Record<string, number>;
  expected: { value: number; unit: string };
  tol: number;
}

const formulas: Formula[] = JSON.parse(
  readFileSync(new URL('../../../content/formulas.json', import.meta.url), 'utf8'),
);
const cases: GoldenCase[] = JSON.parse(
  readFileSync(new URL('./cases.json', import.meta.url), 'utf8'),
);

describe('Golden Tests', () => {
  for (const c of cases) {
    it(`${c.id} → ${c.formulaId}`, () => {
      const formula = formulas.find((f) => f.id === c.formulaId);
      expect(formula, `Formel '${c.formulaId}' fehlt in content/formulas.json`).toBeDefined();
      const value = evaluateFormula(formula!, c.inputs);
      expect(Math.abs(value - c.expected.value)).toBeLessThanOrEqual(c.tol);
      expect(formula!.result.unit).toBe(c.expected.unit);
    });
  }
});

describe('Abdeckung', () => {
  // VERIFICATION.md: bevor eine Formel in die Bibliothek kommt, gibt es
  // mindestens einen Golden Test dafür.
  it('jede Formel hat mindestens einen Golden Case', () => {
    const covered = new Set(cases.map((c) => c.formulaId));
    const missing = formulas.filter((f) => !covered.has(f.id)).map((f) => f.id);
    expect(missing, `Formeln ohne Golden Case: ${missing.join(', ')}`).toEqual([]);
  });
});
