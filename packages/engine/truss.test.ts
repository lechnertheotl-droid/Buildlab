// Tests für das Fachwerk-Modul (ENGINE_SPEC §7: Löser → Golden Test → UI).
// Die Referenz-Topologie „Dreiecksbrücke" ist die EINE geometrische Wahrheit
// des Projekts fachwerkbruecke: Engine-Test, Sim-Preset, Content und CAD
// nutzen dieselben Knoten (3-4-5-Dreieck → Diagonale exakt 187,5 mm).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  checkDeterminacy,
  solveTruss,
  trussResiduals,
  evaluateFormula,
  type Formula,
  type TrussProblem,
} from '@buildlab/engine';

const formulas: Formula[] = JSON.parse(
  readFileSync(new URL('../../content/formulas.json', import.meta.url), 'utf8'),
);
const byId = (id: string) => {
  const f = formulas.find((x) => x.id === id);
  if (!f) throw new Error(`Formel '${id}' fehlt`);
  return f;
};

// Die Dreiecksbrücke aus PROJECT_SPECS §2: 300 mm Spannweite, 5 kg mittig.
// Stäbe: 0 A–M, 1 M–B (Untergurt) · 2 A–T, 3 T–B (Diagonalen) · 4 M–T (Vertikale).
const F_LAST = 49.05;
const BRUECKE: TrussProblem = {
  nodes: [
    { x: 0, y: 0 }, // A (Festlager)
    { x: 150, y: 0 }, // M (Lastknoten)
    { x: 300, y: 0 }, // B (Loslager)
    { x: 150, y: 112.5 }, // T (First)
  ],
  bars: [
    { from: 0, to: 1 },
    { from: 1, to: 2 },
    { from: 0, to: 3 },
    { from: 3, to: 2 },
    { from: 1, to: 3 },
  ],
  supports: [
    { node: 0, fx: true, fy: true },
    { node: 2, fy: true },
  ],
  loads: [{ node: 1, fy: -F_LAST }],
};
const L_DIAG = Math.hypot(150, 112.5); // 187,5 mm — 3-4-5-Dreieck

describe('checkDeterminacy', () => {
  it('einfaches Dreieck ist statisch bestimmt (f = 0)', () => {
    const dreieck = {
      nodes: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 50, y: 80 }],
      bars: [{ from: 0, to: 1 }, { from: 1, to: 2 }, { from: 0, to: 2 }],
      supports: [{ node: 0, fx: true, fy: true }, { node: 1, fy: true }],
    };
    expect(checkDeterminacy(dreieck)).toEqual({ k: 3, s: 3, r: 3, f: 0 });
    expect(checkDeterminacy({ ...dreieck, bars: [...dreieck.bars, { from: 0, to: 1 }] }).f).toBe(-1);
    expect(checkDeterminacy({ ...dreieck, bars: dreieck.bars.slice(0, 2) }).f).toBe(1);
  });

  it('solveTruss verweigert unbestimmte Systeme mit sprechendem Fehler', () => {
    const beweglich = { ...BRUECKE, bars: BRUECKE.bars.slice(0, 4) };
    expect(() => solveTruss(beweglich)).toThrow(/nicht statisch bestimmt/);
  });

  it('solveTruss verweigert kaputte Presets (unbekannter Knoten)', () => {
    const kaputt = { ...BRUECKE, bars: [...BRUECKE.bars.slice(0, 4), { from: 1, to: 9 }] };
    expect(() => solveTruss(kaputt)).toThrow(/unbekannten Knoten/);
  });
});

describe('Dreiecksbrücke (Referenz-Topologie des Projekts)', () => {
  const sol = solveTruss(BRUECKE);
  const [sAM, sMB, sAT, sTB, sMT] = sol.barForces;

  it('jeder Knoten ist im Gleichgewicht (Residuum ≈ 0)', () => {
    for (const r of trussResiduals(BRUECKE, sol)) {
      expect(Math.abs(r.fx)).toBeLessThan(1e-9);
      expect(Math.abs(r.fy)).toBeLessThan(1e-9);
    }
  });

  it('Auflagerreaktionen tragen gemeinsam die Last — je F/2 (Formel beam_reaction)', () => {
    const fa = evaluateFormula(byId('beam_reaction'), { F: F_LAST });
    expect(sol.reactions[0].fy).toBeCloseTo(fa, 9);
    expect(sol.reactions[1].fy).toBeCloseTo(fa, 9);
    expect(sol.reactions[0].fx).toBeCloseTo(0, 9);
  });

  it('Symmetrie: linke und rechte Hälfte tragen gleich', () => {
    expect(sAM).toBeCloseTo(sMB, 9);
    expect(sAT).toBeCloseTo(sTB, 9);
  });

  it('Vorzeichen: Untergurt Zug, Diagonalen Druck, Vertikale Zug', () => {
    expect(sAM).toBeGreaterThan(0);
    expect(sAT).toBeLessThan(0);
    expect(sMT).toBeGreaterThan(0);
  });

  it('Parität Löser ⇔ Formelbibliothek: joint_strut und joint_chord', () => {
    const fa = evaluateFormula(byId('beam_reaction'), { F: F_LAST });
    const sd = evaluateFormula(byId('joint_strut'), { FA: fa, lS: L_DIAG, h: 112.5 });
    const su = evaluateFormula(byId('joint_chord'), { SD: sd, a: 150, lS: L_DIAG });
    expect(Math.abs(sAT)).toBeCloseTo(sd, 9);
    expect(sAM).toBeCloseTo(su, 9);
  });

  it('die Vertikale trägt genau die Last (Knoten M)', () => {
    expect(sMT).toBeCloseTo(F_LAST, 9);
    expect(sol.maxAbsIndex).toBe(4);
    expect(sol.maxAbs).toBeCloseTo(F_LAST, 9);
  });
});

describe('Warren-Träger (7 Knoten, 11 Stäbe)', () => {
  // Untergurt 0-1-2-3 auf y=0, Obergurt 4-5-6 auf y=75; Last mittig oben.
  const WARREN: TrussProblem = {
    nodes: [
      { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 200, y: 0 }, { x: 300, y: 0 },
      { x: 50, y: 75 }, { x: 150, y: 75 }, { x: 250, y: 75 },
    ],
    bars: [
      { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 }, // Untergurt
      { from: 4, to: 5 }, { from: 5, to: 6 }, // Obergurt
      { from: 0, to: 4 }, { from: 4, to: 1 }, { from: 1, to: 5 },
      { from: 5, to: 2 }, { from: 2, to: 6 }, { from: 6, to: 3 }, // Diagonalen
    ],
    supports: [{ node: 0, fx: true, fy: true }, { node: 3, fy: true }],
    loads: [{ node: 5, fy: -60 }],
  };

  it('ist statisch bestimmt und im Gleichgewicht', () => {
    expect(checkDeterminacy(WARREN)).toEqual({ k: 7, s: 11, r: 3, f: 0 });
    const sol = solveTruss(WARREN);
    for (const r of trussResiduals(WARREN, sol)) {
      expect(Math.abs(r.fx)).toBeLessThan(1e-9);
      expect(Math.abs(r.fy)).toBeLessThan(1e-9);
    }
    const summeReaktionen = sol.reactions.reduce((acc, re) => acc + re.fy, 0);
    expect(summeReaktionen).toBeCloseTo(60, 9);
  });

  it('Symmetrie und Vorzeichen: Obergurt Druck, Untergurt Zug', () => {
    const s = solveTruss(WARREN).barForces;
    expect(s[0]).toBeCloseTo(s[2], 9); // Untergurt außen
    expect(s[3]).toBeCloseTo(s[4], 9); // Obergurt
    expect(s[5]).toBeCloseTo(s[10], 9); // Endflügel-Diagonalen
    expect(s[6]).toBeCloseTo(s[9], 9);
    expect(s[7]).toBeCloseTo(s[8], 9);
    expect(s[3]).toBeLessThan(0); // Obergurt: Druck
    expect(s[0]).toBeGreaterThan(0); // Untergurt: Zug
  });
});
