// LeverSlider.tsx — Phase-2-Kernkomponente: Kraft/Hebel-Slider.
//
// Eiserne Regel 1: das Drehmoment M kommt aus packages/engine, nie aus dem
// Markup. Die Slider treiben Kraft F und Hebelarm r; die Engine rechnet M = F·r;
// die 2.5D-Szene (packages/iso) zeigt Kraftvektor und Drehwirkung live.

import { useEffect, useMemo, useState } from 'react';
import { evaluateFormula } from '@buildlab/engine';
import { project, toPolygonPoints, shade, type Vec2, type Vec3 } from '@buildlab/iso';
import { Latex } from '../Latex';
import { useContent } from '../content-context';
import { useWorkspaceStore } from '../store';
import { Slider } from '../Slider';

export interface LeverSliderParams {
  formulaId?: string;
  forceVar?: string;
  armVar?: string;
  force?: number;
  arm?: number;
  forceRange?: [number, number];
  armRange?: [number, number];
}

// Graphit-Grundton des Hebels = DESIGN.md-Token --ink-2; in SVG brauchen wir den
// Hex-Wert, um Flächen über shade() plastisch abzustufen.
const BEAM_BASE = '#57534a';

const VIEW_W = 380;
const VIEW_H = 210;
// Leicht dimetrischer Winkel (flacher als 30°), damit der Hebel ruht statt zu kippen.
const ANGLE = Math.PI / 8;

// Hebel-Geometrie in Weltkoordinaten (konstant).
const BEAM = { min: { x: -0.6, y: -0.3, z: 0 }, max: { x: 4.0, y: 0.3, z: 0.32 } };
const ARM_MIN_X = 0.4;
const ARM_SPAN = 3.2;
const ARROW_MAX = 1.4; // maximale Vektorlänge (Welteinheiten)
const GROUND_Z = -0.7;

function fmt(n: number, digits = 1): string {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: digits }).format(n);
}

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

function box(min: Vec3, max: Vec3): Vec3[] {
  return [
    { x: min.x, y: min.y, z: min.z },
    { x: max.x, y: min.y, z: min.z },
    { x: max.x, y: max.y, z: min.z },
    { x: min.x, y: max.y, z: min.z },
    { x: min.x, y: min.y, z: max.z },
    { x: max.x, y: min.y, z: max.z },
    { x: max.x, y: max.y, z: max.z },
    { x: min.x, y: max.y, z: max.z },
  ];
}

/** Sichtbare Flächen einer iso-Box als SVG-points, projiziert über `proj`. */
function isoBox(min: Vec3, max: Vec3, proj: (p: Vec3) => Vec2) {
  const top = [
    { x: min.x, y: min.y, z: max.z },
    { x: max.x, y: min.y, z: max.z },
    { x: max.x, y: max.y, z: max.z },
    { x: min.x, y: max.y, z: max.z },
  ];
  const front = [
    { x: min.x, y: max.y, z: max.z },
    { x: max.x, y: max.y, z: max.z },
    { x: max.x, y: max.y, z: min.z },
    { x: min.x, y: max.y, z: min.z },
  ];
  const end = [
    { x: max.x, y: min.y, z: max.z },
    { x: max.x, y: max.y, z: max.z },
    { x: max.x, y: max.y, z: min.z },
    { x: max.x, y: min.y, z: min.z },
  ];
  return {
    top: toPolygonPoints(top.map(proj)),
    front: toPolygonPoints(front.map(proj)),
    end: toPolygonPoints(end.map(proj)),
  };
}

// Konstante „Hülle": Balken + Drehpunkt + die Extremlagen von Pfeil/Hebelarm.
// Daraus wird eine feste, randscharfe Rahmung berechnet — die Szene springt beim
// Schieben nicht und nichts wird je abgeschnitten.
const ENVELOPE: Vec3[] = [
  ...box(BEAM.min, BEAM.max),
  { x: 0, y: 0, z: 0 },
  { x: -0.5, y: 0, z: GROUND_Z },
  { x: 0.5, y: 0, z: GROUND_Z },
  { x: BEAM.min.x, y: 0, z: GROUND_Z },
  { x: BEAM.max.x, y: 0, z: GROUND_Z },
  { x: ARM_MIN_X, y: 0, z: BEAM.max.z + ARROW_MAX },
  { x: ARM_MIN_X + ARM_SPAN, y: 0, z: BEAM.max.z + ARROW_MAX },
];

const MARGIN = { l: 30, t: 30, r: 26, b: 16 };

// Einmalig: Maßstab & Verschiebung, die die Hülle randscharf einpassen.
const FRAME = (() => {
  const unit = ENVELOPE.map((p) => project(p, { angle: ANGLE }));
  const xs = unit.map((q) => q.x);
  const ys = unit.map((q) => q.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const w = maxX - minX || 1;
  const h = maxY - minY || 1;
  const scale = Math.min((VIEW_W - MARGIN.l - MARGIN.r) / w, (VIEW_H - MARGIN.t - MARGIN.b) / h);
  // Inhalt auf beiden Achsen mittig setzen (kein einseitiger Leerraum).
  const tx = (VIEW_W - w * scale) / 2 - minX * scale;
  const ty = (VIEW_H - h * scale) / 2 - minY * scale;
  return { scale, tx, ty };
})();

function proj(p: Vec3): Vec2 {
  const q = project(p, { scale: FRAME.scale, angle: ANGLE });
  return { x: q.x + FRAME.tx, y: q.y + FRAME.ty };
}

export function LeverSlider({
  params,
  caption,
}: {
  params: LeverSliderParams;
  caption?: string;
}) {
  const { formulas } = useContent();
  const setActive = useWorkspaceStore((s) => s.setActive);
  const clearActive = useWorkspaceStore((s) => s.clearActive);

  const formulaId = params.formulaId ?? 'torque_lever';
  const forceVar = params.forceVar ?? 'F';
  const armVar = params.armVar ?? 'r';
  const forceRange = params.forceRange ?? [0, 500];
  const armRange = params.armRange ?? [0, 2];

  const [force, setForce] = useState(params.force ?? Math.round((forceRange[1] / 2) * 10) / 10);
  const [arm, setArm] = useState(params.arm ?? Math.round((armRange[1] / 2) * 100) / 100);

  const formula = formulas.get(formulaId);

  // Eiserne Regel 1: das Ergebnis kommt aus der Engine.
  const torque = useMemo(() => {
    if (!formula) return null;
    try {
      return evaluateFormula(formula, { [forceVar]: force, [armVar]: arm });
    } catch {
      return null;
    }
  }, [formula, forceVar, armVar, force, arm]);

  // Aktuellen Kontext für den Universal-Rechner bereitstellen (SCREENS.md §7).
  useEffect(() => {
    setActive({
      formulaId,
      label: caption ?? formula?.result.name ?? formulaId,
      values: { [forceVar]: force, [armVar]: arm },
    });
    return () => clearActive(formulaId);
  }, [setActive, clearActive, formulaId, caption, formula, forceVar, armVar, force, arm]);

  if (!formula) {
    return (
      <p className="rounded border border-viz-high/40 bg-paper-2 p-3 font-mono text-sm text-viz-high">
        Formel „{formulaId}" nicht gefunden.
      </p>
    );
  }

  const forceFrac = forceRange[1] > 0 ? force / forceRange[1] : 0;
  const armFrac = armRange[1] > 0 ? arm / armRange[1] : 0;
  const maxTorque = forceRange[1] * armRange[1] || 1;
  const torqueFrac = torque ? Math.min(1, torque / maxTorque) : 0;

  // Farbe des Kraftvektors nach Betrag (Viz-Skala, nur Sim-Overlay — DESIGN.md).
  const vecColor =
    forceFrac < 0.5 ? 'var(--viz-low)' : forceFrac < 0.8 ? 'var(--viz-mid)' : 'var(--viz-high)';

  // ── aktuelle Szene ───────────────────────────────────────────────────────────
  const armX = ARM_MIN_X + armFrac * ARM_SPAN; // Kraftposition entlang des Balkens
  const arrowLen = 0.3 + forceFrac * (ARROW_MAX - 0.3); // Vektorlänge ∝ Kraft

  const beam = isoBox(BEAM.min, BEAM.max, proj);
  const fulcrum = toPolygonPoints(
    [
      { x: -0.5, y: 0, z: GROUND_Z },
      { x: 0.5, y: 0, z: GROUND_Z },
      { x: 0, y: 0, z: 0 },
    ].map(proj),
  );
  const groundA = proj({ x: BEAM.min.x - 0.2, y: 0, z: GROUND_Z });
  const groundB = proj({ x: BEAM.max.x + 0.2, y: 0, z: GROUND_Z });

  const tip = proj({ x: armX, y: 0, z: BEAM.max.z });
  const tail = proj({ x: armX, y: 0, z: BEAM.max.z + arrowLen });
  const ah = 6; // Pfeilspitzen-Größe (Bildschirm-px)

  const pivot = proj({ x: 0, y: 0, z: 0 });
  const arcR = 16 + torqueFrac * 20;

  // Label sicher im sichtbaren Bereich halten (nie am Rand abschneiden).
  const labelX = Math.max(MARGIN.l + 30, Math.min(VIEW_W - MARGIN.r - 30, tail.x));
  const labelY = Math.max(13, tail.y - 8);

  return (
    <figure className="rounded border border-black/10 bg-paper-2 p-4 shadow">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="mm-grid w-full rounded bg-paper-sink/40"
        role="img"
        aria-label={`Hebel: Kraft ${fmt(force)} Newton am Hebelarm ${fmt(arm, 2)} Meter, Drehmoment ${torque === null ? 'unbestimmt' : fmt(torque)} Newtonmeter`}
      >
        <defs>
          <marker id="lever-arc-head" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={vecColor} />
          </marker>
        </defs>

        {/* Bodenlinie unter dem Drehpunkt */}
        <line
          x1={r2(groundA.x)}
          y1={r2(groundA.y)}
          x2={r2(groundB.x)}
          y2={r2(groundB.y)}
          stroke="var(--ink-faint)"
          strokeOpacity={0.35}
        />

        {/* Drehpunkt-Keil */}
        <polygon points={fulcrum} fill={shade(BEAM_BASE, -0.18)} stroke="#0000001f" />

        {/* Balken als pseudo-3D-Box: oben hell, Stirn/Seite dunkler (Schattierung) */}
        <polygon points={beam.front} fill={shade(BEAM_BASE, -0.24)} />
        <polygon points={beam.end} fill={shade(BEAM_BASE, -0.12)} />
        <polygon points={beam.top} fill={shade(BEAM_BASE, 0.16)} stroke="#0000001f" />

        {/* Drehwirkungs-Bogen über dem Drehpunkt (Betrag ∝ Drehmoment) */}
        <path
          d={`M ${r2(pivot.x - arcR)} ${r2(pivot.y - 2)} A ${r2(arcR)} ${r2(arcR)} 0 0 1 ${r2(pivot.x)} ${r2(pivot.y - arcR - 2)}`}
          fill="none"
          stroke={vecColor}
          strokeWidth={2}
          strokeDasharray="4 3"
          opacity={0.85}
          markerEnd="url(#lever-arc-head)"
        />

        {/* Kraftvektor (2.5D): Linie + Pfeilspitze nach unten, Länge & Farbe ∝ Kraft */}
        <line
          x1={r2(tail.x)}
          y1={r2(tail.y)}
          x2={r2(tip.x)}
          y2={r2(tip.y)}
          stroke={vecColor}
          strokeWidth={3}
          strokeLinecap="round"
        />
        <polygon
          points={`${r2(tip.x)},${r2(tip.y)} ${r2(tip.x - ah)},${r2(tip.y - ah * 1.5)} ${r2(tip.x + ah)},${r2(tip.y - ah * 1.5)}`}
          fill={vecColor}
        />
        <text
          x={r2(labelX)}
          y={r2(labelY)}
          textAnchor="middle"
          className="fill-ink font-mono"
          style={{ fontSize: 11, userSelect: 'none' }}
          pointerEvents="none"
        >
          F = {fmt(force)} N
        </text>
      </svg>

      {/* Live-Ergebnis aus der Engine */}
      <div className="mt-3 flex items-baseline gap-2 font-mono">
        <Latex className="text-ink" src={formula.result.symbol} />
        <span className="text-ink">=</span>
        {torque === null ? (
          <span className="text-viz-high">—</span>
        ) : (
          <span className="text-lg text-accent-ink">
            {fmt(torque)} {formula.result.unit}
          </span>
        )}
        <span className="ml-1 text-xs text-ink-faint">aus der Engine</span>
      </div>

      {/* Steuerung */}
      <div className="mt-4 flex flex-col gap-4">
        <Slider
          label="Kraft"
          symbol={<Latex src="F" />}
          value={force}
          min={forceRange[0]}
          max={forceRange[1]}
          step={5}
          unit="N"
          onChange={setForce}
        />
        <Slider
          label="Hebelarm"
          symbol={<Latex src="r" />}
          value={arm}
          min={armRange[0]}
          max={armRange[1]}
          step={0.05}
          unit="m"
          onChange={setArm}
        />
      </div>

      {caption && <figcaption className="mt-3 text-sm text-ink-2">{caption}</figcaption>}
    </figure>
  );
}
