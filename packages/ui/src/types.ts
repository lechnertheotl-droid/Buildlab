// Datenmodell der UI — spiegelt schema/content.schema.json (v2) & schema/concept.schema.json.
// Die Engine-Typen (Formula, FormulaVariable) bleiben die Quelle der Wahrheit für Formeln.

import type { Formula, FormulaVariable } from '@buildlab/engine';

export type Layer = 'intuitive' | 'practical' | 'rigorous';

export interface Concept {
  id: string;
  name: string;
  symbol?: string;
  unit?: string;
  short: string;
  group?: string;
  prerequisites: string[];
  explanation?: { intuitive?: string; practical?: string; rigorous?: string };
  relatedFormulas?: string[];
}

export interface TextBlock {
  type: 'text';
  variant?: 'hook' | 'merksatz' | 'hinweis';
  layers: { intuitive: string; practical?: string; rigorous?: string };
  introduces?: string[];
  uses?: string[];
}

export interface FormulaBlock {
  type: 'formula';
  formulaId: string;
  note?: string;
}

export interface InteractiveBlock {
  type: 'interactive';
  componentId: string;
  params?: Record<string, unknown>;
  caption?: string;
}

export interface CalcBlock {
  type: 'calc';
  formulaId: string;
  inputs: Record<string, number>;
  expected: { value: number; unit: string };
  narrative?: string;
}

export interface BuildConstraint {
  expr: string;
  label: string;
  proof: { pass: Record<string, number>; fail: Record<string, number> };
}

export interface BuildParameter {
  min: number;
  max: number;
  default: number;
  unit: string;
  label?: string;
}

export interface BuildBlock {
  type: 'build';
  cadModel: string;
  parameters: Record<string, BuildParameter>;
  constraints?: BuildConstraint[];
  exports?: string[];
  bom?: string[];
}

// ── task: neun Aufgabenarten (ENGINE_SPEC.md §3, LERNMODELL.md §8) ───────────

export type TaskKind =
  | 'single'
  | 'multi'
  | 'numeric'
  | 'estimate'
  | 'target'
  | 'error-find'
  | 'order'
  | 'match'
  | 'steps';

export interface TaskOption {
  text: string;
  /** Feedback, warum diese (falsche) Option verführt — Pflicht an falschen Optionen. */
  why?: string;
}

export interface TaskSource {
  formulaId: string;
  inputs: Record<string, number>;
}

export interface TaskScale {
  min: number;
  max: number;
  log?: boolean;
  /** Faktor-Bänder fürs Feedback, z. B. [2, 5]. */
  bands: number[];
}

export interface TaskTargetSpec {
  formulaId: string;
  vars: string[];
  goal: { value: number; tolerance: number };
  proof: { pass: Record<string, number>; fail: Record<string, number> };
}

export interface TaskRow {
  label: string;
  formulaId: string;
  inputs: Record<string, number>;
  shown: number;
}

export interface TaskStage {
  prompt: string;
  formulaId: string;
  /** "$prev" referenziert das (eingegebene) Ergebnis der Vorstufe. */
  inputs: Record<string, number | '$prev'>;
  tolerance?: number;
}

export interface TaskBlock {
  type: 'task';
  kind: TaskKind;
  question: string;
  /** Geprüfte Konzept-IDs — Mastery-Verdrahtung (Pflicht). */
  concepts: string[];
  minDepth?: 'rigorous';
  hint?: string;
  explanation?: string;
  options?: TaskOption[];
  answer?: number | number[];
  tolerance?: number;
  unit?: string;
  unitChoices?: string[];
  source?: TaskSource;
  scale?: TaskScale;
  target?: TaskTargetSpec;
  rows?: TaskRow[];
  items?: string[];
  correctOrder?: number[];
  pairs?: { left: string; right: string }[];
  steps?: TaskStage[];
}

export type Block =
  | TextBlock
  | FormulaBlock
  | InteractiveBlock
  | CalcBlock
  | BuildBlock
  | TaskBlock;

export type StepKind = 'lernen' | 'bauen' | 'meilenstein';

export interface Step {
  id: string;
  title: string;
  goal: string;
  kind: StepKind;
  /** Index des Blocks für die Canvas-Spalte (Default: erster interactive/build). */
  canvas?: number;
  estMinutes?: number;
  /** Nur für meilenstein: Teile-Labels der Explosionsansicht, von unten nach oben. */
  finaleParts?: string[];
  blocks: Block[];
}

export interface Project {
  id: string;
  title: string;
  version: number;
  level: number;
  icon: string;
  durationMin?: number;
  difficulty?: number;
  draft?: boolean;
  buildResult: string;
  challenge: string;
  recommendedAfter?: string[];
  conceptsIntroduced?: string[];
  steps: Step[];
}

// ── Aufgaben-Zustand (persistiert in src/db, hier nur die Form) ──────────────

export interface TaskResult {
  solved: boolean;
  attempts: number;
  usedHelp: boolean;
}

export type { Formula, FormulaVariable };
