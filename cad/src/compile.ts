// compile.ts — Main-Thread-Wrapper um den OpenSCAD-Worker.
//
// Lazy: der Worker (und damit das WASM) wird erst beim ersten Aufruf erzeugt — nie zur
// Importzeit. So bleibt das 14-MB-Modul aus dem Haupt-Bundle (eigener Worker-Chunk,
// bei Bedarf geladen) und SSR berührt es nicht. Ergebnisse werden nach Parameter-Hash
// gecacht: gleiche Parameter → identisches STL (Determinismus, Vorschau == Export).

import type { BrueckeParams, GearParams, PulleyParams, RaketeParams } from './run-openscad';

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

const round3 = (n: number) => Math.round(n * 1000) / 1000; // Slider-Jitter vor dem Hash glätten

function paramKey(p: GearParams): string {
  return `gear|${round3(p.m)}|${round3(p.z)}|${round3(p.thickness)}|${round3(p.bore)}|${round3(p.fn ?? 24)}`;
}

function pulleyKey(p: PulleyParams): string {
  return `rolle|${round3(p.d)}|${round3(p.groove)}|${round3(p.bore)}|${round3(p.thickness)}|${round3(p.fn ?? 48)}`;
}

function raketeKey(p: RaketeParams): string {
  return (
    `rakete|${p.part}|${round3(p.d)}|${round3(p.tubeLen)}|${round3(p.noseLen)}|` +
    `${round3(p.finRoot)}|${round3(p.finTip)}|${round3(p.finSpan)}|${round3(p.finCount)}|${round3(p.fn ?? 32)}`
  );
}

function brueckeKey(p: BrueckeParams): string {
  return (
    `bruecke|${round3(p.preset)}|${round3(p.h)}|${round3(p.b)}|` +
    `${round3(p.tiefe)}|${round3(p.fn ?? 32)}`
  );
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
    getWorker().postMessage({ id, model: 'gear', params });
  });
}

/** Kompiliert die Umlenkrolle zu ASCII-STL (gecacht). Wirft bei Render-Fehlern. */
export function compilePulley(params: PulleyParams): Promise<string> {
  const key = pulleyKey(params);
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
    getWorker().postMessage({ id, model: 'rolle', params });
  });
}

/** Kompiliert ein Raketen-Teil (Rumpf/Nase) zu ASCII-STL (gecacht). */
export function compileRakete(params: RaketeParams): Promise<string> {
  const key = raketeKey(params);
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
    getWorker().postMessage({ id, model: 'rakete', params });
  });
}

/** Kompiliert die Fachwerkbrücke im Worker (gecacht über brueckeKey). */
export function compileBruecke(params: BrueckeParams): Promise<string> {
  const key = brueckeKey(params);
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
    getWorker().postMessage({ id, model: 'bruecke', params });
  });
}
