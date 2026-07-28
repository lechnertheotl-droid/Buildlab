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
  /** Tiefe entlang der Blickrichtung — größer = näher (Maler-Reihenfolge). */
  depth: number;
}

/** Eine Bauteilkante in Bildkoordinaten (Silhouette oder Knickkante). */
export interface IsoEdge {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** 'silhouette' = Umriss gegen den Hintergrund, 'crease' = Knick im Körper. */
  kind: 'silhouette' | 'crease';
  /** Tiefe wie bei den Flächen — Kanten werden mit ihnen verschachtelt
      gezeichnet, sonst scheinen verdeckte Kanten durch den Körper. */
  depth: number;
}

export interface MeshIsoResult {
  polygons: IsoPolygon[];
  /** Bauteilkanten — ohne sie sieht man das Tesselierungsnetz statt der Kanten. */
  edges: IsoEdge[];
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
    // Tiefe über die NÄCHSTE Ecke statt über den Schwerpunkt: bei nicht-konvexen
    // Körpern (Zahnlücken, Seilrille, Finnen am Rohr) ordnet der Schwerpunkt
    // sichtbar falsch — eine große ferne Fläche verdeckt sonst kleine nahe.
    const depth = Math.max(...t.v.map((p) => dot(p, viewN)));
    const lit = dot(norm(t.n), lightN); // [-1, 1]
    const amount = Math.max(-0.3, Math.min(0.3, lit * 0.3));
    const points = toPolygonPoints(t.v.map(proj));
    visible.push({ points, fill: shade(base, amount), depth });
  }

  // Maler-Algorithmus: fern (kleines depth) zuerst, nah zuletzt.
  visible.sort((a, b) => a.depth - b.depth);

  return {
    polygons: visible,
    edges: extractEdges(rotated, viewN, proj),
    width: opts.width,
    height: opts.height,
  };
}

/**
 * Zieht aus dem Mesh die tatsächlichen Bauteilkanten:
 *   Silhouette — die beiden Nachbarflächen zeigen in verschiedene Richtungen
 *                relativ zur Kamera (Umriss gegen den Hintergrund),
 *   Crease     — die Nachbarflächen knicken um mehr als CREASE_DEG.
 *
 * Damit verschwindet das Tesselierungsnetz glatter Zylinder, während
 * Zahnflanken, Rillenkanten und Finnenkanten stehen bleiben — der Unterschied
 * zwischen „Klumpen" und technischer Zeichnung.
 */
const CREASE_DEG = 25;
const QUANT = 1e4; // Ecken auf 1e-4 runden, damit geteilte Kanten zusammenfinden

function extractEdges(
  tris: Triangle[],
  viewN: Vec3,
  proj: (p: Vec3) => { x: number; y: number },
): IsoEdge[] {
  const key = (p: Vec3) =>
    `${Math.round(p.x * QUANT)},${Math.round(p.y * QUANT)},${Math.round(p.z * QUANT)}`;
  const map = new Map<string, { a: Vec3; b: Vec3; normals: Vec3[] }>();

  for (const t of tris) {
    for (let i = 0; i < 3; i++) {
      const a = t.v[i];
      const b = t.v[(i + 1) % 3];
      const ka = key(a);
      const kb = key(b);
      const id = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
      const eintrag = map.get(id);
      if (eintrag) eintrag.normals.push(t.n);
      else map.set(id, { a, b, normals: [t.n] });
    }
  }

  const creaseCos = Math.cos((CREASE_DEG * Math.PI) / 180);
  const edges: IsoEdge[] = [];
  for (const { a, b, normals } of map.values()) {
    let kind: IsoEdge['kind'] | null = null;
    if (normals.length === 1) {
      kind = 'silhouette'; // offener Rand (nicht-manifest) — immer zeichnen
    } else {
      const [n1, n2] = normals;
      const s1 = dot(n1, viewN) > 0;
      const s2 = dot(n2, viewN) > 0;
      if (s1 !== s2) kind = 'silhouette';
      else if (s1 && dot(norm(n1), norm(n2)) < creaseCos) kind = 'crease';
    }
    if (!kind) continue;
    const pa = proj(a);
    const pb = proj(b);
    // Minimal nach vorn versetzt, damit eine Kante über ihrer eigenen Fläche
    // liegt, aber weiterhin von näheren Flächen verdeckt wird.
    const depth = Math.max(dot(a, viewN), dot(b, viewN)) + 1e-6;
    edges.push({
      x1: Math.round(pa.x * 100) / 100,
      y1: Math.round(pa.y * 100) / 100,
      x2: Math.round(pb.x * 100) / 100,
      y2: Math.round(pb.y * 100) / 100,
      kind,
      depth,
    });
  }
  edges.sort((a, b) => a.depth - b.depth);
  return edges;
}
