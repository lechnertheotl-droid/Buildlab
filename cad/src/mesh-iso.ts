// mesh-iso.ts — Dreiecks-Mesh → isometrische SVG-Polygone (Eiserne Regel 3: kein WebGL).
//
// Baut auf den reinen Helfern aus @buildlab/iso auf: project (Projektion), rotateY
// (Drehung), shade (Token-Schattierung). Ablauf: optional drehen → Backface-Culling
// über die Flächennormale → eingepasster FRAME → Painter's-Tiefensortierung → flache
// Flächen-Schattierung. Reine Funktion, ohne DOM/React in Node testbar.

import { project, rotateY, toPolygonPoints, shade, type Vec3 } from '@buildlab/iso';
import type { Triangle } from './stl';

export interface MeshIsoOptions {
  width: number;
  height: number;
  /** Iso-Winkel (Default 30° wie @buildlab/iso). */
  angle?: number;
  /** Drehung um die Welt-y-Achse [rad] (Vorschau-Rotation). */
  rotation?: number;
  margin?: { l: number; t: number; r: number; b: number };
  /** Grundton (Hex) — Default --ink-2, dasselbe Material wie der Hebel. */
  base?: string;
}

export interface IsoPolygon {
  points: string;
  fill: string;
}

export interface MeshIsoResult {
  polygons: IsoPolygon[];
  width: number;
  height: number;
}

const DEFAULT_ANGLE = Math.PI / 6;
const DEFAULT_MARGIN = { l: 16, t: 16, r: 16, b: 16 };
const BASE = '#57534A'; // --ink-2

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}
function norm(a: Vec3): Vec3 {
  const len = Math.hypot(a.x, a.y, a.z) || 1;
  return { x: a.x / len, y: a.y / len, z: a.z / len };
}
function centroid3(t: Triangle): Vec3 {
  return {
    x: (t.v[0].x + t.v[1].x + t.v[2].x) / 3,
    y: (t.v[0].y + t.v[1].y + t.v[2].y) / 3,
    z: (t.v[0].z + t.v[1].z + t.v[2].z) / 3,
  };
}

/**
 * Rendert ein Mesh isometrisch zu sortierten, schattierten SVG-Polygonen.
 *
 * Sichtbarkeit & Tiefe folgen aus der Blickrichtung d = (1, 1, 2·sin angle) — der
 * Welt-Richtung, entlang derer project() orthografisch abbildet. Die Kamera liegt auf
 * der +d-Seite (die Oberseite z=+1 ist sichtbar): sichtbar = n·d > 0; näher = größeres
 * c·d → zuletzt zeichnen (Maler-Algorithmus).
 */
export function meshToIso(triangles: Triangle[], opts: MeshIsoOptions): MeshIsoResult {
  const angle = opts.angle ?? DEFAULT_ANGLE;
  const margin = opts.margin ?? DEFAULT_MARGIN;
  const base = opts.base ?? BASE;
  const rot = opts.rotation ?? 0;

  // Blickrichtung (Nullraum der Projektion) und Lichtrichtung (von oben/vorne).
  const view: Vec3 = { x: 1, y: 1, z: 2 * Math.sin(angle) };
  const viewN = norm(view);
  const lightN = norm({ x: 0.3, y: 0.3, z: 1 });

  // Gedrehte Dreiecke (Normale mitdrehen — rotateY ist eine Rotation, erhält Normalen).
  const rotated: Triangle[] = triangles.map((t) => ({
    n: rotateY(t.n, rot),
    v: [rotateY(t.v[0], rot), rotateY(t.v[1], rot), rotateY(t.v[2], rot)],
  }));

  // FRAME einpassen: alle Eckpunkte bei scale 1 projizieren, Bounding-Box, scale + Versatz.
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const t of rotated) {
    for (const p of t.v) {
      const q = project(p, { angle });
      if (q.x < minX) minX = q.x;
      if (q.x > maxX) maxX = q.x;
      if (q.y < minY) minY = q.y;
      if (q.y > maxY) maxY = q.y;
    }
  }
  const w = maxX - minX || 1;
  const h = maxY - minY || 1;
  const scale = Math.min(
    (opts.width - margin.l - margin.r) / w,
    (opts.height - margin.t - margin.b) / h,
  );
  const tx = (opts.width - w * scale) / 2 - minX * scale;
  const ty = (opts.height - h * scale) / 2 - minY * scale;
  const proj = (p: Vec3) => {
    const q = project(p, { scale, angle });
    return { x: q.x + tx, y: q.y + ty };
  };

  // Culling + Tiefe je Fläche.
  const visible: { points: string; fill: string; depth: number }[] = [];
  for (const t of rotated) {
    if (dot(t.n, viewN) <= 0) continue; // rückseitig
    const depth = dot(centroid3(t), viewN);
    const lit = dot(norm(t.n), lightN); // [-1, 1]
    const amount = Math.max(-0.3, Math.min(0.3, lit * 0.3));
    const points = toPolygonPoints(t.v.map(proj));
    visible.push({ points, fill: shade(base, amount), depth });
  }

  // Maler-Algorithmus: fern (kleines depth) zuerst, nah zuletzt.
  visible.sort((a, b) => a.depth - b.depth);

  return {
    polygons: visible.map(({ points, fill }) => ({ points, fill })),
    width: opts.width,
    height: opts.height,
  };
}
