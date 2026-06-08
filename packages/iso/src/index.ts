// Öffentliche API von @buildlab/iso — der pseudo-3D-Werkzeugkasten.
// Reine Funktionen (Projektion, Schattierung, Explosion); die konkreten
// SVG-Komponenten leben in packages/ui und nutzen diese Helfer.

export { project, projectAll, toPolygonPoints } from './project';
export type { Vec2, Vec3, IsoOptions } from './project';
export { shade, faceShade } from './shade';
export type { Face } from './shade';
export { explode, explodePoint, centroid } from './explode';
