import { describe, it, expect } from 'vitest';
import { meshToIso } from './mesh-iso';
import type { Triangle } from './stl';

// Ein einfacher Würfel-artiger Satz: Ober- und Unterseite (entgegengesetzte Normalen)
// plus eine Seitenfläche — genug, um Culling, Sortierung und Schattierung zu prüfen.
const tris: Triangle[] = [
  { n: { x: 0, y: 0, z: 1 }, v: [{ x: 0, y: 0, z: 1 }, { x: 1, y: 0, z: 1 }, { x: 0, y: 1, z: 1 }] },
  { n: { x: 0, y: 0, z: -1 }, v: [{ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 1, y: 0, z: 0 }] },
  { n: { x: 1, y: 0, z: 0 }, v: [{ x: 1, y: 0, z: 0 }, { x: 1, y: 1, z: 0 }, { x: 1, y: 0, z: 1 }] },
];

describe('meshToIso', () => {
  it('culled Rückseiten, behält aber sichtbare Flächen', () => {
    const res = meshToIso(tris, { width: 200, height: 200 });
    expect(res.polygons.length).toBeGreaterThan(0);
    expect(res.polygons.length).toBeLessThan(tris.length); // mind. die Unterseite ist weg
  });

  it('liefert endliche SVG-Polygon-Koordinaten und Token-Farben', () => {
    const res = meshToIso(tris, { width: 200, height: 200 });
    for (const poly of res.polygons) {
      expect(poly.fill).toMatch(/^#[0-9a-fA-F]{6}$/);
      for (const n of poly.points.split(/[ ,]/)) {
        expect(Number.isFinite(Number(n))).toBe(true);
      }
    }
  });

  it('Rotation verändert die projizierte Ausgabe', () => {
    const a = meshToIso(tris, { width: 200, height: 200, rotation: 0 });
    const b = meshToIso(tris, { width: 200, height: 200, rotation: Math.PI / 4 });
    expect(JSON.stringify(a.polygons)).not.toEqual(JSON.stringify(b.polygons));
  });
});
