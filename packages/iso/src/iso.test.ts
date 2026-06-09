// Tests für den pseudo-3D-Werkzeugkasten. Projektion & Schattierung sind die
// geometrische Wahrheit der Visualisierung — darum festgenagelt.

import { describe, it, expect } from 'vitest';
import {
  project,
  rotateY,
  toPolygonPoints,
  shade,
  faceShade,
  explodePoint,
  centroid,
} from './index';

describe('project', () => {
  it('bildet den Ursprung auf den Ursprung ab', () => {
    expect(project({ x: 0, y: 0, z: 0 })).toEqual({ x: 0, y: 0 });
  });

  it('spiegelt x und y symmetrisch in der Bild-x-Achse', () => {
    const a = project({ x: 1, y: 0, z: 0 });
    const b = project({ x: 0, y: 1, z: 0 });
    expect(a.x).toBeCloseTo(-b.x, 9);
    expect(a.y).toBeCloseTo(b.y, 9);
  });

  it('hebt höhere z sichtbar nach oben (kleinere Bild-y)', () => {
    const unten = project({ x: 0, y: 0, z: 0 });
    const oben = project({ x: 0, y: 0, z: 5 });
    expect(oben.y).toBeLessThan(unten.y);
    expect(oben.y).toBeCloseTo(-5, 9);
  });

  it('skaliert linear mit scale', () => {
    const p = project({ x: 2, y: 1, z: 3 }, { scale: 10 });
    const q = project({ x: 2, y: 1, z: 3 }, { scale: 1 });
    expect(p.x).toBeCloseTo(q.x * 10, 9);
    expect(p.y).toBeCloseTo(q.y * 10, 9);
  });
});

describe('rotateY', () => {
  it('lässt den Punkt bei Winkel 0 unverändert', () => {
    const p = { x: 2, y: 3, z: 4 };
    const r = rotateY(p, 0);
    expect(r.x).toBeCloseTo(2, 9);
    expect(r.y).toBeCloseTo(3, 9);
    expect(r.z).toBeCloseTo(4, 9);
  });

  it('hält y invariant (Drehung nur in der x-z-Ebene)', () => {
    expect(rotateY({ x: 1, y: 7, z: 2 }, 0.5).y).toBe(7);
  });

  it('senkt die +x-Seite bei positivem Winkel (z wird negativ, x = cosθ)', () => {
    const r = rotateY({ x: 1, y: 0, z: 0 }, 0.3);
    expect(r.z).toBeLessThan(0);
    expect(r.x).toBeCloseTo(Math.cos(0.3), 9);
  });
});

describe('toPolygonPoints', () => {
  it('formt projizierte Punkte zu einem SVG-points-String', () => {
    expect(toPolygonPoints([{ x: 1, y: 2 }, { x: 3, y: 4 }])).toBe('1,2 3,4');
  });
});

describe('shade', () => {
  it('lässt die Farbe bei amount 0 unverändert', () => {
    expect(shade('#C2562B', 0)).toBe('#c2562b');
  });

  it('mischt zu Weiß bzw. Schwarz an den Enden', () => {
    expect(shade('#C2562B', 1)).toBe('#ffffff');
    expect(shade('#C2562B', -1)).toBe('#000000');
  });

  it('akzeptiert Kurz-Hex', () => {
    expect(shade('#abc', 0)).toBe('#aabbcc');
  });

  it('gibt für die obere Fläche eine hellere Farbe als für die linke', () => {
    const base = '#C2562B';
    const top = faceShade(base, 'top');
    const left = faceShade(base, 'left');
    expect(top).not.toBe(left);
    // top wird aufgehellt, left abgedunkelt → top hat größere Rotkomponente
    expect(Number.parseInt(top.slice(1, 3), 16)).toBeGreaterThan(
      Number.parseInt(left.slice(1, 3), 16),
    );
  });
});

describe('explode', () => {
  it('lässt Punkte bei factor 0 unverändert', () => {
    const p = { x: 2, y: 3, z: 4 };
    expect(explodePoint(p, { x: 0, y: 0, z: 0 }, 0)).toEqual(p);
  });

  it('verdoppelt bei factor 1 den Abstand zum Zentrum', () => {
    expect(explodePoint({ x: 2, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 1)).toEqual({
      x: 4,
      y: 0,
      z: 0,
    });
  });

  it('centroid liefert den arithmetischen Mittelpunkt', () => {
    expect(centroid([{ x: 0, y: 0, z: 0 }, { x: 2, y: 4, z: 6 }])).toEqual({
      x: 1,
      y: 2,
      z: 3,
    });
  });
});
