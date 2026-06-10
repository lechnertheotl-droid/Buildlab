// RouteError.tsx — Fehler-Karte (SCREENS.md §2): fängt Render-/Loader-Fehler,
// statt eine ewig „ladende" Seite stehen zu lassen. Ton nach VOICE.md §4 —
// kein Vorwurf, der Stand ist gespeichert (IndexedDB schreibt pro Aktion).

import { Component, type ReactNode } from 'react';
import { Button, Card } from '@buildlab/ui';

export function ErrorCard() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 md:px-6 md:py-10">
      <Card level="hero" className="flex flex-col items-start gap-3">
        <h1 className="font-display text-title text-ink-strong">
          Hier hat sich etwas verklemmt.
        </h1>
        <p className="max-w-prose text-sm leading-relaxed text-ink-2">
          Lad die Seite einmal neu — dein Stand ist gespeichert.
        </p>
        <Button className="mt-1" onClick={() => window.location.reload()}>
          Neu laden
        </Button>
      </Card>
    </div>
  );
}

/** errorElement für den Router (Loader-/Routing-Fehler). */
export function RouteError() {
  return <ErrorCard />;
}

/** Fängt Render-Fehler unterhalb der Shell (um den <Outlet/> gelegt). */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <ErrorCard /> : this.props.children;
  }
}
