// Roh-Import von .scad-Quelltext (Vite ?raw). Das Modell bleibt EINE Quelle: gear.scad
// wird als String importiert und zur Laufzeit parametrisiert.
declare module '*.scad?raw' {
  const src: string;
  export default src;
}
