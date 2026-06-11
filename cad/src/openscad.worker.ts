// openscad.worker.ts — Web-Worker, der OpenSCAD-WASM von der UI fernhält.
//
// Hält den schweren CGAL-Render (und das ~14 MB große WASM-Modul) vom Main-Thread weg.
// Nutzt denselben Kern wie der Node-Test (run-openscad), nur über postMessage gekapselt.

import { renderGearStl, renderPulleyStl, type GearParams, type PulleyParams } from './run-openscad';

interface RequestMsg {
  id: number;
  /** Welches parametrische Modell — Default 'gear' (Abwärtskompatibilität). */
  model?: 'gear' | 'rolle';
  params: GearParams | PulleyParams;
}

// Im DOM-Typkontext ist `self` als Window typisiert; im Worker ist postMessage 1-argig.
const post = (msg: unknown) =>
  (self as unknown as { postMessage(m: unknown): void }).postMessage(msg);

self.onmessage = async (e: MessageEvent<RequestMsg>) => {
  const { id, model, params } = e.data;
  try {
    const stl =
      model === 'rolle'
        ? await renderPulleyStl(params as PulleyParams)
        : await renderGearStl(params as GearParams);
    post({ id, ok: true, stl });
  } catch (err) {
    post({ id, ok: false, error: err instanceof Error ? err.message : String(err) });
  }
};
