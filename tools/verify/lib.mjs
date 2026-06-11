// tools/verify/lib.mjs — Prüf-Bibliothek der Inhalts-Selbstprüfung.
//
// Alle semantischen Prüfungen aus VERIFICATION.md §1–2 als reine Funktionen,
// damit (a) index.mjs sie als CLI fährt und (b) verify.test.mjs sie gegen die
// Fixtures testet (der Verifier prüft sich selbst, VERIFICATION.md §4).
//
// Jede Zahl wird über @buildlab/engine gerechnet — nie hier selbst.

import { evaluateFormula, evaluateExpr } from '@buildlab/engine';

export const REL_TOL = 1e-6; // relative Toleranz für gerechnete Beispiele

export function makeReport() {
  const errors = [];
  const warnings = [];
  return {
    errors,
    warnings,
    err: (where, msg) => errors.push(`${where}: ${msg}`),
    warn: (where, msg) => warnings.push(`${where}: ${msg}`),
  };
}

export function makeContext({ formulas, concepts, registry }) {
  return {
    formulas,
    formulaById: new Map(formulas.map((f) => [f.id, f])),
    conceptIds: new Set(concepts.map((c) => c.id)),
    componentStatus: new Map(
      registry.components.map((c) => [c.id, c.status ?? 'implementiert']),
    ),
  };
}

const within = (value, expected, relTol) =>
  Math.abs(value - expected) <= Math.max(relTol * Math.abs(expected), REL_TOL);

function evalById(ctx, formulaId, inputs, where, report) {
  const formula = ctx.formulaById.get(formulaId);
  if (!formula) {
    report.err(where, `formulaId '${formulaId}' nicht in content/formulas.json`);
    return undefined;
  }
  try {
    return evaluateFormula(formula, inputs);
  } catch (e) {
    report.err(where, e.message);
    return undefined;
  }
}

// ── task-Prüfungen (VERIFICATION.md §2, Regeln 6–11) ─────────────────────────
export function checkTask(task, ctx, where, report) {
  for (const c of task.concepts ?? []) {
    if (!ctx.conceptIds.has(c)) report.err(where, `unbekanntes Konzept '${c}' in task.concepts`);
  }

  const kind = task.kind;

  if (kind === 'single' || kind === 'multi') {
    const correct = new Set(kind === 'single' ? [task.answer] : task.answer);
    if (kind === 'single' && (!Number.isInteger(task.answer) || task.answer < 0 || task.answer >= task.options.length)) {
      report.err(where, `answer ${task.answer} ist kein gültiger Options-Index`);
      return;
    }
    if (kind === 'multi') {
      if (!Array.isArray(task.answer) || task.answer.length < 2) {
        report.err(where, `multi braucht ≥ 2 richtige Optionen (answer-Array)`);
      }
      for (const a of task.answer ?? []) {
        if (!Number.isInteger(a) || a < 0 || a >= task.options.length) {
          report.err(where, `answer-Index ${a} ist kein gültiger Options-Index`);
        }
      }
    }
    task.options.forEach((opt, i) => {
      if (!correct.has(i) && !opt.why) {
        report.err(where, `falsche Option [${i}] ohne 'why' (Feedback-Pflicht)`);
      }
    });
  }

  if (kind === 'numeric') {
    const value = evalById(ctx, task.source.formulaId, task.source.inputs, where, report);
    if (value === undefined) return;
    const tol = task.tolerance ?? 1e-3;
    if (!within(task.answer, value, tol)) {
      report.err(where, `answer ${task.answer} weicht von der Engine ab (Engine=${value})`);
    }
    const formula = ctx.formulaById.get(task.source.formulaId);
    if (formula && task.unit !== formula.result.unit) {
      report.err(where, `unit '${task.unit}' ≠ Formel-Einheit '${formula.result.unit}'`);
    }
    if (task.unitChoices && !task.unitChoices.includes(task.unit)) {
      report.err(where, `unitChoices enthält die korrekte Einheit '${task.unit}' nicht`);
    }
  }

  if (kind === 'estimate') {
    const value = evalById(ctx, task.source.formulaId, task.source.inputs, where, report);
    if (value === undefined) return;
    const { min, max, bands } = task.scale;
    if (value < min || value > max) {
      report.err(where, `Engine-Referenzwert ${value} liegt außerhalb der Schätz-Skala [${min}, ${max}]`);
    }
    for (let i = 1; i < bands.length; i++) {
      if (bands[i] <= bands[i - 1]) report.err(where, `scale.bands müssen aufsteigend sein`);
    }
    if (bands[0] <= 1) report.err(where, `scale.bands sind Faktoren > 1`);
  }

  if (kind === 'target') {
    const { formulaId, vars, goal, proof } = task.target;
    const formula = ctx.formulaById.get(formulaId);
    if (formula) {
      const known = new Set(formula.variables.map((v) => v.var));
      for (const v of vars) {
        if (!known.has(v)) report.err(where, `target.vars: '${v}' ist keine Variable von '${formulaId}'`);
      }
    }
    const pass = evalById(ctx, formulaId, proof.pass, where, report);
    const fail = evalById(ctx, formulaId, proof.fail, where, report);
    if (pass !== undefined && !within(pass, goal.value, goal.tolerance)) {
      report.err(where, `target.proof.pass verfehlt das Ziel (Engine=${pass}, Ziel=${goal.value} ±${goal.tolerance})`);
    }
    if (fail !== undefined && within(fail, goal.value, goal.tolerance)) {
      report.err(where, `target.proof.fail erfüllt das Ziel (Engine=${fail}) — Beweis-Paar unbrauchbar`);
    }
  }

  if (kind === 'error-find') {
    let mismatches = 0;
    for (const [i, row] of task.rows.entries()) {
      const value = evalById(ctx, row.formulaId, row.inputs, `${where} › rows[${i}]`, report);
      if (value === undefined) return;
      if (!within(row.shown, value, REL_TOL)) mismatches++;
    }
    if (mismatches !== 1) {
      report.err(where, `error-find braucht genau eine falsche Zeile, gefunden: ${mismatches}`);
    }
  }

  if (kind === 'order') {
    const n = task.items.length;
    const seen = new Set(task.correctOrder);
    if (task.correctOrder.length !== n || seen.size !== n || [...seen].some((i) => i < 0 || i >= n)) {
      report.err(where, `correctOrder ist keine Permutation der items-Indizes`);
    }
  }

  if (kind === 'match') {
    const lefts = new Set(task.pairs.map((p) => p.left));
    const rights = new Set(task.pairs.map((p) => p.right));
    if (lefts.size !== task.pairs.length || rights.size !== task.pairs.length) {
      report.err(where, `match-Paare müssen links und rechts eindeutig sein`);
    }
  }

  if (kind === 'steps') {
    let prev;
    for (const [i, stage] of task.steps.entries()) {
      const inputs = {};
      let usesPrev = false;
      for (const [k, v] of Object.entries(stage.inputs)) {
        if (v === '$prev') {
          usesPrev = true;
          if (prev === undefined) {
            report.err(where, `steps[${i}]: '$prev' ohne Vorstufe`);
            return;
          }
          inputs[k] = prev;
        } else {
          inputs[k] = v;
        }
      }
      const value = evalById(ctx, stage.formulaId, inputs, `${where} › steps[${i}]`, report);
      if (value === undefined) return;
      if (i > 0 && !usesPrev) {
        report.warn(where, `steps[${i}] nutzt '$prev' nicht — ist der Rechenweg wirklich verkettet?`);
      }
      prev = value;
    }
  }
}

// ── build-Constraints (Regel 12) ─────────────────────────────────────────────
export function checkBuild(block, ctx, where, report) {
  for (const [i, c] of (block.constraints ?? []).entries()) {
    const cw = `${where} › constraints[${i}]`;
    let pass, fail;
    try {
      pass = evaluateExpr(c.expr, c.proof.pass);
      fail = evaluateExpr(c.expr, c.proof.fail);
    } catch (e) {
      report.err(cw, e.message);
      continue;
    }
    if (pass !== true) report.err(cw, `proof.pass erfüllt '${c.expr}' nicht`);
    if (fail !== false) report.err(cw, `proof.fail erfüllt '${c.expr}' — Beweis-Paar unbrauchbar`);
  }
}

// ── Schritt-Graph (Regeln 18–21): requires bildet den Projekt-Baum ──────────
// Quelle der Wahrheit für „welcher Schritt braucht welchen" — die App spiegelt
// dieselbe Semantik in src/dag.ts (Gating + Baum-Layout).
export function normalizeRequires(project) {
  const steps = project.steps;
  const explicit = steps.some((s) => s.requires !== undefined);
  const map = new Map();
  steps.forEach((step, i) => {
    map.set(step.id, explicit ? (step.requires ?? []) : i > 0 ? [steps[i - 1].id] : []);
  });
  return map;
}

// Prüft Form (Regel 18), Zyklenfreiheit (19) und die Meilenstein-Senke (20).
// Liefert je Schritt die transitive Vorfahren-Menge für Regel 21 — oder null,
// wenn der Graph dafür zu kaputt ist (Folgefehler vermeiden).
function checkStepGraph(project, report, file) {
  const where = `content/${file}`;
  const steps = project.steps;
  const ids = new Set(steps.map((s) => s.id));

  // Regel 18 — Form: alles-oder-nichts, bekannte IDs, kein Selbstbezug.
  let formOk = true;
  const without = steps.filter((s) => s.requires === undefined);
  if (without.length > 0 && without.length < steps.length) {
    report.err(
      where,
      `requires-Mischform: entweder tragen ALLE Schritte 'requires' (Wurzeln mit []) oder keiner (ohne: ${without.map((s) => s.id).join(', ')})`,
    );
    formOk = false;
  }
  for (const step of steps) {
    for (const r of step.requires ?? []) {
      if (r === step.id) {
        report.err(`${where} › ${step.id}`, `requires verweist auf sich selbst`);
        formOk = false;
      } else if (!ids.has(r)) {
        report.err(`${where} › ${step.id}`, `requires verweist auf unbekannten Schritt '${r}'`);
        formOk = false;
      }
    }
  }
  if (!formOk) return null;

  const requires = normalizeRequires(project);

  // Regel 19 — azyklisch: Kahn-Topo-Sort über die Kanten require → Schritt.
  const indegree = new Map(steps.map((s) => [s.id, requires.get(s.id).length]));
  const dependents = new Map(steps.map((s) => [s.id, []]));
  for (const step of steps) {
    for (const r of requires.get(step.id)) dependents.get(r).push(step.id);
  }
  const queue = steps.map((s) => s.id).filter((id) => indegree.get(id) === 0);
  const topo = [];
  while (queue.length) {
    const id = queue.shift();
    topo.push(id);
    for (const d of dependents.get(id)) {
      indegree.set(d, indegree.get(d) - 1);
      if (indegree.get(d) === 0) queue.push(d);
    }
  }
  if (topo.length < steps.length) {
    const cycle = steps.map((s) => s.id).filter((id) => !topo.includes(id));
    report.err(where, `requires enthält einen Zyklus (beteiligt: ${cycle.join(', ')})`);
    return null;
  }

  // Transitive Vorfahren je Schritt (topologische Reihenfolge garantiert,
  // dass die Vorfahren der requires schon berechnet sind).
  const ancestors = new Map();
  for (const id of topo) {
    const set = new Set();
    for (const r of requires.get(id)) {
      set.add(r);
      for (const a of ancestors.get(r)) set.add(a);
    }
    ancestors.set(id, set);
  }

  // Regel 20 — Meilenstein-Senke: genau eine Senke, sie ist der meilenstein,
  // und jeder Schritt mündet transitiv in ihn — das Produkt oben im Baum ist
  // die Konvergenz von allem (sonst könnte completedAt mit offenen Schritten
  // feuern).
  const requiredIds = new Set();
  for (const reqs of requires.values()) for (const r of reqs) requiredIds.add(r);
  const sinks = steps.filter((s) => !requiredIds.has(s.id));
  const milestone = steps.find((s) => s.kind === 'meilenstein');
  if (milestone && (sinks.length !== 1 || sinks[0].id !== milestone.id)) {
    report.err(
      where,
      `der Schritt-Graph braucht genau eine Senke, und sie muss der meilenstein sein (Senken: ${sinks.map((s) => s.id).join(', ')})`,
    );
  }
  if (milestone && ancestors.has(milestone.id)) {
    const reached = ancestors.get(milestone.id);
    const missed = steps.filter((s) => s.id !== milestone.id && !reached.has(s.id));
    if (missed.length) {
      report.err(
        where,
        `meilenstein erreicht nicht alle Schritte — außerhalb des Pfads: ${missed.map((s) => s.id).join(', ')}`,
      );
    }
  }
  return ancestors;
}

// ── Projekt-Prüfung (Regeln 13–16, 18–21 + Bestand §1) ───────────────────────
export function checkProject(project, ctx, report, file = project.id) {
  const taskedConcepts = new Set();
  let meilensteine = 0;

  const ancestors = checkStepGraph(project, report, file);

  for (const concept of project.conceptsIntroduced ?? []) {
    if (!ctx.conceptIds.has(concept)) {
      report.warn(`content/${file}`, `unbekanntes Konzept '${concept}' in conceptsIntroduced`);
    }
  }

  project.steps.forEach((step, stepIndex) => {
    const sw = `content/${file} › ${step.id}`;
    if (step.kind === 'meilenstein') {
      meilensteine++;
      if (stepIndex !== project.steps.length - 1) {
        report.err(sw, `meilenstein muss der letzte Schritt sein`);
      }
    }
    if (step.canvas !== undefined && step.canvas >= step.blocks.length) {
      report.err(sw, `canvas-Index ${step.canvas} zeigt auf keinen Block`);
    }

    let hasTask = false;
    let hasApply = false;
    let hasBuild = false;

    step.blocks.forEach((block, i) => {
      const where = `${sw} › block[${i}] (${block.type})`;

      if (block.type === 'text') {
        for (const c of [...(block.introduces ?? []), ...(block.uses ?? [])]) {
          if (!ctx.conceptIds.has(c)) report.warn(where, `unbekanntes Konzept '${c}'`);
        }
      }

      if (block.type === 'formula' || block.type === 'calc') {
        if (!ctx.formulaById.has(block.formulaId)) {
          report.err(where, `formulaId '${block.formulaId}' nicht in content/formulas.json`);
        }
      }

      if (block.type === 'interactive') {
        hasApply = true;
        const status = ctx.componentStatus.get(block.componentId);
        if (status === undefined) {
          report.err(where, `componentId '${block.componentId}' nicht in components.registry.json`);
        } else if (status === 'geplant' && !project.draft) {
          report.err(where, `Komponente '${block.componentId}' ist 'geplant' — nur in draft-Projekten erlaubt`);
        }
      }

      if (block.type === 'calc') {
        hasApply = true;
        const formula = ctx.formulaById.get(block.formulaId);
        if (formula) {
          let value;
          try {
            value = evaluateFormula(formula, block.inputs);
          } catch (e) {
            report.err(where, e.message);
            return;
          }
          if (!within(value, block.expected.value, REL_TOL)) {
            report.err(where, `Beispiel weicht ab: expected.value=${block.expected.value}, Engine=${value}`);
          }
          if (block.expected.unit !== formula.result.unit) {
            report.err(where, `expected.unit '${block.expected.unit}' ≠ Formel-Einheit '${formula.result.unit}'`);
          }
          for (const v of formula.variables) {
            const input = block.inputs[v.var];
            if (typeof input !== 'number' || !v.typicalRange) continue;
            const [lo, hi] = v.typicalRange;
            if (input < lo || input > hi) {
              report.warn(where, `Eingabe ${v.var}=${input} außerhalb typicalRange [${lo}, ${hi}]`);
            }
          }
        }
      }

      if (block.type === 'build') {
        hasBuild = true;
        checkBuild(block, ctx, where, report);
      }

      if (block.type === 'task') {
        hasTask = true;
        for (const c of block.concepts ?? []) taskedConcepts.add(c);
        checkTask(block, ctx, where, report);
      }
    });

    // Loop-Check (Regel 14): Lern-Schritte brauchen Prüfen + Anwenden.
    if (step.kind === 'lernen') {
      if (!hasTask) report.warn(sw, `lernen-Schritt ohne task-Block (Prüfen fehlt)`);
      if (!hasApply) report.warn(sw, `lernen-Schritt ohne interactive/calc (Anwenden fehlt)`);
    }
    if (step.kind === 'bauen' && !hasBuild) {
      report.warn(sw, `bauen-Schritt ohne build-Block`);
    }
  });

  if (meilensteine !== 1) {
    report.err(`content/${file}`, `Projekt braucht genau einen meilenstein-Schritt (gefunden: ${meilensteine})`);
  }

  // Konzept-Abdeckung (Regel 13): jedes eingeführte Konzept wird geprüft.
  for (const c of project.conceptsIntroduced ?? []) {
    if (!taskedConcepts.has(c)) {
      report.warn(`content/${file}`, `Konzept '${c}' wird von keiner Aufgabe geprüft (Konzept ohne Prüfung)`);
    }
  }

  // Regel 21 — Einführung vor Verwendung (DAG-bewusst, projekt-lokal): jedes
  // im Projekt eingeführte Konzept, das ein text.uses oder task.concepts
  // verwendet, muss im selben Schritt vorher (Blockindex) oder in einem
  // transitiven requires-Vorfahren eingeführt sein. Konzepte aus anderen
  // Projekten sind ausgenommen (Auffrisch-Karten decken den Quereinstieg ab).
  if (ancestors) {
    const introducedIn = new Map();
    for (const step of project.steps) {
      step.blocks.forEach((block, i) => {
        if (block.type !== 'text') return;
        for (const c of block.introduces ?? []) {
          if (!introducedIn.has(c)) introducedIn.set(c, { stepId: step.id, blockIndex: i });
        }
      });
    }
    for (const step of project.steps) {
      step.blocks.forEach((block, i) => {
        const used =
          block.type === 'text' ? (block.uses ?? [])
          : block.type === 'task' ? (block.concepts ?? [])
          : [];
        for (const c of used) {
          const intro = introducedIn.get(c);
          if (!intro) continue;
          const okSameStep = intro.stepId === step.id && intro.blockIndex <= i;
          if (!okSameStep && !ancestors.get(step.id).has(intro.stepId)) {
            report.err(
              `content/${file} › ${step.id} › block[${i}] (${block.type})`,
              `Konzept '${c}' wird vor seiner Einführung verwendet (eingeführt in '${intro.stepId}' — kein requires-Vorfahre)`,
            );
          }
        }
      });
    }
  }
}

// ── Einführungs-Eindeutigkeit + Index (Regeln 15, 17) ────────────────────────
export function buildIndex(projects, report) {
  const index = {};
  const entry = (c) => (index[c] ??= { introducedIn: null, usedIn: [] });

  for (const { data } of projects) {
    for (const step of data.steps) {
      for (const block of step.blocks) {
        if (block.type !== 'text') continue;
        for (const c of block.introduces ?? []) {
          const e = entry(c);
          const ref = { project: data.id, step: step.id };
          if (e.introducedIn && e.introducedIn.project !== data.id) {
            report.err(
              `content/${data.id}`,
              `Konzept '${c}' wird mehrfach eingeführt (zuerst in '${e.introducedIn.project}') — introduces ist projektübergreifend eindeutig`,
            );
          } else {
            e.introducedIn = ref;
          }
        }
        for (const c of block.uses ?? []) {
          const e = entry(c);
          if (!e.usedIn.some((u) => u.project === data.id && u.step === step.id)) {
            e.usedIn.push({ project: data.id, step: step.id });
          }
        }
      }
    }
  }

  // Deterministische Reihenfolge (Regel 17: eingefroren & committet).
  const sorted = {};
  for (const key of Object.keys(index).sort()) sorted[key] = index[key];
  return sorted;
}
