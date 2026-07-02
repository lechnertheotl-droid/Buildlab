// RocketStability — Raketen-Seitenriss mit Schwerpunkt (CG), Druckpunkt (CP)
// und Stabilitätsmaß (Registry: rocket-stability). Das Massenmodell und der
// Barrowman-Druckpunkt kommen aus packages/engine (computeRocket); angezeigt
// werden die Formelwerte rocket_cg / rocket_cp / stability (Eiserne Regel 1).
// Publiziert die vier Massenpaare für Rechner & target-Aufgaben (rocket_cg).

import { useMemo, useState } from 'react';
import { computeRocket, evaluateById } from '@buildlab/engine';
import { shade } from '@buildlab/iso';
import { Slider } from '../Slider';
import { useContent } from '../content-context';
import { useEngineValue } from '../iso-scene';

export interface RocketStabilityParams {
  d?: number;
  tubeLen?: number;
  noseLen?: number;
  finRoot?: number;
  finTip?: number;
  finSpan?: number;
  finCount?: number;
  /** Ballast (Knete) in der Nase [g]. */
  ballast?: number;
  /** Nur diese Regler zeigen — der Schritt stellt SEINE Stellgrößen frei. */
  show?: ('ballast' | 'finRoot' | 'finTip' | 'finSpan' | 'finCount')[];
  /** Diesen Wert betonen (Akzent auf Marker + Ergebniszeile). */
  highlight?: 'cg' | 'cp' | 's';
  /** Ziel-Marke für den Schwerpunkt [mm ab Spitze] — für target-Aufgaben. */
  goalX?: number;
  ballastRange?: [number, number];
  finRootRange?: [number, number];
  finTipRange?: [number, number];
  finSpanRange?: [number, number];
  finCountRange?: [number, number];
}

const fmt = (n: number, digits = 1) =>
  new Intl.NumberFormat('de-DE', { maximumFractionDigits: digits }).format(n);

const RUMPF = '#a9a294'; // gedecktes Beige-Grau wie die Zahnräder

export function RocketStability({ params, caption }: { params: RocketStabilityParams; caption?: string }) {
  const { formulas } = useContent();
  const list = useMemo(() => [...formulas.values()], [formulas]);

  const d = params.d ?? 24;
  const tubeLen = params.tubeLen ?? 220;
  const noseLen = params.noseLen ?? 80;
  const [finRoot, setFinRoot] = useState(params.finRoot ?? 60);
  const [finTip, setFinTip] = useState(params.finTip ?? 30);
  const [finSpan, setFinSpan] = useState(params.finSpan ?? 40);
  const [finCount, setFinCount] = useState(params.finCount ?? 4);
  const [ballast, setBallast] = useState(params.ballast ?? 0);
  const show = params.show ?? ['ballast'];
  const hl = params.highlight;

  // Massenmodell aus der Engine; die vier Massenpaare sind exakt die Variablen
  // der Formel rocket_cg — useEngineValue publiziert sie für die target-Aufgabe.
  const rocket = useMemo(
    () => computeRocket({ d, tubeLen, noseLen, finRoot, finTip, finSpan, finCount, ballast }),
    [d, tubeLen, noseLen, finRoot, finTip, finSpan, finCount, ballast],
  );
  const cg = useEngineValue('rocket_cg', { ...rocket.masses } as Record<string, number>, 'Schwerpunkt');

  const safe = (id: string, inputs: Record<string, number>) => {
    try {
      return evaluateById(list, id, inputs).value;
    } catch {
      return null;
    }
  };
  const cp = safe('rocket_cp', { d, noseLen, tubeLen, finRoot, finTip, finSpan, finCount });
  const s =
    cg.value !== null && cp !== null ? safe('stability', { xcp: cp, xcg: cg.value, d }) : null;

  // Stabilitäts-Ampel: nie nur Farbe — immer Symbol + Wort (DESIGN §5).
  const urteil =
    s === null
      ? { klasse: 'text-ink-faint', wort: '—', zeichen: '·' }
      : s < 1
        ? { klasse: 'text-fehl', wort: 'kippelig', zeichen: '✗' }
        : s <= 2
          ? { klasse: 'text-ok', wort: 'stabil', zeichen: '✓' }
          : { klasse: 'text-warn', wort: 'überstabil', zeichen: '⚠' };

  // Seitenriss-Geometrie: Spitze links, Maße in mm → Bildmaß über k.
  const W = 460;
  const H = 190;
  const L = noseLen + tubeLen;
  const k = 380 / (L + 10);
  const x0 = 40;
  const yAxis = 78;
  const rPx = (d / 2) * k;
  const px = (mm: number) => x0 + mm * k;
  const finBase = yAxis + rPx;
  const finAussen = finBase + finSpan * k;

  const label =
    `Rakete im Seitenriss: Schwerpunkt ${cg.value === null ? '—' : fmt(cg.value, 0)} mm, ` +
    `Druckpunkt ${cp === null ? '—' : fmt(cp, 0)} mm, ` +
    `Stabilität ${s === null ? '—' : fmt(s, 2)} Kaliber — ${urteil.wort}`;

  return (
    <div className="rounded border border-black/10 bg-paper-2 p-4 shadow">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={label} className="max-w-full">
        <desc>
          Seitenriss einer Modellrakete mit Spitze links: Markierungen zeigen Schwerpunkt (CG) und
          Druckpunkt (CP); die Regler verschieben beide. Stabil ist die Rakete, wenn der Druckpunkt
          1 bis 2 Kaliber hinter dem Schwerpunkt liegt.
        </desc>
        <defs>
          {/* zylindrischer Verlauf: oben hell, unten dunkler (DESIGN §6) */}
          <linearGradient id="rakete-rumpf" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={shade(RUMPF, 0.22)} />
            <stop offset="0.45" stopColor={RUMPF} />
            <stop offset="1" stopColor={shade(RUMPF, -0.22)} />
          </linearGradient>
        </defs>

        {/* Kaliber-Lineal unter der Rakete (Tick-Motiv, alle 2 Kaliber beschriftet) */}
        {Array.from({ length: Math.floor(L / d) + 1 }, (_, i) => (
          <g key={i}>
            <line
              x1={px(i * d)}
              y1={H - 26}
              x2={px(i * d)}
              y2={H - 26 + (i % 2 === 0 ? 7 : 4)}
              stroke="var(--ink)"
              strokeOpacity={0.3}
            />
            {i % 2 === 0 && (
              <text x={px(i * d)} y={H - 8} textAnchor="middle" fontSize="9" className="fill-[color:var(--ink-faint)] font-mono">
                {i}
              </text>
            )}
          </g>
        ))}
        <text x={x0} y={H - 8} fontSize="9" textAnchor="end" className="fill-[color:var(--ink-faint)] font-mono">
          Kaliber
        </text>

        {/* hintere + vordere Finne (Seitenriss: eine oben, eine unten) */}
        {[1, -1].map((dir) => {
          const yWurzel = dir === 1 ? finBase : yAxis - rPx;
          const yTip = dir === 1 ? finAussen : yAxis - rPx - finSpan * k;
          return (
            <polygon
              key={dir}
              points={`${px(L - finRoot)},${yWurzel} ${px(L)},${yWurzel} ${px(L)},${yTip} ${px(L - finTip)},${yTip}`}
              fill={shade(RUMPF, dir === 1 ? -0.3 : -0.08)}
              stroke="var(--ink)"
              strokeOpacity={0.35}
              strokeWidth={0.8}
            />
          );
        })}

        {/* Rumpfrohr + Kegelnase */}
        <rect x={px(noseLen)} y={yAxis - rPx} width={tubeLen * k} height={2 * rPx} fill="url(#rakete-rumpf)" stroke="var(--ink)" strokeOpacity={0.35} strokeWidth={0.8} />
        <polygon
          points={`${px(0)},${yAxis} ${px(noseLen)},${yAxis - rPx} ${px(noseLen)},${yAxis + rPx}`}
          fill="url(#rakete-rumpf)"
          stroke="var(--ink)"
          strokeOpacity={0.35}
          strokeWidth={0.8}
        />
        {/* Glanzkante entlang der Oberseite */}
        <line x1={px(2)} y1={yAxis - rPx * 0.55} x2={px(L - 2)} y2={yAxis - rPx * 0.55} stroke="#fff" strokeOpacity={0.35} strokeWidth={1.2} />

        {/* Ziel-Marke für die target-Aufgabe */}
        {params.goalX !== undefined && (
          <g>
            <line x1={px(params.goalX)} y1={yAxis - rPx - 26} x2={px(params.goalX)} y2={yAxis + rPx + 14} stroke="var(--ok)" strokeDasharray="4 3" strokeWidth={1.2} />
            <text x={px(params.goalX)} y={yAxis - rPx - 30} textAnchor="middle" fontSize="10" className="fill-[color:var(--ok)] font-mono">
              Ziel {fmt(params.goalX, 0)} mm
            </text>
          </g>
        )}

        {/* CG-Marker (⊕) auf der Achse */}
        {cg.value !== null && (
          <g transform={`translate(${px(cg.value)} ${yAxis})`}>
            <circle r={7} fill="var(--paper)" stroke={hl === 'cg' ? 'var(--accent)' : 'var(--ink)'} strokeWidth={1.6} />
            <line x1={-7} y1={0} x2={7} y2={0} stroke={hl === 'cg' ? 'var(--accent)' : 'var(--ink)'} strokeWidth={1.2} />
            <line x1={0} y1={-7} x2={0} y2={7} stroke={hl === 'cg' ? 'var(--accent)' : 'var(--ink)'} strokeWidth={1.2} />
            <text y={-13} textAnchor="middle" fontSize="10" className="fill-[color:var(--ink)] font-mono">
              CG
            </text>
          </g>
        )}

        {/* CP-Marker (●) auf der Achse */}
        {cp !== null && (
          <g transform={`translate(${px(cp)} ${yAxis})`}>
            <circle r={5.5} fill={hl === 'cp' ? 'var(--accent)' : 'var(--ink-2)'} />
            <text y={22} textAnchor="middle" fontSize="10" className="fill-[color:var(--ink)] font-mono">
              CP
            </text>
          </g>
        )}
      </svg>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {show.includes('ballast') && (
          <Slider label="Ballast in der Nase" value={ballast} min={params.ballastRange?.[0] ?? 0} max={params.ballastRange?.[1] ?? 25} step={1} unit="g" onChange={setBallast} />
        )}
        {show.includes('finRoot') && (
          <Slider label="Wurzeltiefe" symbol="C_R" value={finRoot} min={params.finRootRange?.[0] ?? 30} max={params.finRootRange?.[1] ?? 90} step={2} unit="mm" onChange={setFinRoot} />
        )}
        {show.includes('finTip') && (
          <Slider label="Spitzentiefe" symbol="C_T" value={finTip} min={params.finTipRange?.[0] ?? 10} max={params.finTipRange?.[1] ?? 60} step={2} unit="mm" onChange={setFinTip} />
        )}
        {show.includes('finSpan') && (
          <Slider label="Spannweite" symbol="s" value={finSpan} min={params.finSpanRange?.[0] ?? 20} max={params.finSpanRange?.[1] ?? 60} step={2} unit="mm" onChange={setFinSpan} />
        )}
        {show.includes('finCount') && (
          <Slider label="Finnenzahl" symbol="N" value={finCount} min={params.finCountRange?.[0] ?? 3} max={params.finCountRange?.[1] ?? 6} step={1} onChange={setFinCount} />
        )}
      </div>

      <p className="mt-3 flex flex-wrap items-baseline gap-x-5 gap-y-1 border-t border-black/10 pt-3 font-mono text-sm" aria-live="polite">
        <span className={hl && hl !== 'cg' ? 'opacity-60' : ''}>
          CG = <span className="text-accent-ink">{cg.value === null ? '—' : `${fmt(cg.value, 0)} mm`}</span>
        </span>
        <span className={hl && hl !== 'cp' ? 'opacity-60' : ''}>
          CP = <span className="text-accent-ink">{cp === null ? '—' : `${fmt(cp, 0)} mm`}</span>
        </span>
        <span className={hl && hl !== 's' ? 'opacity-60' : ''}>
          S = <span className="text-accent-ink">{s === null ? '—' : `${fmt(s, 2)} Kaliber`}</span>
        </span>
        <span className={`${urteil.klasse}`}>
          {urteil.zeichen} {urteil.wort}
        </span>
        <span className="text-xs text-ink-faint">aus der Engine</span>
      </p>
      {caption && <p className="mt-2 text-sm text-ink-2">{caption}</p>}
    </div>
  );
}
