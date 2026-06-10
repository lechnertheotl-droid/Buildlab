// render.test.tsx — UI-Smoke-Tests (SSR, kein Browser nötig).
// Belegt: Komponenten zeigen Werte AUS DER ENGINE, der registry-gated
// Dispatcher lässt nur bekannte componentIds zu, und das Task-System
// (9 Aufgabenarten + Feedback-Heuristiken) verhält sich nach LERNMODELL.md §7–8.

import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ContentProvider } from './content-context';
import { InteractiveRenderer } from './interactive/InteractiveRenderer';
import { BlockRenderer } from './blocks';
import { Calculator } from './Calculator';
import { TaskView } from './task/TaskView';
import { WorkspaceStep } from './workspace/WorkspaceStep';
import { classifyMiss, isWithin, parseGermanNumber } from './task/feedback';
import { useWorkspaceStore } from './store';
import type {
  BuildBlock, Concept, Formula, InteractiveBlock, Project, TaskBlock,
} from './types';
import formulas from '../../../content/formulas.json';
import concepts from '../../../content/concepts.json';
import registry from '../../../components.registry.json';
import getriebe from '../../../content/stirnradgetriebe.json';
import flaschenzug from '../../../content/hebel-flaschenzug.json';

const componentIds = registry.components.map((c) => c.id);
const project = getriebe as unknown as Project;
const hebel = flaschenzug as unknown as Project;

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

describe('InteractiveRenderer (Registry-Gate)', () => {
  it('LeverSlider zeigt das Drehmoment aus der Engine (F=100, r=0.5 → 50 N*m)', () => {
    const block: InteractiveBlock = {
      type: 'interactive',
      componentId: 'lever-slider',
      params: { formulaId: 'torque_lever', force: 100, arm: 0.5 },
    };
    const html = wrap(<InteractiveRenderer block={block} />);
    expect(html).toContain('50 N*m');
    expect(html).toContain('aus der Engine');
    expect(html).toContain('<svg');
    expect(html).toContain('<polygon');
  });

  it('GearPair rechnet i, d und a über die Engine (z1=20, z2=60, m=2)', () => {
    const block: InteractiveBlock = {
      type: 'interactive',
      componentId: 'gear-pair',
      params: { z1: 20, z2: 60, m: 2 },
    };
    const html = wrap(<InteractiveRenderer block={block} />);
    expect(html).toContain('Übersetzung 3');
    expect(html).toContain('80 mm'); // Achsabstand aus der Engine
    expect(html).toContain('120 mm'); // d2 aus der Engine
  });

  it('ValueSlider zeigt das Engine-Ergebnis mit festen Inputs', () => {
    const block: InteractiveBlock = {
      type: 'interactive',
      componentId: 'value-slider',
      params: { formulaId: 'torque_out', var: 'eta', min: 0.85, max: 1, step: 0.01, fixed: { M1: 10, i: 3 } },
    };
    const html = wrap(<InteractiveRenderer block={block} />);
    expect(html).toContain('M1 = 10');
    expect(html).toContain('aria-live');
  });

  it('PulleySystem zeigt die Zugkraft aus der Engine (G=19.62, n=4 → 4,905 N)', () => {
    const block: InteractiveBlock = {
      type: 'interactive',
      componentId: 'pulley-system',
      params: { G: 19.62, n: 4, nRange: [1, 6], massLabel: '2 kg' },
    };
    const html = wrap(<InteractiveRenderer block={block} />);
    expect(html).toContain('4,905'); // F = G/n aus der Engine
    expect(html).toContain('aus der Engine');
    expect(html).toContain('<polyline'); // das Seil über die Rollen
    expect(html).toContain('Flaschenzug: 4 tragende Seilstränge');
    expect(html).toContain('2 kg'); // Masse-Beschriftung der Last
  });

  it('PulleySystem fädelt das Seil bei anderem n sichtbar neu', () => {
    const render = (n: number) =>
      wrap(
        <InteractiveRenderer
          block={{ type: 'interactive', componentId: 'pulley-system', params: { G: 19.62, n } }}
        />,
      );
    const one = render(1);
    const four = render(4);
    expect(one).toContain('19,62 N'); // n=1: feste Rolle, volle Gewichtskraft
    expect(four).not.toBe(one); // andere Seilführung, andere Rollen
    // n=4 hat mehr Rollen → mehr Scheiben-Polygone in der Szene.
    const discs = (html: string) => (html.match(/<polygon/g) ?? []).length;
    expect(discs(four)).toBeGreaterThan(discs(one));
  });

  it('lehnt componentIds ab, die nicht in der Registry stehen', () => {
    const block = {
      type: 'interactive',
      componentId: 'nicht-existent',
    } as unknown as InteractiveBlock;
    const html = wrap(<InteractiveRenderer block={block} />);
    expect(html).toContain('nicht in components.registry.json');
  });

  it('zeigt für geplante Registry-Komponenten einen ruhigen Platzhalter', () => {
    const block: InteractiveBlock = { type: 'interactive', componentId: 'flight-sim' };
    const html = wrap(<InteractiveRenderer block={block} />);
    expect(html).toContain('folgt in einer späteren Phase');
  });
});

describe('Feedback-Heuristiken (ENGINE_SPEC.md §4)', () => {
  it('erkennt Zehnerpotenz, Vorzeichen, Kehrwert und knapp daneben', () => {
    expect(classifyMiss(80000, 80, 0.01)).toBe('zehnerpotenz');
    expect(classifyMiss(-80, 80, 0.01)).toBe('vorzeichen');
    expect(classifyMiss(1 / 3, 3, 0.01)).toBe('kehrwert');
    expect(classifyMiss(80.5, 80, 0.005)).toBe('knapp');
    expect(classifyMiss(42, 80, 0.01)).toBe('neutral');
  });

  it('akzeptiert Komma und Punkt als Dezimaltrenner', () => {
    expect(parseGermanNumber('29,1')).toBeCloseTo(29.1);
    expect(parseGermanNumber('29.1')).toBeCloseTo(29.1);
  });

  it('prüft relative Toleranz', () => {
    expect(isWithin(3.0, 3, 0.01)).toBe(true);
    expect(isWithin(3.04, 3, 0.01)).toBe(false);
  });
});

describe('TaskView (9 Aufgabenarten)', () => {
  const numericTask = project.steps[1].blocks[4] as TaskBlock; // numeric (i = 3)
  const errorFindTask = project.steps[2].blocks[4] as TaskBlock;
  const targetTask = project.steps[3].blocks[4] as TaskBlock;
  const stepsTask = project.steps[4].blocks[4] as TaskBlock;
  const singleTask = project.steps[5].blocks[3] as TaskBlock;

  it('rendert numeric mit Eingabefeld und Prüfen-Knopf', () => {
    const html = wrap(<TaskView block={numericTask} />);
    expect(html).toContain(numericTask.question);
    expect(html).toContain('Prüfen');
    expect(html).toContain('inputMode="decimal"');
  });

  it('rendert error-find mit allen Zeilen als Buttons', () => {
    const html = wrap(<TaskView block={errorFindTask} />);
    for (const row of errorFindTask.rows!) expect(html).toContain(row.label.slice(0, 10));
  });

  it('target zeigt Ziel mit Toleranz und Aufforderung zur Canvas', () => {
    // Die Live-Kopplung (canvasInputs → Auto-Quittung) ist Client-seitig
    // (zustand nutzt im SSR den Initialzustand); hier prüfbar: die Ziel-Zeile.
    const html = wrap(<TaskView block={targetTask} />);
    expect(html).toContain('Ziel:');
    expect(html).toContain('80');
    expect(html).toContain('±');
    expect(html).toContain('stell die Regler');
    // Store-Logik direkt: setCanvasInputs/clearCanvasInputs arbeiten korrekt.
    useWorkspaceStore.getState().setCanvasInputs({ m: 2, z1: 20, z2: 60 });
    expect(useWorkspaceStore.getState().canvasInputs).toEqual({ m: 2, z1: 20, z2: 60 });
    useWorkspaceStore.getState().clearCanvasInputs();
    expect(useWorkspaceStore.getState().canvasInputs).toBeNull();
  });

  it('steps zeigt die erste Stufe mit Formel', () => {
    const html = wrap(<TaskView block={stepsTask} />);
    expect(html).toContain('Stufe 1');
    expect(html).not.toContain('Stufe 2 ·'); // zweite Stufe noch verdeckt
  });

  it('single rendert Optionen; gelöster Zustand zeigt die Statusecke', () => {
    const html = wrap(
      <TaskView block={singleTask} state={{ solved: true, attempts: 1, usedHelp: false }} />,
    );
    expect(html).toContain('gelöst');
  });

  it('Vertiefungsaufgaben (minDepth) erscheinen nur auf Ebene „genau“', () => {
    const deep: TaskBlock = { ...singleTask, minDepth: 'rigorous' };
    expect(wrap(<TaskView block={deep} depth="practical" />)).toBe('');
    expect(wrap(<TaskView block={deep} depth="rigorous" />)).toContain('Vertiefung');
  });
});

describe('WorkspaceStep (SCREENS.md §6)', () => {
  const baseProps = {
    project,
    maxStepReached: 7,
    depth: 'practical' as const,
    seenConcepts: new Set<string>(),
    onTaskResult: () => {},
    onNavigate: () => {},
    onStepComplete: () => {},
  };

  it('zeigt Ziel, Canvas-Block und deaktivierten Weiter-Knopf (Gating)', () => {
    const html = wrap(<WorkspaceStep {...baseProps} stepIndex={1} taskStates={{}} />);
    expect(html).toContain(project.steps[1].goal);
    expect(html).toContain('Noch eine Aufgabe offen');
  });

  it('aktiviert Weiter, wenn die Pflicht-Aufgaben gelöst sind', () => {
    const html = wrap(
      <WorkspaceStep
        {...baseProps}
        stepIndex={1}
        taskStates={{ 4: { solved: true, attempts: 1, usedHelp: false } }}
      />,
    );
    expect(html).not.toContain('Noch eine Aufgabe offen');
    expect(html).toContain('Schritt 2 ✓');
  });

  it('zeigt Auffrisch-Karten für ungesehene uses-Konzepte (Quereinstieg)', () => {
    // Schritt 1 nutzt „drehmoment“ — nicht in seenConcepts → Karte erscheint.
    const html = wrap(<WorkspaceStep {...baseProps} stepIndex={0} taskStates={{}} />);
    expect(html).toContain('Kurz auffrischen');
    expect(html).toContain('Drehmoment');
  });

  it('unterdrückt Auffrisch-Karten für gesehene Konzepte', () => {
    const html = wrap(
      <WorkspaceStep
        {...baseProps}
        stepIndex={0}
        taskStates={{}}
        seenConcepts={new Set(['drehmoment'])}
      />,
    );
    expect(html).not.toContain('Kurz auffrischen');
  });
});

describe('Projekt hebel-flaschenzug (R7-Content)', () => {
  const baseProps = {
    project: hebel,
    maxStepReached: 7,
    depth: 'practical' as const,
    seenConcepts: new Set<string>(),
    onTaskResult: () => {},
    onNavigate: () => {},
    onStepComplete: () => {},
  };

  it('jeder Schritt rendert ohne Bruch durch den WorkspaceStep', () => {
    hebel.steps.forEach((step, i) => {
      const html = wrap(<WorkspaceStep {...baseProps} stepIndex={i} taskStates={{}} />);
      expect(html).toContain(step.goal);
    });
  });

  it('Schritt „Rollen" zeigt den Flaschenzug als Canvas mit Engine-Zugkraft', () => {
    const html = wrap(<WorkspaceStep {...baseProps} stepIndex={3} taskStates={{}} />);
    expect(html).toContain('Flaschenzug'); // pulley-system auf der Bühne
    expect(html).toContain('19,62 N'); // n=1 → F = G aus der Engine
  });

  it('die target-Aufgabe der Auslegung koppelt an die pulley-Canvas', () => {
    const targetTask = hebel.steps[5].blocks[3] as TaskBlock;
    expect(targetTask.kind).toBe('target');
    const html = wrap(<TaskView block={targetTask} />);
    expect(html).toContain('Ziel:');
    expect(html).toContain('4,905');
  });
});

describe('CadBuild (build-Block)', () => {
  it('rendert Slider, das Engine-Maß d=m·z und die SVG-Vorschau (SSR-sicher)', () => {
    const block: BuildBlock = {
      type: 'build',
      cadModel: 'gear',
      parameters: {
        m: { min: 1, max: 4, default: 2, unit: 'mm' },
        z: { min: 12, max: 40, default: 20, unit: '-' },
      },
      exports: ['stl'],
    };
    const html = wrap(<BlockRenderer block={block} />);
    expect(html).toContain('40 mm'); // d = m·z = 2·20 aus der Engine
    expect(html).toContain('aus der Engine');
    expect(html).toContain('bl-range');
    expect(html).toContain('STL herunterladen');
  });

  it('Radpaar-Build (z1+z2): Umschalter + Constraints + gesperrter Export', () => {
    const block = project.steps[6].blocks[1] as BuildBlock;
    const html = wrap(<BlockRenderer block={block} />);
    expect(html).toContain('Rad 1');
    expect(html).toContain('Rad 2');
    expect(html).toContain('Übersetzung trifft das Ziel');
    expect(html).toContain('Stückliste');
  });

  it('zeigt für unbekannte CAD-Modelle einen Platzhalter', () => {
    const block: BuildBlock = { type: 'build', cadModel: 'unbekannt', parameters: {} };
    const html = wrap(<BlockRenderer block={block} />);
    expect(html).toContain('folgt in einer späteren Phase');
  });
});

describe('Text-Varianten (LERNMODELL.md §2.2)', () => {
  it('hook rendert als Frage-Karte, merksatz mit Akzent-Strich', () => {
    const hook = project.steps[0].blocks[0];
    expect(wrap(<BlockRenderer block={hook} />)).toContain('font-display');
    const merksatz = project.steps[5].blocks[1];
    expect(wrap(<BlockRenderer block={merksatz} />)).toContain('border-accent');
  });

  it('globale Tiefe wählt die Ebene; lokaler Umschalter ist vorhanden', () => {
    const text = project.steps[1].blocks[0];
    const html = wrap(<BlockRenderer block={text} depth="rigorous" />);
    expect(html).toContain('Eingriffspunkt'); // rigoroser Text
    expect(html).toContain('Erklärtiefe für diesen Text');
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
