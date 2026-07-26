// RocketStability — Raketen-Seitenriss mit Schwerpunkt (CG), Druckpunkt (CP)
// und Stabilitätsmaß (Registry: rocket-stability). Das Massenmodell und der
// Barrowman-Druckpunkt kommen aus packages/engine (computeRocket); angezeigt
// werden die Formelwerte rocket_cg / rocket_cp / stability (Eiserne Regel 1).
// Publiziert die vier Massenpaare für Rechner & target-Aufgaben (rocket_cg).

import { useMemo, useState } from 'react';
import { computeRocket, evaluateById } from '@buildlab/engine';
import { dimension, shade } from '@buildlab/iso';
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

const r2 = (n: number) => Math.round(n * 100) / 100;

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
  const H = 230;
  const L = noseLen + tubeLen;
  // Maßstab aus BEIDEN Zwängen: Länge und Bauhöhe inkl. Finnen. Vorher war nur
  // die Länge berücksichtigt und die obere Finne ragte ab finSpan > 51,6 mm aus
  // dem Bild — genau der Regler, den der Content bis 60 freigibt.
  const spanMax = params.finSpanRange?.[1] ?? Math.max(finSpan, 60);
  const kLaenge = 380 / (L + 10);
  const kHoehe = (H - 78 - 10) / 2 / (d / 2 + spanMax);
  const k = Math.min(kLaenge, kHoehe);
  const x0 = 40;
  // Achse so legen, dass die größtmögliche Finne oben noch Platz hat.
  const yAxis = Math.max(78, 10 + (d / 2 + spanMax) * k);
  const rPx = (d / 2) * k;
  const px = (mm: number) => x0 + mm * k;

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

        {/* ALLE finCount Finnen im echten Seitenriss: Finne i steht im Rollwinkel
            φᵢ = i·360/N und erscheint mit der Halbspannweite finSpan·cos φᵢ.
            Vorher wurden immer genau zwei gezeichnet — der Regler „mehr Finnen"
            veränderte das Bild nicht, obwohl die Caption genau das ankündigt.
            Hintere Finnen (sin φ < 0) zuerst und dunkler: Tiefenstaffelung. */}
        {Array.from({ length: finCount }, (_, idx) => {
          const phi = (idx * 2 * Math.PI) / finCount;
          return { idx, proj: Math.cos(phi), tiefe: Math.sin(phi) };
        })
          .sort((a, b) => a.tiefe - b.tiefe)
          .map(({ idx, proj, tiefe }) => {
            // Halbspannweite im Seitenriss; Finnen quer zur Blickrichtung
            // erscheinen als schmale Kante (|cos φ| ≈ 0).
            const span = finSpan * proj * k;
            const yWurzel = span >= 0 ? yAxis + rPx : yAxis - rPx;
            const yTip = yWurzel + span;
            const dunkel = tiefe < -0.05 ? -0.34 : tiefe > 0.05 ? -0.06 : -0.2;
            return (
              <polygon
                key={idx}
                points={`${px(L - finRoot)},${r2(yWurzel)} ${px(L)},${r2(yWurzel)} ${px(L)},${r2(yTip)} ${px(L - finTip)},${r2(yTip)}`}
                fill={shade(RUMPF, dunkel)}
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
        {/* Glanzkante entlang der Oberseite. Sie folgt der Kegelflanke, bis die
            Silhouette die Höhe 0,55·r erreicht (bei x = 0,55·noseLen), und läuft
            erst dann waagerecht weiter — vorher schwebte sie über den ersten
            42 mm frei neben der Nase im Papier. */}
        <polyline
          points={`${px(0)},${r2(yAxis)} ${px(0.55 * noseLen)},${r2(yAxis - rPx * 0.55)} ${px(L - 2)},${r2(yAxis - rPx * 0.55)}`}
          fill="none"
          stroke="#fff"
          strokeOpacity={0.35}
          strokeWidth={1.2}
        />

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

        {/* Das Stabilitätsmaß als MASSLINIE zwischen CG und CP. Der Schritt
            lehrt „S misst den Abstand CP−CG in Kalibern" — bisher stand S nur
            als Zahl in der Textzeile, der Abstand war nirgends zu sehen.
            Daneben ein Referenzbalken der Länge 1 Kaliber. */}
        {cg.value !== null && cp !== null && s !== null && (() => {
          // Unter die tiefste Finne legen, aber über das Kaliber-Lineal.
          const finUnten = yAxis + rPx + finSpan * k;
          const yMass = Math.min(finUnten + 20, H - 46);
          const gute = s >= 1 && s <= 2;
          const farbe = gute ? 'var(--ok)' : s < 1 ? 'var(--fehl)' : 'var(--warn)';
          const dim = dimension({ x: px(cg.value), y: yMass }, { x: px(cp), y: yMass });
          return (
            <g>
              {/* Ziel-Korridor: CP soll 1–2 Kaliber hinter dem CG liegen (SCREENS §6) */}
              <rect
                x={r2(px(cg.value + d))}
                y={r2(yMass - 7)}
                width={r2(d * k)}
                height={14}
                fill="var(--ok)"
                fillOpacity={0.14}
              />
              <g stroke={farbe} strokeWidth={1.2}>
                <line x1={r2(px(cg.value))} y1={r2(yAxis + 8)} x2={r2(px(cg.value))} y2={r2(yMass)} strokeOpacity={0.45} strokeDasharray="3 3" />
                <line x1={r2(px(cp))} y1={r2(yAxis + 8)} x2={r2(px(cp))} y2={r2(yMass)} strokeOpacity={0.45} strokeDasharray="3 3" />
                <line x1={r2(dim.line[0].x)} y1={r2(dim.line[0].y)} x2={r2(dim.line[1].x)} y2={r2(dim.line[1].y)} />
                {dim.arrows.map((pts, idx) => (
                  <polygon key={idx} points={pts.map((q) => `${r2(q.x)},${r2(q.y)}`).join(' ')} fill={farbe} stroke="none" />
                ))}
              </g>
              <text
                x={r2((px(cg.value) + px(cp)) / 2)}
                y={r2(yMass - 6)}
                textAnchor="middle"
                fontSize="10.5"
                fill={farbe}
                className="font-mono"
              >
                S = {fmt(s, 2)} Kaliber
              </text>
              {/* Referenzbalken „1 Kaliber" */}
              <g stroke="var(--ink-faint)" strokeWidth={1}>
                <line x1={r2(px(0))} y1={r2(yMass + 16)} x2={r2(px(d))} y2={r2(yMass + 16)} />
                <line x1={r2(px(0))} y1={r2(yMass + 12)} x2={r2(px(0))} y2={r2(yMass + 20)} />
                <line x1={r2(px(d))} y1={r2(yMass + 12)} x2={r2(px(d))} y2={r2(yMass + 20)} />
              </g>
              <text x={r2(px(d) + 6)} y={r2(yMass + 20)} fontSize="9" className="fill-[color:var(--ink-faint)] font-mono">
                1 Kaliber = {fmt(d, 0)} mm
              </text>
            </g>
          );
        })()}
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
