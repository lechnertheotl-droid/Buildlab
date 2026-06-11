// src/db/types.ts — Typen des persistenten Zustands.
// Verbindliche Definition: DATENMODELL.md §2. Kein Store ohne Eintrag dort.

export type Depth = 'playful' | 'practical' | 'rigorous';
export type Persona = 'studium' | 'azubi' | 'maker';
export type ConceptStatus = 'neu' | 'gesehen' | 'angewendet' | 'sicher';

export interface SettingsShape {
  /** @deprecated Onboarding entfällt (R9) — wird toleriert, nie mehr geschrieben. */
  onboardingDone: boolean;
  /** @deprecated Persona entfällt mit dem Onboarding (R9). */
  persona?: Persona;
  depth: Depth;
  reducedMotion: boolean;
  /** Projekt, dessen Baum die Projektkarte zeigt (DATENMODELL.md §2.1). */
  activeProject?: string;
  schemaVersion: number;
}

export interface ProjectProgress {
  /** Zuletzt besuchter Schritt — nur Resume-Hinweis, kein Gating (R9). */
  currentStep: number;
  /** @deprecated Lineares Gating (vor R9). Wird weiter geschrieben, nie gelesen — Backups bleiben formgleich. */
  maxStepReached: number;
  /** Erledigte Schritt-IDs — die Wahrheit fürs DAG-Gating (src/dag.ts). */
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
