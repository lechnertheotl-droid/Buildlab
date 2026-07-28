// VectorDrag — ziehbarer 2.5D-Kraftvektor (Registry: vector-drag).
//
// Eine Kiste auf isometrischem Boden (eigene Bühne im Stil der IsoStage —
// ein einziges SVG, damit der Drag-Layer und die Szene dieselben Koordinaten
// teilen); vom Angriffspunkt aus zeigt ein frei ziehbarer Kraftpfeil in der
// Bildebene. Der Pfeilkopf ist der Drag-Handle (Pointer-Capture wie
// CalculatorDrawer); gestrichelte Konstruktionslinien zeigen die Komponenten
// Fx/Fy, ein Winkelbogen die Richtung. Eiserne Regel 1: die Komponenten
// kommen aus packages/engine (evaluateExpr), nie aus dem Markup. A11y nach
// DESIGN.md §7: role=img mit Live-Werten, natives Range-Input je Größe,
// Pfeilkopf zusätzlich per Tastatur steuerbar.

import { useRef, useState } from 'react';
import { evaluateExpr } from '@buildlab/engine';
import { project } from '@buildlab/iso';
import { Slider } from '../Slider';
import { ampelColor, isoBox } from '../iso-scene';
import { focusRing } from '../primitives/focus';
import { useCountUp } from '../useCountUp';

export interface VectorDragParams {
  /** Maximaler Kraftbetrag in N (Ampel-Skala + Slider-Ende). */
  maxN?: number;
  /** Startbetrag in N. */
  initN?: number;
  /** Startrichtung in Grad (0° = nach rechts, 90° = nach oben). */
  initDeg?: number;
}

const fmt = (n: number, digits = 1) =>
  new Intl.NumberFormat('de-DE', { maximumFractionDigits: digits }).format(n);

const r2 = (n: number) => Math.round(n * 100) / 100;

const VIEW_W = 460;
const VIEW_H = 300;
const ORIGIN = { x: 230, y: 205 };
const FLOOR = 110;
const BOX_SIZE = { x: 44, y: 44, z: 30 };
const BOX_COLOR = '#a98e6f';
// Pfeillänge in px: Sockel + Anteil bis maxN — auch kleine Kräfte bleiben greifbar.
const LEN_MIN = 26;
const LEN_MAX = 120;

/** Geschlossene Pfeil-Silhouette (AmpelArrow-Formsprache), frei rotiert. */
function arrowPoints(from: { x: number; y: number }, angleRad: number, length: number): string {
  const ux = Math.cos(angleRad);
  const uy = -Math.sin(angleRad); // Bildschirm-y zeigt nach unten
  const nx = -uy;
  const ny = ux;
  const headLen = 13;
  const headHalf = 8;
  const shaftHalf = 2.2;
  const tip = { x: from.x + ux * length, y: from.y + uy * length };
  const base = { x: tip.x - ux * headLen, y: tip.y - uy * headLen };
  return [
    { x: from.x + nx * shaftHalf, y: from.y + ny * shaftHalf },
    { x: base.x + nx * shaftHalf, y: base.y + ny * shaftHalf },
    { x: base.x + nx * headHalf, y: base.y + ny * headHalf },
    tip,
    { x: base.x - nx * headHalf, y: base.y - ny * headHalf },
    { x: base.x - nx * shaftHalf, y: base.y - ny * shaftHalf },
    { x: from.x - nx * shaftHalf, y: from.y - ny * shaftHalf },
  ]
    .map((p) => `${r2(p.x)},${r2(p.y)}`)
    .join(' ');
}

// Boden-Gitter der Bühne (statisch → einmal berechnet, Stil IsoStage).
const GRID: { x1: number; y1: number; x2: number; y2: number; op: number }[] = (() => {
  const lines: { x1: number; y1: number; x2: number; y2: number; op: number }[] = [];
  const steps = 6;
  for (let i = -steps; i <= steps; i++) {
    const t = (i / steps) * FLOOR;
    const a = project({ x: t, y: -FLOOR, z: 0 });
    const b = project({ x: t, y: FLOOR, z: 0 });
    const c = project({ x: -FLOOR, y: t, z: 0 });
    const d = project({ x: FLOOR, y: t, z: 0 });
    const fade = 0.22 - 0.14 * (Math.abs(i) / steps);
    const op = i === 0 ? 0.35 : fade;
    lines.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, op });
    lines.push({ x1: c.x, y1: c.y, x2: d.x, y2: d.y, op });
  }
  return lines;
})();

export function VectorDrag({ params, caption }: { params: VectorDragParams; caption?: string }) {
  const maxN = params.maxN ?? 100;
  const [kraft, setKraft] = useState(() => Math.min(maxN, Math.max(0, params.initN ?? maxN / 2)));
  const [richtung, setRichtung] = useState(() => (((params.initDeg ?? 35) % 360) + 360) % 360);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragging = useRef(false);

  const phi = (richtung * Math.PI) / 180;
  // Eiserne Regel 1: die Komponenten rechnet die Engine, nicht das Markup.
  const fx = evaluateExpr('F * cos(phi)', { F: kraft, phi }) as number;
  const fy = evaluateExpr('F * sin(phi)', { F: kraft, phi }) as number;

  const frac = maxN > 0 ? kraft / maxN : 0;
  const kraftAnzeige = useCountUp(kraft);

  // Angriffspunkt: Mitte der Kisten-Deckfläche (in Bühnen-Koordinaten).
  const ankerLokal = project({ x: 0, y: 0, z: BOX_SIZE.z });
  const anker = { x: ORIGIN.x + ankerLokal.x, y: ORIGIN.y + ankerLokal.y };
  const len = LEN_MIN + frac * (LEN_MAX - LEN_MIN);
  const ux = Math.cos(phi);
  const uy = -Math.sin(phi);
  const tip = { x: anker.x + ux * len, y: anker.y + uy * len };

  // Komponenten-Konstruktion (Kräfteparallelogramm): waagerecht Fx, senkrecht Fy.
  const eckeX = { x: tip.x, y: anker.y };

  // Winkelbogen am Anker (von 0° bis zur Richtung).
  const arcR = 24;
  const arcSteps = 18;
  const arcPts = Array.from({ length: arcSteps + 1 }, (_, i) => {
    const a = (phi * i) / arcSteps;
    return `${r2(anker.x + arcR * Math.cos(a))},${r2(anker.y - arcR * Math.sin(a))}`;
  }).join(' ');

  /** Pointer-Position in viewBox-Einheiten. */
  const toView = (e: React.PointerEvent): { x: number; y: number } | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0) return null;
    return {
      x: ((e.clientX - rect.left) / rect.width) * VIEW_W,
      y: ((e.clientY - rect.top) / rect.height) * VIEW_H,
    };
  };

  const applyPointer = (e: React.PointerEvent) => {
    const p = toView(e);
    if (!p) return;
    const dx = p.x - anker.x;
    const dy = anker.y - p.y; // Bildschirm-y → Mathe-y
    const dist = Math.hypot(dx, dy);
    setKraft(Math.round(Math.min(maxN, Math.max(0, ((dist - LEN_MIN) / (LEN_MAX - LEN_MIN)) * maxN))));
    if (dist > 6) {
      setRichtung(Math.round(((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360));
    }
  };

  // Drag-Muster wie CalculatorDrawer: Pointer-Capture am Handle.
  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    (e.target as Element).setPointerCapture(e.pointerId);
    applyPointer(e);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (dragging.current) applyPointer(e);
  };
  const onPointerUp = () => {
    dragging.current = false;
  };

  // Tastatur am Handle: ←/→ drehen, ↑/↓ ändern den Betrag (DESIGN.md §7).
  const onKeyDown = (e: React.KeyboardEvent) => {
    const schritt = e.shiftKey ? 10 : 1;
    if (e.key === 'ArrowLeft') setRichtung((r) => (r + schritt) % 360);
    else if (e.key === 'ArrowRight') setRichtung((r) => (r - schritt + 360) % 360);
    else if (e.key === 'ArrowUp') setKraft((k) => Math.min(maxN, k + schritt));
    else if (e.key === 'ArrowDown') setKraft((k) => Math.max(0, k - schritt));
    else return;
    e.preventDefault();
  };

  const label =
    `Kraftvektor: Betrag ${fmt(kraft)} Newton, Richtung ${fmt(richtung, 0)} Grad — ` +
    `waagerecht ${fmt(fx)} Newton, senkrecht ${fmt(fy)} Newton`;

  return (
    <figure className="rounded border border-black/10 bg-paper-2 p-4 shadow">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="w-full touch-none"
        role="img"
        aria-label={label}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <desc>
          Eine Kiste auf isometrischem Boden; vom Angriffspunkt aus zeigt ein ziehbarer
          Kraftpfeil in der Bildebene. Gestrichelte Linien zeigen die Komponenten Fx und Fy,
          ein Bogen den Winkel zur Waagerechten.
        </desc>
        <defs>
          <radialGradient id="vd-floorlight">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Bühne: Lichtfleck + Boden-Gitter + Kontaktschatten + Kiste */}
        <g transform={`translate(${ORIGIN.x} ${ORIGIN.y})`} className="bl-einzeichnen">
          <ellipse cx={0} cy={0} rx={FLOOR * 1.1} ry={FLOOR * 0.5} fill="url(#vd-floorlight)" />
          {GRID.map((l, i) => (
            <line key={i} x1={r2(l.x1)} y1={r2(l.y1)} x2={r2(l.x2)} y2={r2(l.y2)} stroke="var(--ink-faint)" strokeOpacity={l.op} />
          ))}
          <ellipse cx={0} cy={2} rx={44} ry={18} fill="#000" opacity={0.12} />
          {isoBox({ at: { x: -BOX_SIZE.x / 2, y: -BOX_SIZE.y / 2, z: 0 }, size: BOX_SIZE, color: BOX_COLOR })}
        </g>

        {/* Konstruktionslinien: Komponenten Fx/Fy als Kräfteparallelogramm */}
        {kraft > 0 && (
          <g stroke="var(--ink-faint)" strokeOpacity={0.8} fill="none">
            <line x1={r2(anker.x)} y1={r2(anker.y)} x2={r2(eckeX.x)} y2={r2(eckeX.y)} strokeDasharray="3 3" />
            <line x1={r2(eckeX.x)} y1={r2(eckeX.y)} x2={r2(tip.x)} y2={r2(tip.y)} strokeDasharray="3 3" />
            <polyline points={arcPts} strokeDasharray="2 2" />
          </g>
        )}

        {/* Der Kraftvektor: Ampel-Silhouette, frei rotiert */}
        <polygon
          points={arrowPoints(anker, phi, len)}
          fill={ampelColor(frac)}
          stroke="var(--ink)"
          strokeWidth={1.4}
          strokeLinejoin="round"
        />

        {/* Drag-Handle am Pfeilkopf: ≥44 px Trefffläche, Akzent-Ring = „anfassbar" */}
        <g
          role="slider"
          aria-label="Kraftpfeil ziehen: Pfeiltasten links/rechts drehen, hoch/runter ändern den Betrag"
          aria-valuenow={kraft}
          aria-valuemin={0}
          aria-valuemax={maxN}
          aria-valuetext={`${fmt(kraft)} Newton, ${fmt(richtung, 0)} Grad`}
          tabIndex={0}
          className={`cursor-grab ${focusRing}`}
          onPointerDown={onPointerDown}
          onKeyDown={onKeyDown}
        >
          <circle cx={r2(tip.x)} cy={r2(tip.y)} r={22} fill="transparent" />
          <circle cx={r2(tip.x)} cy={r2(tip.y)} r={11} fill="none" stroke="var(--accent)" strokeWidth={1.6} strokeDasharray="3 2.5" />
        </g>

        {/* Mess-Tags: Betrag+Winkel am Pfeil, Komponenten an den Konstruktionslinien */}
        <g pointerEvents="none" className="font-mono">
          <text x={r2(anker.x + arcR + 8)} y={r2(anker.y - 5)} fontSize={10} className="fill-[color:var(--ink-2)]">
            {fmt(richtung, 0)}°
          </text>
          {Math.abs(fx) > maxN * 0.04 && (
            <text x={r2((anker.x + eckeX.x) / 2)} y={r2(anker.y + 13)} textAnchor="middle" fontSize={10} className="fill-[color:var(--ink-2)]">
              Fx {fmt(fx)} N
            </text>
          )}
          {Math.abs(fy) > maxN * 0.04 && (
            <text
              x={r2(eckeX.x + (fy >= 0 ? 6 : 6))}
              y={r2((eckeX.y + tip.y) / 2)}
              fontSize={10}
              className="fill-[color:var(--ink-2)]"
            >
              Fy {fmt(fy)} N
            </text>
          )}
        </g>
      </svg>

      {/* Live-Ablesung (aus der Engine) */}
      <p className="mt-3 flex flex-wrap items-baseline gap-x-5 gap-y-1 font-mono text-sm" aria-live="polite">
        <span>
          F = <span className="text-lg text-accent-ink">{fmt(kraftAnzeige)} N</span>
        </span>
        <span>
          φ = <span className="text-accent-ink">{fmt(richtung, 0)}°</span>
        </span>
        <span>
          Fx = <span className="text-accent-ink">{fmt(fx)} N</span>
        </span>
        <span>
          Fy = <span className="text-accent-ink">{fmt(fy)} N</span>
        </span>
        <span className="text-xs text-ink-faint">aus der Engine</span>
      </p>

      {/* Fallback-Regler: dieselbe State-Quelle wie der Drag */}
      <div className="mt-4 flex flex-col gap-4">
        <Slider label="Betrag" symbol="F" value={kraft} min={0} max={maxN} step={1} unit="N" onChange={setKraft} />
        <Slider label="Richtung" symbol="φ" value={richtung} min={0} max={360} step={5} unit="°" onChange={(v) => setRichtung(((v % 360) + 360) % 360)} />
      </div>

      {caption && <figcaption className="mt-3 text-sm text-ink-2">{caption}</figcaption>}
    </figure>
  );
}
