// Öffentliche API von @buildlab/cad.
//
// Eine geometrische Wahrheit (gear.scad) → OpenSCAD-WASM → ASCII-STL; daraus leiten
// sich Vorschau (meshToIso) UND Download (dasselbe STL) ab. Der Browser nutzt
// compileGear (Worker); Node/Tests nutzen renderGearStl (direkt). Eiserne Regel 4.

export { compileGear, compilePulley, compileRakete, compileBruecke } from './compile';
export {
  renderGearStl,
  gearScadSource,
  renderPulleyStl,
  pulleyScadSource,
  renderRaketeStl,
  raketeScadSource,
  type GearParams,
  type PulleyParams,
  type RaketeParams,
  renderBrueckeStl,
  brueckeScadSource,
  type BrueckeParams,
} from './run-openscad';
export { parseStl, validateStl, checkManifold, type Triangle, type StlValidation, type ManifoldCheck } from './stl';
export { meshToIso, type MeshIsoOptions, type IsoEdge, type IsoPolygon, type MeshIsoResult } from './mesh-iso';
