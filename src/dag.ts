// src/dag.ts — Schritt-Graph eines Projekts: Gating + Baum-Layout der
// Projektkarte. Spiegelt die Verifier-Semantik aus tools/verify/lib.mjs
// (normalizeRequires, Regeln 18–21): der Verifier garantiert beim Einfrieren
// Form, Zyklenfreiheit und die Meilenstein-Senke — die App darf hier von
// einem gültigen DAG ausgehen und fällt bei kaputtem Graph auf die lineare
// Reihenfolge zurück, statt zu sperren.

interface DagStep {
  id: string;
  requires?: string[];
}

interface DagProject {
  steps: DagStep[];
}

/**
 * requires je Schritt — explizit oder linearer Fallback (Schritt i braucht
 * Schritt i−1). Ungültige Graphen (Zyklus, unbekannte/fehlende IDs) fallen
 * komplett auf linear zurück.
 */
export function stepRequires(project: DagProject): Map<string, string[]> {
  const steps = project.steps;
  const linear = () =>
    new Map(steps.map((s, i) => [s.id, i > 0 ? [steps[i - 1].id] : []]));

  if (!steps.some((s) => s.requires !== undefined)) return linear();

  const ids = new Set(steps.map((s) => s.id));
  const explicit = new Map(steps.map((s) => [s.id, s.requires ?? []]));
  for (const [id, reqs] of explicit) {
    if (reqs.some((r) => r === id || !ids.has(r))) return linear();
  }

  // Zyklus-Check (Kahn): bleibt ein Schritt unsortierbar, ist der Graph kaputt.
  const indegree = new Map(steps.map((s) => [s.id, explicit.get(s.id)!.length]));
  const dependents = new Map<string, string[]>(steps.map((s) => [s.id, []]));
  for (const s of steps) for (const r of explicit.get(s.id)!) dependents.get(r)!.push(s.id);
  const queue = steps.filter((s) => indegree.get(s.id) === 0).map((s) => s.id);
  let sorted = 0;
  while (queue.length) {
    const id = queue.shift()!;
    sorted++;
    for (const d of dependents.get(id)!) {
      indegree.set(d, indegree.get(d)! - 1);
      if (indegree.get(d) === 0) queue.push(d);
    }
  }
  return sorted === steps.length ? explicit : linear();
}

/**
 * Freigeschaltete Schritte: alle direkten requires sind erledigt.
 * Erledigte Schritte erfüllen das per Konstruktion ebenfalls (lineare
 * Alt-Fortschritte sind gültige Done-Mengen — keine Migration nötig).
 */
export function unlockedStepIds(project: DagProject, stepsDone: ReadonlySet<string>): Set<string> {
  const requires = stepRequires(project);
  const unlocked = new Set<string>();
  for (const step of project.steps) {
    if (requires.get(step.id)!.every((r) => stepsDone.has(r))) unlocked.add(step.id);
  }
  return unlocked;
}

/**
 * Der eindeutige nächste Schritt (Index): genau ein Schritt ist frei und noch
 * nicht erledigt → sein Index, sonst null (0 oder ≥ 2 Kandidaten — dann
 * entscheidet die Projektkarte, nicht der Weiter-Knopf).
 */
export function nextStepIndex(project: DagProject, stepsDone: ReadonlySet<string>): number | null {
  const unlocked = unlockedStepIds(project, stepsDone);
  const open = project.steps
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => unlocked.has(s.id) && !stepsDone.has(s.id));
  return open.length === 1 ? open[0].i : null;
}

// ── Baum-Layout der Projektkarte (SCREENS.md „Projektkarte") ─────────────────
// Deterministisch, kein Force-Layout: Longest-Path-Layering (Ebene = längster
// Pfad von einer Wurzel), Meilenstein oben, Wurzeln unten. Reihenfolge in der
// Ebene = Autorenreihenfolge plus ein Barycenter-Durchlauf über die direkten
// requires, stabiler Tie-Break über den Schritt-Index.

export interface TreeNode {
  stepId: string;
  /** Index im steps-Array (für /projekt/:id/schritt/:n). */
  index: number;
  /** 0 = Wurzel-Ebene (unten). */
  layer: number;
  x: number;
  y: number;
}

export interface TreeLayout {
  nodes: TreeNode[];
  /** from = Voraussetzung (unten) → to = Schritt (oben). */
  edges: { from: string; to: string }[];
  width: number;
  height: number;
}

export const TREE_WIDTH = 400;
const ROW_GAP = 112;
const PAD_TOP = 104; // Platz für die Produkt-Platte des Meilensteins
const PAD_BOTTOM = 56;

export function layoutTree(project: DagProject): TreeLayout {
  const steps = project.steps;
  const requires = stepRequires(project);
  const indexOf = new Map(steps.map((s, i) => [s.id, i]));

  // Ebene = längster Pfad von einer Wurzel (rekursiv mit Memo; stepRequires
  // liefert garantiert einen azyklischen Graphen).
  const layer = new Map<string, number>();
  const resolve = (id: string): number => {
    const known = layer.get(id);
    if (known !== undefined) return known;
    const reqs = requires.get(id)!;
    const value = reqs.length === 0 ? 0 : 1 + Math.max(...reqs.map(resolve));
    layer.set(id, value);
    return value;
  };
  for (const s of steps) resolve(s.id);
  const maxLayer = Math.max(...steps.map((s) => layer.get(s.id)!));

  // Ebenen füllen (Autorenreihenfolge), dann ein Barycenter-Durchlauf von
  // unten nach oben: Schritt rückt über den Schwerpunkt seiner requires.
  const byLayer: string[][] = Array.from({ length: maxLayer + 1 }, () => []);
  for (const s of steps) byLayer[layer.get(s.id)!].push(s.id);

  const xOf = new Map<string, number>();
  byLayer.forEach((ids, l) => {
    if (l > 0) {
      const bary = (id: string) => {
        const reqs = requires.get(id)!;
        if (reqs.length === 0) return indexOf.get(id)!;
        return reqs.reduce((sum, r) => sum + xOf.get(r)!, 0) / reqs.length;
      };
      ids.sort((a, b) => bary(a) - bary(b) || indexOf.get(a)! - indexOf.get(b)!);
    }
    ids.forEach((id, slot) => {
      xOf.set(id, (TREE_WIDTH * (slot + 1)) / (ids.length + 1));
    });
  });

  const height = PAD_TOP + maxLayer * ROW_GAP + PAD_BOTTOM;
  const nodes: TreeNode[] = steps.map((s) => ({
    stepId: s.id,
    index: indexOf.get(s.id)!,
    layer: layer.get(s.id)!,
    x: xOf.get(s.id)!,
    y: PAD_TOP + (maxLayer - layer.get(s.id)!) * ROW_GAP,
  }));

  const edges = steps.flatMap((s) => requires.get(s.id)!.map((r) => ({ from: r, to: s.id })));
  return { nodes, edges, width: TREE_WIDTH, height };
}
