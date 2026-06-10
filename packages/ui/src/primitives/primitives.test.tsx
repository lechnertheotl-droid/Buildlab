// primitives.test.tsx — SSR-Smoke-Tests fürs Design-System (DESIGN.md §4).
// Belegt: alle Zustände vorhanden, ARIA-Semantik korrekt, zugeklappter
// Collapse-Inhalt bleibt im DOM, Roving-Tabindex hat genau einen Tab-Stopp.

import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Button, buttonClass } from './Button';
import { Card } from './Card';
import { EmptyState } from './EmptyState';
import { Skeleton, ScreenSkeleton } from './Skeleton';
import { Dialog } from './Dialog';
import { SegmentedControl } from './SegmentedControl';
import { StatusBadge } from './StatusBadge';
import { ProgressBar } from './ProgressBar';
import { Collapse } from './Collapse';

describe('Button', () => {
  it('primär: Akzent-Fläche, Fokus-Ring, Aktiv-Zustand, 44px-Höhe', () => {
    const html = renderToStaticMarkup(<Button>Weiter</Button>);
    expect(html).toContain('bg-accent');
    expect(html).toContain('focus-visible:ring-2');
    expect(html).toContain('active:translate-y-px');
    expect(html).toContain('min-h-11');
  });

  it('deaktiviert: 40 % Opazität + not-allowed (DESIGN.md §4)', () => {
    const html = renderToStaticMarkup(<Button disabled>Weiter</Button>);
    expect(html).toContain('disabled');
    expect(html).toContain('disabled:opacity-40');
    expect(html).toContain('disabled:cursor-not-allowed');
  });

  it('buttonClass liefert Varianten für Router-Links', () => {
    expect(buttonClass({ variant: 'secondary' })).toContain('border');
    expect(buttonClass({ variant: 'danger' })).toContain('bg-fehl');
    expect(buttonClass({ variant: 'ghost' })).toContain('hover:bg-paper-sink');
    expect(buttonClass({ size: 'sm' })).toContain('min-h-9');
  });
});

describe('Card & EmptyState', () => {
  it('Karte: Hairline + Elevation 1; hero großzügiger mit radius-lg', () => {
    expect(renderToStaticMarkup(<Card>Inhalt</Card>)).toContain('shadow');
    expect(renderToStaticMarkup(<Card level="hero">Inhalt</Card>)).toContain('rounded-lg');
  });

  it('EmptyState zeigt Titel, Hinweis und Aktion', () => {
    const html = renderToStaticMarkup(
      <EmptyState title="Noch nichts gebaut" hint="Dein erstes Bauteil wartet." action={<Button>los</Button>} />,
    );
    expect(html).toContain('Noch nichts gebaut');
    expect(html).toContain('Dein erstes Bauteil wartet.');
    expect(html).toContain('bg-accent');
  });
});

describe('Skeleton', () => {
  it('schimmert auf paper-deep und ist für Screenreader als Laden markiert', () => {
    expect(renderToStaticMarkup(<Skeleton className="h-4" />)).toContain('bl-schimmer');
    const screen = renderToStaticMarkup(<ScreenSkeleton layout="workspace" />);
    expect(screen).toContain('role="status"');
    expect(screen).toContain('lädt');
  });
});

describe('Dialog', () => {
  it('offen: role=dialog, aria-modal, Titel verknüpft, Elevation 2', () => {
    const html = renderToStaticMarkup(
      <Dialog open onClose={() => {}} title="Backup einspielen?">
        <p>3 Projekte</p>
      </Dialog>,
    );
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-labelledby');
    expect(html).toContain('Backup einspielen?');
    expect(html).toContain('shadow-2');
    expect(html).toContain('bl-gleiten');
  });

  it('geschlossen: rendert nichts', () => {
    expect(
      renderToStaticMarkup(
        <Dialog open={false} onClose={() => {}} title="x">
          y
        </Dialog>,
      ),
    ).toBe('');
  });
});

describe('SegmentedControl (Roving-Tabindex)', () => {
  const options = [
    { id: 'intuitive', label: 'verspielt' },
    { id: 'practical', label: 'praxis' },
    { id: 'rigorous', label: 'genau' },
  ] as const;

  it('genau ein Tab-Stopp, Auswahl via aria-checked', () => {
    const html = renderToStaticMarkup(
      <SegmentedControl
        value="practical"
        onChange={() => {}}
        options={[...options]}
        ariaLabel="Erklärtiefe"
      />,
    );
    expect(html).toContain('role="radiogroup"');
    expect((html.match(/tabindex="0"/g) ?? []).length).toBe(1);
    expect((html.match(/tabindex="-1"/g) ?? []).length).toBe(2);
    expect(html).toContain('aria-checked="true"');
  });

  it('outlineActive markiert lokale Abweichung als Outline-Tab', () => {
    const html = renderToStaticMarkup(
      <SegmentedControl
        value="rigorous"
        onChange={() => {}}
        options={[...options]}
        ariaLabel="Erklärtiefe"
        outlineActive
      />,
    );
    expect(html).toContain('inset_0_0_0_2px');
    expect(html).not.toContain('bg-accent');
  });
});

describe('StatusBadge & ProgressBar', () => {
  it('Status trägt Symbol + Text, nie nur Farbe (DESIGN.md §5)', () => {
    const html = renderToStaticMarkup(<StatusBadge tone="warn">Voraussetzung offen</StatusBadge>);
    expect(html).toContain('⚠');
    expect(html).toContain('Voraussetzung offen');
  });

  it('ProgressBar: progressbar-Rolle + fuellen-Motion', () => {
    const html = renderToStaticMarkup(<ProgressBar value={3} max={8} label="3 von 8 Schritten" />);
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuenow="3"');
    expect(html).toContain('bl-fuellen');
    expect(html).toContain('width:37.5%');
  });
});

describe('Collapse', () => {
  it('zugeklappt: Inhalt bleibt im DOM (SSR/ARIA), aber aria-hidden', () => {
    const html = renderToStaticMarkup(
      <Collapse open={false} id="canvas-inhalt">
        <p>Canvas</p>
      </Collapse>,
    );
    expect(html).toContain('Canvas');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('0fr');
    expect(html).toContain('id="canvas-inhalt"');
  });

  it('aufgeklappt: 1fr und sichtbar', () => {
    const html = renderToStaticMarkup(
      <Collapse open>
        <p>Canvas</p>
      </Collapse>,
    );
    expect(html).toContain('1fr');
    expect(html).not.toContain('aria-hidden="true"');
  });
});
