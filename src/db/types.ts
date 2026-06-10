// src/db/types.ts — Typen des persistenten Zustands.
// Verbindliche Definition: DATENMODELL.md §2. Kein Store ohne Eintrag dort.

export type Depth = 'playful' | 'practical' | 'rigorous';
export type Persona = 'studium' | 'azubi' | 'maker';
export type ConceptStatus = 'neu' | 'gesehen' | 'angewendet' | 'sicher';

export interface SettingsShape {
  onboardingDone: boolean;
  persona?: Persona;
  depth: Depth;
  reducedMotion: boolean;
  schemaVersion: number;
}

export interface ProjectProgress {
  currentStep: number;
  maxStepReached: number;
  stepsDone: string[];
  startedAt: string;
  completedAt?: string;
}

export interface TaskStateEntry {
  solved: boolean;
  attempts: number;
  usedHelp: boolean;
  solvedAt?: string;
}

export interface ConceptStateEntry {
  status: ConceptStatus;
  box: 1 | 2 | 3 | 4 | 5;
  due: string | null;
  lastSeenIn?: string;
  refreshShown: string[];
}

export interface CalcHistoryEntry {
  expr: string;
  /** Formatiertes Ergebnis inkl. Einheit (z. B. "29,43 N·m"). */
  display: string;
  at: string;
}

export interface BuildEntry {
  projectId: string;
  cadModel: string;
  params: Record<string, number>;
  label: string;
  at: string;
}

/** Leitner-Intervalle in Tagen je Box (LERNMODELL.md §3.1). */
export const BOX_INTERVALS: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 1,
  2: 3,
  3: 7,
  4: 16,
  5: 35,
};

export const taskKey = (projectId: string, stepId: string, blockIndex: number) =>
  `${projectId}/${stepId}/${blockIndex}`;
