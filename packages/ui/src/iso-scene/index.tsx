// iso-scene — wiederverwendbare Bühnen-Primitiven der Pseudo-3D-Sprache
// (DESIGN.md §6). Konvention von @buildlab/iso: x/y spannen den Boden auf,
// z ist die Höhe; positioniert wird über einen translate auf der Bühne.

import { useEffect } from 'react';
import {
  project, projectAll, toPolygonPoints, shade,
  type IsoOptions, type Vec3,
} from '@buildlab/iso';
import { evaluateById } from '@buildlab/engine';
import { useContent } from '../content-context';
import { useWorkspaceStore } from '../store';

export interface IsoStageProps {
  width?: number;
  height?: number;
  /** Weltursprung in SVG-Koordinaten. */
  origin?: { x: number; y: number };
  /** Halbe Bodengröße in Welteinheiten. */
  floor?: number;
  iso?: IsoOptions;
  label: string;
  children: React.ReactNode;
}

/**
 * Isometrische Bühne: projizierter Boden mit Welt-Gitter (Millimeterpapier in
 * 3D) + Gauß-Blur-Filter `iso-soft` für weiche Schatten unter Körpern.
 */
export function IsoStage({
  width = 460,
  height = 300,
  origin = { x: 230, y: 190 },
  floor = 110,
  iso = {},
  label,
  children,
}: IsoStageProps) {
  const lines: React.ReactNode[] = [];
  const steps = 6;
  for (let i = -steps; i <= steps; i++) {
    const t = (i / steps) * floor;
    const a = project({ x: t, y: -floor, z: 0 }, iso);
    const b = project({ x: t, y: floor, z: 0 }, iso);
    const c = project({ x: -floor, y: t, z: 0 }, iso);
    const d = project({ x: floor, y: t, z: 0 }, iso);
    lines.push(
      <line key={`gx${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--ink-faint)" strokeOpacity={i === 0 ? 0.35 : 0.15} />,
      <line key={`gy${i}`} x1={c.x} y1={c.y} x2={d.x} y2={d.y} stroke="var(--ink-faint)" strokeOpacity={i === 0 ? 0.35 : 0.15} />,
    );
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label={label}>
      <defs>
        <filter id="iso-soft" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>
      <g transform={`translate(${origin.x} ${origin.y})`}>
        <g className="bl-einzeichnen">{lines}</g>
        {children}
      </g>
    </svg>
  );
}

export interface IsoBoxSpec {
  /** Eck-Minimum in Weltkoordinaten (x/y Boden, z Höhe). */
  at: Vec3;
  size: { x: number; y: number; z: number };
  color: string;
  iso?: IsoOptions;
}

/**
 * Plastischer Quader: Deckfläche hell, Seiten dunkler, Glanzkante + Bevel
 * (DESIGN.md §6). Sichtbar sind Deckel, +x- und +y-Seite.
 */
export function isoBox({ at, size, color, iso = {} }: IsoBoxSpec): React.ReactNode {
  const c = (dx: number, dy: number, dz: number): Vec3 => ({
    x: at.x + dx * size.x,
    y: at.y + dy * size.y,
    z: at.z + dz * size.z,
  });
  const top = [c(0, 0, 1), c(1, 0, 1), c(1, 1, 1), c(0, 1, 1)];
  const sideX = [c(1, 0, 1), c(1, 0, 0), c(1, 1, 0), c(1, 1, 1)];
  const sideY = [c(0, 1, 1), c(1, 1, 1), c(1, 1, 0), c(0, 1, 0)];
  const poly = (pts: Vec3[], fill: string, key: string) => (
    <polygon key={key} points={toPolygonPoints(projectAll(pts, iso))} fill={fill} stroke="var(--ink)" strokeOpacity={0.25} strokeWidth={0.6} />
  );
  const glossA = project(c(0, 0, 1), iso);
  const glossB = project(c(1, 0, 1), iso);
  const bevelA = project(c(1, 0, 0), iso);
  const bevelB = project(c(1, 1, 0), iso);
  return (
    <g>
      {poly(sideY, shade(color, -0.27), 'sy')}
      {poly(sideX, shade(color, -0.11), 'sx')}
      {poly(top, shade(color, 0.24), 't')}
      <line x1={glossA.x} y1={glossA.y} x2={glossB.x} y2={glossB.y} stroke={shade(color, 0.45)} strokeWidth={1} />
      <line x1={bevelA.x} y1={bevelA.y} x2={bevelB.x} y2={bevelB.y} stroke={shade(color, -0.35)} strokeWidth={1} />
    </g>
  );
}

/**
 * 2×2-Screen-Matrix, die eine Boden-Rotation um die Hochachse (z) in der
 * Projektion abbildet: M(θ) = P·R(θ)·P⁻¹. Damit lassen sich flache Körper
 * (Zahnräder!) per SVG-`matrix(...)` drehen, ohne pro Frame neu zu projizieren.
 */
export function groundRotationMatrix(theta: number, iso: IsoOptions = {}): string {
  const angle = iso.angle ?? Math.PI / 6;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const ct = Math.cos(theta);
  const st = Math.sin(theta);
  const det = 2 * cos * sin;
  // P = [[c, -c], [n, n]]; P⁻¹ = 1/(2cn)·[[n, c], [-n, c]] — numerisch multipliziert.
  const P = [
    [cos, -cos],
    [sin, sin],
  ];
  const R = [
    [ct, -st],
    [st, ct],
  ];
  const Pi = [
    [sin / det, cos / det],
    [-sin / det, cos / det],
  ];
  const mul = (A: number[][], B: number[][]) => [
    [A[0][0] * B[0][0] + A[0][1] * B[1][0], A[0][0] * B[0][1] + A[0][1] * B[1][1]],
    [A[1][0] * B[0][0] + A[1][1] * B[1][0], A[1][0] * B[0][1] + A[1][1] * B[1][1]],
  ];
  const M = mul(mul(P, R), Pi);
  return `matrix(${M[0][0]} ${M[1][0]} ${M[0][1]} ${M[1][1]} 0 0)`;
}

/**
 * Engine-Kopplung einer interaktiven Komponente: liefert den Engine-Wert und
 * publiziert Formel + aktuelle Werte (a) für den Universal-Rechner
 * (`active`-Kontext) und (b) für target-Aufgaben (`canvasInputs`).
 */
export function useEngineValue(
  formulaId: string,
  inputs: Record<string, number>,
  label: string,
): { value: number | null; unit: string } {
  const { formulas } = useContent();
  const setActive = useWorkspaceStore((s) => s.setActive);
  const clearActive = useWorkspaceStore((s) => s.clearActive);
  const setCanvasInputs = useWorkspaceStore((s) => s.setCanvasInputs);

  const key = JSON.stringify(inputs);
  useEffect(() => {
    setActive({ formulaId, label, values: inputs });
    setCanvasInputs(inputs);
    // key repräsentiert inputs (Vergleich über Inhalt statt Referenz).
  }, [formulaId, label, key, setActive, setCanvasInputs]);
  useEffect(() => () => clearActive(formulaId), [formulaId, clearActive]);

  const formula = formulas.get(formulaId);
  if (!formula) return { value: null, unit: '' };
  try {
    const { value, unit } = evaluateById([...formulas.values()], formulaId, inputs);
    return { value, unit };
  } catch {
    return { value: null, unit: formula.result.unit };
  }
}
