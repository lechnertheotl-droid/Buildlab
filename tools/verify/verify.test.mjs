// tools/verify/verify.test.mjs — Der Verifier prüft sich selbst.
//
// Für jede Prüfregel aus VERIFICATION.md §2 liegt in fixtures/fixtures.json ein
// absichtlich kaputtes Mini-Projekt. Dieser Test stellt sicher, dass der
// Verifier den jeweiligen Fehler (bzw. die Warnung) wirklich findet — eine
// Prüfregel ohne Fixture gilt als nicht existent.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { makeContext, makeReport, checkProject, buildIndex } from './lib.mjs';

const read = (rel) => JSON.parse(readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8'));

const formulas = read('../../content/formulas.json');
const concepts = read('../../content/concepts.json');
const registry = read('../../components.registry.json');
const { fixtures } = read('./fixtures/fixtures.json');

const ctx = makeContext({ formulas, concepts, registry });

describe('Verifier-Selbsttest (Fixtures)', () => {
  for (const fx of fixtures) {
    test(fx.name, () => {
      const report = makeReport();
      checkProject(fx.project, ctx, report, `${fx.name}.json`);
      if (fx.expectError) {
        expect(report.errors.join('\n')).toContain(fx.expectError);
      }
      if (fx.expectWarning) {
        expect(report.warnings.join('\n')).toContain(fx.expectWarning);
        expect(report.errors).toEqual([]);
      }
    });
  }

  test('doppelte-einfuehrung (projektübergreifend)', () => {
    const mini = (id) => ({
      data: {
        id,
        steps: [
          {
            id: 's1',
            blocks: [{ type: 'text', introduces: ['drehmoment'], layers: { intuitive: '-' } }],
          },
        ],
      },
    });
    const report = makeReport();
    buildIndex([mini('p1'), mini('p2')], report);
    expect(report.errors.join('\n')).toContain('mehrfach eingeführt');
  });

  test('Gold-Standard stirnradgetriebe ist fehlerfrei', () => {
    const project = read('../../content/stirnradgetriebe.json');
    const report = makeReport();
    checkProject(project, ctx, report, 'stirnradgetriebe.json');
    expect(report.errors).toEqual([]);
    expect(report.warnings).toEqual([]);
  });
});
