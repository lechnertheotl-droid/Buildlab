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

/**
 * Verschiebt ein Bauteil entlang der Montageachse — so entstehen echte
 * Explosionsdarstellungen: Teile wandern in Montagereihenfolge auseinander,
 * statt radial vom Schwerpunkt zu streuen. `order` ist die Position in der
 * Montagefolge (0 bleibt stehen), `gap` der Abstand je Stufe in Welteinheiten.
 */
export function explodeAlong(
  point: Vec3,
  axis: Vec3,
  order: number,
  gap: number,
  factor = 1,
): Vec3 {
  const len = Math.hypot(axis.x, axis.y, axis.z) || 1;
  const d = order * gap * factor;
  return {
    x: point.x + (axis.x / len) * d,
    y: point.y + (axis.y / len) * d,
    z: point.z + (axis.z / len) * d,
  };
}

/**
 * Bezugslinie einer Explosionsdarstellung: die strichpunktierte Bahn, auf der
 * ein Teil aus seiner Einbaulage gewandert ist (DESIGN.md §6).
 */
export function explodeTrail(point: Vec3, axis: Vec3, order: number, gap: number): [Vec3, Vec3] {
  return [point, explodeAlong(point, axis, order, gap)];
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
