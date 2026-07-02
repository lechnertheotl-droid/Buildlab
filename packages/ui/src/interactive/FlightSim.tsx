// FlightSim — Flugbahn-Diagramm h(t) aus der RK4-Simulation der Engine
// (Registry: flight-sim). Kartesisches Diagramm im Millimeterpapier-Stil
// (DESIGN §3): Raster, Maßlinien, Mono-Zahlen. Apogäum und v_max kommen aus
// packages/engine/simulateFlight — hier wird nur gezeichnet (Eiserne Regel 1).

import { useMemo, useState } from 'react';
import { simulateFlight, MOTORS } from '@buildlab/engine';
import { Slider } from '../Slider';

export interface FlightSimParams {
  /** Motor aus der Engine-Datenbank (MOTORS), z. B. "C6". */
  motorClass?: string;
  /** Leermasse der Rakete (Struktur + Ballast, ohne Motor) [g]. */
  massG?: number;
  massRange?: [number, number];
  /** Rohrdurchmesser [mm] — bestimmt die Stirnfläche. */
  d?: number;
  /** Widerstandsbeiwert. */
  cw?: number;
  /** Ziellinie [m] — z. B. 100 für die Challenge. */
  showGoal?: number;
  /** Masse-Regler anzeigen? (Default: ja) */
  showMassSlider?: boolean;
}

const fmt = (n: number, digits = 0) =>
  new Intl.NumberFormat('de-DE', { maximumFractionDigits: digits }).format(n);

// Zeichenfläche
const W = 460;
const H = 250;
const M = { left: 46, right: 14, top: 18, bottom: 34 };

export function FlightSim({ params, caption }: { params: FlightSimParams; caption?: string }) {
  const motorClass = params.motorClass ?? 'C6';
  const d = params.d ?? 24;
  const cw = params.cw ?? 0.75;
  const [massG, setMassG] = useState(params.massG ?? 53);
  const [massMin, massMax] = params.massRange ?? [35, 150];
  const goal = params.showGoal;

  const motor = MOTORS[motorClass];
  const sim = useMemo(
    () => (motor ? simulateFlight({ motor: motorClass, massEmptyG: massG, d, cw }) : null),
    [motor, motorClass, massG, d, cw],
  );

  if (!motor || !sim) {
    return (
      <p className="rounded border border-viz-high/40 bg-paper-2 p-3 font-mono text-sm text-viz-high">
        Motor „{motorClass}" ist nicht in der Engine-Datenbank.
      </p>
    );
  }

  const tEnd = sim.trajectory[sim.trajectory.length - 1]?.t ?? 1;
  const hTop = Math.max(sim.apogee, goal ?? 0) * 1.12;
  const sx = (t: number) => M.left + (t / tEnd) * (W - M.left - M.right);
  const sy = (h: number) => H - M.bottom - (h / hTop) * (H - M.top - M.bottom);

  // Flugbahn dezimieren (~200 Punkte reichen fürs Diagramm).
  const schritt = Math.max(1, Math.floor(sim.trajectory.length / 200));
  const punkte = sim.trajectory
    .filter((_, i) => i % schritt === 0 || i === sim.trajectory.length - 1)
    .map((p) => `${sx(p.t).toFixed(1)},${sy(Math.max(p.h, 0)).toFixed(1)}`)
    .join(' ');

  // Achsen-Ticks: Zeit in ganzen Sekunden, Höhe in runden 50-m-Schritten.
  const tStep = tEnd > 20 ? 5 : tEnd > 8 ? 2 : 1;
  const tTicks = Array.from({ length: Math.floor(tEnd / tStep) + 1 }, (_, i) => i * tStep);
  const hStep = hTop > 400 ? 100 : 50;
  const hTicks = Array.from({ length: Math.floor(hTop / hStep) + 1 }, (_, i) => i * hStep);

  const zielErreicht = goal !== undefined ? sim.apogee >= goal : null;

  const label =
    `Flugbahn mit Motor ${motor.name}: Apogäum ${fmt(sim.apogee)} m nach ${fmt(sim.tApogee, 1)} s, ` +
    `Höchstgeschwindigkeit ${fmt(sim.vMax)} m/s` +
    (goal !== undefined ? ` — Ziel ${fmt(goal)} m ${zielErreicht ? 'erreicht' : 'verfehlt'}` : '');

  return (
    <div className="rounded border border-black/10 bg-paper-2 p-4 shadow">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={label} className="max-w-full">
        <desc>
          Diagramm der Flughöhe über der Zeit: steiler Anstieg während der Boost-Phase, Ausrollen
          bis zum Apogäum, danach Sinken. Der Masse-Regler verändert die Kurve.
        </desc>

        {/* Millimeterpapier: feines Raster über die Zeichenfläche */}
        {hTicks.map((h) => (
          <line key={`h${h}`} x1={M.left} y1={sy(h)} x2={W - M.right} y2={sy(h)} stroke="var(--ink)" strokeOpacity={0.08} />
        ))}
        {tTicks.map((t) => (
          <line key={`t${t}`} x1={sx(t)} y1={M.top} x2={sx(t)} y2={H - M.bottom} stroke="var(--ink)" strokeOpacity={0.08} />
        ))}

        {/* Achsen + Mono-Beschriftung */}
        <line x1={M.left} y1={M.top} x2={M.left} y2={H - M.bottom} stroke="var(--ink)" strokeOpacity={0.45} />
        <line x1={M.left} y1={H - M.bottom} x2={W - M.right} y2={H - M.bottom} stroke="var(--ink)" strokeOpacity={0.45} />
        {hTicks.map((h) => (
          <text key={`hl${h}`} x={M.left - 6} y={sy(h) + 3} textAnchor="end" fontSize="9" className="fill-[color:var(--ink-faint)] font-mono">
            {fmt(h)}
          </text>
        ))}
        {tTicks.map((t) => (
          <text key={`tl${t}`} x={sx(t)} y={H - M.bottom + 12} textAnchor="middle" fontSize="9" className="fill-[color:var(--ink-faint)] font-mono">
            {fmt(t)}
          </text>
        ))}
        <text x={M.left - 34} y={M.top + 8} fontSize="9" className="fill-[color:var(--ink-faint)] font-mono">
          h [m]
        </text>
        <text x={W - M.right} y={H - 6} textAnchor="end" fontSize="9" className="fill-[color:var(--ink-faint)] font-mono">
          t [s]
        </text>

        {/* Ziellinie (Challenge) */}
        {goal !== undefined && (
          <g>
            <line x1={M.left} y1={sy(goal)} x2={W - M.right} y2={sy(goal)} stroke={zielErreicht ? 'var(--ok)' : 'var(--fehl)'} strokeDasharray="5 4" strokeWidth={1.2} />
            <text x={W - M.right - 4} y={sy(goal) - 4} textAnchor="end" fontSize="10" className={`font-mono ${zielErreicht ? 'fill-[color:var(--ok)]' : 'fill-[color:var(--fehl)]'}`}>
              {zielErreicht ? '✓' : '✗'} Ziel {fmt(goal)} m
            </text>
          </g>
        )}

        {/* Flugphasen: Brennschluss-Marke + Beschriftung Boost/Coast/Sinken */}
        <line x1={sx(sim.tBurnout)} y1={M.top} x2={sx(sim.tBurnout)} y2={H - M.bottom} stroke="var(--ink)" strokeOpacity={0.3} strokeDasharray="3 3" />
        <text x={(M.left + sx(sim.tBurnout)) / 2} y={M.top + 9} textAnchor="middle" fontSize="9" className="fill-[color:var(--ink-faint)] font-mono">
          Boost
        </text>
        <text x={(sx(sim.tBurnout) + sx(sim.tApogee)) / 2} y={M.top + 9} textAnchor="middle" fontSize="9" className="fill-[color:var(--ink-faint)] font-mono">
          Coast
        </text>
        <text x={(sx(sim.tApogee) + (W - M.right)) / 2} y={M.top + 9} textAnchor="middle" fontSize="9" className="fill-[color:var(--ink-faint)] font-mono">
          Sinken
        </text>

        {/* Die Flugbahn selbst */}
        <polyline points={punkte} fill="none" stroke="var(--accent)" strokeWidth={1.8} />

        {/* Apogäum-Marker mit Maßlinie */}
        <circle cx={sx(sim.tApogee)} cy={sy(sim.apogee)} r={3.5} fill="var(--accent)" stroke="var(--paper)" strokeWidth={1.2} />
        <text x={sx(sim.tApogee)} y={sy(sim.apogee) - 8} textAnchor="middle" fontSize="10" className="fill-[color:var(--accent-ink)] font-mono">
          Apogäum {fmt(sim.apogee)} m
        </text>
      </svg>

      {(params.showMassSlider ?? true) && (
        <div className="mt-3">
          <Slider label="Leermasse (ohne Motor)" symbol="m" value={massG} min={massMin} max={massMax} step={1} unit="g" onChange={setMassG} />
        </div>
      )}

      <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 border-t border-black/10 pt-3 font-mono text-sm" aria-live="polite">
        <span>
          Apogäum = <span className="text-accent-ink">{fmt(sim.apogee)} m</span>
        </span>
        <span>
          v_max = <span className="text-accent-ink">{fmt(sim.vMax)} m/s</span>
        </span>
        <span>
          Brennschluss = <span className="text-accent-ink">{fmt(sim.tBurnout, 2)} s</span>
        </span>
        <span className="text-xs text-ink-faint">aus der Engine (RK4)</span>
      </p>
      {caption && <p className="mt-2 text-sm text-ink-2">{caption}</p>}
    </div>
  );
}
