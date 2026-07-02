// run-openscad.test.ts — ECHTES OpenSCAD-WASM headless (End-to-End-Gate, Phase-3-DoD).
//
// Beweist: das EINE Modell (gear.scad) wird durch OpenSCAD-WASM zu validem STL
// gerendert, das sich in Dreiecke parsen und isometrisch darstellen lässt. Läuft als
// Teil von `pnpm verify`. Ein Compile bei modestem $fn (~0.4 s) — bewusst gewählt
// (ehrliches End-to-End statt Fixture).

import { describe, it, expect } from 'vitest';
import { renderGearStl, renderPulleyStl, renderRaketeStl } from './run-openscad';
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

describe('OpenSCAD-WASM Umlenkrolle (rolle.scad, Testbefund B-20)', () => {
  it(
    'rendert rolle.scad zu validem STL und lässt es isometrisch darstellen',
    async () => {
      const stl = await renderPulleyStl({ d: 40, groove: 2.5, bore: 8, thickness: 12, fn: 24 });
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
    'ist wirklich parametrisch: größere Bohrung ändert die Geometrie',
    async () => {
      const a = await renderPulleyStl({ d: 40, groove: 2.5, bore: 6, thickness: 12, fn: 16 });
      const b = await renderPulleyStl({ d: 40, groove: 2.5, bore: 10, thickness: 12, fn: 16 });
      expect(validateStl(a).ok).toBe(true);
      expect(validateStl(b).ok).toBe(true);
      expect(a).not.toBe(b);
    },
    60_000,
  );
});

describe('OpenSCAD-WASM Modellrakete (rakete.scad)', () => {
  // Der Default-Bau aus content/modellrakete.json — dieselbe Geometrie, die das
  // Engine-Massenmodell als „dokumentierte Beispielrakete" durchrechnet.
  const beispiel = { d: 24, tubeLen: 220, noseLen: 80, finRoot: 60, finTip: 30, finSpan: 40, finCount: 4 } as const;

  it(
    'rendert Rumpf UND Nase zu validem STL und lässt beide isometrisch darstellen',
    async () => {
      for (const part of ['rumpf', 'nase'] as const) {
        const stl = await renderRaketeStl({ ...beispiel, part, fn: 16 });
        const res = validateStl(stl);
        expect(res.ok, `Teil '${part}' muss valides STL liefern`).toBe(true);
        expect(res.triangles ?? 0).toBeGreaterThan(0);

        const tris = parseStl(stl);
        expect(tris.length).toBe(res.triangles);

        const iso = meshToIso(tris, { width: 320, height: 220 });
        expect(iso.polygons.length).toBeGreaterThan(0);
      }
    },
    120_000,
  );

  it(
    'ist wirklich parametrisch: mehr Finnen ⇒ mehr Facetten am Rumpf',
    async () => {
      const drei = await renderRaketeStl({ ...beispiel, part: 'rumpf', finCount: 3, fn: 16 });
      const sechs = await renderRaketeStl({ ...beispiel, part: 'rumpf', finCount: 6, fn: 16 });
      const ra = validateStl(drei);
      const rb = validateStl(sechs);
      expect(ra.ok).toBe(true);
      expect(rb.ok).toBe(true);
      expect(rb.triangles ?? 0).toBeGreaterThan(ra.triangles ?? 0);
    },
    120_000,
  );
});
