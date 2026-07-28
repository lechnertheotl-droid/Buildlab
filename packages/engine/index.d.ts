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

// ── Fachwerk-Modul (truss.js) ────────────────────────────────────────────────

/** Knoten in mm; y zeigt nach oben. */
export interface TrussNode {
  x: number;
  y: number;
}

/** Stab zwischen zwei Knoten-Indizes. */
export interface TrussBar {
  from: number;
  to: number;
}

/** Auflager: gesperrte Richtungen am Knoten (Festlager: fx+fy, Loslager: fy). */
export interface TrussSupport {
  node: number;
  fx?: boolean;
  fy?: boolean;
}

/** Äußere Kraft am Knoten in N (y nach oben, Gewicht also fy < 0). */
export interface TrussLoad {
  node: number;
  fx?: number;
  fy?: number;
}

export interface TrussTopology {
  nodes: TrussNode[];
  bars: TrussBar[];
  supports: TrussSupport[];
}

export interface TrussProblem extends TrussTopology {
  loads: TrussLoad[];
}

export interface DeterminacyResult {
  k: number;
  s: number;
  r: number;
  /** f = 2k − (s + r); 0 = statisch bestimmt. */
  f: number;
}

export interface TrussReaction {
  node: number;
  fx: number;
  fy: number;
}

export interface TrussSolution {
  /** Stabkraft je Stab: > 0 Zug, < 0 Druck (N). */
  barForces: number[];
  reactions: TrussReaction[];
  maxAbs: number;
  maxAbsIndex: number;
}

/** Zählt k, s, r und liefert den Freiheitsgrad f = 2k − (s + r). */
export function checkDeterminacy(topology: TrussTopology): DeterminacyResult;

/** Löst ein statisch bestimmtes Fachwerk per Knotenpunktverfahren (lusolve). */
export function solveTruss(problem: TrussProblem): TrussSolution;

/** Gleichgewichtsresiduum je Knoten (Testhilfe) — muss überall ≈ 0 sein. */
export function trussResiduals(
  problem: TrussProblem,
  solution: Pick<TrussSolution, 'barForces' | 'reactions'>,
): { fx: number; fy: number }[];

// ── Brücken-Presets: eine Quelle für Löser, Bau-Panel und CAD ────────────────

/** Spannweite aller Brücken-Presets in mm. */
export declare const BRIDGE_SPAN: number;

export interface BridgeGeometry extends TrussTopology {
  label: string;
  /** Knoten, an dem die Last angreift (Mitte des Untergurts). */
  loadNode: number;
}

/** Waagerechter Abstand Auflager → erster Obergurt-/Firstknoten. */
export function bridgeDiagonalRun(preset: number): number;

/** Topologie und Geometrie einer Bauart (1 = Dreieck, 2 = Trapez). */
export function bridgePreset(preset: number, h: number): BridgeGeometry;

/** Preset unter mittiger Last F lösen. */
export function solveBridge(preset: number, h: number, F: number): BridgeGeometry & TrussSolution;

/** Gesamte Stablänge der Bauart (mm) — Grundlage des Material-Budgets. */
export function bridgeBarLength(preset: number, h: number): number;
