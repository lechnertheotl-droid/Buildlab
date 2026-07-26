// Tests für das Fachwerk-Modul (ENGINE_SPEC §7: Löser → Golden Test → UI).
// Die Referenz-Topologie „Dreiecksbrücke" ist die EINE geometrische Wahrheit
// des Projekts fachwerkbruecke: Engine-Test, Sim-Preset, Content und CAD
// nutzen dieselben Knoten (3-4-5-Dreieck → Diagonale exakt 187,5 mm).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  BRIDGE_SPAN,
  bridgeBarLength,
  bridgeDiagonalRun,
  bridgePreset,
  checkDeterminacy,
  solveBridge,
  solveTruss,
  trussResiduals,
  evaluateExpr,
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

describe('Brücken-Presets (die eine Quelle für Löser, Bau-Panel und CAD)', () => {
  const F = F_LAST;

  it('beide Bauarten sind statisch bestimmt und im Gleichgewicht', () => {
    for (const preset of [1, 2]) {
      for (const h of [70, 112.5, 160]) {
        const geo = bridgePreset(preset, h);
        expect(checkDeterminacy(geo).f, `Preset ${preset}, h=${h}`).toBe(0);
        const sol = solveBridge(preset, h, F);
        const res = trussResiduals({ ...geo, loads: [{ node: geo.loadNode, fy: -F }] }, sol);
        for (const r of res) {
          expect(Math.abs(r.fx)).toBeLessThan(1e-9);
          expect(Math.abs(r.fy)).toBeLessThan(1e-9);
        }
      }
    }
  });

  it('überspannt in jeder Bauart 300 mm und trägt mittig', () => {
    for (const preset of [1, 2]) {
      const geo = bridgePreset(preset, 112.5);
      const xs = geo.nodes.map((n) => n.x);
      expect(Math.min(...xs)).toBe(0);
      expect(Math.max(...xs)).toBe(BRIDGE_SPAN);
      expect(geo.nodes[geo.loadNode].x).toBe(BRIDGE_SPAN / 2);
      expect(geo.nodes[geo.loadNode].y).toBe(0);
    }
  });

  // Die Bau-Constraints tragen die Statik als geschlossene mathjs-Ausdrücke
  // (der Verifier kann nur exprs nachrechnen). Diese Tests halten die
  // geschlossene Form deckungsgleich mit dem Löser — wer eines ändert, muss
  // beides ändern. Beim Trapez regiert unterhalb h ≈ 130 mm der Obergurt,
  // beim Dreieck unterhalb h = 75 mm der Untergurt: beide Wechsel sind drin.
  const geschlossen = (preset: number, h: number) => {
    const a = bridgeDiagonalRun(preset);
    const l = Math.hypot(a, h);
    const sDiag = (F / 2) * (l / h);
    const sGurt = preset === 1 ? 0 : (75 * F) / h;
    return {
      // maßgebend fürs Knicken ist das größte S·l_k² (F_k ∝ 1/l_k²)
      knick: Math.max(sDiag * l * l, sGurt * 150 * 150),
      zug: preset === 1 ? Math.max(F, (75 * F) / h) : sDiag,
      laenge: preset === 1 ? 300 + 2 * l + h : 450 + 4 * l,
    };
  };

  it('geschlossene Form trifft den Löser über den ganzen Reglerbereich', () => {
    for (const preset of [1, 2]) {
      for (let h = 50; h <= 180; h += 2.5) {
        const sol = solveBridge(preset, h, F);
        const g = geschlossen(preset, h);

        const knickLoeser = Math.max(
          ...sol.barForces.map((f, i) => {
            if (f >= 0) return 0;
            const a = sol.nodes[sol.bars[i].from];
            const b = sol.nodes[sol.bars[i].to];
            return -f * Math.hypot(b.x - a.x, b.y - a.y) ** 2;
          }),
        );
        const zugLoeser = Math.max(...sol.barForces.filter((f) => f > 0));

        expect(Math.abs(g.knick - knickLoeser) / knickLoeser, `knick p${preset} h=${h}`).toBeLessThan(1e-9);
        expect(Math.abs(g.zug - zugLoeser) / zugLoeser, `zug p${preset} h=${h}`).toBeLessThan(1e-9);
        expect(Math.abs(g.laenge - bridgeBarLength(preset, h)), `länge p${preset} h=${h}`).toBeLessThan(1e-6);
      }
    }
  });

  it('höher gebaut heißt kleinere Diagonalkraft — der Lernsatz des Projekts', () => {
    const flach = solveBridge(1, 70, F);
    const hoch = solveBridge(1, 160, F);
    expect(hoch.maxAbs).toBeLessThan(flach.maxAbs);
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

describe('Anti-Drift: Bau-Constraints ⇔ Fachwerk-Löser', () => {
  // Die Constraints in content/fachwerkbruecke.json tragen die Statik als
  // Inline-mathjs-Ausdrücke (der Verifier kann nur exprs nachrechnen). Dieser
  // Test erzwingt, dass Ausdruck und Löser dieselbe Mathematik bleiben — bei
  // der Rakete hat genau dieser Test die Drift sofort gemeldet.
  interface BuildConstraint {
    expr: string;
    label: string;
  }
  const projekt = JSON.parse(
    readFileSync(new URL('../../content/fachwerkbruecke.json', import.meta.url), 'utf8'),
  ) as { steps: { blocks: { type: string; constraints?: BuildConstraint[] }[] }[] };
  const build = projekt.steps.flatMap((s) => s.blocks).find((b) => b.type === 'build');
  const exprs = (build?.constraints ?? []).map((c) => c.expr);

  const saetze = [
    { preset: 1, h: 112.5, b: 7, tiefe: 8 },
    { preset: 1, h: 60, b: 4, tiefe: 6 },
    { preset: 1, h: 170, b: 10, tiefe: 10 },
    { preset: 2, h: 112.5, b: 7, tiefe: 8 },
    { preset: 2, h: 75, b: 5, tiefe: 7 },
    { preset: 2, h: 160, b: 9, tiefe: 9 },
  ];

  it('das Projekt trägt genau drei Bau-Anforderungen', () => {
    expect(exprs).toHaveLength(3);
  });

  it('der Knick-Nachweis urteilt wie der Löser', () => {
    const E = 3500;
    const NU = 2;
    for (const p of saetze) {
      const sol = solveBridge(p.preset, p.h, F_LAST);
      // Maßgebend ist der Druckstab mit dem größten S·l_k² (F_k ∝ 1/l_k²).
      const maxgabe = Math.max(
        ...sol.barForces.map((f, i) => {
          if (f >= 0) return 0;
          const a = sol.nodes[sol.bars[i].from];
          const b = sol.nodes[sol.bars[i].to];
          return -f * Math.hypot(b.x - a.x, b.y - a.y) ** 2;
        }),
      );
      // Schwache Achse: die kleinere Querschnittsseite knickt zuerst.
      const grenze = ((Math.PI ** 2 * E * Math.min(p.b, p.tiefe) ** 4) / 12) / NU;
      expect(evaluateExpr(exprs[0], p), `Knick ${JSON.stringify(p)}`).toBe(maxgabe <= grenze);
    }
  });

  it('der Zug-Nachweis urteilt wie der Löser', () => {
    const SIGMA = 20;
    for (const p of saetze) {
      const sol = solveBridge(p.preset, p.h, F_LAST);
      const zug = Math.max(...sol.barForces.filter((f) => f > 0));
      expect(evaluateExpr(exprs[1], p), `Zug ${JSON.stringify(p)}`).toBe(zug <= SIGMA * p.b * p.tiefe);
    }
  });

  it('das Materialbudget urteilt wie die Stablängen des Presets', () => {
    const BUDGET = 60000;
    for (const p of saetze) {
      const volumen = bridgeBarLength(p.preset, p.h) * p.b * p.tiefe;
      expect(evaluateExpr(exprs[2], p), `Budget ${JSON.stringify(p)}`).toBe(volumen <= BUDGET);
    }
  });

  it('die Referenz-Auslegung erfüllt alle drei Anforderungen', () => {
    const referenz = { preset: 1, h: 112.5, b: 7, tiefe: 8 };
    for (const e of exprs) expect(evaluateExpr(e, referenz)).toBe(true);
  });
});
