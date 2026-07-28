// geometry.ts — Projektions-Geometrie, die bisher in jeder Komponente einzeln
// (und teils falsch) nachgebaut wurde: Kreise, Tiefensortierung, Einpassung.
//
// Der wichtigste Fall ist projectCircle: ein Kreis der Grundebene wird unter
// project() zu einer achsparallelen Ellipse mit rx = r·√2·cos α und
// ry = r·√2·sin α. Die Komponenten haben diesen Faktor bisher geraten
// (0,58 / 0,62 / 1,15) — daher lagen Teilkreise im Fußkreis und Scheiben
// in der falschen Tiefe.

import { project, type IsoOptions, type Vec2, type Vec3 } from './project';

const DEFAULT_ANGLE = Math.PI / 6;

export interface Ellipse {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

/**
 * Exakte Projektion eines Kreises der Ebene z = center.z (Grundebene).
 *
 * Herleitung: mit p = center + r·(cos t, sin t, 0) wird
 *   x' = c'x + r·cos α·(cos t − sin t) = c'x + r·√2·cos α·cos(t + π/4)
 *   y' = c'y + r·sin α·(cos t + sin t) = c'y + r·√2·sin α·sin(t + π/4)
 * also eine achsparallele Ellipse — ohne Drehung, ohne Näherung.
 */
export function projectCircle(center: Vec3, r: number, opts: IsoOptions = {}): Ellipse {
  const scale = opts.scale ?? 1;
  const angle = opts.angle ?? DEFAULT_ANGLE;
  const c = project(center, opts);
  const k = r * Math.SQRT2 * scale;
  return { cx: c.x, cy: c.y, rx: k * Math.cos(angle), ry: k * Math.sin(angle) };
}

/**
 * Tiefe eines Punktes entlang der Blickrichtung dieser Projektion.
 * Die Blickrichtung ist der Nullraum von project(): d = (1, 1, 2·sin α)
 * — bei der Standard-Isometrie (30°) also exakt (1, 1, 1).
 * **Größer = näher am Betrachter** (zuletzt zeichnen).
 */
export function depthOf(p: Vec3, opts: IsoOptions = {}): number {
  const angle = opts.angle ?? DEFAULT_ANGLE;
  return p.x + p.y + 2 * Math.sin(angle) * p.z;
}

/**
 * Sortiert Teile nach Tiefe (Maler-Algorithmus): ferne zuerst, nahe zuletzt.
 * Stabil — gleich tiefe Teile behalten ihre Eingabereihenfolge.
 */
export function sortByDepth<T>(parts: T[], at: (part: T) => Vec3, opts: IsoOptions = {}): T[] {
  return parts
    .map((part, i) => ({ part, i, d: depthOf(at(part), opts) }))
    .sort((a, b) => a.d - b.d || a.i - b.i)
    .map((e) => e.part);
}

export interface FitResult {
  /** Pixel je Welteinheit. */
  scale: number;
  /** Verschiebung nach der Projektion (Bildschirm-Pixel). */
  tx: number;
  ty: number;
  /** Wendet Maßstab und Verschiebung an — die fertige Welt→Bild-Abbildung. */
  toScreen: (p: Vec3) => Vec2;
}

export interface FitBox {
  width: number;
  height: number;
  margin?: { l?: number; t?: number; r?: number; b?: number };
  /** Obergrenze für den Maßstab — damit kleine Körper nicht formatfüllend aufblasen. */
  maxScale?: number;
}

/**
 * Passt eine Punktwolke randscharf in eine Zeichenfläche ein und liefert die
 * fertige Welt→Bild-Abbildung. Wer den Maßstab über `maxScale` deckelt, behält
 * echte Größenunterschiede im Bild — genau das fehlte beim Modul-Slider,
 * der sich vorher aus einer normierten Skalierung herauskürzte.
 */
export function scaleToFit(points: Vec3[], box: FitBox, opts: IsoOptions = {}): FitResult {
  const angle = opts.angle ?? DEFAULT_ANGLE;
  const m = { l: 0, t: 0, r: 0, b: 0, ...(box.margin ?? {}) };
  const unit = points.map((p) => project(p, { angle }));
  const xs = unit.map((q) => q.x);
  const ys = unit.map((q) => q.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const w = maxX - minX || 1;
  const h = maxY - minY || 1;
  const avail = { w: box.width - m.l - m.r, h: box.height - m.t - m.b };
  let scale = Math.min(avail.w / w, avail.h / h);
  if (box.maxScale !== undefined) scale = Math.min(scale, box.maxScale);
  // Inhalt mittig im verfügbaren Feld setzen.
  const tx = m.l + (avail.w - w * scale) / 2 - minX * scale;
  const ty = m.t + (avail.h - h * scale) / 2 - minY * scale;
  const toScreen = (p: Vec3): Vec2 => {
    const q = project(p, { angle, scale });
    return { x: q.x + tx, y: q.y + ty };
  };
  return { scale, tx, ty, toScreen };
}

/**
 * Dreht einen Punkt um die Hochachse z (Turntable-Drehung) — die Drehung
 * flacher Körper wie Zahnräder und Rollen. Ergänzt rotateY (Kippen).
 */
export function rotateZ(p: Vec3, angle: number): Vec3 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: p.x * cos - p.y * sin, y: p.x * sin + p.y * cos, z: p.z };
}

/** Dreht einen Punkt um die Welt-x-Achse (Neigen der Bühne). */
export function rotateX(p: Vec3, angle: number): Vec3 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: p.x, y: p.y * cos - p.z * sin, z: p.y * sin + p.z * cos };
}
