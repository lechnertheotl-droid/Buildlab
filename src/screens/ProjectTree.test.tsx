// src/screens/ProjectTree.test.tsx — die Projektkarte (reine Ansicht, SSR wie
// packages/ui/src/render.test.tsx): Knoten-Zustände folgen dem Schritt-Graphen.

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ProjectTreeView } from './ProjectTree';
import type { ProjectMeta } from '../content';

const project = {
  id: 'fx-baum',
  title: 'Fixture',
  version: 2,
  level: 1,
  icon: '⚙',
  buildResult: 'Ein Fixture.',
  challenge: '-',
  steps: [
    { id: 'a', title: 'Anfang', goal: 'G', kind: 'lernen', requires: [], blocks: [] },
    { id: 'b', title: 'Links', goal: 'G', kind: 'lernen', requires: ['a'], blocks: [] },
    { id: 'c', title: 'Rechts', goal: 'G', kind: 'lernen', requires: ['a'], blocks: [] },
    { id: 'm', title: 'Fertig', goal: 'G', kind: 'meilenstein', requires: ['b', 'c'], blocks: [] },
  ],
} as unknown as ProjectMeta;

const render = (stepsDone: Set<string>, highlight?: Set<string>) =>
  renderToStaticMarkup(
    <ProjectTreeView
      project={project}
      stepsDone={stepsDone}
      highlight={highlight}
      onOpenStep={() => {}}
    />,
  );

describe('ProjectTreeView (Projektkarte)', () => {
  it('ohne Fortschritt: nur die Wurzel ist frei, der Rest gesperrt mit Begründung', () => {
    const html = render(new Set());
    expect(html).toContain('Schritt „Anfang“: frei');
    expect(html).toContain('Schritt „Links“: gesperrt — vorher: Anfang');
    expect(html).toContain('Schritt „Fertig“: gesperrt — vorher: Links, Rechts');
    expect(html).toContain('Das Ziel');
    expect(html).toContain('4 Schritte: 0 erledigt, 1 frei, 3 gesperrt');
  });

  it('parallele Äste öffnen sich nach der Wurzel gemeinsam', () => {
    const html = render(new Set(['a']));
    expect(html).toContain('Schritt „Anfang“: erledigt');
    expect(html).toContain('Schritt „Links“: frei');
    expect(html).toContain('Schritt „Rechts“: frei');
    expect(html).toContain('Schritt „Fertig“: gesperrt');
  });

  it('beide Äste erledigt → das Finale ist frei', () => {
    const html = render(new Set(['a', 'b', 'c']));
    expect(html).toContain('Finale frei!');
    expect(html).toContain('Schritt „Fertig“: frei');
  });

  it('alles erledigt → die Produkt-Platte steht', () => {
    const html = render(new Set(['a', 'b', 'c', 'm']));
    expect(html).toContain('Steht. ✓');
    expect(html).toContain('4 erledigt, 0 frei, 0 gesperrt');
  });

  it('frisch freigeschaltete Knoten bekommen die Quittung', () => {
    const html = render(new Set(['a']), new Set(['b']));
    expect(html).toContain('bl-quittung-pop');
  });
});
