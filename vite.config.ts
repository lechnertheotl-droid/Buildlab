import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Pseudo-3D bleibt SVG/Canvas2D (Eiserne Regel 3) — kein WebGL-Setup hier.
export default defineConfig({
  plugins: [react()],
});
