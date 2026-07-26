// run-openscad.test.ts — ECHTES OpenSCAD-WASM headless (End-to-End-Gate, Phase-3-DoD).
//
// Beweist: das EINE Modell (gear.scad) wird durch OpenSCAD-WASM zu validem STL
// gerendert, das sich in Dreiecke parsen und isometrisch darstellen lässt. Läuft als
// Teil von `pnpm verify`. Ein Compile bei modestem $fn (~0.4 s) — bewusst gewählt
// (ehrliches End-to-End statt Fixture).

import { describe, it, expect } from 'vitest';
import { renderBrueckeStl, renderGearStl, renderPulleyStl, renderRaketeStl } from './run-openscad';
import { validateStl, parseStl, checkManifold } from './stl';
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

describe('Zahnrad-Geometrie am gedruckten Teil (nicht nur im Bild)', () => {
  /** Größter Radius über alle STL-Ecken — der tatsächliche Kopfkreis des Teils. */
  const maxRadius = (stl: string): number => {
    let r = 0;
    for (const t of parseStl(stl)) {
      for (const v of t.v) r = Math.max(r, Math.hypot(v.x, v.y));
    }
    return r;
  };

  it(
    'hält den Kopfkreis d_a = d + 2m — der Content verspricht genau das',
    async () => {
      // Die alte, handgerechnete Evolvente setzte den Abrollwinkel gleich dem
      // Eingriffswinkel und lieferte d_a = 42,84 statt 44 mm (Addendum −29 %).
      const stl = await renderGearStl({ m: 2, z: 20, thickness: 8, bore: 5, fn: 16 });
      expect(maxRadius(stl)).toBeCloseTo(22, 1);
    },
    60_000,
  );

  it(
    'bleibt bei großen Rädern zusammenhängend (Zähne reißen nicht ab)',
    async () => {
      // m=4, z=33 erfüllt die Bau-Constraint, ließ die Zähne früher aber vom
      // Körper abklaffen: circle(r_root) erbte $fn=24, der Inkreis lag unter
      // der Zahnwurzel. Ergebnis war ein nicht-manifestes STL.
      const stl = await renderGearStl({ m: 4, z: 33, thickness: 8, bore: 5, fn: 24 });
      expect(validateStl(stl).ok).toBe(true);
      expect(maxRadius(stl)).toBeCloseTo(70, 0); // d_a = 4·33/2 + 4 = 70
    },
    60_000,
  );

  it(
    'skaliert mit dem Modul (m ist im Teil sichtbar, nicht nur im Text)',
    async () => {
      const m2 = await renderGearStl({ m: 2, z: 20, thickness: 8, bore: 5, fn: 16 });
      const m4 = await renderGearStl({ m: 4, z: 20, thickness: 8, bore: 5, fn: 16 });
      expect(maxRadius(m4)).toBeCloseTo(2 * maxRadius(m2), 0);
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

describe('OpenSCAD-WASM Fachwerkbrücke (bruecke.scad)', () => {
  // Knoten und Stäbe kommen aus bridgePreset — derselben Quelle, mit der
  // solveTruss die Stabkräfte rechnet. Diese Tests halten das Bauteil an der
  // Geometrie fest, die der Lernende zuvor durchgerechnet hat.
  const spanne = (stl: string, achse: 'x' | 'y' | 'z') => {
    const w = parseStl(stl).flatMap((t) => t.v.map((v) => v[achse]));
    return Math.max(...w) - Math.min(...w);
  };

  it(
    'rendert beide Bauarten zu validem STL und stellt sie isometrisch dar',
    async () => {
      for (const preset of [1, 2]) {
        const stl = await renderBrueckeStl({ preset, h: 112.5, b: 7, tiefe: 8, fn: 24 });
        const res = validateStl(stl);
        expect(res.ok, `Preset ${preset} muss valides STL liefern`).toBe(true);
        const tris = parseStl(stl);
        expect(tris.length).toBe(res.triangles);
        expect(meshToIso(tris, { width: 320, height: 220 }).polygons.length).toBeGreaterThan(0);
      }
    },
    120_000,
  );

  it(
    'überspannt die geforderten 300 mm und folgt der eingestellten Höhe',
    async () => {
      // Die Challenge nennt 30 cm Spannweite; die Auflagerfüße ragen beidseits
      // um je 8 mm über die Lagerknoten hinaus.
      const flach = await renderBrueckeStl({ preset: 1, h: 80, b: 7, tiefe: 8, fn: 24 });
      const hoch = await renderBrueckeStl({ preset: 1, h: 150, b: 7, tiefe: 8, fn: 24 });
      expect(spanne(flach, 'x')).toBeCloseTo(316, 0);
      expect(spanne(hoch, 'x')).toBeCloseTo(316, 0);
      // Die Fachwerkhöhe steht in der Welt-z-Achse (die Scheibe ist aufgestellt).
      expect(spanne(hoch, 'z') - spanne(flach, 'z')).toBeCloseTo(70, 0);
      // Die Bautiefe liegt in y.
      expect(spanne(flach, 'y')).toBeCloseTo(8, 1);
    },
    120_000,
  );

  it(
    'das Trapez hat mehr Stäbe als das Dreieck — die Bauart ist wirklich im Teil',
    async () => {
      const dreieck = await renderBrueckeStl({ preset: 1, h: 112.5, b: 7, tiefe: 8, fn: 24 });
      const trapez = await renderBrueckeStl({ preset: 2, h: 112.5, b: 7, tiefe: 8, fn: 24 });
      expect(validateStl(trapez).ok).toBe(true);
      expect(validateStl(trapez).triangles ?? 0).toBeGreaterThan(validateStl(dreieck).triangles ?? 0);
    },
    120_000,
  );
});

describe('Manifest-Prüfung: kein unbaubares Teil verlässt den Export', () => {
  // validateStl prüft nur Syntax. Ein Körper mit freischwebenden Stücken
  // (beim Zahnrad real aufgetreten, m=4/z=33) passiert es anstandslos.
  it(
    'alle vier Modelle sind geschlossen und nach außen orientiert',
    async () => {
      const faelle: [string, string][] = [
        ['gear m=2 z=20', await renderGearStl({ m: 2, z: 20, thickness: 8, bore: 5, fn: 24 })],
        ['gear m=4 z=33', await renderGearStl({ m: 4, z: 33, thickness: 8, bore: 5, fn: 24 })],
        ['rolle', await renderPulleyStl({ d: 40, groove: 1.5, bore: 8, thickness: 12, fn: 24 })],
        ['bruecke Dreieck', await renderBrueckeStl({ preset: 1, h: 112.5, b: 7, tiefe: 8, fn: 24 })],
        ['bruecke Trapez', await renderBrueckeStl({ preset: 2, h: 112.5, b: 7, tiefe: 8, fn: 24 })],
      ];
      for (const [name, stl] of faelle) {
        const m = checkManifold(parseStl(stl));
        expect(m.ok, `${name}: ${m.reason ?? ''}`).toBe(true);
        expect(m.volume, `${name} braucht positives Volumen`).toBeGreaterThan(0);
      }
    },
    300_000,
  );
});
