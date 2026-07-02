// Golden Tests für das Raketen-Modul (ENGINE_SPEC §7: Löser → Golden Test → UI).
// Die dokumentierte Beispielrakete ist der Default-Bau aus content/modellrakete.json
// (PROJECT_SPECS §11: Apogäum einer dokumentierten Beispielrakete, Toleranz 5 %).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  MOTORS,
  thrustAt,
  totalImpulse,
  computeRocket,
  barrowmanCp,
  simulateFlight,
  evaluateFormula,
  evaluateExpr,
  type Formula,
  type MotorData,
} from '@buildlab/engine';

const formulas: Formula[] = JSON.parse(
  readFileSync(new URL('../../content/formulas.json', import.meta.url), 'utf8'),
);
const byId = (id: string) => {
  const f = formulas.find((x) => x.id === id);
  if (!f) throw new Error(`Formel '${id}' fehlt`);
  return f;
};

// Der Default-Bau aus dem Bau-Schritt — die „dokumentierte Beispielrakete".
const BEISPIEL = { d: 24, tubeLen: 220, noseLen: 80, finRoot: 60, finTip: 30, finSpan: 40, finCount: 4, ballast: 8 };

describe('Motor C6', () => {
  it('Gesamtimpuls liegt in der Klasse C (NAR-Zertifikat: ≈ 8,82 N·s)', () => {
    const i = totalImpulse(MOTORS.C6);
    expect(i).toBeGreaterThanOrEqual(8.5);
    expect(i).toBeLessThanOrEqual(9.1);
  });

  it('Schubkurve: 0 vor Zündung und nach Brennschluss, Peak ≈ 14,09 N', () => {
    expect(thrustAt(MOTORS.C6, 0)).toBe(0);
    expect(thrustAt(MOTORS.C6, 2.5)).toBe(0);
    expect(thrustAt(MOTORS.C6, 0.192)).toBeCloseTo(14.09, 6);
  });
});

describe('Massenmodell & Barrowman (Parität zur Formel-Bibliothek)', () => {
  const faelle = [
    BEISPIEL,
    { d: 24, tubeLen: 220, noseLen: 80, finRoot: 30, finTip: 10, finSpan: 20, finCount: 3, ballast: 0 },
    { d: 28, tubeLen: 300, noseLen: 100, finRoot: 80, finTip: 50, finSpan: 55, finCount: 6, ballast: 20 },
  ];

  it('barrowmanCp stimmt exakt mit der Formel rocket_cp überein', () => {
    for (const g of faelle) {
      const jsWert = barrowmanCp(g);
      const formelWert = evaluateFormula(byId('rocket_cp'), {
        d: g.d, noseLen: g.noseLen, tubeLen: g.tubeLen,
        finRoot: g.finRoot, finTip: g.finTip, finSpan: g.finSpan, finCount: g.finCount,
      });
      expect(Math.abs(jsWert - formelWert)).toBeLessThan(1e-9);
    }
  });

  it('computeRocket-Schwerpunkt stimmt exakt mit der Formel rocket_cg überein', () => {
    for (const g of faelle) {
      const r = computeRocket(g);
      const formelWert = evaluateFormula(byId('rocket_cg'), { ...r.masses });
      expect(Math.abs(r.xcg - formelWert)).toBeLessThan(1e-9);
    }
  });

  it('die Beispielrakete ist stabil: S ∈ [1, 2] Kaliber', () => {
    const r = computeRocket(BEISPIEL);
    expect(r.stability).toBeGreaterThanOrEqual(1);
    expect(r.stability).toBeLessThanOrEqual(2);
  });
});

describe('Flug-Sim (RK4)', () => {
  it('trifft die geschlossene Lösung für konstanten Schub ohne Luftwiderstand', () => {
    // Synthetischer Motor: konstant 6 N für 2 s, masselos — damit gilt exakt
    // a = F/m − g, v_b = a·t_b, h_b = ½·a·t_b², Apogäum = h_b + v_b²/(2g).
    // dt = 0.001, weil an der Schub-Sprungstelle (Brennschluss) ein O(dt)-Randfehler entsteht.
    const motor: MotorData = {
      name: 'Testmotor konstant', diameterMm: 18, lengthMm: 70,
      totalMassKg: 0, propellantMassKg: 0,
      points: [[-0.001, 6], [2, 6]],
    };
    const m = 0.1; // kg
    const g = 9.81;
    const a = 6 / m - g;
    const analytisch = (a * 2 * 2) / 2 + (a * 2) ** 2 / (2 * g);
    const sim = simulateFlight({ motor, massEmptyG: 100, d: 24, cw: 0, dt: 0.001 });
    expect(Math.abs(sim.apogee - analytisch) / analytisch).toBeLessThan(1e-3);
    expect(Math.abs(sim.vMax - a * 2) / (a * 2)).toBeLessThan(1e-3);
  });

  it('Beispielrakete mit C6: Apogäum ≥ 100 m und stabil reproduziert (±5 %)', () => {
    const r = computeRocket(BEISPIEL);
    const sim = simulateFlight({ motor: 'C6', massEmptyG: r.massEmptyG, d: BEISPIEL.d });
    expect(sim.apogee).toBeGreaterThanOrEqual(100);
    // Gepinnter Referenzwert (Engine-Ausgabe beim Einfrieren): 290.10264337287714 m.
    expect(Math.abs(sim.apogee - 290.10264337287714) / 290.10264337287714).toBeLessThan(0.05);
  });

  it('Physik-Monotonie: mehr Masse → tiefer; ohne Luftwiderstand → höher', () => {
    const leicht = simulateFlight({ motor: 'C6', massEmptyG: 45, d: 24 });
    const schwer = simulateFlight({ motor: 'C6', massEmptyG: 90, d: 24 });
    const glatt = simulateFlight({ motor: 'C6', massEmptyG: 45, d: 24, cw: 0 });
    expect(schwer.apogee).toBeLessThan(leicht.apogee);
    expect(glatt.apogee).toBeGreaterThan(leicht.apogee);
  });

  it('liefert eine brauchbare Flugbahn: hebt ab, kommt herunter, endet am Boden', () => {
    const sim = simulateFlight({ motor: 'C6', massEmptyG: 53, d: 24 });
    expect(sim.trajectory.length).toBeGreaterThan(100);
    expect(sim.trajectory[sim.trajectory.length - 1].h).toBe(0);
    expect(sim.tApogee).toBeGreaterThan(sim.tBurnout);
    expect(sim.vBurnout).toBeGreaterThan(0);
  });
});

describe('Anti-Drift: Bau-Constraints ⇔ Engine-Massenmodell', () => {
  // Die Stabilitäts-Constraints in content/modellrakete.json tragen das
  // Massenmodell als Inline-mathjs-Ausdruck (der Verifier kann nur exprs
  // nachrechnen). Dieser Test erzwingt, dass Ausdruck und computeRocket
  // dieselbe Mathematik bleiben — wer eines ändert, muss beide ändern.
  interface BuildConstraint {
    expr: string;
    label: string;
  }
  const projekt = JSON.parse(
    readFileSync(new URL('../../content/modellrakete.json', import.meta.url), 'utf8'),
  ) as { steps: { blocks: { type: string; constraints?: BuildConstraint[] }[] }[] };
  const buildBlock = projekt.steps
    .flatMap((s) => s.blocks)
    .find((b) => b.type === 'build');
  const stabilExprs = (buildBlock?.constraints ?? [])
    .map((c) => c.expr)
    .filter((e) => e.includes('finSpan'));

  const saetze = [
    { d: 24, tubeLen: 220, noseLen: 80, finRoot: 60, finTip: 30, finSpan: 40, finCount: 4, ballast: 8 },
    { d: 24, tubeLen: 220, noseLen: 80, finRoot: 30, finTip: 10, finSpan: 20, finCount: 3, ballast: 0 },
    { d: 24, tubeLen: 320, noseLen: 60, finRoot: 40, finTip: 20, finSpan: 55, finCount: 6, ballast: 20 },
    { d: 28, tubeLen: 260, noseLen: 100, finRoot: 70, finTip: 40, finSpan: 45, finCount: 5, ballast: 12 },
  ];

  it('beide Stabilitäts-Ausdrücke existieren und urteilen wie computeRocket', () => {
    expect(stabilExprs).toHaveLength(2);
    for (const params of saetze) {
      const s = computeRocket(params).stability;
      // Der reine S-Ausdruck (ohne Vergleich) muss numerisch übereinstimmen …
      const nurS = stabilExprs[0].replace(/ >= 1$/, '');
      expect(Math.abs((evaluateExpr(nurS, params) as number) - s)).toBeLessThan(1e-9);
      // … und die booleschen Urteile müssen exakt denen der Engine entsprechen.
      expect(evaluateExpr(stabilExprs[0], params)).toBe(s >= 1);
      expect(evaluateExpr(stabilExprs[1], params)).toBe(s <= 2);
    }
  });
});
