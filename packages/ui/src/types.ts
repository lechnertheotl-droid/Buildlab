// Datenmodell der UI — spiegelt schema/content.schema.json & schema/concept.schema.json.
// Die Engine-Typen (Formula, FormulaVariable) bleiben die Quelle der Wahrheit für Formeln.

import type { Formula, FormulaVariable } from '@buildlab/engine';

export type Layer = 'intuitive' | 'practical' | 'rigorous';

export interface Concept {
  id: string;
  name: string;
  symbol?: string;
  unit?: string;
  short: string;
  prerequisites: string[];
  explanation?: { intuitive?: string; practical?: string; rigorous?: string };
  relatedFormulas?: string[];
}

export interface TextBlock {
  type: 'text';
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

export interface BuildBlock {
  type: 'build';
  cadModel: string;
  parameters: Record<string, unknown>;
  exports?: string[];
  bom?: string[];
}

export interface CheckBlock {
  type: 'check';
  kind: 'single' | 'multi' | 'numeric';
  question: string;
  options?: string[];
  answer?: number | number[];
  tolerance?: number;
  unit?: string;
  explanation?: string;
}

export type Block =
  | TextBlock
  | FormulaBlock
  | InteractiveBlock
  | CalcBlock
  | BuildBlock
  | CheckBlock;

export interface Step {
  id: string;
  title: string;
  goal: string;
  estMinutes?: number;
  blocks: Block[];
}

export interface Project {
  id: string;
  title: string;
  level: number;
  buildResult: string;
  challenge: string;
  prerequisites?: string[];
  conceptsIntroduced?: string[];
  steps: Step[];
}

export type { Formula, FormulaVariable };
