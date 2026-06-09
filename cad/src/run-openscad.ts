// run-openscad.ts — framework-agnostischer Render-Kern.
//
// Lädt das OpenSCAD-WASM-Modul (einmalig, gecacht), injiziert die Parameter in das
// EINE Modell (gear.scad) und gibt das ASCII-STL zurück. Läuft ohne DOM — in Node
// (Vitest-Gate) ebenso wie im Web-Worker (Browser). Eiserne Regel 1: die im UI
// angezeigten Maße kommen aus packages/engine; hier entsteht nur die Geometrie.

import { createOpenSCAD, type OpenSCADInstance } from 'openscad-wasm';
import gearScad from '../gear.scad?raw';

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

let instancePromise: Promise<OpenSCADInstance> | null = null;

function getInstance(): Promise<OpenSCADInstance> {
  if (!instancePromise) {
    // print/printErr stummschalten: OpenSCAD schreibt Cache-/Render-Statistik auf stderr.
    instancePromise = createOpenSCAD({ noInitialRun: true, print: () => {}, printErr: () => {} });
  }
  return instancePromise;
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
  const oscad = await getInstance();
  return oscad.renderToStl(gearScadSource(p));
}
