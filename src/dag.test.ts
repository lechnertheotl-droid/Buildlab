// src/dag.test.ts — Gating- und Layout-Logik des Projekt-Baums.
// Die Semantik muss mit tools/verify/lib.mjs (normalizeRequires) übereinstimmen.

import { describe, expect, it } from 'vitest';
import { layoutTree, nextStepIndex, stepRequires, unlockedStepIds } from './dag';

const step = (id: string, requires?: string[]) => ({ id, requires });

// Der Getriebe-Graph aus content/stirnradgetriebe.json in Kurzform.
const gear = {
  steps: [
    step('warum', []),
    step('ueber', ['warum']),
    step('modul', ['ueber']),
    step('achse', ['modul']),
    step('dreh', ['ueber']),
    step('eta', ['dreh', 'modul']),
    step('bauen', ['achse']),
    step('ms', ['bauen', 'eta']),
  ],
};

const linear = {
  steps: [step('a'), step('b'), step('c')],
};

describe('stepRequires', () => {
  it('liefert den expliziten Graphen, wenn requires gesetzt sind', () => {
    expect(stepRequires(gear).get('eta')).toEqual(['dreh', 'modul']);
    expect(stepRequires(gear).get('warum')).toEqual([]);
  });

  it('fällt ohne requires auf die lineare Reihenfolge zurück', () => {
    const map = stepRequires(linear);
    expect(map.get('a')).toEqual([]);
    expect(map.get('b')).toEqual(['a']);
    expect(map.get('c')).toEqual(['b']);
  });

  it('fällt bei Zyklus oder unbekannter ID auf linear zurück (Verifier verhindert das im Content)', () => {
    const cyclic = { steps: [step('a', ['b']), step('b', ['a']), step('c', ['b'])] };
    expect(stepRequires(cyclic).get('b')).toEqual(['a']);
    const broken = { steps: [step('a', []), step('b', ['nix'])] };
    expect(stepRequires(broken).get('b')).toEqual(['a']);
  });
});

describe('unlockedStepIds', () => {
  it('ohne Fortschritt sind genau die Wurzeln frei', () => {
    expect(unlockedStepIds(gear, new Set())).toEqual(new Set(['warum']));
  });

  it('parallele Äste öffnen sich gemeinsam', () => {
    const done = new Set(['warum', 'ueber']);
    const unlocked = unlockedStepIds(gear, done);
    expect(unlocked.has('modul')).toBe(true);
    expect(unlocked.has('dreh')).toBe(true);
    expect(unlocked.has('eta')).toBe(false); // braucht beide Äste
    expect(unlocked.has('ms')).toBe(false);
  });

  it('lineare Alt-Fortschritte (Prefix-Mengen) bleiben gültig', () => {
    const done = new Set(['warum', 'ueber', 'modul']);
    const unlocked = unlockedStepIds(gear, done);
    expect(unlocked.has('achse')).toBe(true);
    expect(unlocked.has('dreh')).toBe(true);
  });
});

describe('nextStepIndex', () => {
  it('eindeutiger nächster Schritt → Index', () => {
    expect(nextStepIndex(gear, new Set())).toBe(0);
    expect(nextStepIndex(gear, new Set(['warum']))).toBe(1);
  });

  it('mehrere offene Schritte → null (die Projektkarte entscheidet)', () => {
    expect(nextStepIndex(gear, new Set(['warum', 'ueber']))).toBeNull();
  });

  it('alles erledigt → null', () => {
    const all = new Set(gear.steps.map((s) => s.id));
    expect(nextStepIndex(gear, all)).toBeNull();
  });
});

describe('layoutTree', () => {
  it('ist deterministisch: gleicher Input → identische Koordinaten', () => {
    expect(layoutTree(gear)).toEqual(layoutTree(gear));
  });

  it('Meilenstein oben (kleinstes y), Wurzel unten (größtes y)', () => {
    const { nodes } = layoutTree(gear);
    const byId = new Map(nodes.map((n) => [n.stepId, n]));
    const ys = nodes.map((n) => n.y);
    expect(byId.get('ms')!.y).toBe(Math.min(...ys));
    expect(byId.get('warum')!.y).toBe(Math.max(...ys));
  });

  it('parallele Äste teilen sich eine Ebene, Kanten zeigen aufwärts', () => {
    const { nodes, edges } = layoutTree(gear);
    const byId = new Map(nodes.map((n) => [n.stepId, n]));
    expect(byId.get('modul')!.layer).toBe(byId.get('dreh')!.layer);
    expect(byId.get('modul')!.y).toBe(byId.get('dreh')!.y);
    expect(byId.get('modul')!.x).not.toBe(byId.get('dreh')!.x);
    for (const e of edges) {
      expect(byId.get(e.from)!.y).toBeGreaterThan(byId.get(e.to)!.y);
    }
    expect(edges).toContainEqual({ from: 'dreh', to: 'eta' });
  });

  it('lineare Projekte ergeben eine senkrechte Kette', () => {
    const { nodes } = layoutTree(linear);
    const xs = new Set(nodes.map((n) => n.x));
    expect(xs.size).toBe(1);
    expect(nodes.map((n) => n.layer)).toEqual([0, 1, 2]);
  });
});
