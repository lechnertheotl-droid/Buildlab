// src/lib/stl.ts — STL-Neukompilieren + Download für gespeicherte Bauten.
// Persistiert sind nur die Parameter (DATENMODELL.md §1, keine Blobs);
// das STL entsteht bei Bedarf frisch aus dem parametrischen Modell.
// Genutzt vom Produkt-Knoten der Projektkarte (früher: Werkstatt-Screen).

import { compileGear, compilePulley } from '@buildlab/cad';
import type { BuildEntry } from '../db/types';

export async function recompileBuild(build: BuildEntry): Promise<string> {
  if (build.cadModel === 'gear') {
    const { m, z, thickness, bore } = build.params;
    return compileGear({ m, z, thickness, bore });
  }
  if (build.cadModel === 'rolle') {
    const { d, groove, bore, thickness } = build.params;
    return compilePulley({ d, groove, bore, thickness });
  }
  throw new Error(`Unbekanntes Modell '${build.cadModel}'`);
}

/** Dateiname robust halten: Sonderzeichen (Ø, Umlaute) brechen sonst das
    download-Attribut in manchen Browsern. */
export function stlFileName(label: string): string {
  const safe = label
    .toLowerCase()
    .replaceAll('ø', 'd')
    .replace(/[äöüß]/g, (c) => ({ ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' })[c] ?? c)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${safe || 'bauteil'}.stl`;
}

export function downloadStl(stl: string, name: string) {
  const blob = new Blob([stl], { type: 'model/stl' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
