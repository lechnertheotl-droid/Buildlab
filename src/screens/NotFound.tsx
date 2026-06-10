// src/screens/NotFound.tsx — Freundliche 404-Karte (SCREENS.md §1).

import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-24 text-center">
      <p className="font-display text-2xl">Hier ist nichts gezeichnet.</p>
      <p className="mt-2 text-sm text-ink-2">Die Adresse führt ins Leere — zurück aufs Papier.</p>
      <Link
        to="/"
        className="mt-6 inline-flex min-h-11 items-center rounded bg-accent px-5 text-sm text-paper outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper active:translate-y-px"
      >
        zum Start →
      </Link>
    </div>
  );
}
