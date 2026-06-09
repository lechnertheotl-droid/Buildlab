// compile.ts — Main-Thread-Wrapper um den OpenSCAD-Worker.
//
// Lazy: der Worker (und damit das WASM) wird erst beim ersten Aufruf erzeugt — nie zur
// Importzeit. So bleibt das 14-MB-Modul aus dem Haupt-Bundle (eigener Worker-Chunk,
// bei Bedarf geladen) und SSR berührt es nicht. Ergebnisse werden nach Parameter-Hash
// gecacht: gleiche Parameter → identisches STL (Determinismus, Vorschau == Export).

import type { GearParams } from './run-openscad';

interface ResponseMsg {
  id: number;
  ok: boolean;
  stl?: string;
  error?: string;
}

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, { resolve: (stl: string) => void; reject: (e: Error) => void }>();
const cache = new Map<string, string>();

function paramKey(p: GearParams): string {
  const r = (n: number) => Math.round(n * 1000) / 1000; // Slider-Jitter vor dem Hash glätten
  return `${r(p.m)}|${r(p.z)}|${r(p.thickness)}|${r(p.bore)}|${r(p.fn ?? 24)}`;
}

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./openscad.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<ResponseMsg>) => {
      const { id, ok, stl, error } = e.data;
      const entry = pending.get(id);
      if (!entry) return;
      pending.delete(id);
      if (ok && stl !== undefined) entry.resolve(stl);
      else entry.reject(new Error(error ?? 'OpenSCAD-Render fehlgeschlagen'));
    };
  }
  return worker;
}

/** Kompiliert das Stirnrad zu ASCII-STL (gecacht). Wirft bei Render-Fehlern. */
export function compileGear(params: GearParams): Promise<string> {
  const key = paramKey(params);
  const hit = cache.get(key);
  if (hit !== undefined) return Promise.resolve(hit);

  const id = nextId++;
  return new Promise<string>((resolve, reject) => {
    pending.set(id, {
      resolve: (stl) => {
        cache.set(key, stl);
        resolve(stl);
      },
      reject,
    });
    getWorker().postMessage({ id, params });
  });
}
