// stl.ts — ASCII-STL parsen und validieren.
//
// OpenSCAD-WASM (renderToStl) liefert ASCII-STL als Text. validateStl() gatet den
// Download (nur valides STL geht raus) und wird im Gate getestet; parseStl() füttert
// den iso-Renderer mit Dreiecken. Reine Funktionen, in Node testbar.

import type { Vec3 } from '@buildlab/iso';

export interface Triangle {
  /** Flächennormale (wie im STL angegeben). */
  n: Vec3;
  /** Die drei Eckpunkte. */
  v: [Vec3, Vec3, Vec3];
}

export interface StlValidation {
  ok: boolean;
  reason?: string;
  triangles?: number;
}

const NUM = /-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?/g;
const FACET = /facet\s+normal\s+([^]*?)endfacet/g;

function finite3(a: number, b: number, c: number): boolean {
  return Number.isFinite(a) && Number.isFinite(b) && Number.isFinite(c);
}

/**
 * Prüft, ob `text` ein wohlgeformtes ASCII-STL ist: solid…endsolid, mindestens ein
 * facet, jedes facet mit Normale + genau drei vertices, alle Koordinaten endlich.
 */
export function validateStl(text: string): StlValidation {
  if (typeof text !== 'string' || text.length === 0) {
    return { ok: false, reason: 'leerer Inhalt' };
  }
  const trimmed = text.trimStart();
  if (!trimmed.startsWith('solid')) return { ok: false, reason: "kein 'solid'-Header" };
  if (!/endsolid/.test(text)) return { ok: false, reason: "kein 'endsolid'-Abschluss" };

  const facets = text.match(/facet\s+normal/g)?.length ?? 0;
  if (facets === 0) return { ok: false, reason: 'keine Facetten' };

  const vertices = text.match(/\bvertex\b/g)?.length ?? 0;
  if (vertices !== facets * 3) {
    return { ok: false, reason: `vertices (${vertices}) ≠ 3·facets (${facets * 3})` };
  }

  // Jede Facette braucht genau 12 endliche Zahlen (3 Normale + 9 vertex-Koordinaten).
  // Das fängt auch NaN/Inf/Müll ab, die das reine vertex-Zählen passieren lassen würde.
  let counted = 0;
  for (const facet of text.matchAll(FACET)) {
    const nums = facet[1].match(NUM)?.map(Number) ?? [];
    if (nums.length !== 12 || nums.some((n) => !Number.isFinite(n))) {
      return { ok: false, reason: 'Facette ohne 12 endliche Koordinaten' };
    }
    counted++;
  }
  if (counted !== facets) return { ok: false, reason: 'Facetten nicht parsebar' };

  return { ok: true, triangles: facets };
}

/** Parst ASCII-STL in Dreiecke. Erwartet wohlgeformten Input (siehe validateStl). */
export function parseStl(text: string): Triangle[] {
  const triangles: Triangle[] = [];
  for (const facet of text.matchAll(FACET)) {
    const body = facet[1];
    const nums = body.match(NUM)?.map(Number) ?? [];
    // 3 (Normale) + 9 (drei vertices) = 12 Zahlen je Facette.
    if (nums.length < 12) continue;
    const n: Vec3 = { x: nums[0], y: nums[1], z: nums[2] };
    const v: [Vec3, Vec3, Vec3] = [
      { x: nums[3], y: nums[4], z: nums[5] },
      { x: nums[6], y: nums[7], z: nums[8] },
      { x: nums[9], y: nums[10], z: nums[11] },
    ];
    if (
      !finite3(n.x, n.y, n.z) ||
      !finite3(v[0].x, v[0].y, v[0].z) ||
      !finite3(v[1].x, v[1].y, v[1].z) ||
      !finite3(v[2].x, v[2].y, v[2].z)
    ) {
      continue;
    }
    // Manche Exporte liefern eine Null-Normale. Ungeprüft übernommen ergibt das
    // n·d = 0, die Facette wird still weggecullt und der Körper bekommt ein
    // Loch. Darum aus den Kanten nachrechnen (Rechte-Hand-Regel wie im STL);
    // echte Nullflächen-Dreiecke werden verworfen.
    if (Math.hypot(n.x, n.y, n.z) < 1e-12) {
      const e1 = { x: v[1].x - v[0].x, y: v[1].y - v[0].y, z: v[1].z - v[0].z };
      const e2 = { x: v[2].x - v[0].x, y: v[2].y - v[0].y, z: v[2].z - v[0].z };
      const c = {
        x: e1.y * e2.z - e1.z * e2.y,
        y: e1.z * e2.x - e1.x * e2.z,
        z: e1.x * e2.y - e1.y * e2.x,
      };
      const len = Math.hypot(c.x, c.y, c.z);
      if (len < 1e-12) continue; // entartetes Dreieck ohne Fläche
      n.x = c.x / len;
      n.y = c.y / len;
      n.z = c.z / len;
    }
    triangles.push({ n, v });
  }
  return triangles;
}
