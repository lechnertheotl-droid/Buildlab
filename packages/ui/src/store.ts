// store.ts — minimaler Zustand-Store (CLAUDE.md: State = Zustand, bewusst minimal).
//
// Hält den „aktiven Rechenkontext" des laufenden Schritts: welche Formel gerade
// interaktiv bespielt wird und mit welchen Werten. Das ist die Brücke zwischen
// (a) interaktiver Komponente und Universal-Rechner (SCREENS.md §12) und
// (b) Canvas-Komponente und target-Aufgabe (SCREENS.md §6.2: gemeinsamer
// Engine-Kontext — die Aufgabe wertet die Formel mit den aktuellen
// Slider-Werten aus und quittiert automatisch).

import { create } from 'zustand';

export interface ActiveContext {
  /** Formel-ID aus content/formulas.json. */
  formulaId: string;
  /** Anzeigename für den Rechner (z. B. Schritt-Titel). */
  label: string;
  /** Aktuelle Variablenwerte (var-Name → Zahl in Basis-Einheit). */
  values: Record<string, number>;
}

interface WorkspaceState {
  active: ActiveContext | null;
  setActive: (ctx: ActiveContext) => void;
  clearActive: (formulaId: string) => void;
  /**
   * Aktuelle Eingaben der Canvas-Komponente des Schritts (z. B. z1/z2/m des
   * gear-pair). target-Aufgaben lesen hieraus; Komponenten publizieren bei
   * jeder Änderung.
   */
  canvasInputs: Record<string, number> | null;
  setCanvasInputs: (inputs: Record<string, number>) => void;
  clearCanvasInputs: () => void;
  /** Zuletzt fokussiertes numerisches Antwortfeld (Rechner: „in Aufgabe einsetzen"). */
  answerSink: ((value: number) => void) | null;
  setAnswerSink: (sink: ((value: number) => void) | null) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  active: null,
  setActive: (ctx) => set({ active: ctx }),
  // Nur räumen, wenn noch die eigene Formel aktiv ist (Race beim Unmount vermeiden).
  clearActive: (formulaId) =>
    set((s) => (s.active?.formulaId === formulaId ? { active: null } : s)),
  canvasInputs: null,
  setCanvasInputs: (inputs) => set({ canvasInputs: inputs }),
  clearCanvasInputs: () => set({ canvasInputs: null }),
  answerSink: null,
  setAnswerSink: (sink) => set({ answerSink: sink }),
}));
