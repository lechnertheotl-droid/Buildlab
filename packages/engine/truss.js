// packages/engine/truss.js — Fachwerk-Modul: statische Bestimmtheit und
// Stabkräfte über das Knotenpunktverfahren als lineares Gleichungssystem
// (ENGINE_SPEC.md §7: Löser → Golden Test → Verifier-Anbindung → UI).
//
// EISERNE REGEL 1 gilt auch hier: Jede Stabkraft im Content und in den
// Interactives kommt aus diesen Funktionen. Alles ist deterministisch:
// feste Knoten-/Stabreihenfolge aus den Eingaben, mathjs-LU ohne Zufälle.
//
// Konventionen (wie components.registry.json „truss-load"):
//   Stabkraft S > 0 = Zug (Stab zieht seine beiden Knoten zueinander),
//   S < 0 = Druck. Koordinaten in mm, Kräfte in N, y zeigt nach oben.

import { create, all } from 'mathjs';

const math = create(all, {});

/**
 * Zählt Knoten (k), Stäbe (s) und Auflager-Wertigkeiten (r) und liefert den
 * Freiheitsgrad f = 2k − (s + r). f = 0 heißt statisch bestimmt.
 */
export function checkDeterminacy({ nodes, bars, supports }) {
  const k = nodes.length;
  const s = bars.length;
  let r = 0;
  for (const sup of supports) {
    if (sup.fx) r += 1;
    if (sup.fy) r += 1;
  }
  return { k, s, r, f: 2 * k - (s + r) };
}

/** Prüft Topologie-Eingaben und wirft sprechende Fehler für kaputte Presets. */
function validateTopology({ nodes, bars, supports, loads }) {
  bars.forEach((bar, i) => {
    const { from, to } = bar;
    if (!(from in nodes) || !(to in nodes)) {
      throw new Error(`Fachwerk: Stab ${i} verweist auf unbekannten Knoten (${from}–${to}).`);
    }
    const dx = nodes[to].x - nodes[from].x;
    const dy = nodes[to].y - nodes[from].y;
    if (Math.hypot(dx, dy) === 0) {
      throw new Error(`Fachwerk: Stab ${i} hat Länge 0 (Knoten ${from} = Knoten ${to}).`);
    }
  });
  for (const sup of supports) {
    if (!(sup.node in nodes)) {
      throw new Error(`Fachwerk: Auflager verweist auf unbekannten Knoten ${sup.node}.`);
    }
  }
  for (const load of loads) {
    if (!(load.node in nodes)) {
      throw new Error(`Fachwerk: Last verweist auf unbekannten Knoten ${load.node}.`);
    }
  }
}

/**
 * Löst ein ebenes, statisch bestimmtes Fachwerk per Knotenpunktverfahren.
 * Unbekannte: s Stabkräfte + r Reaktionskomponenten; je Knoten ΣFx=0, ΣFy=0.
 *
 * @returns {{ barForces: number[], reactions: {node:number, fx:number, fy:number}[],
 *             maxAbs: number, maxAbsIndex: number }}
 */
export function solveTruss({ nodes, bars, supports, loads }) {
  validateTopology({ nodes, bars, supports, loads });

  const { k, s, r, f } = checkDeterminacy({ nodes, bars, supports });
  if (f !== 0) {
    throw new Error(
      `Fachwerk ist nicht statisch bestimmt: f = 2·${k} − (${s} + ${r}) = ${f} ` +
        `(${f > 0 ? 'beweglich' : 'überbestimmt'}).`,
    );
  }

  const unknowns = s + r;
  // Zeilen: 2 je Knoten (erst Fx, dann Fy). Spalten: erst Stäbe, dann Reaktionen.
  const A = Array.from({ length: 2 * k }, () => new Array(unknowns).fill(0));
  const rhs = new Array(2 * k).fill(0);

  bars.forEach((bar, col) => {
    const { from, to } = bar;
    const dx = nodes[to].x - nodes[from].x;
    const dy = nodes[to].y - nodes[from].y;
    const len = Math.hypot(dx, dy);
    const ux = dx / len;
    const uy = dy / len;
    // Zug (S>0) zieht 'from' Richtung 'to' und 'to' Richtung 'from'.
    A[2 * from][col] += ux;
    A[2 * from + 1][col] += uy;
    A[2 * to][col] += -ux;
    A[2 * to + 1][col] += -uy;
  });

  const reactionCols = []; // { node, axis: 'fx'|'fy', col }
  let col = s;
  for (const sup of supports) {
    if (sup.fx) {
      A[2 * sup.node][col] = 1;
      reactionCols.push({ node: sup.node, axis: 'fx', col });
      col += 1;
    }
    if (sup.fy) {
      A[2 * sup.node + 1][col] = 1;
      reactionCols.push({ node: sup.node, axis: 'fy', col });
      col += 1;
    }
  }

  for (const load of loads) {
    rhs[2 * load.node] -= load.fx ?? 0;
    rhs[2 * load.node + 1] -= load.fy ?? 0;
  }

  let solution;
  try {
    solution = math.lusolve(A, rhs).map((row) => row[0]);
  } catch (e) {
    throw new Error(`Fachwerk-Gleichungssystem ist singulär (Mechanismus trotz f=0?): ${e.message}`);
  }
  if (solution.some((v) => typeof v !== 'number' || !Number.isFinite(v))) {
    throw new Error('Fachwerk-Gleichungssystem lieferte keine endlichen Werte (Mechanismus trotz f=0?).');
  }

  const barForces = solution.slice(0, s);
  const reactions = supports.map((sup) => ({ node: sup.node, fx: 0, fy: 0 }));
  for (const rc of reactionCols) {
    const target = reactions.find((re) => re.node === rc.node);
    target[rc.axis] = solution[rc.col];
  }

  let maxAbs = 0;
  let maxAbsIndex = 0;
  barForces.forEach((force, i) => {
    if (Math.abs(force) > maxAbs) {
      maxAbs = Math.abs(force);
      maxAbsIndex = i;
    }
  });

  return { barForces, reactions, maxAbs, maxAbsIndex };
}

/**
 * Gleichgewichtsresiduum je Knoten (für Tests): Summe aller Stab-, Reaktions-
 * und Lastanteile — muss überall ≈ 0 sein.
 */
export function trussResiduals({ nodes, bars, loads }, { barForces, reactions }) {
  const res = nodes.map(() => ({ fx: 0, fy: 0 }));
  bars.forEach((bar, i) => {
    const { from, to } = bar;
    const dx = nodes[to].x - nodes[from].x;
    const dy = nodes[to].y - nodes[from].y;
    const len = Math.hypot(dx, dy);
    const ux = dx / len;
    const uy = dy / len;
    res[from].fx += barForces[i] * ux;
    res[from].fy += barForces[i] * uy;
    res[to].fx -= barForces[i] * ux;
    res[to].fy -= barForces[i] * uy;
  });
  for (const re of reactions) {
    res[re.node].fx += re.fx;
    res[re.node].fy += re.fy;
  }
  for (const load of loads) {
    res[load.node].fx += load.fx ?? 0;
    res[load.node].fy += load.fy ?? 0;
  }
  return res;
}
