// src/shell/icons.tsx — Gezeichnete UI-Icons (Stroke, 1.5pt) statt Emojis
// (DESIGN.md §9). Größe über className, Farbe über currentColor.
// Seit dem Projektkarten-Umbau (R9) braucht die Shell nur noch das Zahnrad.

import type { SVGProps } from 'react';

const base: SVGProps<SVGSVGElement> = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

export const IconEinstellungen = (p: SVGProps<SVGSVGElement>) => (
  // Klassisches Zahnrad mit Zahnkranz — die alte Strahlen-Variante las sich
  // als Sonne/Helligkeit (Testbefund B-34).
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="3" />
    <circle cx="12" cy="12" r="6.5" />
    {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
      const rad = (a * Math.PI) / 180;
      const x1 = 12 + 6.5 * Math.cos(rad);
      const y1 = 12 + 6.5 * Math.sin(rad);
      const x2 = 12 + 9 * Math.cos(rad);
      const y2 = 12 + 9 * Math.sin(rad);
      return <line key={a} x1={x1.toFixed(2)} y1={y1.toFixed(2)} x2={x2.toFixed(2)} y2={y2.toFixed(2)} />;
    })}
  </svg>
);
