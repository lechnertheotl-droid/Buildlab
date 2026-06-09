// run-openscad.test.ts — ECHTES OpenSCAD-WASM headless (End-to-End-Gate, Phase-3-DoD).
//
// Beweist: das EINE Modell (gear.scad) wird durch OpenSCAD-WASM zu validem STL
// gerendert, das sich in Dreiecke parsen und isometrisch darstellen lässt. Läuft als
// Teil von `pnpm verify`. Ein Compile bei modestem $fn (~0.4 s) — bewusst gewählt
// (ehrliches End-to-End statt Fixture).

import { describe, it, expect } from 'vitest';
import { renderGearStl } from './run-openscad';
import { validateStl, parseStl } from './stl';
import { meshToIso } from './mesh-iso';

describe('OpenSCAD-WASM (echtes STL, DoD Phase 3)', () => {
  it(
    'rendert gear.scad zu validem STL und lässt es isometrisch darstellen',
    async () => {
      const stl = await renderGearStl({ m: 2, z: 20, thickness: 8, bore: 5, fn: 16 });
      const res = validateStl(stl);
      expect(res.ok).toBe(true);
      expect(res.triangles ?? 0).toBeGreaterThan(0);

      const tris = parseStl(stl);
      expect(tris.length).toBe(res.triangles);

      const iso = meshToIso(tris, { width: 320, height: 220 });
      expect(iso.polygons.length).toBeGreaterThan(0);
    },
    60_000,
  );

  it(
    'rendert mehrfach hintereinander mit anderen Parametern (Instanz-Wiederverwendung)',
    async () => {
      // Regression: ein zweiter Render auf einer wiederverwendeten WASM-Instanz warf
      // früher eine WASM-Ausnahme (roher Pointer als Fehlertext). Beide müssen valide
      // sein, und mehr Zähne ⇒ mehr Facetten (das Modell ist wirklich parametrisch).
      const a = await renderGearStl({ m: 2, z: 20, thickness: 8, bore: 5, fn: 16 });
      const b = await renderGearStl({ m: 2, z: 32, thickness: 8, bore: 5, fn: 16 });
      const ra = validateStl(a);
      const rb = validateStl(b);
      expect(ra.ok).toBe(true);
      expect(rb.ok).toBe(true);
      expect(rb.triangles ?? 0).toBeGreaterThan(ra.triangles ?? 0);
    },
    60_000,
  );
});
