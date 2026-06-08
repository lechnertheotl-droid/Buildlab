// LeverSlider.tsx — Phase-2-Kernkomponente: Kraft/Hebel-Slider.
//
// Eiserne Regel 1: das Drehmoment M kommt aus packages/engine, nie aus dem
// Markup. Die Slider treiben Kraft F und Hebelarm r; die Engine rechnet M = F·r;
// die 2.5D-Szene (packages/iso) zeigt Kraftvektor und Drehwirkung live.

import { useEffect, useMemo, useState } from 'react';
import { evaluateFormula } from '@buildlab/engine';
import { project, projectAll, toPolygonPoints, shade, type Vec3 } from '@buildlab/iso';
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
const VIEW_H = 240;
const SCALE = 44; // px pro Welteinheit
const ISO = { scale: SCALE };

function fmt(n: number, digits = 1): string {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: digits }).format(n);
}

/** Sichtbare Flächen einer isometrischen Quader-„Box" als SVG-points. */
function isoBox(min: Vec3, max: Vec3) {
  const top = projectAll(
    [
      { x: min.x, y: min.y, z: max.z },
      { x: max.x, y: min.y, z: max.z },
      { x: max.x, y: max.y, z: max.z },
      { x: min.x, y: max.y, z: max.z },
    ],
    ISO,
  );
  const front = projectAll(
    [
      { x: min.x, y: max.y, z: max.z },
      { x: max.x, y: max.y, z: max.z },
      { x: max.x, y: max.y, z: min.z },
      { x: min.x, y: max.y, z: min.z },
    ],
    ISO,
  );
  const end = projectAll(
    [
      { x: max.x, y: min.y, z: max.z },
      { x: max.x, y: max.y, z: max.z },
      { x: max.x, y: max.y, z: min.z },
      { x: max.x, y: min.y, z: min.z },
    ],
    ISO,
  );
  return {
    top: toPolygonPoints(top),
    front: toPolygonPoints(front),
    end: toPolygonPoints(end),
  };
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

  // ── Szene in Weltkoordinaten ────────────────────────────────────────────────
  const beamMinX = -0.7;
  const beamMaxX = 5.0;
  const armX = 0.4 + armFrac * 4.2; // Position der Kraft entlang des Balkens
  const arrowLen = 0.4 + forceFrac * 2.6; // Vektorlänge ∝ Kraft

  const beam = isoBox(
    { x: beamMinX, y: -0.32, z: 0 },
    { x: beamMaxX, y: 0.32, z: 0.34 },
  );

  // Drehpunkt (Keil) unter dem Balken bei x = 0.
  const fulcrum = toPolygonPoints(
    projectAll(
      [
        { x: -0.55, y: 0, z: -0.95 },
        { x: 0.55, y: 0, z: -0.95 },
        { x: 0, y: 0, z: 0 },
      ],
      ISO,
    ),
  );

  // Kraftvektor: von oben auf den Balken bei armX (zeigt nach unten, −z).
  const tip = project({ x: armX, y: 0, z: 0.34 }, ISO);
  const tail = project({ x: armX, y: 0, z: 0.34 + arrowLen }, ISO);
  const ah = 7; // Pfeilspitzen-Größe (Bildschirm-px)

  // Bogen für die Drehwirkung um den Drehpunkt; Radius ∝ Drehmoment.
  const pivot = project({ x: 0, y: 0, z: 0 }, ISO);
  const arcR = 26 + torqueFrac * 34;

  // Szene zentrieren: Drehpunkt etwa mittig-unten platzieren.
  const ox = VIEW_W / 2 - (project({ x: beamMaxX / 2, y: 0, z: 0 }, ISO).x);
  const oy = VIEW_H * 0.62;

  return (
    <figure className="rounded border border-black/10 bg-paper-2 p-4 shadow">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="mm-grid w-full rounded bg-paper-sink/40"
        role="img"
        aria-label={`Hebel: Kraft ${fmt(force)} Newton am Hebelarm ${fmt(arm, 2)} Meter`}
      >
        <g transform={`translate(${fmt(ox, 2)} ${fmt(oy, 2)})`}>
          {/* Bodenlinie */}
          <line x1={-150} y1={6} x2={250} y2={6} stroke="var(--ink-faint)" strokeOpacity={0.3} />

          {/* Drehpunkt-Keil (zwei Abstufungen für Tiefe) */}
          <polygon points={fulcrum} fill={shade(BEAM_BASE, -0.18)} stroke="#0000001a" />

          {/* Balken als pseudo-3D-Box: oben hell, Stirn/Seite dunkler (Schattierung) */}
          <polygon points={beam.front} fill={shade(BEAM_BASE, -0.22)} />
          <polygon points={beam.end} fill={shade(BEAM_BASE, -0.1)} />
          <polygon points={beam.top} fill={shade(BEAM_BASE, 0.16)} stroke="#0000001a" />

          {/* Drehwirkungs-Bogen (Betrag ∝ Drehmoment) */}
          <path
            d={`M ${fmt(pivot.x + arcR, 2)} ${fmt(pivot.y, 2)} A ${fmt(arcR, 2)} ${fmt(arcR, 2)} 0 0 1 ${fmt(pivot.x, 2)} ${fmt(pivot.y - arcR, 2)}`}
            fill="none"
            stroke={vecColor}
            strokeWidth={2}
            strokeDasharray="4 3"
            opacity={0.8}
            markerEnd="url(#arc-head)"
          />

          {/* Kraftvektor (2.5D): Linie + Pfeilspitze, Länge & Farbe ∝ Kraft */}
          <line
            x1={fmt(tail.x, 2)}
            y1={fmt(tail.y, 2)}
            x2={fmt(tip.x, 2)}
            y2={fmt(tip.y, 2)}
            stroke={vecColor}
            strokeWidth={3}
            strokeLinecap="round"
          />
          <polygon
            points={`${fmt(tip.x, 2)},${fmt(tip.y, 2)} ${fmt(tip.x - ah, 2)},${fmt(tip.y - ah * 1.4, 2)} ${fmt(tip.x + ah, 2)},${fmt(tip.y - ah * 1.4, 2)}`}
            fill={vecColor}
          />
          <text
            x={fmt(tail.x, 2)}
            y={fmt(tail.y - 8, 2)}
            textAnchor="middle"
            className="fill-ink font-mono"
            style={{ fontSize: 11 }}
          >
            F = {fmt(force)} N
          </text>
        </g>

        <defs>
          <marker id="arc-head" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill={vecColor} />
          </marker>
        </defs>
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
