// Tests der Projektions- und Zeichnungs-Primitiven. Sie sichern genau die
// Annahmen, die vorher in den Komponenten geraten wurden.

import { describe, it, expect } from 'vitest';
import {
  project, projectCircle, depthOf, sortByDepth, scaleToFit, rotateZ, rotateX,
  gearProfile, gearMeshPhase, involute, minTeethNoUndercut, dimension, hatch, shadeByNormal,
  explodeAlong, type Vec3,
} from './index';

describe('projectCircle', () => {
  it('trifft die tatsächliche Projektion des Kreises (nicht geraten)', () => {
    const r = 20;
    const e = projectCircle({ x: 0, y: 0, z: 0 }, r);
    // Gegenprobe: viele Punkte des Weltkreises projizieren und die Hüllmaße messen.
    let maxX = 0;
    let maxY = 0;
    for (let i = 0; i < 720; i++) {
      const t = (i / 720) * 2 * Math.PI;
      const p = project({ x: r * Math.cos(t), y: r * Math.sin(t), z: 0 });
      maxX = Math.max(maxX, Math.abs(p.x));
      maxY = Math.max(maxY, Math.abs(p.y));
    }
    expect(e.rx).toBeCloseTo(maxX, 6);
    expect(e.ry).toBeCloseTo(maxY, 6);
    // Der bisher geratene Faktor 1,0 war um √2·cos30° = 1,2247 zu klein.
    expect(e.rx / r).toBeCloseTo(Math.SQRT2 * Math.cos(Math.PI / 6), 9);
    expect(e.ry / r).toBeCloseTo(Math.SQRT2 * Math.sin(Math.PI / 6), 9);
  });

  it('liegt zwischen Fuß- und Kopfkreis, wenn der Teilkreis dazwischen liegt', () => {
    // Genau der Fehler aus GearPair: der Teilkreis wurde in den Fußkreis gezeichnet.
    const rf = 17.5;
    const r = 20;
    const ra = 22;
    const [ef, ep, ea] = [rf, r, ra].map((x) => projectCircle({ x: 0, y: 0, z: 0 }, x));
    expect(ep.rx).toBeGreaterThan(ef.rx);
    expect(ep.rx).toBeLessThan(ea.rx);
  });
});

describe('depthOf / sortByDepth', () => {
  it('die Blickrichtung ist der Nullraum der Projektion', () => {
    // Punkte entlang (1,1,2·sin α) fallen im Bild aufeinander …
    const d: Vec3 = { x: 1, y: 1, z: 2 * Math.sin(Math.PI / 6) };
    const a = project({ x: 0, y: 0, z: 0 });
    const b = project({ x: d.x * 5, y: d.y * 5, z: d.z * 5 });
    expect(b.x).toBeCloseTo(a.x, 9);
    expect(b.y).toBeCloseTo(a.y, 9);
    // … unterscheiden sich aber in der Tiefe.
    expect(depthOf({ x: 5, y: 5, z: 5 })).toBeGreaterThan(depthOf({ x: 0, y: 0, z: 0 }));
  });

  it('sortiert fern nach nah (größeres y ist näher am Betrachter)', () => {
    const parts = [
      { id: 'vorne', at: { x: 0, y: 4, z: 0 } },
      { id: 'hinten', at: { x: 0, y: -4, z: 0 } },
    ];
    expect(sortByDepth(parts, (p) => p.at).map((p) => p.id)).toEqual(['hinten', 'vorne']);
  });
});

describe('scaleToFit', () => {
  it('behält echte Größenunterschiede, wenn der Maßstab gedeckelt ist', () => {
    // Der Modul-Fehler: eine normierte Skalierung kürzt die Größe heraus.
    const box = { width: 300, height: 200, maxScale: 2 };
    const klein = scaleToFit([{ x: -10, y: -10, z: 0 }, { x: 10, y: 10, z: 0 }], box);
    const gross = scaleToFit([{ x: -40, y: -40, z: 0 }, { x: 40, y: 40, z: 0 }], box);
    const spanne = (f: typeof klein, r: number) => f.toScreen({ x: r, y: 0, z: 0 }).x - f.toScreen({ x: 0, y: 0, z: 0 }).x;
    // Beide am Deckel → gleicher Maßstab → das größere Objekt ist im Bild größer.
    expect(klein.scale).toBe(2);
    expect(gross.scale).toBe(2);
    expect(spanne(gross, 40)).toBeGreaterThan(spanne(klein, 10));
  });

  it('passt randscharf ein und respektiert Ränder', () => {
    const f = scaleToFit([{ x: -10, y: -10, z: 0 }, { x: 10, y: 10, z: 0 }], {
      width: 200, height: 100, margin: { l: 10, r: 10, t: 5, b: 5 },
    });
    const pts = [
      f.toScreen({ x: -10, y: -10, z: 0 }), f.toScreen({ x: 10, y: 10, z: 0 }),
      f.toScreen({ x: -10, y: 10, z: 0 }), f.toScreen({ x: 10, y: -10, z: 0 }),
    ];
    for (const p of pts) {
      expect(p.x).toBeGreaterThanOrEqual(9.99);
      expect(p.x).toBeLessThanOrEqual(190.01);
      expect(p.y).toBeGreaterThanOrEqual(4.99);
      expect(p.y).toBeLessThanOrEqual(95.01);
    }
  });
});

describe('rotateZ / rotateX', () => {
  it('rotateZ dreht um die Hochachse und erhält Radius und Höhe', () => {
    const p = rotateZ({ x: 3, y: 0, z: 7 }, Math.PI / 2);
    expect(p.x).toBeCloseTo(0, 9);
    expect(p.y).toBeCloseTo(3, 9);
    expect(p.z).toBe(7);
  });
  it('rotateX dreht um die x-Achse', () => {
    const p = rotateX({ x: 5, y: 2, z: 0 }, Math.PI / 2);
    expect(p.x).toBe(5);
    expect(p.y).toBeCloseTo(0, 9);
    expect(p.z).toBeCloseTo(2, 9);
  });
});

describe('gearProfile (Evolventenverzahnung, DIN 867)', () => {
  const m = 2;
  const z = 20;
  const g = gearProfile({ z, m });

  it('hält die Normmaße für Teil-, Grund-, Kopf- und Fußkreis', () => {
    expect(g.r).toBeCloseTo(20, 9); // d = m·z = 40
    expect(g.rb).toBeCloseTo(20 * Math.cos((20 * Math.PI) / 180), 9);
    expect(g.ra).toBeCloseTo(22, 9); // d_a = d + 2m = 44 — das CAD lieferte 42,84
    expect(g.rf).toBeCloseTo(17.5, 9); // d_f = d − 2,5m = 35
  });

  it('Zahndicke = Lückenweite auf dem Teilkreis (s = e = p/2)', () => {
    expect(g.toothThickness).toBeCloseTo((Math.PI * m) / 2, 9);
  });

  it('der Zahn wird nach außen dünner — Kopfdicke nach der Normformel', () => {
    // s_a = r_a·(s_p/r_p + 2·(inv α_p − inv α_a))
    const alpha = (20 * Math.PI) / 180;
    const alphaA = Math.acos(g.rb / g.ra);
    const erwartet = g.ra * (g.toothThickness / g.r + 2 * (involute(alpha) - involute(alphaA)));
    expect(g.tipThickness).toBeCloseTo(erwartet, 6);
    // Die alte CAD-Geometrie war hier 2,4-fach zu dick (3,36 statt 1,40 mm).
    expect(g.tipThickness).toBeLessThan(g.toothThickness);
    expect(g.tipThickness).toBeCloseTo(1.4, 1);
  });

  it('alle Punkte liegen zwischen Fuß- und Kopfkreis', () => {
    for (const p of g.points) {
      const rho = Math.hypot(p.x, p.y);
      expect(rho).toBeGreaterThanOrEqual(g.rf - 1e-9);
      expect(rho).toBeLessThanOrEqual(g.ra + 1e-9);
    }
  });

  it('erzeugt genau z Zähne (Radius-Maxima)', () => {
    let spitzen = 0;
    const n = g.points.length;
    for (let i = 0; i < n; i++) {
      const r0 = Math.hypot(g.points[(i - 1 + n) % n].x, g.points[(i - 1 + n) % n].y);
      const r1 = Math.hypot(g.points[i].x, g.points[i].y);
      const r2 = Math.hypot(g.points[(i + 1) % n].x, g.points[(i + 1) % n].y);
      if (r1 >= g.ra - 1e-6 && r0 < r1 - 1e-9 && r2 <= r1 + 1e-9) spitzen++;
    }
    expect(spitzen).toBe(z);
  });

  it('Flankenspiel verringert die Zahndicke beidseitig', () => {
    const mitSpiel = gearProfile({ z, m, backlash: 0.2 });
    expect(mitSpiel.toothThickness).toBeCloseTo(g.toothThickness - 0.2, 9);
  });

  it('läuft bei kleiner Zähnezahl spitz zu statt sich zu überschlagen', () => {
    const spitz = gearProfile({ z: 7, m: 2 });
    for (const p of spitz.points) {
      expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
    }
  });
});

describe('gearMeshPhase — Zahn greift in Lücke', () => {
  // Zwei Räder auf exaktem Achsabstand a = m(z1+z2)/2 dürfen sich nicht
  // durchdringen. Genau das war im Bild der Default-Fehler (3,93 mm Eindringung).
  // Echter Test: Punkt-in-Polygon in beide Richtungen. Ein Radienvergleich
  // greift hier nicht — die Kopfspitze des Gegenrads bleibt ohnehin um das
  // Kopfspiel (0,25·m) über dem Fußkreis, auch wenn die Flanken kollidieren.
  interface P { x: number; y: number }
  const imPolygon = (p: P, poly: P[]): boolean => {
    let drin = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i];
      const b = poly[j];
      if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) {
        drin = !drin;
      }
    }
    return drin;
  };
  const dreh = (pts: P[], w: number, dx: number): P[] =>
    pts.map((p) => ({
      x: p.x * Math.cos(w) - p.y * Math.sin(w) + dx,
      y: p.x * Math.sin(w) + p.y * Math.cos(w),
    }));

  /** Zählt Punkte, die in der Kontur des jeweils anderen Rades liegen. */
  const kollisionen = (z1: number, z2: number, m: number, theta = 0): number => {
    const g1 = gearProfile({ z: z1, m, steps: 16 });
    const g2 = gearProfile({ z: z2, m, steps: 16 });
    const a = (m * (z1 + z2)) / 2;
    const A = dreh(g1.points, theta, 0);
    const B = dreh(g2.points, -theta * (z1 / z2) + gearMeshPhase(z2), a);
    let n = 0;
    for (const p of B) if (Math.hypot(p.x, p.y) <= g1.ra + 0.5 && imPolygon(p, A)) n++;
    for (const p of A) if (Math.hypot(p.x - a, p.y) <= g2.ra + 0.5 && imPolygon(p, B)) n++;
    return n;
  };

  it('der Test erkennt eine falsche Phase (Gegenprobe)', () => {
    // Mit halber Teilung verdreht muss Zahn auf Zahn treffen — sonst prüft der
    // Test nichts. Genau dieser Zustand war vorher der Default.
    const g1 = gearProfile({ z: 20, m: 2, steps: 16 });
    const g2 = gearProfile({ z: 60, m: 2, steps: 16 });
    const a = 80;
    const A = g1.points;
    const B = dreh(g2.points, gearMeshPhase(60) + Math.PI / 60, a);
    let n = 0;
    for (const p of B) if (Math.hypot(p.x, p.y) <= g1.ra + 0.5 && imPolygon(p, A)) n++;
    expect(n).toBeGreaterThan(0);
  });

  it('Default-Paarung 20/60 kämmt ohne jede Durchdringung', () => {
    expect(kollisionen(20, 60, 2)).toBe(0);
  });

  it('bleibt bei ungerader Zähnezahl, anderem Modul und während der Drehung sauber', () => {
    expect(kollisionen(20, 61, 2)).toBe(0);
    expect(kollisionen(30, 45, 3)).toBe(0);
    expect(kollisionen(20, 60, 2, 0.3)).toBe(0);
    expect(kollisionen(20, 60, 2, 1.1)).toBe(0);
    expect(kollisionen(17, 34, 1)).toBe(0); // gerade noch unterschnittfrei
  });

  it('meldet Unterschnitt unterhalb der Grenzzähnezahl, statt ihn zu verstecken', () => {
    // z < 17 bei α = 20° ist ein echter Konstruktionsfehler: die Paarung
    // kollidiert wirklich. Der Profilgenerator zeigt das an, statt zu glätten.
    expect(minTeethNoUndercut(20)).toBeCloseTo(17.097, 3);
    expect(gearProfile({ z: 12, m: 1 }).undercut).toBe(true);
    expect(gearProfile({ z: 17, m: 1 }).undercut).toBe(false);
    expect(kollisionen(12, 120, 1)).toBeGreaterThan(0);
  });

  it('setzt die Phase nach der Parität der Zähnezahl', () => {
    expect(gearMeshPhase(60)).toBeCloseTo(Math.PI / 60, 12);
    expect(gearMeshPhase(61)).toBe(0);
  });
});

describe('dimension', () => {
  it('setzt Pfeile senkrecht zur Maßlinie — auch bei schräger Lage', () => {
    const d = dimension({ x: 0, y: 0 }, { x: 30, y: 30 });
    expect(d.lengthPx).toBeCloseTo(Math.hypot(30, 30), 9);
    expect(d.arrows).toHaveLength(2);
    // Die Pfeilbasis liegt auf der Maßlinie; die Spitze sitzt im Messpunkt.
    const [tip, b1, b2] = d.arrows[0];
    expect(tip.x).toBeCloseTo(0, 9);
    const mitte = { x: (b1.x + b2.x) / 2, y: (b1.y + b2.y) / 2 };
    const u = { x: Math.SQRT1_2, y: Math.SQRT1_2 };
    expect(mitte.x).toBeCloseTo(u.x * 9, 6); // arrowLen entlang der Maßlinie
    // Die Basisbreite steht senkrecht auf der Maßlinie.
    const w = { x: b1.x - b2.x, y: b1.y - b2.y };
    expect(w.x * u.x + w.y * u.y).toBeCloseTo(0, 9);
  });

  it('dreht die Maßzahl nie auf den Kopf', () => {
    expect(dimension({ x: 30, y: 0 }, { x: 0, y: 0 }).label.angleDeg).toBeCloseTo(0, 9);
  });

  it('zeichnet Maßhilfslinien nur bei versetzter Maßlinie', () => {
    expect(dimension({ x: 0, y: 0 }, { x: 10, y: 0 }).extensions).toHaveLength(0);
    expect(dimension({ x: 0, y: 0 }, { x: 10, y: 0 }, { offset: 12 }).extensions).toHaveLength(2);
  });
});

describe('hatch', () => {
  it('füllt ein Quadrat mit parallelen Linien innerhalb der Kontur', () => {
    const quad = [{ x: 0, y: 0 }, { x: 40, y: 0 }, { x: 40, y: 40 }, { x: 0, y: 40 }];
    const lines = hatch(quad, 6, 45);
    expect(lines.length).toBeGreaterThan(3);
    for (const [a, b] of lines) {
      for (const p of [a, b]) {
        expect(p.x).toBeGreaterThanOrEqual(-0.001);
        expect(p.x).toBeLessThanOrEqual(40.001);
        expect(p.y).toBeGreaterThanOrEqual(-0.001);
        expect(p.y).toBeLessThanOrEqual(40.001);
      }
      // alle Linien parallel unter 45°
      expect(Math.abs(Math.atan2(b.y - a.y, b.x - a.x)) % Math.PI).toBeCloseTo(Math.PI / 4, 6);
    }
  });

  it('liefert für entartete Polygone nichts statt zu werfen', () => {
    expect(hatch([{ x: 0, y: 0 }, { x: 1, y: 1 }])).toEqual([]);
  });
});

describe('shadeByNormal', () => {
  it('hellt zum Licht hin auf und dunkelt vom Licht weg ab', () => {
    const base = '#808080';
    const zumLicht = shadeByNormal(base, { x: -0.4, y: -0.5, z: 1 });
    const vomLicht = shadeByNormal(base, { x: 0.4, y: 0.5, z: -1 });
    const hell = Number.parseInt(zumLicht.slice(1, 3), 16);
    const dunkel = Number.parseInt(vomLicht.slice(1, 3), 16);
    expect(hell).toBeGreaterThan(0x80);
    expect(dunkel).toBeLessThan(0x80);
  });

  it('stuft gekrümmte Mäntel stufenlos ab', () => {
    const werte = Array.from({ length: 8 }, (_, i) => {
      const t = (i / 8) * 2 * Math.PI;
      return shadeByNormal('#a0a0a0', { x: Math.cos(t), y: Math.sin(t), z: 0 });
    });
    expect(new Set(werte).size).toBeGreaterThan(4); // nicht vier diskrete Stufen
  });
});

describe('explodeAlong', () => {
  it('schiebt entlang der Montageachse statt radial', () => {
    const p = explodeAlong({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }, 2, 10);
    expect(p).toEqual({ x: 0, y: 0, z: 20 });
  });
  it('lässt das erste Teil (order 0) stehen', () => {
    expect(explodeAlong({ x: 3, y: 4, z: 5 }, { x: 1, y: 0, z: 0 }, 0, 10)).toEqual({ x: 3, y: 4, z: 5 });
  });
});
