// run-openscad.ts — framework-agnostischer Render-Kern.
//
// Lädt das OpenSCAD-WASM-Modul (einmalig, gecacht), injiziert die Parameter in das
// EINE Modell (gear.scad) und gibt das ASCII-STL zurück. Läuft ohne DOM — in Node
// (Vitest-Gate) ebenso wie im Web-Worker (Browser). Eiserne Regel 1: die im UI
// angezeigten Maße kommen aus packages/engine; hier entsteht nur die Geometrie.

import { createOpenSCAD, type OpenSCADInstance } from 'openscad-wasm';
import { gearProfile } from '@buildlab/iso';
import { bridgePreset } from '@buildlab/engine';
import gearScad from '../gear.scad?raw';
import rolleScad from '../rolle.scad?raw';
import raketeScad from '../rakete.scad?raw';
import brueckeScad from '../bruecke.scad?raw';

export interface GearParams {
  /** Modul m [mm] */
  m: number;
  /** Zähnezahl z [-] */
  z: number;
  /** Zahnbreite [mm] */
  thickness: number;
  /** Bohrungsdurchmesser [mm] */
  bore: number;
  /** Flankenspiel [mm] — gedruckte Zahnräder brauchen 0,1–0,2 mm, sonst klemmen sie. */
  backlash?: number;
  /** Nabendurchmesser [mm]; 0 = keine Nabe. */
  hub?: number;
  /** Nabenüberstand je Seite [mm]. */
  hubHeight?: number;
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

/**
 * Baut den vollständigen .scad-Quelltext: $fn + Modell + Evolventen-Kontur.
 *
 * Die Zahnkontur kommt aus gearProfile() — derselben Funktion, aus der die
 * Simulation zeichnet. Bild und gedrucktes Teil können damit nicht mehr
 * auseinanderlaufen; die Flankenzahl (steps) ist im CAD höher als im Bild,
 * die Geometrie aber identisch.
 */
export function gearScadSource(p: GearParams): string {
  const fn = p.fn ?? 24;
  const profile = gearProfile({ z: p.z, m: p.m, steps: 12, backlash: p.backlash ?? 0.15 });
  const pts = profile.points.map((q) => `[${q.x.toFixed(4)},${q.y.toFixed(4)}]`).join(',');
  // Nabe nur, wenn sie über die Bohrung hinausragt und im Fußkreis Platz hat.
  const hub = p.hub ?? Math.min(p.bore + 6, Math.max(0, (profile.rf - 1) * 2));
  const hubHeight = p.hubHeight ?? (hub > p.bore + 1 ? 3 : 0);
  return (
    `$fn=${fn};\n` +
    `${gearScad}\n` +
    `gear(profile=[${pts}], thickness=${p.thickness}, bore=${p.bore}, ` +
    `hub=${hub.toFixed(3)}, hubHeight=${hubHeight});\n`
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

export interface RaketeParams {
  /** Welches druckbare Teil: Rumpf (Rohr + Finnen + Motorschacht) oder Nase. */
  part: 'rumpf' | 'nase';
  /** Rohr-Außendurchmesser [mm] */
  d: number;
  /** Rohrlänge [mm] */
  tubeLen: number;
  /** Nasenlänge [mm] */
  noseLen: number;
  /** Wurzeltiefe der Finne [mm] */
  finRoot: number;
  /** Spitzentiefe der Finne [mm] */
  finTip: number;
  /** Spannweite der Finne [mm] */
  finSpan: number;
  /** Anzahl der Finnen [-] */
  finCount: number;
  /** Vorschau-Qualität ($fn); modest halten, damit die Facet-Zahl klein bleibt. */
  fn?: number;
}

/** Baut den vollständigen .scad-Quelltext der Rakete (Teil per part gewählt). */
export function raketeScadSource(p: RaketeParams): string {
  const fn = p.fn ?? 32;
  return (
    `$fn=${fn};\n` +
    `${raketeScad}\n` +
    `rakete(part="${p.part}", d=${p.d}, tubeLen=${p.tubeLen}, noseLen=${p.noseLen}, ` +
    `finRoot=${p.finRoot}, finTip=${p.finTip}, finSpan=${p.finSpan}, finCount=${p.finCount});\n`
  );
}

/** Rendert ein Raketen-Teil zu ASCII-STL (Text). Wirft bei OpenSCAD-Fehlern. */
export async function renderRaketeStl(p: RaketeParams): Promise<string> {
  const oscad = await newInstance();
  return oscad.renderToStl(raketeScadSource(p));
}

export interface BrueckeParams {
  /** Bauart: 1 = Dreieck, 2 = Trapez (siehe bridgePreset in packages/engine). */
  preset: number;
  /** Fachwerkhöhe [mm] */
  h: number;
  /** Stabbreite in der Scheibenebene [mm] */
  b: number;
  /** Bautiefe / Extrusionshöhe [mm] */
  tiefe: number;
  /** Vorschau-Qualität ($fn); modest halten, damit die Facet-Zahl klein bleibt. */
  fn?: number;
}

/**
 * Baut den vollständigen .scad-Quelltext der Fachwerkbrücke.
 *
 * Knoten und Stäbe kommen aus bridgePreset() — derselben Funktion, aus der
 * solveTruss die Stabkräfte rechnet. Bauteil und Statik können damit nicht
 * auseinanderlaufen (Muster: gearScadSource).
 */
export function brueckeScadSource(p: BrueckeParams): string {
  const fn = p.fn ?? 32;
  const geo = bridgePreset(p.preset, p.h);
  const nodes = geo.nodes.map((n) => `[${n.x.toFixed(4)},${n.y.toFixed(4)}]`).join(',');
  const bars = geo.bars.map((e) => `[${e.from},${e.to}]`).join(',');
  const feet = geo.supports.map((s) => s.node).join(',');
  return (
    `$fn=${fn};\n` +
    `${brueckeScad}\n` +
    `bruecke(nodes=[${nodes}], bars=[${bars}], feet=[${feet}], ` +
    `eye=${geo.loadNode}, b=${p.b}, tiefe=${p.tiefe});\n`
  );
}

/** Rendert die Fachwerkbrücke zu ASCII-STL (Text). Wirft bei OpenSCAD-Fehlern. */
export async function renderBrueckeStl(p: BrueckeParams): Promise<string> {
  const oscad = await newInstance();
  return oscad.renderToStl(brueckeScadSource(p));
}
