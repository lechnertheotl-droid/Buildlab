// Öffentliche API von @buildlab/cad.
//
// Eine geometrische Wahrheit (gear.scad) → OpenSCAD-WASM → ASCII-STL; daraus leiten
// sich Vorschau (meshToIso) UND Download (dasselbe STL) ab. Der Browser nutzt
// compileGear (Worker); Node/Tests nutzen renderGearStl (direkt). Eiserne Regel 4.

export { compileGear, compilePulley } from './compile';
export { renderGearStl, gearScadSource, renderPulleyStl, pulleyScadSource, type GearParams, type PulleyParams } from './run-openscad';
export { parseStl, validateStl, type Triangle, type StlValidation } from './stl';
export { meshToIso, type MeshIsoOptions, type IsoPolygon, type MeshIsoResult } from './mesh-iso';
