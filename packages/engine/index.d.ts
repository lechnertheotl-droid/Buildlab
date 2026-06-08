// Typen für die Rechen-Engine. Implementierung in index.js (ESM).

export interface FormulaVariable {
  var: string;
  symbol: string;
  name: string;
  unit: string;
  explanation: string;
  typicalRange?: [number, number];
}

export interface FormulaResult {
  symbol: string;
  name: string;
  unit: string;
}

export interface Formula {
  id: string;
  latex: string;
  expr: string;
  conceptId?: string;
  result: FormulaResult;
  variables: FormulaVariable[];
}

export interface UnitCheckResult {
  ok: boolean;
  reason?: string;
}

export interface EvalResult {
  id: string;
  value: number;
  unit: string;
}

/** Wertet eine Formel numerisch aus (Eingaben in Basis-Einheit der Variable). */
export function evaluateFormula(formula: Formula, inputs: Record<string, number>): number;

/** Sucht eine Formel per id und liefert { id, value, unit }. */
export function evaluateById(
  formulas: Formula[],
  id: string,
  inputs: Record<string, number>,
): EvalResult;

/** Dimensionsanalyse: prüft, ob die Ergebnis-Dimension zu result.unit passt. */
export function checkUnits(formula: Formula): UnitCheckResult;
