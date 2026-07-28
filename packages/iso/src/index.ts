// Öffentliche API von @buildlab/iso — der pseudo-3D-Werkzeugkasten.
// Reine Funktionen (Projektion, Geometrie, Verzahnung, Bemaßung, Schattierung,
// Explosion); die konkreten SVG-Komponenten leben in packages/ui und nutzen
// diese Helfer. Alles, was mehr als eine Komponente braucht, gehört hierher —
// geratene Projektionsfaktoren in einzelnen Komponenten sind die Fehlerquelle,
// die dieses Paket verhindern soll.

export { project, projectAll, toPolygonPoints, rotateY } from './project';
export type { Vec2, Vec3, IsoOptions } from './project';
export { projectCircle, depthOf, sortByDepth, scaleToFit, rotateZ, rotateX } from './geometry';
export type { Ellipse, FitBox, FitResult } from './geometry';
export { gearProfile, gearMeshPhase, involute, minTeethNoUndercut } from './gear';
export type { GearProfile, GearProfileOptions } from './gear';
export { dimension, hatch } from './draw';
export type { DimensionGeometry, DimensionOptions } from './draw';
export { shade, faceShade, shadeByNormal } from './shade';
export type { Face } from './shade';
export { explode, explodePoint, explodeAlong, explodeTrail, centroid } from './explode';
