import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Pseudo-3D bleibt SVG/Canvas2D (Eiserne Regel 3) — kein WebGL-Setup hier.
// Relative base ('./'), damit die App unter dem GitHub-Pages-Projektpfad
// (…github.io/<repo>/) funktioniert, ohne den Repo-Namen hartzukodieren.
export default defineConfig({
  base: './',
  plugins: [react()],
  // OpenSCAD-WASM (Phase 3) läuft in einem Modul-Worker (cad/src/openscad.worker.ts);
  // er wird lazy erzeugt → das ~14 MB große WASM bleibt aus dem Haupt-Bundle.
  worker: { format: 'es' },
  // Workspace-Pakete mit TS(X)-Quellen sowie das schwere openscad-wasm vom
  // Dep-Optimizer ausnehmen (normale Transform; kein Prebundle des WASM-Moduls).
  optimizeDeps: { exclude: ['@buildlab/ui', '@buildlab/iso', '@buildlab/cad', 'openscad-wasm'] },
});
