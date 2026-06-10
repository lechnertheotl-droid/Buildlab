// tools/verify/index.mjs — Inhalts-Selbstprüfung (pnpm verify:content).
//
// Prüft den generierten/eingefrorenen Content gegen das Sicherheitsnetz aus
// VERIFICATION.md: schema · units · examples · ranges · tasks · constraints ·
// loop · registry-status · index. Bricht mit Exit-Code 1 ab, sobald ein Fehler
// gefunden wird. Warnungen brechen NICHT ab.
//
// Die semantischen Prüfungen leben in lib.mjs (dort auch von den
// Fixtures-Tests verwendet — der Verifier prüft sich selbst).

import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import { checkUnits } from '@buildlab/engine';
import {
  makeContext, makeReport, checkProject, checkTrainingPool, buildIndex,
} from './lib.mjs';

const root = fileURLToPath(new URL('../..', import.meta.url));
const p = (...parts) => path.join(root, ...parts);
const readJson = (rel) => JSON.parse(readFileSync(p(rel), 'utf8'));

const report = makeReport();
const { err } = report;

// ── Quellen laden ──────────────────────────────────────────────────────────
const contentSchema = readJson('schema/content.schema.json');
const formulaSchema = readJson('schema/formula.schema.json');
const conceptSchema = readJson('schema/concept.schema.json');
const formulas = readJson('content/formulas.json');
const concepts = readJson('content/concepts.json');
const registry = readJson('components.registry.json');

const ctx = makeContext({ formulas, concepts, registry });

const ajv = new Ajv2020({ allErrors: true, strict: false });
ajv.addSchema(contentSchema);
const validateProject = ajv.getSchema('content.schema.json');
const validateTask = ajv.compile({ $ref: 'content.schema.json#/$defs/taskBlock' });
const validateFormula = ajv.compile(formulaSchema);
const validateConcept = ajv.compile(conceptSchema);

const reportAjv = (file, validate) => {
  for (const e of validate.errors ?? []) {
    err(file, `${e.instancePath || '/'} ${e.message}`);
  }
};

// ── 1) schema ────────────────────────────────────────────────────────────────
for (const f of formulas) {
  if (!validateFormula(f)) reportAjv(`content/formulas.json#${f.id}`, validateFormula);
}
for (const c of concepts) {
  if (!validateConcept(c)) reportAjv(`content/concepts.json#${c.id}`, validateConcept);
}

// Nicht-Projekt-Dateien im content-Ordner (eigene Formate, kein Projekt-Schema).
const NON_PROJECT = new Set(['formulas.json', 'concepts.json', 'skillmap.layout.json', '_index.json']);

const projectFiles = readdirSync(p('content'), { withFileTypes: true })
  .filter((e) => e.isFile() && e.name.endsWith('.json') && !NON_PROJECT.has(e.name))
  .map((e) => e.name);

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

// ── 3–16) Projekt-Prüfungen (examples · ranges · tasks · constraints · loop) ─
for (const { file, data } of projects) {
  checkProject(data, ctx, report, file);
}

// ── Trainings-Pools ──────────────────────────────────────────────────────────
if (existsSync(p('content/training'))) {
  for (const file of readdirSync(p('content/training')).filter((n) => n.endsWith('.json'))) {
    const pool = readJson(path.join('content/training', file));
    (pool.tasks ?? []).forEach((task, i) => {
      if (!validateTask(task)) reportAjv(`content/training/${file} › tasks[${i}]`, validateTask);
    });
    checkTrainingPool(pool, ctx, report, file);
  }
}

// ── Skill-Map-Layout: referenzierte Konzepte müssen existieren ───────────────
if (existsSync(p('content/skillmap.layout.json'))) {
  const layout = readJson('content/skillmap.layout.json');
  for (const node of layout.nodes ?? []) {
    if (!ctx.conceptIds.has(node.conceptId)) {
      report.warn('content/skillmap.layout.json', `unbekanntes Konzept '${node.conceptId}'`);
    }
  }
}

// ── 15+17) Einführungs-Eindeutigkeit + Index generieren ──────────────────────
const index = buildIndex(projects, report);
const indexJson = `${JSON.stringify(
  { _doc: 'GENERIERT von tools/verify — nicht von Hand pflegen. Konzept → Einführung/Verwendungen (SCREENS.md §7 „kommt vor in").', concepts: index },
  null,
  2,
)}\n`;
const indexPath = p('content/_index.json');
const current = existsSync(indexPath) ? readFileSync(indexPath, 'utf8') : null;
if (current !== indexJson) {
  writeFileSync(indexPath, indexJson);
  report.warn('content/_index.json', 'war veraltet und wurde neu generiert — bitte mit committen');
}

// ── Bericht ──────────────────────────────────────────────────────────────────
const checked = `${projects.length} Projekt(e), ${formulas.length} Formel(n), ${concepts.length} Konzept(e)`;

for (const w of report.warnings) console.warn(`⚠  ${w}`);

if (report.errors.length) {
  for (const e of report.errors) console.error(`✖  ${e}`);
  console.error(`\nverify:content FEHLGESCHLAGEN — ${report.errors.length} Fehler (${checked}).`);
  process.exit(1);
}

console.log(`✓  verify:content grün — schema · units · examples · ranges · tasks · constraints · loop · index (${checked}).`);
if (report.warnings.length) console.log(`   ${report.warnings.length} Warnung(en).`);
