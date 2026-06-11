// src/shell/icons.tsx — Gezeichnete UI-Icons (Stroke, 1.5pt) statt Emojis
// (DESIGN.md §9). Größe über className, Farbe über currentColor.

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

export const IconStart = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M4 11.5 12 5l8 6.5" />
    <path d="M6 10.5V19h12v-8.5" />
  </svg>
);

export const IconKarte = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <circle cx="6" cy="7" r="2.2" />
    <circle cx="18" cy="7" r="2.2" />
    <circle cx="12" cy="17" r="2.2" />
    <path d="M7.6 8.4 10.6 15M16.4 8.4 13.4 15M8.2 7h7.6" />
  </svg>
);

export const IconProjekte = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <rect x="4" y="4" width="7" height="7" rx="1" />
    <rect x="13" y="4" width="7" height="7" rx="1" />
    <rect x="4" y="13" width="7" height="7" rx="1" />
    <rect x="13" y="13" width="7" height="7" rx="1" />
  </svg>
);

export const IconWerkstatt = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M14.5 6.5a4 4 0 0 0-5.6 4.9L4 16.3V20h3.7l4.9-4.9a4 4 0 0 0 4.9-5.6l-2.7 2.7-2.3-2.3 2-2.4Z" />
  </svg>
);

export const IconTraining = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M4 12a8 8 0 0 1 14-5.3" />
    <path d="M18 3v4h-4" />
    <path d="M20 12a8 8 0 0 1-14 5.3" />
    <path d="M6 21v-4h4" />
  </svg>
);

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
