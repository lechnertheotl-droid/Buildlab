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
import { AmpelArrow, IsoStage, ampelColor } from './iso-scene';
import { ChallengeCheck } from './workspace/ChallengeCheck';
import { useWorkspaceStore } from './store';
import type {
  BuildBlock, Concept, Formula, InteractiveBlock, Project, TaskBlock,
} from './types';
import formulas from '../../../content/formulas.json';
import concepts from '../../../content/concepts.json';
import registry from '../../../components.registry.json';
import getriebe from '../../../content/stirnradgetriebe.json';
import flaschenzug from '../../../content/hebel-flaschenzug.json';
import bruecke from '../../../content/fachwerkbruecke.json';

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
  it('LeverSlider zeigt das Drehmoment aus der Engine (F=100, r=0.5 → 50 N·m)', () => {
    const block: InteractiveBlock = {
      type: 'interactive',
      componentId: 'lever-slider',
      params: { formulaId: 'torque_lever', force: 100, arm: 0.5 },
    };
    const html = wrap(<InteractiveRenderer block={block} />);
    // Anzeige typografisch (formatUnit): N·m statt mathjs-Rohformat N*m.
    expect(html).toContain('50 N·m');
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
    // Die Komponente hatte lange gar kein Bild; jetzt zeigt sie die Kennlinie.
    expect(html).toContain('<polyline');
  });

  it('ValueSlider macht die Nichtlinearität sichtbar (Luftwiderstand ∝ v²)', () => {
    const html = wrap(
      <InteractiveRenderer
        block={{
          type: 'interactive',
          componentId: 'value-slider',
          params: { formulaId: 'drag', var: 'v', min: 0, max: 120, step: 5, fixed: { rho: 1.225, cw: 0.75, A: 0.000452 } },
        }}
      />,
    );
    // Kurvenpunkte aus der Engine: bei v² wächst der Abstand zwischen den
    // Stützstellen monoton — eine Gerade hätte konstante Abstände.
    const pts = html.match(/<polyline points="([^"]+)"/)?.[1].split(' ').map((p) => p.split(',').map(Number)) ?? [];
    expect(pts.length).toBeGreaterThan(30);
    const d1 = pts[10][1] - pts[11][1];
    const d2 = pts[50][1] - pts[51][1];
    expect(d2).toBeGreaterThan(d1 * 2); // hinten deutlich steiler
    // Kleine feste Werte dürfen nicht auf 0 gerundet werden.
    expect(html).toContain('0,000452');
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

  it('RocketStability zeigt CG, CP und Stabilität aus der Engine (Beispielrakete)', () => {
    const block: InteractiveBlock = {
      type: 'interactive',
      componentId: 'rocket-stability',
      params: { ballast: 8, show: ['ballast'] },
    };
    const html = wrap(<InteractiveRenderer block={block} />);
    // CG aus dem korrigierten Massenmodell: der Ballast sitzt nicht in der
    // Spitze, sondern dort, wo Knete in der Kegelkavität wirklich landet;
    // Finnen- und Nasenschwerpunkt folgen den Flächenschwerpunkten.
    expect(html).toContain('214 mm'); // CG aus rocket_cg
    expect(html).toContain('248 mm'); // CP aus rocket_cp (Barrowman)
    expect(html).toContain('1,42 Kaliber'); // S aus stability
    expect(html).toContain('stabil'); // Ampel-Urteil in Worten, nie nur Farbe
    expect(html).toContain('aus der Engine');
    expect(html).toContain('aria-live');
  });

  it('FlightSim zeichnet die RK4-Flugbahn mit Apogäum und Ziellinie', () => {
    const block: InteractiveBlock = {
      type: 'interactive',
      componentId: 'flight-sim',
      params: { motorClass: 'C6', massG: 53, showGoal: 100 },
    };
    const html = wrap(<InteractiveRenderer block={block} />);
    expect(html).toContain('Apogäum'); // Marker + Ergebniszeile
    expect(html).toContain('291 m'); // Apogäum aus simulateFlight (RK4)
    expect(html).toContain('88 m/s'); // v_max aus der Engine
    expect(html).toContain('✓ Ziel 100 m'); // Challenge-Linie erreicht
    expect(html).toContain('<polyline'); // die Flugbahn selbst
    expect(html).toContain('Boost'); // Flugphasen-Beschriftung
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

  it('GearPair: der Modul verändert das Bild wirklich', () => {
    // Vorher kürzte sich m aus dem normierten Maßstab heraus — das SVG war für
    // m=1 und m=4 pixelgleich, der Schritt „Modul & Teilkreis" ohne Bild.
    const render = (m: number) =>
      wrap(
        <InteractiveRenderer
          block={{ type: 'interactive', componentId: 'gear-pair', params: { z1: 20, z2: 60, m } }}
        />,
      );
    const spannweite = (html: string) => {
      const xs = [...html.matchAll(/points="([^"]+)"/g)]
        .flatMap((mm) => mm[1].split(' '))
        .map((p) => Number.parseFloat(p.split(',')[0]))
        .filter(Number.isFinite);
      return Math.max(...xs) - Math.min(...xs);
    };
    expect(spannweite(render(4))).toBeGreaterThan(spannweite(render(1)) * 1.5);
  });

  it('GearPair: die Zähne greifen ineinander statt sich zu durchdringen', () => {
    // Die Grundstellung muss die Eingriffsphase tragen — auch ohne Animation
    // (reduzierte Bewegung setzt nie ein Transform).
    const html = wrap(
      <InteractiveRenderer
        block={{ type: 'interactive', componentId: 'gear-pair', params: { z1: 20, z2: 60, m: 2 } }}
      />,
    );
    // z2 = 60 ist gerade → Phase π/60 ≠ 0 → Rad 2 trägt eine Drehmatrix.
    const matrizen = [...html.matchAll(/matrix\(([^)]+)\)/g)].map((mm) => mm[1]);
    expect(matrizen.length).toBeGreaterThanOrEqual(2);
    // Mindestens eine Matrix ist keine Identität (Rad 2 ist um die halbe Teilung versetzt).
    const identisch = matrizen.filter((s) => {
      const v = s.split(' ').map(Number);
      return Math.abs(v[0] - 1) < 1e-9 && Math.abs(v[1]) < 1e-9;
    });
    expect(identisch.length).toBeLessThan(matrizen.length);
  });

  it('VectorDrag rechnet die Komponenten Fx/Fy über die Engine', () => {
    const block: InteractiveBlock = {
      type: 'interactive',
      componentId: 'vector-drag',
      params: { maxN: 100, initN: 50, initDeg: 60 },
    };
    const html = wrap(<InteractiveRenderer block={block} />);
    // F=50 N unter 60°: Fx = 50·cos60° = 25 N, Fy = 50·sin60° = 43,3 N (aus der Engine).
    expect(html).toContain('25 N');
    expect(html).toContain('43,3 N');
    expect(html).toContain('aus der Engine');
    expect(html).toContain('role="slider"'); // Drag-Handle ist auch per Tastatur bedienbar
  });

  it('ForceBalance quittiert das Gleichgewicht bei ΣF = 0', () => {
    const render = (init: number) =>
      wrap(
        <InteractiveRenderer
          block={{
            type: 'interactive',
            componentId: 'force-balance',
            params: {
              forces: [
                { label: 'Seilzug', value: 30 },
                { label: 'Wind', value: 19 },
              ],
              tolerance: 0.5,
              range: [-60, 0],
              init,
            },
          }}
        />,
      );
    // 30 + 19 − 49 = 0 exakt (ganzzahlig, deshalb ist die Quittung erreichbar).
    expect(render(-49)).toContain('Gleichgewicht');
    expect(render(-30)).not.toContain('✓ Gleichgewicht');
  });

  it('TrussLoad färbt Zug- und Druckstäbe nach dem Engine-Löser', () => {
    const block: InteractiveBlock = {
      type: 'interactive',
      componentId: 'truss-load',
      params: { load: 49.05, allowN: 106 },
    };
    const html = wrap(<InteractiveRenderer block={block} />);
    // Referenz-Dreiecksbrücke: Untergurt Zug 32,7 N, Diagonalen Druck 40,875 N,
    // Vertikale trägt die volle Last (Werte aus solveTruss).
    expect(html).toContain('32,7 N');
    expect(html).toContain('-40,9 N');
    expect(html).toContain('(Z)'); // Glyphe, nie nur Farbe (DESIGN §5/§7)
    expect(html).toContain('(D)');
    expect(html).toContain('24,5 N'); // Auflagerreaktionen aus dem Löser
    expect(html).toContain('aus der Engine');
  });

  it('PulleySystem: der Zugkraft-Pfeil zeigt nach unten', () => {
    // Die AmpelArrow-Primitive zeigt bereits nach unten; eine zusätzliche
    // Spiegelung ließ die Hand nach OBEN ziehen.
    const html = wrap(
      <InteractiveRenderer
        block={{ type: 'interactive', componentId: 'pulley-system', params: { G: 19.62, n: 2 } }}
      />,
    );
    // Kein scale(1 -1) mehr in der Szene.
    expect(html).not.toContain('scale(1 -1)');
    // Der Kraftpfeil ist das Polygon mit 7 Ecken: seine Spitze (größtes y)
    // muss unterhalb des Schaftendes (kleinstes y) liegen.
    const pfeile = [...html.matchAll(/points="([^"]+)"/g)]
      .map((mm) => mm[1].trim().split(/\s+/))
      .filter((pts) => pts.length === 7)
      .map((pts) => pts.map((p) => p.split(',').map(Number)));
    expect(pfeile.length).toBeGreaterThan(0);
    for (const p of pfeile) {
      const ys = p.map((q) => q[1]);
      const xs = p.map((q) => q[0]);
      // Die Spitze ist der Punkt mit dem extremsten y und mittigem x.
      const spitzeY = Math.max(...ys);
      const mitteX = (Math.min(...xs) + Math.max(...xs)) / 2;
      const spitze = p.find((q) => q[1] === spitzeY);
      expect(Math.abs((spitze?.[0] ?? 0) - mitteX)).toBeLessThan(1);
    }
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
    const block: InteractiveBlock = { type: 'interactive', componentId: 'stress-bar' };
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

  it('multi rendert Checkboxen und verlangt die richtige Options-Menge (B-19)', () => {
    const multiTask = project.steps[1].blocks[5] as TaskBlock; // i=4-Aussagen
    expect(multiTask.kind).toBe('multi');
    const html = wrap(<TaskView block={multiTask} />);
    expect(html).toContain(multiTask.question);
    expect(html).toContain('role="checkbox"');
    expect((html.match(/role="checkbox"/g) ?? []).length).toBe(multiTask.options!.length);
  });

  it('order rendert die Karten gemischt mit Hoch/Runter-Tasten (B-19)', () => {
    const orderTask = hebel.steps
      .flatMap((s) => s.blocks)
      .find((b) => (b as TaskBlock).kind === 'order') as TaskBlock;
    expect(orderTask).toBeDefined();
    const html = wrap(<TaskView block={orderTask} />);
    for (const item of orderTask.items!) expect(html).toContain(item.slice(0, 20));
    expect(html).toContain('nach oben');
    expect(html).toContain('nach unten');
    // Startreihenfolge ist garantiert ≠ korrekt (deterministisch gemischt).
    const first = orderTask.items![orderTask.correctOrder![0]].slice(0, 20);
    expect(html.indexOf(first)).toBeGreaterThan(html.indexOf('1.'));
  });

  it('match rendert je Paar ein Auswahlfeld mit allen rechten Seiten', () => {
    const matchTask = project.steps[5].blocks.find(
      (b) => (b as TaskBlock).kind === 'match',
    ) as TaskBlock;
    expect(matchTask).toBeDefined();
    const html = wrap(<TaskView block={matchTask} />);
    expect((html.match(/<select/g) ?? []).length).toBe(matchTask.pairs!.length);
    for (const p of matchTask.pairs!) expect(html).toContain(p.left);
  });

  it('target zeigt Ziel mit Toleranz und Aufforderung zur Canvas', () => {
    // Die Live-Kopplung (canvasInputs → Auto-Quittung) ist Client-seitig
    // (zustand nutzt im SSR den Initialzustand); hier prüfbar: die Ziel-Zeile.
    const html = wrap(<TaskView block={targetTask} />);
    expect(html).toContain('Ziel:');
    expect(html).toContain('80');
    expect(html).toContain('±');
    expect(html).toContain('beweg die Regler');
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
    doneCount: 0,
    nextStepIndex: null,
    depth: 'practical' as const,
    seenConcepts: new Set<string>(),
    onTaskResult: () => {},
    onNavigate: () => {},
    onExit: () => {},
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
        // Schritt 2 hat zwei Pflicht-Aufgaben: numeric (Index 4) + multi (Index 5, B-19).
        taskStates={{
          4: { solved: true, attempts: 1, usedHelp: false },
          5: { solved: true, attempts: 1, usedHelp: false },
        }}
      />,
    );
    expect(html).not.toContain('Noch eine Aufgabe offen');
    expect(html).toContain('Schritt 2 ✓');
  });

  it('mobile Griff-Leiste vorhanden, Canvas standardmäßig ausgeklappt (§6.4)', () => {
    const html = wrap(<WorkspaceStep {...baseProps} stepIndex={1} taskStates={{}} />);
    expect(html).toContain('aria-label="Ansicht einklappen"');
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('id="canvas-inhalt"');
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
    doneCount: 0,
    nextStepIndex: null,
    depth: 'practical' as const,
    seenConcepts: new Set<string>(),
    onTaskResult: () => {},
    onNavigate: () => {},
    onExit: () => {},
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
    // Große Toleranz (±50 %) wird als Korridor angezeigt (Befund B-15).
    expect(html).toContain('zwischen');
    expect(html).toContain('7,4');
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
    expect(html).toContain('Wälzpunkt'); // rigoroser Text (nur dort gilt v gleich)
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

  it('zeigt Skeleton-Zeilen, solange der Verlauf lädt', () => {
    const html = wrap(<Calculator historyLoading />);
    expect(html).toContain('bl-schimmer');
    expect(html).toContain('Verlauf lädt');
  });
});

describe('iso-scene (DESIGN.md §6)', () => {
  it('ampelColor: verbindliche Schwellen 0,5 / 0,8', () => {
    expect(ampelColor(0)).toBe('var(--viz-low)');
    expect(ampelColor(0.49)).toBe('var(--viz-low)');
    expect(ampelColor(0.5)).toBe('var(--viz-mid)');
    expect(ampelColor(0.79)).toBe('var(--viz-mid)');
    expect(ampelColor(0.8)).toBe('var(--viz-high)');
    expect(ampelColor(1)).toBe('var(--viz-high)');
  });

  it('AmpelArrow: eine geschlossene Silhouette mit Ink-Kontur', () => {
    const html = renderToStaticMarkup(<AmpelArrow tip={{ x: 50, y: 80 }} length={30} frac={0.9} />);
    expect(html).toContain('<polygon');
    expect(html).toContain('var(--viz-high)');
    expect(html).toContain('var(--ink)');
  });

  it('IsoStage: Bühne mit Licht-Pool, Gitter-Fade und <desc>', () => {
    const html = renderToStaticMarkup(
      <IsoStage label="Testbühne" desc="Eine leere Bühne.">
        <circle r="4" />
      </IsoStage>,
    );
    expect(html).toContain('iso-floorlight');
    expect(html).toContain('iso-soft');
    expect(html).toContain('<desc>Eine leere Bühne.</desc>');
  });
});

describe('Meilenstein (SCREENS.md §6.3)', () => {
  it('Explosionsansicht mit Maßlinien-Beschriftung der Teile', () => {
    const msIndex = project.steps.findIndex((s) => s.kind === 'meilenstein');
    expect(msIndex).toBeGreaterThan(-1);
    const required = project.steps[msIndex].blocks
      .map((b, i) => ({ b, i }))
      .filter(({ b }) => b.type === 'task' && (b as TaskBlock).minDepth === undefined)
      .map(({ i }) => i);
    const taskStates = Object.fromEntries(
      required.map((i) => [i, { solved: true, attempts: 1, usedHelp: false }]),
    );
    const html = wrap(
      <WorkspaceStep
        project={project}
        stepIndex={msIndex}
        doneCount={project.steps.length - 1}
        nextStepIndex={null}
        depth="practical"
        seenConcepts={new Set<string>()}
        taskStates={taskStates}
        onTaskResult={() => {}}
        onNavigate={() => {}}
        onExit={() => {}}
        onStepComplete={() => {}}
      />,
    );
    expect(html).toContain('Explosionsansicht');
    // Teile-Labels kommen aus dem Content (step.finaleParts), nicht aus dem Code.
    for (const label of project.steps[msIndex].finaleParts ?? []) {
      expect(html).toContain(label);
    }
    expect(project.steps[msIndex].finaleParts?.length).toBeGreaterThan(0);
    // Projekt mit build-Block → Bauteil-Satz; ohne → Abschluss-Satz.
    expect(html).toContain('Dein Bauteil wartet oben auf deiner Projektkarte.');
  });
});

describe('ChallengeCheck — der Meilenstein rechnet mit den eigenen Bauwerten', () => {
  const projekt = bruecke as unknown as Project;

  it('zeigt ohne eigenen Bau nur an, WAS geprüft wird — ohne Urteil', () => {
    // Die Parameter-Defaults sind in manchen Projekten bewusst noch nicht die
    // Lösung; ein ✓/✗ dagegen wäre irreführend.
    const html = wrap(<ChallengeCheck project={projekt} buildParams={null} />);
    expect(html).toContain('Sobald du im Bau-Schritt ein STL herunterlädst');
    expect(html).not.toContain('✗');
    expect(html).not.toContain('✓');
    expect(html).not.toContain('deine Werte');
  });

  it('nimmt die echten Bauwerte, sobald einer gespeichert ist', () => {
    const html = wrap(
      <ChallengeCheck project={projekt} buildParams={{ preset: 2, h: 130, b: 8, tiefe: 8 }} />,
    );
    expect(html).toContain('deine Werte');
    expect(html).toContain('130'); // die selbst gewählte Fachwerkhöhe
    expect(html).not.toContain('Du hast noch nichts gebaut');
  });

  it('meldet eine verfehlte Anforderung, statt sie schönzurechnen', () => {
    // Zu dünne Stäbe: der Druckstab knickt.
    const html = wrap(
      <ChallengeCheck project={projekt} buildParams={{ preset: 1, h: 112.5, b: 4, tiefe: 8 }} />,
    );
    expect(html).toContain('✗');
    expect(html).toContain('Eine Anforderung ist noch offen');
  });

  it('urteilt nicht, wenn ein alter Bau Felder vermissen lässt', () => {
    const html = wrap(<ChallengeCheck project={projekt} buildParams={{ h: 130 }} />);
    expect(html).toContain('Sobald du im Bau-Schritt');
    expect(html).not.toContain('deine Werte');
  });
});
