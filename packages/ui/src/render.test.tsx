// render.test.tsx — Phase-2-Smoke-Test (SSR, kein Browser nötig).
// Belegt die DoD: der Kraft/Hebel-Slider rendert und zeigt den Wert AUS DER
// ENGINE (M = F·r), und der registry-gated Dispatcher lässt nur bekannte
// componentIds zu. Ergänzt das Sicherheitsnetz um die UI-Schicht.

import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ContentProvider } from './content-context';
import { InteractiveRenderer } from './interactive/InteractiveRenderer';
import { Calculator } from './Calculator';
import type { Concept, Formula, InteractiveBlock } from './types';
import formulas from '../../../content/formulas.json';
import concepts from '../../../content/concepts.json';
import registry from '../../../components.registry.json';

const componentIds = registry.components.map((c) => c.id);

function wrap(node: React.ReactNode): string {
  return renderToStaticMarkup(
    <ContentProvider
      formulas={formulas as unknown as Formula[]}
      concepts={concepts as unknown as Concept[]}
      componentIds={componentIds}
    >
      {node}
    </ContentProvider>,
  );
}

describe('LeverSlider (DoD Phase 2)', () => {
  it('zeigt das Drehmoment aus der Engine (F=100, r=0.5 → 50 N*m)', () => {
    const block: InteractiveBlock = {
      type: 'interactive',
      componentId: 'lever-slider',
      params: { formulaId: 'torque_lever', force: 100, arm: 0.5 },
    };
    const html = wrap(<InteractiveRenderer block={block} />);
    expect(html).toContain('50 N*m');
    expect(html).toContain('aus der Engine');
    // 2.5D-Vektor + Schattierung sind als SVG da.
    expect(html).toContain('<svg');
    expect(html).toContain('<polygon');
  });

  it('lehnt componentIds ab, die nicht in der Registry stehen', () => {
    const block = {
      type: 'interactive',
      componentId: 'nicht-existent',
    } as unknown as InteractiveBlock;
    const html = wrap(<InteractiveRenderer block={block} />);
    expect(html).toContain('nicht in components.registry.json');
  });

  it('zeigt für noch nicht implementierte Registry-Komponenten einen Platzhalter', () => {
    const block: InteractiveBlock = { type: 'interactive', componentId: 'gear-pair' };
    const html = wrap(<InteractiveRenderer block={block} />);
    expect(html).toContain('folgt in einer späteren Phase');
  });
});

describe('Calculator', () => {
  it('rendert Tastenfeld und Verlauf ohne Fehler', () => {
    const html = wrap(<Calculator />);
    expect(html).toContain('Verlauf');
    expect(html).toContain('Σ Formeln');
    expect(html).toContain('sin');
  });
});
