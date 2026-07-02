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

/** Wertet einen freien mathjs-Ausdruck (Zahl oder Boolean) über einem Zahlen-Scope aus. */
export function evaluateExpr(expr: string, scope: Record<string, number>): number | boolean;

/** Sucht eine Formel per id und liefert { id, value, unit }. */
export function evaluateById(
  formulas: Formula[],
  id: string,
  inputs: Record<string, number>,
): EvalResult;

/** Dimensionsanalyse: prüft, ob die Ergebnis-Dimension zu result.unit passt. */
export function checkUnits(formula: Formula): UnitCheckResult;

// ── Raketen-Modul (rocket.js) ────────────────────────────────────────────────

export interface MotorData {
  name: string;
  diameterMm: number;
  lengthMm: number;
  totalMassKg: number;
  propellantMassKg: number;
  /** Schubkurven-Stützpunkte [t in s, F in N] im Stil des .eng-Formats. */
  points: [number, number][];
}

export declare const MOTORS: Record<string, MotorData>;

/** Schub zum Zeitpunkt t (linear interpoliert; 0 außerhalb der Kurve). */
export function thrustAt(motor: MotorData, t: number): number;

/** Gesamtimpuls I = ∫F dt als Trapezsumme über die Stützpunkte. */
export function totalImpulse(motor: MotorData): number;

export interface RocketGeometry {
  d: number;
  tubeLen: number;
  noseLen: number;
  finRoot: number;
  finTip: number;
  finSpan: number;
  finCount: number;
  /** Ballast (Knete) in der Nase, in Gramm. */
  ballast?: number;
  motor?: MotorData;
}

/** Die vier Massenpaare — exakt die Variablen der Formel rocket_cg. */
export interface RocketMasses {
  mNase: number;
  xNase: number;
  mRohr: number;
  xRohr: number;
  mFin: number;
  xFin: number;
  mMotor: number;
  xMotor: number;
}

export interface RocketDerived {
  masses: RocketMasses;
  /** Strukturmasse inkl. Ballast, ohne Motor (g). */
  massEmptyG: number;
  xcg: number;
  xcp: number;
  stability: number;
}

/** Massenmodell + Schwerpunkt (mit Motor) + Barrowman-Druckpunkt + Stabilität. */
export function computeRocket(geo: RocketGeometry): RocketDerived;

/** Druckpunkt nach Barrowman (reduziert) — Mathematik der Formel rocket_cp. */
export function barrowmanCp(geo: Omit<RocketGeometry, 'ballast' | 'motor'>): number;

export interface FlightOptions {
  /** Motor-Name aus MOTORS (z. B. 'C6') oder eigener Datensatz. */
  motor?: string | MotorData;
  /** Strukturmasse inkl. Ballast, ohne Motor (g). */
  massEmptyG: number;
  /** Rohrdurchmesser in mm (bestimmt die Stirnfläche). */
  d: number;
  cw?: number;
  rho?: number;
  dt?: number;
}

export interface FlightSample {
  t: number;
  h: number;
  v: number;
}

export interface FlightResult {
  apogee: number;
  vMax: number;
  tApogee: number;
  tBurnout: number;
  vBurnout: number;
  trajectory: FlightSample[];
}

/** Senkrechter Flug per RK4 (fester Schritt): h(t), Apogäum, v_max. */
export function simulateFlight(opts: FlightOptions): FlightResult;
