// LeverSlider.tsx — Phase-2-Kernkomponente: Kraft/Hebel-Slider.
//
// Eiserne Regel 1: das Drehmoment M kommt aus packages/engine, nie aus dem
// Markup. Die Slider treiben Kraft F und Hebelarm r; die Engine rechnet M = F·r;
// die 2.5D-Szene (packages/iso) zeigt Kraftvektor und Drehwirkung live — der
// Balken neigt sich sichtbar unter Last, der Ampel-Pfeil zeigt den Kraftbetrag.

import { useEffect, useMemo, useState } from 'react';
import { evaluateFormula } from '@buildlab/engine';
import { project, rotateY, toPolygonPoints, shade, type Vec2, type Vec3 } from '@buildlab/iso';
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
// Drehpunkt als 3D-Keil (Prisma): halbe Breite in x, halbe Tiefe in y.
const FUL = { halfX: 0.5, halfY: 0.3 };
// Maximale Balken-Neigung unter Last (an der Drehpunkt-Hinge). Bewusst dezent,
// damit der Hebel kippt statt umzustürzen — sofort sichtbar, bleibt elegant.
const MAX_TILT = (9 * Math.PI) / 180;
// Perspektivische Bodenfläche (Bühne) unter der Szene.
const FLOOR = {
  x0: -1.0,
  x1: BEAM.max.x + 0.4,
  y0: -FUL.halfY - 0.4,
  y1: FUL.halfY + 0.4,
  step: 0.4,
};

// Token-abgeleitete Flächenfarben (BEAM_BASE ist konstant → einmal berechnet).
const G = {
  topHi: shade(BEAM_BASE, 0.3),
  topLo: shade(BEAM_BASE, 0.08),
  frontHi: shade(BEAM_BASE, -0.12),
  frontLo: shade(BEAM_BASE, -0.3),
  endHi: shade(BEAM_BASE, -0.02),
  endLo: shade(BEAM_BASE, -0.18),
  fulSideHi: shade(BEAM_BASE, -0.18),
  fulSideLo: shade(BEAM_BASE, -0.34),
  fulFrontHi: shade(BEAM_BASE, 0.04),
  fulFrontLo: shade(BEAM_BASE, -0.16),
  glanz: shade(BEAM_BASE, 0.5),
  ridge: shade(BEAM_BASE, 0.2),
};

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

/**
 * Sichtbare Flächen einer iso-Box, durch `tf` (Welt→Bild) transformiert.
 * Gibt sowohl die <polygon>-Strings als auch die Eck-Vec2 zurück, damit
 * Glanz- und Bevel-Kanten exakt auf den (ggf. gekippten) Kanten liegen.
 */
function isoBox(min: Vec3, max: Vec3, tf: (p: Vec3) => Vec2) {
  const topV = [
    { x: min.x, y: min.y, z: max.z },
    { x: max.x, y: min.y, z: max.z },
    { x: max.x, y: max.y, z: max.z },
    { x: min.x, y: max.y, z: max.z },
  ].map(tf);
  const frontV = [
    { x: min.x, y: max.y, z: max.z },
    { x: max.x, y: max.y, z: max.z },
    { x: max.x, y: max.y, z: min.z },
    { x: min.x, y: max.y, z: min.z },
  ].map(tf);
  const endV = [
    { x: max.x, y: min.y, z: max.z },
    { x: max.x, y: max.y, z: max.z },
    { x: max.x, y: max.y, z: min.z },
    { x: max.x, y: min.y, z: min.z },
  ].map(tf);
  return {
    topV,
    frontV,
    top: toPolygonPoints(topV),
    front: toPolygonPoints(frontV),
    end: toPolygonPoints(endV),
  };
}

// Konstante „Hülle": Balken (ruhend UND maximal gekippt) + Drehpunkt + Pfeil-
// Extremlagen + Bodenfläche. Daraus wird eine feste, randscharfe Rahmung
// berechnet — die Szene springt beim Schieben/Kippen nicht und nichts clippt.
const ENVELOPE: Vec3[] = [
  ...box(BEAM.min, BEAM.max),
  ...box(BEAM.min, BEAM.max).map((p) => rotateY(p, MAX_TILT)),
  // Drehpunkt-Keil (mit Tiefe), inkl. Kontaktschatten-Spielraum.
  { x: 0, y: FUL.halfY, z: 0 },
  { x: 0, y: -FUL.halfY, z: 0 },
  { x: -FUL.halfX - 0.15, y: FUL.halfY, z: GROUND_Z },
  { x: FUL.halfX + 0.15, y: -FUL.halfY, z: GROUND_Z },
  { x: ARM_MIN_X, y: 0, z: BEAM.max.z + ARROW_MAX },
  { x: ARM_MIN_X + ARM_SPAN, y: 0, z: BEAM.max.z + ARROW_MAX },
  // Bodenfläche (Bühne).
  { x: FLOOR.x0, y: FLOOR.y0, z: GROUND_Z },
  { x: FLOOR.x1, y: FLOOR.y0, z: GROUND_Z },
  { x: FLOOR.x1, y: FLOOR.y1, z: GROUND_Z },
  { x: FLOOR.x0, y: FLOOR.y1, z: GROUND_Z },
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

// Bildfüllender perspektivischer Boden als Hintergrund: eine große Welt-Ebene
// bei z = GROUND_Z, projiziert mit demselben proj() wie die Szene. Bewusst
// UNABHÄNGIG von ENVELOPE/FRAME (die Linien dürfen über den Rand laufen, wir
// beschneiden per clipPath) — so bleibt die Szenen-Rahmung unverändert.
// Statisch (nur Konstanten) → einmal erzeugt, null Render-Kosten.
const BG = { x0: -10, x1: 16, y0: -12, y1: 12, step: 0.5 };
const BG_GRID: { x1: number; y1: number; x2: number; y2: number }[] = (() => {
  const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
  const nx = Math.round((BG.x1 - BG.x0) / BG.step);
  const ny = Math.round((BG.y1 - BG.y0) / BG.step);
  for (let i = 0; i <= nx; i++) {
    const x = BG.x0 + i * BG.step;
    const a = proj({ x, y: BG.y0, z: GROUND_Z });
    const b = proj({ x, y: BG.y1, z: GROUND_Z });
    lines.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
  }
  for (let j = 0; j <= ny; j++) {
    const y = BG.y0 + j * BG.step;
    const a = proj({ x: BG.x0, y, z: GROUND_Z });
    const b = proj({ x: BG.x1, y, z: GROUND_Z });
    lines.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
  }
  return lines;
})();

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

  // Ampel-Farbe des Kraftvektors nach Betrag (Viz-Skala, nur Sim-Overlay).
  const vecColor =
    forceFrac < 0.5 ? 'var(--viz-low)' : forceFrac < 0.8 ? 'var(--viz-mid)' : 'var(--viz-high)';

  // ── aktuelle Szene ───────────────────────────────────────────────────────────
  const armX = ARM_MIN_X + armFrac * ARM_SPAN; // Kraftposition entlang des Balkens
  const arrowLen = 0.3 + forceFrac * (ARROW_MAX - 0.3); // Vektorlänge ∝ Kraft

  // Der Balken kippt an der Drehpunkt-Hinge; die Neigung wächst mit dem Drehmoment.
  const tilt = MAX_TILT * torqueFrac;
  const tf = (p: Vec3): Vec2 => proj(rotateY(p, tilt));

  const beam = isoBox(BEAM.min, BEAM.max, tf);

  // Drehpunkt als pseudo-3D-Keil: Stirndreieck (vorne) + rechte Schrägfläche (Tiefe).
  // Der Keil steht fest (Stützpunkt) — er kippt nicht mit.
  const apexF = { x: 0, y: FUL.halfY, z: 0 };
  const apexB = { x: 0, y: -FUL.halfY, z: 0 };
  const baseLF = { x: -FUL.halfX, y: FUL.halfY, z: GROUND_Z };
  const baseRF = { x: FUL.halfX, y: FUL.halfY, z: GROUND_Z };
  const baseRB = { x: FUL.halfX, y: -FUL.halfY, z: GROUND_Z };
  const fulFront = toPolygonPoints([apexF, baseLF, baseRF].map(proj));
  const fulSide = toPolygonPoints([apexF, apexB, baseRB, baseRF].map(proj));
  const fulRidge = [proj(apexF), proj(apexB)];

  // Kontaktschatten unter dem Keil (statt verwirrender Bodenlinie).
  const shadow = proj({ x: 0, y: 0, z: GROUND_Z });
  const shadowRx = Math.abs(proj(baseRF).x - proj(baseLF).x) / 2 + 6;

  // Kraft-Angriffspunkt auf der GEKIPPTEN Balken-Oberkante.
  const tip = tf({ x: armX, y: 0, z: BEAM.max.z });
  // Pfeil bleibt senkrecht (Schwerkraft): Schaft in Bildschirm-px über dem Fuß.
  const tail = { x: tip.x, y: tip.y - arrowLen * FRAME.scale };

  // Kraftvektor als EINE geschlossene Silhouette (Schaft + Spitze), senkrecht
  // nach unten zeigend → eine durchgehende, gleichmäßige Kontur.
  const ah = 8; // halbe Pfeilkopf-Breite (Bildschirm-px)
  const headLen = 13; // Länge der Pfeilspitze
  const sw = 2.2; // halbe Schaftbreite
  const cx = tip.x;
  const yHead = tip.y - headLen; // Kopfbasis
  const yTail = Math.min(tail.y, yHead - 2); // immer etwas Schaft, nie invertiert
  const arrowPts = [
    [cx - sw, yTail],
    [cx - sw, yHead],
    [cx - ah, yHead],
    [cx, tip.y],
    [cx + ah, yHead],
    [cx + sw, yHead],
    [cx + sw, yTail],
  ]
    .map(([x, y]) => `${r2(x)},${r2(y)}`)
    .join(' ');

  const pivot = proj({ x: 0, y: 0, z: 0 });
  const arcR = 18 + torqueFrac * 22;
  // Drehwirkungs-Pfeil als EINE geschlossene Form (gekrümmtes Band, das in die
  // Spitze ausläuft) → eine durchgehende Ink-Kontur, Spitze exakt tangential.
  // Selbst parametrisiert (kein SVG-A-Arc), damit Tangente und Form zusammenpassen.
  // P(φ) = C + R·(cosφ, −sinφ): φ=90° oben, 180° links; abnehmendes φ = im Uhrzeigersinn.
  const arcPt = (phi: number, r: number): Vec2 => ({
    x: pivot.x + r * Math.cos(phi),
    y: pivot.y - r * Math.sin(phi),
  });
  const RAD = Math.PI / 180;
  const arcPhi0 = 178 * RAD; // Schwanz (links)
  const arcPhiHead = 92 * RAD; // Kopfbasis (kurz vor oben)
  const arcSteps = 14;
  const inner: Vec2[] = [];
  const outer: Vec2[] = [];
  for (let i = 0; i <= arcSteps; i++) {
    const phi = arcPhi0 + ((arcPhiHead - arcPhi0) * i) / arcSteps;
    const c = Math.cos(phi);
    const s = Math.sin(phi);
    const n = { x: c, y: -s }; // Normale = Radial
    const p = arcPt(phi, arcR);
    inner.push({ x: p.x - n.x * sw, y: p.y - n.y * sw });
    outer.push({ x: p.x + n.x * sw, y: p.y + n.y * sw });
  }
  const cH = Math.cos(arcPhiHead);
  const sH = Math.sin(arcPhiHead);
  const nH = { x: cH, y: -sH }; // Radial an der Kopfbasis
  const tH = { x: sH, y: cH }; // Tangente (Drehrichtung) an der Kopfbasis
  const headBase = arcPt(arcPhiHead, arcR);
  const arcTip = { x: headBase.x + tH.x * headLen, y: headBase.y + tH.y * headLen };
  // Ein Pfad: Innenkante → innere Kopfecke → Spitze → äußere Kopfecke → Außenkante zurück → Z.
  const arcPath =
    `M ${r2(inner[0].x)} ${r2(inner[0].y)} ` +
    inner
      .slice(1)
      .map((p) => `L ${r2(p.x)} ${r2(p.y)}`)
      .join(' ') +
    ` L ${r2(headBase.x - nH.x * ah)} ${r2(headBase.y - nH.y * ah)}` +
    ` L ${r2(arcTip.x)} ${r2(arcTip.y)}` +
    ` L ${r2(headBase.x + nH.x * ah)} ${r2(headBase.y + nH.y * ah)} ` +
    outer
      .slice()
      .reverse()
      .map((p) => `L ${r2(p.x)} ${r2(p.y)}`)
      .join(' ') +
    ' Z';

  // Maßlinie für den Hebelarm r auf der (gekippten) Balken-Oberkante.
  const dimA = tf({ x: 0, y: 0, z: BEAM.max.z });
  const dimB = tf({ x: armX, y: 0, z: BEAM.max.z });

  // Kraft-Label als Mess-Tag; Breite aus der Monospace-Zeichenzahl geschätzt.
  const labelText = `F = ${fmt(force)} N`;
  const labelW = labelText.length * 6.7 + 12;
  const labelX = Math.max(MARGIN.l + labelW / 2, Math.min(VIEW_W - MARGIN.r - labelW / 2, tail.x));
  const labelY = Math.max(15, tail.y - 10);

  return (
    <figure className="rounded border border-black/10 bg-paper-2 p-4 shadow">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="w-full rounded"
        role="img"
        aria-label={`Hebel: Kraft ${fmt(force)} Newton am Hebelarm ${fmt(arm, 2)} Meter, Drehmoment ${torque === null ? 'unbestimmt' : fmt(torque)} Newtonmeter`}
      >
        <defs>
          {/* Feld-Begrenzung (gerundetes Rechteck) für den bildfüllenden Boden. */}
          <clipPath id="lever-field">
            <rect x={0} y={0} width={VIEW_W} height={VIEW_H} rx={6} />
          </clipPath>
          {/* Boden-Verlauf: hinten/oben heller → vorne/unten dunkler (Horizont-Tiefe). */}
          <linearGradient id="lever-floor-bg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--paper-2)" />
            <stop offset="0.55" stopColor="var(--paper)" />
            <stop offset="1" stopColor="var(--paper-sink)" />
          </linearGradient>
          {/* Flächen-Farbverläufe (Licht von oben) — plastisch statt flach. */}
          <linearGradient id="lever-top" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={G.topHi} />
            <stop offset="1" stopColor={G.topLo} />
          </linearGradient>
          <linearGradient id="lever-front" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={G.frontHi} />
            <stop offset="1" stopColor={G.frontLo} />
          </linearGradient>
          <linearGradient id="lever-end" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={G.endHi} />
            <stop offset="1" stopColor={G.endLo} />
          </linearGradient>
          <linearGradient id="lever-ful-side" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={G.fulSideHi} />
            <stop offset="1" stopColor={G.fulSideLo} />
          </linearGradient>
          <linearGradient id="lever-ful-front" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={G.fulFrontHi} />
            <stop offset="1" stopColor={G.fulFrontLo} />
          </linearGradient>
          {/* Weicher, dezenter Tiefenschatten (kein dicker Schlagschatten). */}
          <filter id="lever-soft" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2.5" />
            <feOffset dy="2" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.18" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Bildfüllender iso-Boden als Hintergrund (Bühne), auf das Feld beschnitten */}
        <g clipPath="url(#lever-field)">
          <rect x={0} y={0} width={VIEW_W} height={VIEW_H} fill="url(#lever-floor-bg)" />
          {BG_GRID.map((l, i) => (
            <line
              key={i}
              x1={r2(l.x1)}
              y1={r2(l.y1)}
              x2={r2(l.x2)}
              y2={r2(l.y2)}
              stroke="#00000014"
              strokeWidth={0.6}
            />
          ))}
        </g>

        {/* Sauberer Hairline-Rahmen obenauf */}
        <rect
          x={4.5}
          y={4.5}
          width={VIEW_W - 9}
          height={VIEW_H - 9}
          rx={4}
          fill="none"
          stroke="#00000022"
          strokeWidth={1}
        />

        {/* Kontaktschatten unter dem Drehpunkt */}
        <g className="lever-in lever-d1">
          <ellipse cx={r2(shadow.x)} cy={r2(shadow.y)} rx={r2(shadowRx)} ry={5} fill="#0000001a" />
        </g>

        {/* Drehpunkt als pseudo-3D-Keil mit Farbverlauf + Glanz-Grat */}
        <g className="lever-in lever-d2" filter="url(#lever-soft)">
          <polygon points={fulSide} fill="url(#lever-ful-side)" />
          <polygon points={fulFront} fill="url(#lever-ful-front)" stroke="#00000022" />
          <line
            x1={r2(fulRidge[0].x)}
            y1={r2(fulRidge[0].y)}
            x2={r2(fulRidge[1].x)}
            y2={r2(fulRidge[1].y)}
            stroke={G.ridge}
            strokeWidth={1}
          />
        </g>

        {/* Balken als pseudo-3D-Box: Farbverläufe, Glanzkante oben, Bevel unten */}
        <g className="lever-in lever-d3" filter="url(#lever-soft)">
          <polygon points={beam.front} fill="url(#lever-front)" />
          <polygon points={beam.end} fill="url(#lever-end)" />
          <polygon points={beam.top} fill="url(#lever-top)" />
          {/* Glanzkante: helle Linie entlang der oberen Vorder- und Stirnkante */}
          <polyline
            points={toPolygonPoints([beam.topV[3], beam.topV[2], beam.topV[1]])}
            fill="none"
            stroke={G.glanz}
            strokeWidth={1}
            strokeOpacity={0.7}
            strokeLinecap="round"
          />
          {/* Bevel: dünne dunkle Linie an der unteren Vorderkante (Erdung) */}
          <line
            x1={r2(beam.frontV[3].x)}
            y1={r2(beam.frontV[3].y)}
            x2={r2(beam.frontV[2].x)}
            y2={r2(beam.frontV[2].y)}
            stroke="#00000022"
            strokeWidth={0.8}
          />
        </g>

        {/* Vordergrund: Maßlinie, Drehwirkungs-Bogen, Kraftvektor, Label */}
        <g className="lever-in lever-d4">
          {/* Maßlinie für den Hebelarm r auf der gekippten Balken-Oberkante */}
          {Math.hypot(dimB.x - dimA.x, dimB.y - dimA.y) > 14 && (
            <g stroke="var(--ink-faint)" strokeOpacity={0.7}>
              <line x1={r2(dimA.x)} y1={r2(dimA.y)} x2={r2(dimB.x)} y2={r2(dimB.y)} strokeDasharray="2 2" />
              <circle cx={r2(dimA.x)} cy={r2(dimA.y)} r={1.6} fill="var(--ink-faint)" stroke="none" />
              <circle cx={r2(dimB.x)} cy={r2(dimB.y)} r={1.6} fill="var(--ink-faint)" stroke="none" />
            </g>
          )}

          {/* Drehwirkungs-Pfeil (Betrag ∝ Drehmoment): EINE geschlossene Form mit
              einer durchgehenden Ink-Kontur — gleiche Sprache wie der Kraftpfeil. */}
          <path
            className="lever-arc-pulse"
            d={arcPath}
            fill={vecColor}
            stroke="var(--ink)"
            strokeWidth={1.4}
            strokeLinejoin="round"
          />

          {/* Kraftvektor (2.5D): EIN Polygon (Schaft + Spitze) mit durchgehender,
              gleichmäßiger Ink-Kontur — Ampel-Farbe je Kraftbetrag. */}
          <polygon
            points={arrowPts}
            fill={vecColor}
            stroke="var(--ink)"
            strokeWidth={1.4}
            strokeLinejoin="round"
          />

          {/* Kraft-Label als dezentes Mess-Tag (Mono auf Papier-Chip) */}
          <g pointerEvents="none">
            <rect
              x={r2(labelX - labelW / 2)}
              y={r2(labelY - 11)}
              width={r2(labelW)}
              height={15}
              rx={3}
              fill="var(--paper-2)"
              stroke="#00000014"
            />
            <text
              x={r2(labelX)}
              y={r2(labelY)}
              textAnchor="middle"
              className="fill-ink font-mono"
              style={{ fontSize: 11, userSelect: 'none' }}
            >
              {labelText}
            </text>
          </g>
        </g>
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
