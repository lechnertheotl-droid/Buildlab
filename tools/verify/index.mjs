// tools/verify/index.mjs — Inhalts-Selbstprüfung (pnpm verify:content).
//
// Prüft den generierten/eingefrorenen Content gegen das Sicherheitsnetz aus
// VERIFICATION.md: schema · units · examples · ranges. Bricht mit Exit-Code 1
// ab, sobald ein Fehler gefunden wird. Warnungen (z. B. Lernbeispiel außerhalb
// des typischen Bereichs) brechen NICHT ab.
//
// Lint, Typecheck, Golden Tests und Build sind eigene pnpm-Skripte und laufen
// in `pnpm verify` vor bzw. nach diesem Schritt.

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import { evaluateFormula, checkUnits } from '@buildlab/engine';

const root = fileURLToPath(new URL('../..', import.meta.url));
const p = (...parts) => path.join(root, ...parts);
const readJson = (rel) => JSON.parse(readFileSync(p(rel), 'utf8'));

const errors = [];
const warnings = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);
const warn = (where, msg) => warnings.push(`${where}: ${msg}`);

// ── Quellen laden ──────────────────────────────────────────────────────────
const contentSchema = readJson('schema/content.schema.json');
const formulaSchema = readJson('schema/formula.schema.json');
const conceptSchema = readJson('schema/concept.schema.json');
const formulas = readJson('content/formulas.json');
const concepts = readJson('content/concepts.json');
const registry = readJson('components.registry.json');

const formulaById = new Map(formulas.map((f) => [f.id, f]));
const conceptIds = new Set(concepts.map((c) => c.id));
const componentIds = new Set(registry.components.map((c) => c.id));

const ajv = new Ajv2020({ allErrors: true, strict: false });
const validateProject = ajv.compile(contentSchema);
const validateFormula = ajv.compile(formulaSchema);
const validateConcept = ajv.compile(conceptSchema);

const ajvWhere = (file) => file;
const reportAjv = (file, validate) => {
  for (const e of validate.errors ?? []) {
    err(ajvWhere(file), `${e.instancePath || '/'} ${e.message}`);
  }
};

// ── 1) schema ────────────────────────────────────────────────────────────────
// formulas.json -> formula.schema, concepts.json -> concept.schema,
// alle übrigen content/*.json -> content.schema (Projekte).
for (const f of formulas) {
  if (!validateFormula(f)) reportAjv(`content/formulas.json#${f.id}`, validateFormula);
}
for (const c of concepts) {
  if (!validateConcept(c)) reportAjv(`content/concepts.json#${c.id}`, validateConcept);
}

const projectFiles = readdirSync(p('content'))
  .filter((name) => name.endsWith('.json'))
  .filter((name) => name !== 'formulas.json' && name !== 'concepts.json');

const projects = [];
for (const file of projectFiles) {
  const data = readJson(path.join('content', file));
  if (!validateProject(data)) {
    reportAjv(`content/${file}`, validateProject);
    continue;
  }
  projects.push({ file, data });
}

// ── 2) units (Dimensionsanalyse jeder Formel) ────────────────────────────────
for (const f of formulas) {
  const res = checkUnits(f);
  if (!res.ok) err(`formula '${f.id}'`, res.reason);
}

// ── Querverweise + 3) examples (run-the-example) + 4) ranges ─────────────────
const REL_TOL = 1e-6; // relative Toleranz für gerechnete Beispiele

for (const { file, data } of projects) {
  for (const concept of data.conceptsIntroduced ?? []) {
    if (!conceptIds.has(concept)) warn(`content/${file}`, `unbekanntes Konzept '${concept}' in conceptsIntroduced`);
  }

  for (const step of data.steps) {
    for (let i = 0; i < step.blocks.length; i++) {
      const block = step.blocks[i];
      const where = `content/${file} › ${step.id} › block[${i}] (${block.type})`;

      if (block.type === 'text') {
        for (const c of [...(block.introduces ?? []), ...(block.uses ?? [])]) {
          if (!conceptIds.has(c)) warn(where, `unbekanntes Konzept '${c}'`);
        }
      }

      if (block.type === 'formula' || block.type === 'calc') {
        if (!formulaById.has(block.formulaId)) {
          err(where, `formulaId '${block.formulaId}' nicht in content/formulas.json`);
        }
      }

      if (block.type === 'interactive' && !componentIds.has(block.componentId)) {
        err(where, `componentId '${block.componentId}' nicht in components.registry.json`);
      }

      if (block.type === 'calc') {
        const formula = formulaById.get(block.formulaId);
        if (!formula) continue;

        // examples: Wert deterministisch aus der Engine rechnen und vergleichen.
        let value;
        try {
          value = evaluateFormula(formula, block.inputs);
        } catch (e) {
          err(where, e.message);
          continue;
        }
        const expected = block.expected.value;
        const diff = Math.abs(value - expected);
        const tol = Math.max(REL_TOL * Math.abs(expected), REL_TOL);
        if (diff > tol) {
          err(where, `Beispiel weicht ab: expected.value=${expected}, Engine=${value} (Δ=${diff})`);
        }
        if (block.expected.unit !== formula.result.unit) {
          err(where, `expected.unit '${block.expected.unit}' ≠ Formel-Einheit '${formula.result.unit}'`);
        }

        // ranges: Eingaben gegen typicalRange der Variablen (Lernbeispiel → Warnung).
        for (const v of formula.variables) {
          const input = block.inputs[v.var];
          if (typeof input !== 'number' || !v.typicalRange) continue;
          const [lo, hi] = v.typicalRange;
          if (input < lo || input > hi) {
            warn(where, `Eingabe ${v.var}=${input} außerhalb typicalRange [${lo}, ${hi}]`);
          }
        }
      }
    }
  }
}

// ── Bericht ──────────────────────────────────────────────────────────────────
const checked = `${projects.length} Projekt(e), ${formulas.length} Formel(n), ${concepts.length} Konzept(e)`;

for (const w of warnings) console.warn(`⚠  ${w}`);

if (errors.length) {
  for (const e of errors) console.error(`✖  ${e}`);
  console.error(`\nverify:content FEHLGESCHLAGEN — ${errors.length} Fehler (${checked}).`);
  process.exit(1);
}

console.log(`✓  verify:content grün — schema · units · examples · ranges (${checked}).`);
if (warnings.length) console.log(`   ${warnings.length} Warnung(en).`);
