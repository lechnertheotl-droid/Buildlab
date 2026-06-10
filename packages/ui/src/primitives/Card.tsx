// Card.tsx — das eine Zeichenfeld (DESIGN.md §3/§4): Hairline-Rahmen,
// erhöhte Fläche, Elevation 1. „hero" = großzügige Variante für die je
// wichtigste Karte eines Screens.

import type { HTMLAttributes } from 'react';

export type CardLevel = 1 | 'hero';

export function cardClass(level: CardLevel = 1): string {
  return level === 'hero'
    ? 'rounded-lg border border-black/10 bg-paper-2 p-6 shadow'
    : 'rounded border border-black/10 bg-paper-2 p-4 shadow';
}

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  level?: CardLevel;
}

export function Card({ level = 1, className = '', ...rest }: CardProps) {
  return <div className={`${cardClass(level)} ${className}`} {...rest} />;
}
