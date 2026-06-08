// store.ts — minimaler Zustand-Store (CLAUDE.md: State = Zustand, bewusst minimal).
//
// Hält den „aktiven Rechenkontext" des laufenden Schritts: welche Formel gerade
// interaktiv bespielt wird und mit welchen Werten. Das ist die Brücke zwischen
// interaktiver Komponente (z. B. Hebel-Slider) und dem Universal-Rechner
// (SCREENS.md §7: der Rechner zieht Formeln & aktuelle Slider-Werte herein).

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
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  active: null,
  setActive: (ctx) => set({ active: ctx }),
  // Nur räumen, wenn noch die eigene Formel aktiv ist (Race beim Unmount vermeiden).
  clearActive: (formulaId) =>
    set((s) => (s.active?.formulaId === formulaId ? { active: null } : s)),
}));
