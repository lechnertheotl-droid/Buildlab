// run-openscad.ts — framework-agnostischer Render-Kern.
//
// Lädt das OpenSCAD-WASM-Modul (einmalig, gecacht), injiziert die Parameter in das
// EINE Modell (gear.scad) und gibt das ASCII-STL zurück. Läuft ohne DOM — in Node
// (Vitest-Gate) ebenso wie im Web-Worker (Browser). Eiserne Regel 1: die im UI
// angezeigten Maße kommen aus packages/engine; hier entsteht nur die Geometrie.

import { createOpenSCAD, type OpenSCADInstance } from 'openscad-wasm';
import gearScad from '../gear.scad?raw';
import rolleScad from '../rolle.scad?raw';

export interface GearParams {
  /** Modul m [mm] */
  m: number;
  /** Zähnezahl z [-] */
  z: number;
  /** Zahnbreite [mm] */
  thickness: number;
  /** Bohrungsdurchmesser [mm] */
  bore: number;
  /** Vorschau-Qualität ($fn); modest halten, damit die Facet-Zahl klein bleibt. */
  fn?: number;
}

// WICHTIG: pro Render eine FRISCHE Instanz. Das WASM-Modul wird einmal pro callMain
// ausgeführt; emscripten setzt den Stack zwischen Aufrufen nicht zurück, ein zweiter
// renderToStl auf derselben Instanz wirft eine WASM-Ausnahme (roher Pointer als
// „message", z. B. „1114200"). Eine neue Instanz je Aufruf ist robust; das WASM-Binary
// ist nach dem ersten Fetch gecacht, die Neu-Instanziierung ist hinter dem UI-Debounce
// unkritisch. Identische Parameter rendern wegen des compileGear-Caches gar nicht neu.
function newInstance(): Promise<OpenSCADInstance> {
  // print/printErr stummschalten: OpenSCAD schreibt Cache-/Render-Statistik auf stderr.
  return createOpenSCAD({ noInitialRun: true, print: () => {}, printErr: () => {} });
}

export interface PulleyParams {
  /** Außendurchmesser der Rolle [mm] */
  d: number;
  /** Radius des Rillen-Querschnitts [mm] — bestimmt, wie tief das Seil liegt. */
  groove: number;
  /** Bohrungsdurchmesser (Achse/Karabiner) [mm] */
  bore: number;
  /** Breite der Rolle [mm] */
  thickness: number;
  /** Vorschau-Qualität ($fn); modest halten, damit die Facet-Zahl klein bleibt. */
  fn?: number;
}

/** Baut den vollständigen .scad-Quelltext: $fn + Modell + parametrisierter Aufruf. */
export function gearScadSource(p: GearParams): string {
  const fn = p.fn ?? 24;
  return (
    `$fn=${fn};\n` +
    `${gearScad}\n` +
    `gear(m=${p.m}, z=${p.z}, thickness=${p.thickness}, bore=${p.bore});\n`
  );
}

/** Rendert das Stirnrad zu ASCII-STL (Text). Wirft bei OpenSCAD-Fehlern. */
export async function renderGearStl(p: GearParams): Promise<string> {
  // Frische Instanz pro Render (siehe newInstance): nach dem renderToStl nicht weiter
  // referenziert → GC-fähig.
  const oscad = await newInstance();
  return oscad.renderToStl(gearScadSource(p));
}

/** Baut den vollständigen .scad-Quelltext der Umlenkrolle (analog zum gear). */
export function pulleyScadSource(p: PulleyParams): string {
  const fn = p.fn ?? 48;
  return (
    `$fn=${fn};\n` +
    `${rolleScad}\n` +
    `rolle(d=${p.d}, groove=${p.groove}, bore=${p.bore}, thickness=${p.thickness});\n`
  );
}

/** Rendert die Umlenkrolle zu ASCII-STL (Text). Wirft bei OpenSCAD-Fehlern. */
export async function renderPulleyStl(p: PulleyParams): Promise<string> {
  const oscad = await newInstance();
  return oscad.renderToStl(pulleyScadSource(p));
}
