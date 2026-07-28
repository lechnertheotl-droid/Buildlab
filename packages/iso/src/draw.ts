// draw.ts — Bemaßung und Schraffur als Geometrie (DIN 406 / DIN ISO 128-50).
//
// Reine Geometrie, kein SVG: packages/iso bleibt React-frei, die Komponenten in
// packages/ui zeichnen daraus. Vorher hatte jede Komponente ihren eigenen
// Maßlinien-Stil — einer ohne Pfeile, einer ohne Maßzahl, beide mit
// Begrenzungen senkrecht zum Bildschirm statt zur Maßlinie.

import type { Vec2 } from './project';

export interface DimensionOptions {
  /** Versatz der Maßlinie gegenüber der Messstrecke (px, senkrecht). Default 0. */
  offset?: number;
  /** Überstand der Maßhilfslinien über die Maßlinie hinaus (px). Default 4. */
  overshoot?: number;
  /** Länge der Maßpfeile (px). Default 9. */
  arrowLen?: number;
  /** Halbe Breite der Maßpfeile (px). Default 3. */
  arrowHalf?: number;
}

export interface DimensionGeometry {
  /** Die Maßlinie selbst. */
  line: [Vec2, Vec2];
  /** Maßhilfslinien von den Messpunkten zur Maßlinie. */
  extensions: [Vec2, Vec2][];
  /** Zwei Pfeil-Polygone, nach außen zeigend, senkrecht auf der Maßlinie. */
  arrows: Vec2[][];
  /** Ankerpunkt und Drehwinkel (Grad) für die Maßzahl über der Linie. */
  label: { at: Vec2; angleDeg: number };
  /** Gemessene Länge in px — nur informativ, die Maßzahl kommt aus der Engine. */
  lengthPx: number;
}

/**
 * Baut eine vollständige Maßkette zwischen zwei Bildpunkten: Maßlinie,
 * Maßhilfslinien, zwei Pfeile **senkrecht zur Maßlinie** und den Anker für die
 * Maßzahl. Funktioniert auch für schräge (isometrische) Maßlinien.
 */
export function dimension(from: Vec2, to: Vec2, opts: DimensionOptions = {}): DimensionGeometry {
  const offset = opts.offset ?? 0;
  const overshoot = opts.overshoot ?? 4;
  const arrowLen = opts.arrowLen ?? 9;
  const arrowHalf = opts.arrowHalf ?? 3;

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy; // Normale der Maßlinie
  const ny = ux;

  const a: Vec2 = { x: from.x + nx * offset, y: from.y + ny * offset };
  const b: Vec2 = { x: to.x + nx * offset, y: to.y + ny * offset };

  const extensions: [Vec2, Vec2][] = offset === 0
    ? []
    : [
        [from, { x: a.x + nx * overshoot, y: a.y + ny * overshoot }],
        [to, { x: b.x + nx * overshoot, y: b.y + ny * overshoot }],
      ];

  // Pfeile zeigen nach außen auf die Messpunkte zu.
  const arrow = (tip: Vec2, dirX: number, dirY: number): Vec2[] => {
    const base = { x: tip.x + dirX * arrowLen, y: tip.y + dirY * arrowLen };
    const px = -dirY;
    const py = dirX;
    return [
      tip,
      { x: base.x + px * arrowHalf, y: base.y + py * arrowHalf },
      { x: base.x - px * arrowHalf, y: base.y - py * arrowHalf },
    ];
  };

  // Maßzahlen stehen nie auf dem Kopf (DIN 406): Winkel auf (−90°, 90°] drehen.
  let angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (angleDeg > 90) angleDeg -= 180;
  else if (angleDeg <= -90) angleDeg += 180;

  return {
    line: [a, b],
    extensions,
    arrows: [arrow(a, ux, uy), arrow(b, -ux, -uy)],
    label: { at: { x: (a.x + b.x) / 2 + nx * 7, y: (a.y + b.y) / 2 + ny * 7 }, angleDeg },
    lengthPx: len,
  };
}

/**
 * Schnittschraffur (DIN ISO 128-50): parallele Linien unter `angleDeg`,
 * auf das Polygon zugeschnitten. Liefert die Liniensegmente.
 */
export function hatch(polygon: Vec2[], spacing = 6, angleDeg = 45): [Vec2, Vec2][] {
  if (polygon.length < 3) return [];
  const a = (angleDeg * Math.PI) / 180;
  const ux = Math.cos(a);
  const uy = Math.sin(a);
  const nx = -uy;
  const ny = ux;

  // Ausdehnung des Polygons quer zur Schraffurrichtung bestimmen.
  const ds = polygon.map((p) => p.x * nx + p.y * ny);
  const ts = polygon.map((p) => p.x * ux + p.y * uy);
  const dMin = Math.min(...ds);
  const dMax = Math.max(...ds);
  const tMin = Math.min(...ts) - 1;
  const tMax = Math.max(...ts) + 1;

  const out: [Vec2, Vec2][] = [];
  const start = Math.ceil(dMin / spacing) * spacing;
  for (let d = start; d <= dMax; d += spacing) {
    // Schnittpunkte der Geraden (d fest) mit allen Polygonkanten sammeln.
    const hits: number[] = [];
    for (let i = 0; i < polygon.length; i++) {
      const p = polygon[i];
      const q = polygon[(i + 1) % polygon.length];
      const dp = p.x * nx + p.y * ny - d;
      const dq = q.x * nx + q.y * ny - d;
      if (dp === dq) continue;
      if (dp <= 0 === dq <= 0) continue; // Kante schneidet nicht
      const s = dp / (dp - dq);
      const ix = p.x + (q.x - p.x) * s;
      const iy = p.y + (q.y - p.y) * s;
      hits.push(ix * ux + iy * uy);
    }
    hits.sort((x, y) => x - y);
    // Paarweise füllen (gerade-ungerade-Regel).
    for (let i = 0; i + 1 < hits.length; i += 2) {
      const t0 = Math.max(hits[i], tMin);
      const t1 = Math.min(hits[i + 1], tMax);
      if (t1 - t0 < 0.5) continue;
      out.push([
        { x: nx * d + ux * t0, y: ny * d + uy * t0 },
        { x: nx * d + ux * t1, y: ny * d + uy * t1 },
      ]);
    }
  }
  return out;
}
