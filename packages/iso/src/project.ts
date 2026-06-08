// project.ts — Isometrische Projektion (Eiserne Regel 3: SVG/Canvas2D, kein WebGL).
//
// Weltkoordinaten (x, y, z): x = nach rechts-hinten, y = nach links-hinten,
// z = nach oben. Bildschirmkoordinaten (SVG): x nach rechts, y nach UNTEN.
// Darum wird z von der Bildschirm-y abgezogen (höher = weiter oben am Schirm).

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Vec2 {
  x: number;
  y: number;
}

export interface IsoOptions {
  /** Gleichmäßiger Maßstab (Pixel pro Welteinheit). Default 1. */
  scale?: number;
  /** Projektionswinkel der Grundebene gegen die Waagerechte. Default 30° (echte Isometrie). */
  angle?: number;
}

const DEFAULT_ANGLE = Math.PI / 6; // 30°

/**
 * Projiziert einen 3D-Punkt isometrisch in die 2D-Bildebene.
 * Tiefe entsteht allein aus der Geometrie; Schattierung kommt aus shade.ts.
 */
export function project(p: Vec3, opts: IsoOptions = {}): Vec2 {
  const scale = opts.scale ?? 1;
  const angle = opts.angle ?? DEFAULT_ANGLE;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: (p.x - p.y) * cos * scale,
    y: ((p.x + p.y) * sin - p.z) * scale,
  };
}

/** Projiziert mehrere Punkte (z. B. die Ecken einer Fläche). */
export function projectAll(points: Vec3[], opts: IsoOptions = {}): Vec2[] {
  return points.map((p) => project(p, opts));
}

/** Formt projizierte Punkte zu einem SVG-`points`-String für <polygon>/<polyline>. */
export function toPolygonPoints(points: Vec2[]): string {
  return points.map((p) => `${round(p.x)},${round(p.y)}`).join(' ');
}

function round(n: number): number {
  // Auf 3 Nachkommastellen — sauberes SVG ohne Float-Rauschen.
  return Math.round(n * 1000) / 1000;
}
