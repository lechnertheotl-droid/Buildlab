import { describe, it, expect } from 'vitest';
import { validateStl, parseStl } from './stl';

const GOOD = `solid demo
  facet normal 0 0 1
    outer loop
      vertex 0 0 0
      vertex 1 0 0
      vertex 0 1 0
    endloop
  endfacet
  facet normal 0 0 -1
    outer loop
      vertex 0 0 0
      vertex 0 1 0
      vertex 1 0 0
    endloop
  endfacet
endsolid demo
`;

describe('validateStl', () => {
  it('akzeptiert wohlgeformtes ASCII-STL und zählt Facetten', () => {
    const res = validateStl(GOOD);
    expect(res.ok).toBe(true);
    expect(res.triangles).toBe(2);
  });

  it('lehnt leeren Inhalt ab', () => {
    expect(validateStl('').ok).toBe(false);
  });

  it('lehnt fehlenden solid-Header ab', () => {
    expect(validateStl('facet normal 0 0 1\nendsolid').ok).toBe(false);
  });

  it('lehnt fehlenden endsolid-Abschluss ab', () => {
    expect(validateStl('solid x\n  facet normal 0 0 1').ok).toBe(false);
  });

  it('lehnt vertex/facet-Ungleichgewicht ab', () => {
    const bad = `solid x
  facet normal 0 0 1
    outer loop
      vertex 0 0 0
      vertex 1 0 0
    endloop
  endfacet
endsolid x`;
    expect(validateStl(bad).ok).toBe(false);
  });

  it('lehnt nicht-endliche Koordinaten ab', () => {
    const bad = GOOD.replace('vertex 1 0 0', 'vertex NaN 0 0');
    // NaN matcht das Zahlen-Regex nicht; dann stimmt die vertex/Zahl-Bilanz nicht.
    expect(validateStl(bad).ok).toBe(false);
  });
});

describe('parseStl', () => {
  it('parst Facetten in Dreiecke mit endlichen Koordinaten', () => {
    const tris = parseStl(GOOD);
    expect(tris).toHaveLength(2);
    expect(tris[0].n).toEqual({ x: 0, y: 0, z: 1 });
    expect(tris[0].v[1]).toEqual({ x: 1, y: 0, z: 0 });
    for (const t of tris) {
      for (const p of t.v) {
        expect(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z)).toBe(true);
      }
    }
  });
});
