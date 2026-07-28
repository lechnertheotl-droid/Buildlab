// ForceBalance — Kräfte addieren bis Gleichgewicht (Registry: force-balance).
//
// Eine Kiste auf der IsoStage, an der entlang der Welt-x-Achse mehrere Kräfte
// angreifen: feste Kräfte aus params.forces plus eine Stellkraft F3 (Slider,
// ganzzahlig). Die Engine liefert ΣF über die Formel sum_f (Eiserne Regel 1);
// useEngineValue publiziert {F1,F2,F3} für Rechner und target-Aufgaben.
// Solange ΣF ≠ 0, kriecht die Kiste sichtbar in Richtung der Resultierenden
// (rAF, reduced-motion: statischer Versatz); bei |ΣF| ≤ tolerance kommt sie
// zur Ruhe und eine Quittungszeile erscheint einmalig (Motion „quittung").

import { useEffect, useRef, useState } from 'react';
import { project, type Vec3 } from '@buildlab/iso';
import { Slider } from '../Slider';
import { IsoStage, ampelColor, isoBox, isoContactShadow, useEngineValue } from '../iso-scene';
import { reducedMotionActive } from '../primitives/motion';

export interface ForceBalanceParams {
  /** Feste Kräfte in N (Vorzeichen = Richtung entlang der x-Achse). */
  forces?: { label: string; value: number }[];
  /** |ΣF| ≤ tolerance gilt als Gleichgewicht (N). */
  tolerance?: number;
  /** Slider-Bereich der Stellkraft F3. */
  range?: [number, number];
  /** Startwert der Stellkraft F3. */
  init?: number;
}

const fmt = (n: number, digits = 1) =>
  new Intl.NumberFormat('de-DE', { maximumFractionDigits: digits }).format(n);

const r2 = (n: number) => Math.round(n * 100) / 100;

const BOX_SIZE = { x: 46, y: 46, z: 32 };
const BOX_COLOR = '#a98e6f';
// Kriech-Geschwindigkeit: px pro Sekunde bei ΣF = 1 N; Auslauf-Grenze.
const DRIFT_GAIN = 1.6;
const DRIFT_MAX = 46;

/** Waagerechter Kraftpfeil entlang der Welt-x-Achse (geschlossene Silhouette). */
function xArrow(at: Vec3, forceN: number, pxPerN: number, frac: number, key: string) {
  const from = project(at);
  const len = Math.max(14, Math.abs(forceN) * pxPerN);
  const dir = Math.sign(forceN) || 1;
  // Richtung der Welt-x-Achse in Bildkoordinaten.
  const ax = project({ x: dir, y: 0, z: 0 });
  const a0 = project({ x: 0, y: 0, z: 0 });
  const n = Math.hypot(ax.x - a0.x, ax.y - a0.y) || 1;
  const ux = (ax.x - a0.x) / n;
  const uy = (ax.y - a0.y) / n;
  const nx = -uy;
  const ny = ux;
  const headLen = 12;
  const headHalf = 7;
  const shaftHalf = 2.2;
  const tip = { x: from.x + ux * len, y: from.y + uy * len };
  const base = { x: tip.x - ux * headLen, y: tip.y - uy * headLen };
  const pts = [
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
  return (
    <polygon key={key} points={pts} fill={ampelColor(frac)} stroke="var(--ink)" strokeWidth={1.3} strokeLinejoin="round" />
  );
}

export function ForceBalance({ params, caption }: { params: ForceBalanceParams; caption?: string }) {
  const feste = params.forces ?? [
    { label: 'Seilzug', value: 30 },
    { label: 'Wind', value: 19 },
  ];
  const f1 = feste[0]?.value ?? 0;
  const f2 = feste[1]?.value ?? 0;
  const tolerance = params.tolerance ?? 0.5;
  const [minF, maxF] = params.range ?? [-60, 0];
  const [f3, setF3] = useState(() => Math.round(params.init ?? (minF + maxF) / 2));

  // Eiserne Regel 1: ΣF kommt aus der Engine (Formel sum_f); publiziert
  // {F1,F2,F3} als canvasInputs für die target-Aufgabe.
  const summe = useEngineValue('sum_f', { F1: f1, F2: f2, F3: f3 }, 'Kräftesumme');
  const sigma = summe.value ?? 0;
  const imGleichgewicht = Math.abs(sigma) <= tolerance;

  const maxAbs = Math.max(Math.abs(f1) + Math.abs(f2) + Math.max(Math.abs(minF), Math.abs(maxF)), 1);
  const resFrac = Math.min(1, Math.abs(sigma) / (maxAbs / 2));

  // Kriechen: die Kiste driftet mit v ∝ ΣF; im Gleichgewicht federt sie zurück.
  const boxRef = useRef<SVGGElement | null>(null);
  const drift = useRef(0);
  useEffect(() => {
    const ziel = imGleichgewicht ? 0 : null;
    if (reducedMotionActive()) {
      // Reduzierte Bewegung: statischer Versatz statt Drift.
      drift.current = ziel === 0 ? 0 : Math.max(-DRIFT_MAX, Math.min(DRIFT_MAX, sigma * 2));
      boxRef.current?.setAttribute('transform', `translate(${r2(drift.current)} 0)`);
      return;
    }
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (ziel === 0) {
        // Zur Ruhe federn (kritisch gedämpft genug für eine ruhige Quittung).
        drift.current += (0 - drift.current) * Math.min(1, dt * 6);
        if (Math.abs(drift.current) < 0.2) drift.current = 0;
      } else {
        drift.current = Math.max(-DRIFT_MAX, Math.min(DRIFT_MAX, drift.current + sigma * DRIFT_GAIN * dt));
      }
      boxRef.current?.setAttribute('transform', `translate(${r2(drift.current)} 0)`);
      if (ziel === 0 && drift.current === 0) return; // Ruhe erreicht — Loop endet
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const onVis = () => {
      last = performance.now();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [sigma, imGleichgewicht]);

  const pxPerN = 90 / maxAbs; // Pfeilmaßstab
  const zMitte = BOX_SIZE.z / 2;
  const resAnker = project({ x: 0, y: 0, z: BOX_SIZE.z + 26 });

  const label =
    `Kräfte an der Kiste: ${feste.map((f) => `${f.label} ${fmt(f.value)} Newton`).join(', ')}, ` +
    `Stellkraft ${fmt(f3)} Newton — Kräftesumme ${fmt(sigma)} Newton, ` +
    (imGleichgewicht ? 'Gleichgewicht: die Kiste ruht.' : 'kein Gleichgewicht: die Kiste kriecht.');

  return (
    <figure className="rounded border border-black/10 bg-paper-2 p-4 shadow">
      <IsoStage
        label={label}
        desc="Eine Kiste auf isometrischem Boden; waagerechte Ampel-Pfeile zeigen die angreifenden Kräfte, ein Pfeil über der Kiste die Resultierende. Ist die Summe null, kommt die Kiste zur Ruhe."
      >
        {/* Kiste + feste Kräfte + Stellkraft driften gemeinsam */}
        <g ref={boxRef}>
          {isoContactShadow({ x: 0, y: 0, z: 0 }, 46)}
          {isoBox({ at: { x: -BOX_SIZE.x / 2, y: -BOX_SIZE.y / 2, z: 0 }, size: BOX_SIZE, color: BOX_COLOR })}

          {/* Feste Kräfte greifen an der Kiste an (Fußpunkt je Seite) */}
          {feste.slice(0, 2).map((f, i) =>
            xArrow(
              { x: (Math.sign(f.value) || 1) * (BOX_SIZE.x / 2), y: i === 0 ? -10 : 10, z: zMitte },
              f.value,
              pxPerN,
              Math.min(1, Math.abs(f.value) / maxAbs),
              `fest${i}`,
            ),
          )}
          {/* Die Stellkraft F3 (vom Lernenden geregelt) */}
          {f3 !== 0 &&
            xArrow(
              { x: (Math.sign(f3) || 1) * (BOX_SIZE.x / 2), y: 0, z: zMitte + 12 },
              f3,
              pxPerN,
              Math.min(1, Math.abs(f3) / maxAbs),
              'stell',
            )}

          {/* Mess-Tags an den Kräften */}
          <g pointerEvents="none" className="font-mono">
            {feste.slice(0, 2).map((f, i) => {
              const p = project({ x: (Math.sign(f.value) || 1) * (BOX_SIZE.x / 2 + 30), y: i === 0 ? -10 : 10, z: zMitte });
              return (
                <text key={`t${i}`} x={r2(p.x)} y={r2(p.y - 8)} textAnchor="middle" fontSize={10} className="fill-[color:var(--ink-2)]">
                  {f.label} {fmt(f.value)} N
                </text>
              );
            })}
            {(() => {
              const p = project({ x: (Math.sign(f3) || 1) * (BOX_SIZE.x / 2 + 30), y: 0, z: zMitte + 12 });
              return (
                <text x={r2(p.x)} y={r2(p.y - 8)} textAnchor="middle" fontSize={10} className="fill-[color:var(--accent-ink)]">
                  F₃ {fmt(f3)} N
                </text>
              );
            })()}
          </g>

          {/* Resultierende über der Kiste: schrumpft sichtbar gegen 0 */}
          {!imGleichgewicht &&
            xArrow({ x: 0, y: 0, z: BOX_SIZE.z + 26 }, sigma, pxPerN * 1.4, resFrac, 'res')}
          {!imGleichgewicht && (
            <text
              x={r2(resAnker.x)}
              y={r2(resAnker.y - 12)}
              textAnchor="middle"
              fontSize={10}
              className="fill-[color:var(--ink-2)] font-mono"
              pointerEvents="none"
            >
              ΣF = {fmt(sigma)} N
            </text>
          )}
        </g>
      </IsoStage>

      {/* Live-Ergebnis + Quittung */}
      <p className="mt-3 flex flex-wrap items-baseline gap-x-5 gap-y-1 font-mono text-sm" aria-live="polite">
        <span>
          ΣF ={' '}
          <span className="text-lg" style={{ color: imGleichgewicht ? 'var(--ok)' : 'var(--accent-ink)' }}>
            {fmt(sigma)} {summe.unit || 'N'}
          </span>
        </span>
        {imGleichgewicht && (
          <span className="bl-quittung" style={{ color: 'var(--ok)' }}>
            ✓ Gleichgewicht — nichts bewegt sich
          </span>
        )}
        <span className="text-xs text-ink-faint">aus der Engine</span>
      </p>

      <div className="mt-4">
        <Slider label="Stellkraft" symbol="F₃" value={f3} min={minF} max={maxF} step={1} unit="N" onChange={(v) => setF3(Math.round(v))} />
      </div>

      {caption && <figcaption className="mt-3 text-sm text-ink-2">{caption}</figcaption>}
    </figure>
  );
}
