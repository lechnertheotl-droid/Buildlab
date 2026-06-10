// src/screens/NotFound.tsx — Freundliche 404-Karte (SCREENS.md §1).

import { Link } from 'react-router-dom';
import { buttonClass } from '@buildlab/ui';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-24 text-center">
      {/* Leeres Blatt: gestrichelter Iso-Rahmen, nichts eingezeichnet. */}
      <svg viewBox="0 0 96 56" className="mx-auto h-20 w-32" aria-hidden="true">
        <polygon
          points="48,4 92,26 48,48 4,26"
          fill="none"
          stroke="var(--ink-faint)"
          strokeWidth="1.2"
          strokeDasharray="4 4"
        />
        <line x1="40" y1="26" x2="56" y2="26" stroke="var(--accent)" strokeWidth="1.5" />
      </svg>
      <p className="mt-4 font-display text-display-sm text-ink-strong">Hier ist nichts gezeichnet.</p>
      <p className="mt-2 text-sm text-ink-2">Die Adresse führt ins Leere — zurück aufs Papier.</p>
      <Link to="/" className={`mt-6 ${buttonClass()}`}>
        zum Start →
      </Link>
    </div>
  );
}
