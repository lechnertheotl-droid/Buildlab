// iso-scene — wiederverwendbare Bühnen-Primitiven der Pseudo-3D-Sprache
// (DESIGN.md §6). Konvention von @buildlab/iso: x/y spannen den Boden auf,
// z ist die Höhe; positioniert wird über einen translate auf der Bühne.

import { useEffect } from 'react';
import {
  project, projectAll, toPolygonPoints, shade,
  type IsoOptions, type Vec2, type Vec3,
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
  /** Statische Szenen-Beschreibung für Screenreader (DESIGN.md §7). */
  desc?: string;
  /** 'plain' lässt Lichtfleck + Lineal-Ticks weg (nur Gitter). */
  staging?: 'voll' | 'plain';
  children: React.ReactNode;
}

/**
 * Isometrische Bühne (DESIGN.md §6): projizierter Boden mit Welt-Gitter
 * (Millimeterpapier in 3D, zum Rand auslaufend), Licht-Pool unter dem
 * Ursprung, Lineal-Ticks auf der +x-Achse + Gauß-Blur-Filter `iso-soft`
 * für weiche Schatten unter Körpern.
 */
export function IsoStage({
  width = 460,
  height = 300,
  origin = { x: 230, y: 190 },
  floor = 110,
  iso = {},
  label,
  desc,
  staging = 'voll',
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
    // Gitter läuft zum Rand hin aus (Licht in der Mitte, Achsen kräftiger).
    const fade = 0.22 - 0.14 * (Math.abs(i) / steps);
    const op = i === 0 ? 0.35 : fade;
    lines.push(
      <line key={`gx${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--ink-faint)" strokeOpacity={op} />,
      <line key={`gy${i}`} x1={c.x} y1={c.y} x2={d.x} y2={d.y} stroke="var(--ink-faint)" strokeOpacity={op} />,
    );
  }

  // Lineal-Ticks auf der +x-Bodenachse (DESIGN.md §3: Tick-Marks als Motiv).
  const ticks: React.ReactNode[] = [];
  if (staging === 'voll') {
    for (let i = 1; i <= steps; i++) {
      const p = project({ x: (i / steps) * floor, y: 0, z: 0 }, iso);
      ticks.push(
        <line key={`tick${i}`} x1={p.x} y1={p.y - 2} x2={p.x} y2={p.y + 2} stroke="var(--ink-faint)" strokeOpacity={0.6} />,
      );
    }
  }

  const pool = project({ x: 0, y: 0, z: 0 }, iso);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label={label}>
      {desc && <desc>{desc}</desc>}
      <defs>
        <filter id="iso-soft" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
        <radialGradient id="iso-floorlight">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g transform={`translate(${origin.x} ${origin.y})`}>
        <g className="bl-einzeichnen">
          {staging === 'voll' && (
            <ellipse
              cx={pool.x}
              cy={pool.y}
              rx={floor * 1.1}
              ry={floor * 0.5}
              fill="url(#iso-floorlight)"
            />
          )}
          {lines}
          {ticks}
        </g>
        {children}
      </g>
    </svg>
  );
}

/**
 * Weicher Kontaktschatten unter einem Körper (DESIGN.md §6: Gauß-Blur,
 * niedriges Alpha — kein harter Schlagschatten). In einer IsoStage verwenden
 * (braucht deren `iso-soft`-Filter).
 */
export function isoContactShadow(at: Vec3, rx: number, iso: IsoOptions = {}, opacity = 0.16): React.ReactNode {
  const p = project(at, iso);
  return (
    <ellipse cx={p.x} cy={p.y} rx={rx} ry={rx * 0.42} fill="#000" opacity={opacity} filter="url(#iso-soft)" />
  );
}

/** Ampel-Farbe nach Auslastungsanteil (DESIGN.md §6: ok → warn → fehl).
    Schwellen verbindlich: < 0,5 grün · < 0,8 gelb · sonst rot. */
export function ampelColor(frac: number): string {
  return frac < 0.5 ? 'var(--viz-low)' : frac < 0.8 ? 'var(--viz-mid)' : 'var(--viz-high)';
}

export interface AmpelArrowSpec {
  /** Pfeilspitze in Bildschirm-Koordinaten; der Pfeil zeigt senkrecht nach unten. */
  tip: Vec2;
  /** Schaftlänge in Bildschirm-px (Spitze → Schwanz). */
  length: number;
  /** Auslastung 0–1 → Ampel-Farbe. */
  frac: number;
  /** Halbe Schaftbreite / halbe Kopfbreite / Kopflänge (Bildschirm-px). */
  shaftHalf?: number;
  headHalf?: number;
  headLen?: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Kraftvektor als Ampel-Pfeil (DESIGN.md §6): EINE geschlossene Silhouette
 * (Schaft + Spitze) mit durchgehender Ink-Kontur und kräftiger Spitze —
 * der Betrag bleibt auch im grünen Bereich lesbar.
 */
export function AmpelArrow({
  tip,
  length,
  frac,
  shaftHalf = 2.2,
  headHalf = 8,
  headLen = 13,
}: AmpelArrowSpec) {
  const yHead = tip.y - headLen; // Kopfbasis
  const yTail = Math.min(tip.y - length, yHead - 2); // immer etwas Schaft, nie invertiert
  const points = [
    [tip.x - shaftHalf, yTail],
    [tip.x - shaftHalf, yHead],
    [tip.x - headHalf, yHead],
    [tip.x, tip.y],
    [tip.x + headHalf, yHead],
    [tip.x + shaftHalf, yHead],
    [tip.x + shaftHalf, yTail],
  ]
    .map(([x, y]) => `${r2(x)},${r2(y)}`)
    .join(' ');
  return (
    <polygon
      points={points}
      fill={ampelColor(frac)}
      stroke="var(--ink)"
      strokeWidth={1.4}
      strokeLinejoin="round"
    />
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
