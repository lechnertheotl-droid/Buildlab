// PulleySystem — 2.5D-Flaschenzug auf der IsoStage (Registry: pulley-system).
//
// Gestell (isoBox-Pfosten + Balken), 1–6 tragende Seilstränge: feste Rollen
// hängen am Balken, lose Rollen im Unterkloben an der Last. Das Seil ist eine
// projizierte Polyline, die sich beim Ändern von n sichtbar neu fädelt.
// Eiserne Regel 1: die Zugkraft F = G/n kommt aus packages/engine
// (Formel `pulley_force`); useEngineValue publiziert {G, n} für Rechner
// und target-Aufgaben. A11y nach DESIGN.md §7 (role=img, Live-Werte,
// natives Range-Input über die Slider-Komponente).

import { useEffect, useState } from 'react';
import { project, shade, type Vec3 } from '@buildlab/iso';
import { Slider } from '../Slider';
import { AmpelArrow, IsoStage, isoBox, useEngineValue } from '../iso-scene';
import { reducedMotionActive } from '../primitives/motion';

export interface PulleySystemParams {
  /** Gewichtskraft der Last in N. */
  G?: number;
  /** Startwert der tragenden Seilstränge. */
  n?: number;
  nRange?: [number, number];
  /** Beschriftung der Last (z. B. "2 kg"). */
  massLabel?: string;
}

const fmt = (n: number, digits = 3) =>
  new Intl.NumberFormat('de-DE', { maximumFractionDigits: digits }).format(n);

const r2 = (n: number) => Math.round(n * 100) / 100;

// ── Welt-Konstanten (x-z-Ebene, y = Tiefe) ───────────────────────────────────
const FRAME_COLOR = '#a9a294';
const LOAD_COLOR = '#a98e6f';
const PULLEY_COLOR = '#9a9489';
const S = 16; // Strang-Abstand
const R = 8; // Rollenradius = S/2 → Halbkreis verbindet Nachbarstränge
const Z_BEAM = 120; // Balken-Unterkante
const Z_TOP = 108; // Achsen der festen Rollen
const HAND_Z = 34; // Seilende (Zugpunkt)

/** Kreis in der x-z-Ebene (Tiefe y) als projizierter Polygon-String. */
function discPoints(cx: number, cz: number, y: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * 2 * Math.PI;
    const p = project({ x: cx + r * Math.cos(a), y, z: cz + r * Math.sin(a) });
    pts.push(`${p.x.toFixed(2)},${p.y.toFixed(2)}`);
  }
  return pts.join(' ');
}

function Pulley({ cx, cz }: { cx: number; cz: number }) {
  return (
    <g>
      {/* Scheibe mit Tiefe: hintere Lage dunkler, vordere heller, Nabe als Punkt */}
      <polygon points={discPoints(cx, cz, 4, R)} fill={shade(PULLEY_COLOR, -0.22)} stroke="var(--ink)" strokeOpacity={0.3} strokeWidth={0.6} />
      <polygon points={discPoints(cx, cz, -4, R)} fill={shade(PULLEY_COLOR, 0.18)} stroke="var(--ink)" strokeOpacity={0.4} strokeWidth={0.7} />
      <polygon points={discPoints(cx, cz, -4, R * 0.3)} fill="var(--paper-sink)" stroke="var(--ink)" strokeOpacity={0.3} strokeWidth={0.5} />
    </g>
  );
}

/**
 * Seilführung als Weltpunkte: Anker (unten bei ungeradem n, oben bei geradem),
 * dann abwechselnd unter lose / über feste Rollen, zuletzt über die
 * Zug-Umlenkrolle nach unten zur Hand. Liefert auch die Rollen-Positionen.
 */
function buildRope(n: number, zBot: number) {
  const xs = (k: number) => (k - (n - 1) / 2) * S;
  const rope: Vec3[] = [];
  const tops: number[] = [];
  const bots: number[] = [];

  const arcTop = (cx: number) => {
    tops.push(cx);
    for (let i = 0; i <= 12; i++) {
      const a = Math.PI - (i / 12) * Math.PI; // von links über den Scheitel nach rechts
      rope.push({ x: cx + R * Math.cos(a), y: 0, z: Z_TOP + R * Math.sin(a) });
    }
  };
  const arcBot = (cx: number) => {
    bots.push(cx);
    for (let i = 0; i <= 12; i++) {
      const a = Math.PI + (i / 12) * Math.PI; // von links unter der Rolle durch
      rope.push({ x: cx + R * Math.cos(a), y: 0, z: zBot + R * Math.sin(a) });
    }
  };

  const anchorBottom = n % 2 === 1;
  rope.push({ x: xs(0), y: 0, z: anchorBottom ? zBot : Z_BEAM });
  let nextTop = anchorBottom;
  for (let k = 0; k < n - 1; k++) {
    const cx = (xs(k) + xs(k + 1)) / 2;
    if (nextTop) arcTop(cx);
    else arcBot(cx);
    nextTop = !nextTop;
  }
  arcTop(xs(n - 1) + R); // Zug-Umlenkung, immer oben
  const pullX = xs(n - 1) + 2 * R;
  rope.push({ x: pullX, y: 0, z: HAND_Z });

  const anchor = rope[0];
  const attachXs = anchorBottom ? [anchor.x, ...bots] : bots.length ? bots : [xs(0)];
  const loadCx = (Math.min(...attachXs) + Math.max(...attachXs)) / 2;
  return { rope, tops, bots, pullX, anchor, anchorBottom, loadCx };
}

export function PulleySystem({ params, caption }: { params: PulleySystemParams; caption?: string }) {
  const G = params.G ?? 19.62;
  const [nMin, nMax] = params.nRange ?? [1, 6];
  const [n, setN] = useState(() => Math.min(nMax, Math.max(nMin, params.n ?? 2)));

  // Engine-Wert (Eiserne Regel 1) + Publikation für Rechner/target-Aufgaben.
  const f = useEngineValue('pulley_force', { G, n }, 'Flaschenzug');

  // Dezente Hub-Animation: die Last atmet leicht (reduced-motion-fähig).
  const [lift, setLift] = useState(0);
  useEffect(() => {
    if (reducedMotionActive()) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      setLift(2.5 + 2.5 * Math.sin(((now - t0) / 1000) * 1.1));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const zBot = 48 + lift; // Achsen der losen Rollen / Anbindung an die Last
  const { rope, tops, bots, pullX, anchor, loadCx } = buildRope(n, zBot);
  const ropePts = rope.map((p) => project(p)).map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');

  // Last + Haken unter dem Unterkloben.
  const loadW = 36;
  const loadTopZ = zBot - 16;
  const hookTop = project({ x: loadCx, y: 0, z: zBot - 8 });
  const hookBot = project({ x: loadCx, y: 0, z: loadTopZ });
  const loadFront = project({ x: loadCx, y: 0, z: loadTopZ - 11 });
  const loadShadow = project({ x: loadCx, y: 0, z: 0 });

  // Zugkraft-Pfeil (Ampel nach Kraftanteil, DESIGN.md §6): zieht am Seilende
  // nach unten — die AmpelArrow-Primitive zeigt nach unten, hier gespiegelt.
  const frac = Math.min(1, (f.value ?? G) / G);
  const hand = project({ x: pullX, y: 0, z: HAND_Z });
  const aLen = 14 + 26 * frac;
  const tipY = hand.y + aLen;

  // Achsaufhängungen der festen Rollen (Laschen am Balken).
  const brackets = tops.map((cx) => ({
    a: project({ x: cx, y: 0, z: Z_BEAM }),
    b: project({ x: cx, y: 0, z: Z_TOP }),
  }));
  const anchorPt = project(anchor);

  const label = `Flaschenzug: ${n} tragende Seilstränge, Last ${fmt(G)} Newton, Zugkraft ${f.value === null ? 'unbestimmt' : fmt(f.value)} Newton`;

  return (
    <div className="rounded border border-black/10 bg-paper-2 p-4 shadow">
      <IsoStage
        label={label}
        desc="Ein Flaschenzug an einem Gestell: Seil über Rollen, Last am Haken; der Ampel-Pfeil am Seilende zeigt die nötige Zugkraft."
        height={320}
        origin={{ x: 230, y: 196 }}
        floor={110}
      >
        {/* weicher Schatten unter der Last */}
        <ellipse cx={r2(loadShadow.x)} cy={r2(loadShadow.y)} rx={34} ry={12} fill="var(--ink)" opacity={0.12} filter="url(#iso-soft)" />

        {/* Gestell: zwei Pfosten + Balken (plastische isoBoxen) */}
        {isoBox({ at: { x: -100, y: -7, z: 0 }, size: { x: 12, y: 14, z: Z_BEAM }, color: FRAME_COLOR })}
        {isoBox({ at: { x: 88, y: -7, z: 0 }, size: { x: 12, y: 14, z: Z_BEAM }, color: FRAME_COLOR })}
        {isoBox({ at: { x: -106, y: -8, z: Z_BEAM }, size: { x: 212, y: 16, z: 12 }, color: FRAME_COLOR })}

        {/* Laschen der festen Rollen */}
        {brackets.map((b, i) => (
          <line key={`br${i}`} x1={r2(b.a.x)} y1={r2(b.a.y)} x2={r2(b.b.x)} y2={r2(b.b.y)} stroke="var(--ink)" strokeOpacity={0.45} strokeWidth={2} />
        ))}

        {/* feste Rollen oben, lose Rollen im Unterkloben */}
        {tops.map((cx, i) => (
          <Pulley key={`t${i}`} cx={cx} cz={Z_TOP} />
        ))}
        {bots.map((cx, i) => (
          <Pulley key={`b${i}`} cx={cx} cz={zBot} />
        ))}

        {/* das Seil: eine Polyline über alle Rollen — fädelt sich mit n neu */}
        <polyline points={ropePts} fill="none" stroke="var(--ink)" strokeOpacity={0.7} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />
        {/* Anker-Knoten */}
        <circle cx={r2(anchorPt.x)} cy={r2(anchorPt.y)} r={2.6} fill="var(--ink)" fillOpacity={0.75} />

        {/* Haken + hängende Last mit Masse-Beschriftung */}
        <line x1={r2(hookTop.x)} y1={r2(hookTop.y)} x2={r2(hookBot.x)} y2={r2(hookBot.y)} stroke="var(--ink)" strokeOpacity={0.55} strokeWidth={2} />
        {isoBox({ at: { x: loadCx - loadW / 2, y: -13, z: loadTopZ - 22 }, size: { x: loadW, y: 26, z: 22 }, color: LOAD_COLOR })}
        <text x={r2(loadFront.x)} y={r2(loadFront.y)} textAnchor="middle" fontSize="11" className="fill-[color:var(--paper)] font-mono" pointerEvents="none">
          {params.massLabel ?? `${fmt(G)} N`}
        </text>
        <text x={r2(loadShadow.x)} y={r2(loadShadow.y) + 22} textAnchor="middle" fontSize="10" className="fill-ink-2 font-mono">
          G = {fmt(G)} N
        </text>

        {/* Zugkraft als Ampel-Pfeil am Seilende (an der Hand-Höhe gespiegelt,
            weil die Zugrichtung nach unten zeigt). */}
        <g transform={`translate(0 ${r2(hand.y + tipY)}) scale(1 -1)`}>
          <AmpelArrow tip={{ x: hand.x, y: tipY }} length={aLen} frac={frac} shaftHalf={2} headHalf={7} headLen={11} />
        </g>
        <text x={r2(hand.x)} y={r2(hand.y) - 8} textAnchor="middle" fontSize="11" className="fill-[color:var(--accent-ink)] font-mono">
          F = {f.value === null ? '—' : fmt(f.value)} N
        </text>
      </IsoStage>

      <div className="mt-3">
        <Slider
          label="Tragende Seilstränge"
          symbol="n"
          value={n}
          min={nMin}
          max={nMax}
          step={1}
          ticks={nMax - nMin}
          onChange={(v) => setN(Math.round(v))}
        />
      </div>

      <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 border-t border-black/10 pt-3 font-mono text-sm" aria-live="polite">
        <span>n = <span className="text-accent-ink">{n}</span></span>
        <span>G = <span className="text-accent-ink">{fmt(G)} N</span></span>
        <span>
          F = <span className="text-accent-ink">{f.value === null ? '—' : fmt(f.value)} N</span>
          <span className="ml-1 text-xs text-ink-faint">aus der Engine</span>
        </span>
      </p>
      {caption && <p className="mt-2 text-sm text-ink-2">{caption}</p>}
    </div>
  );
}
