import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Pseudo-3D bleibt SVG/Canvas2D (Eiserne Regel 3) — kein WebGL-Setup hier.
// Relative base ('./'), damit die App unter dem GitHub-Pages-Projektpfad
// (…github.io/<repo>/) funktioniert, ohne den Repo-Namen hartzukodieren.
export default defineConfig({
  base: './',
  plugins: [react()],
  // @buildlab/ui ist ein Workspace-Paket mit TSX-Quellen. Vom Dep-Optimizer
  // ausnehmen, damit es durch die normale React/TS-Transform-Pipeline läuft.
  optimizeDeps: { exclude: ['@buildlab/ui'] },
});
