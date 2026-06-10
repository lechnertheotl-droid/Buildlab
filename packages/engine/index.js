// packages/engine — Die deterministische Rechen-Engine.
// EISERNE REGEL 1: Kein LLM-Output enthält je eine selbst gerechnete Zahl.
// Jede Zahl im ganzen Projekt kommt aus dieser Datei.
//
// Bewusst als ESM-JavaScript (+ index.d.ts) geschrieben, damit dieselbe Engine
// von rohem `node` (tools/eval.mjs, tools/verify) UND von Vite/React/Vitest
// (mit Typen) genutzt werden kann — eine einzige Quelle der Wahrheit.

import { create, all } from 'mathjs';

const math = create(all, {});

// Fachlich dimensionslose Einheiten-Labels, die mathjs nicht als Unit kennt.
const DIMENSIONLESS_LABELS = new Set(['-', 'Kaliber']);

const isDimensionlessLabel = (unit) => !unit || DIMENSIONLESS_LABELS.has(unit);

/**
 * Wertet eine Formel rein numerisch aus.
 * Eingaben sind Zahlen in der Basis-Einheit der jeweiligen Variable.
 */
export function evaluateFormula(formula, inputs) {
  const needed = formula.variables.map((v) => v.var);
  const missing = needed.filter((name) => !(name in inputs));
  if (missing.length) {
    throw new Error(`Formel '${formula.id}': fehlende Eingaben ${missing.join(', ')}`);
  }
  const value = math.evaluate(formula.expr, inputs);
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Formel '${formula.id}': Ergebnis ist keine endliche Zahl.`);
  }
  return value;
}

/**
 * Wertet einen freien mathjs-Ausdruck über einem reinen Zahlen-Scope aus
 * (z. B. build-Constraints wie "abs(z2/z1 - 3)/3 <= 0.05").
 * Liefert eine Zahl oder einen Boolean — alles andere ist ein Fehler.
 */
export function evaluateExpr(expr, scope) {
  for (const [k, v] of Object.entries(scope)) {
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      throw new Error(`Ausdruck '${expr}': Scope-Wert '${k}' ist keine endliche Zahl.`);
    }
  }
  const value = math.evaluate(expr, { ...scope });
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  throw new Error(`Ausdruck '${expr}': Ergebnis ist weder Zahl noch Boolean.`);
}

/**
 * Sucht eine Formel per id und wertet sie aus.
 * Liefert { id, value, unit } — das Format, das tools/eval.mjs ausgibt.
 */
export function evaluateById(formulas, id, inputs) {
  const formula = formulas.find((f) => f.id === id);
  if (!formula) {
    throw new Error(`Formel '${id}' nicht gefunden.`);
  }
  return { id, value: evaluateFormula(formula, inputs), unit: formula.result.unit };
}

/**
 * Dimensionsanalyse: wertet die Formel mit Einheiten (statt Zahlen) aus und
 * prüft, ob die Dimension des Ergebnisses zu result.unit passt.
 */
export function checkUnits(formula) {
  const scope = {};
  for (const v of formula.variables) {
    if (isDimensionlessLabel(v.unit)) {
      scope[v.var] = 1;
      continue;
    }
    try {
      scope[v.var] = math.unit(1, v.unit);
    } catch (e) {
      return { ok: false, reason: `Variable '${v.var}': unbekannte Einheit '${v.unit}' (${e.message})` };
    }
  }

  let result;
  try {
    result = math.evaluate(formula.expr, scope);
  } catch (e) {
    return { ok: false, reason: `Auswertung mit Einheiten fehlgeschlagen: ${e.message}` };
  }

  const expectedDimensionless = isDimensionlessLabel(formula.result.unit);
  const resultIsUnit = math.isUnit(result);
  const resultDimensionless = !resultIsUnit || result.dimensions.every((d) => d === 0);

  if (expectedDimensionless) {
    if (!resultDimensionless) {
      return { ok: false, reason: `Ergebnis hat eine Dimension, erwartet war dimensionslos ('${formula.result.unit}').` };
    }
    return { ok: true };
  }

  if (resultDimensionless) {
    return { ok: false, reason: `Ergebnis ist dimensionslos, erwartet war '${formula.result.unit}'.` };
  }

  let expectedUnit;
  try {
    expectedUnit = math.unit(1, formula.result.unit);
  } catch (e) {
    return { ok: false, reason: `Ergebnis-Einheit '${formula.result.unit}' ist unbekannt (${e.message}).` };
  }
  if (!result.equalBase(expectedUnit)) {
    return { ok: false, reason: `Ergebnis-Dimension passt nicht zu '${formula.result.unit}'.` };
  }
  return { ok: true };
}
