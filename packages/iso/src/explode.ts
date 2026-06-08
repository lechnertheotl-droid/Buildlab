// explode.ts — Explosionsansicht (CLAUDE.md: Tiefe über Explosionsansichten).
// Schiebt Bauteile radial vom gemeinsamen Mittelpunkt weg, damit man die
// Einzelteile getrennt sieht. Rein geometrisch, animationsneutral.

import type { Vec3 } from './project';

/**
 * Verschiebt einen Punkt vom Zentrum weg.
 * factor = 0 → unverändert; factor = 1 → doppelter Abstand zum Zentrum.
 */
export function explodePoint(point: Vec3, center: Vec3, factor: number): Vec3 {
  return {
    x: center.x + (point.x - center.x) * (1 + factor),
    y: center.y + (point.y - center.y) * (1 + factor),
    z: center.z + (point.z - center.z) * (1 + factor),
  };
}

/** Explodiert eine ganze Punktwolke um ihren (übergebenen) Mittelpunkt. */
export function explode(points: Vec3[], center: Vec3, factor: number): Vec3[] {
  return points.map((p) => explodePoint(p, center, factor));
}

/** Arithmetischer Mittelpunkt einer Punktwolke (als Default-Zentrum). */
export function centroid(points: Vec3[]): Vec3 {
  if (points.length === 0) return { x: 0, y: 0, z: 0 };
  const sum = points.reduce(
    (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y, z: acc.z + p.z }),
    { x: 0, y: 0, z: 0 },
  );
  const n = points.length;
  return { x: sum.x / n, y: sum.y / n, z: sum.z / n };
}
