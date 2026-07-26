// TrussLoad — Fachwerk unter Last (Registry: truss-load). Das Herzstück des
// Projekts Fachwerkbrücke: technische Seitenansicht auf Millimeterpapier
// (kartesisch, Präzedenz FlightSim), Lehrbuch-Lagersymbole, Maßlinie.
//
// Eiserne Regel 1: JEDE Stabkraft kommt aus packages/engine (solveTruss,
// Knotenpunktverfahren als Gleichungssystem). Färbung nach Lehrbuch-Konvention:
// Zug blau (--viz-zug), Druck rot (--viz-high), dazu immer eine Z/D-Glyphe
// (nie nur Farbe, DESIGN.md §5/§7). Strichdicke ∝ |S|. Überschreitet ein Stab
// die zulässige Kraft, wird er statisch fett hervorgehoben mit ⚠-Tag
// (einmalige Quittung, kein Endlos-Puls — Motion-Vokabular §8).
// useEngineValue publiziert die Auflagerkraft (beam_reaction) für den Rechner.

import { useMemo, useState } from 'react';
import { solveTruss } from '@buildlab/engine';
import { Slider } from '../Slider';
import { AmpelArrow, useEngineValue } from '../iso-scene';

export interface TrussLoadParams {
  /** Knoten [x, y] in mm (y nach oben). */
  nodes?: [number, number][];
  /** Stäbe als Knoten-Index-Paare. */
  bars?: [number, number][];
  /** Auflager: gesperrte Richtungen je Knoten. */
  supports?: { node: number; fx?: boolean; fy?: boolean }[];
  /** Startlast in N (senkrecht nach unten). */
  load?: number;
  /** Lastknoten (Default: Knoten 1). */
  loadNode?: number;
  /** Slider-Bereich der Last. */
  loadRange?: [number, number];
  /** Zulässige Stabkraft in N — ab hier gilt ein Stab als überlastet. */
  allowN?: number;
}

const fmt = (n: number, digits = 1) =>
  new Intl.NumberFormat('de-DE', { maximumFractionDigits: digits }).format(n);

const r2 = (n: number) => Math.round(n * 100) / 100;

const W = 460;
const H = 300;
const M = { left: 40, right: 40, top: 46, bottom: 74 };
// Überzeichnete Absenkung des Lastknotens (rein anschaulich, max. px).
const MAX_SAG = 10;

// Referenz-Preset: die Dreiecksbrücke aus PROJECT_SPECS §2 (300 mm, 3-4-5).
const DEFAULT_NODES: [number, number][] = [[0, 0], [150, 0], [300, 0], [150, 112.5]];
const DEFAULT_BARS: [number, number][] = [[0, 1], [1, 2], [0, 3], [3, 2], [1, 3]];
const DEFAULT_SUPPORTS = [{ node: 0, fx: true, fy: true }, { node: 2, fy: true }];

/** Senkrechter Ampel-Pfeil nach OBEN (Reaktionskräfte) — Silhouette wie AmpelArrow. */
function upArrow(tip: { x: number; y: number }, length: number, key: string) {
  const headLen = 11;
  const headHalf = 7;
  const shaftHalf = 2;
  const yHead = tip.y + headLen;
  const yTail = Math.max(tip.y + length, yHead + 2);
  const pts = [
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
  return <polygon key={key} points={pts} fill="var(--viz-low)" stroke="var(--ink)" strokeWidth={1.2} strokeLinejoin="round" />;
}

export function TrussLoad({ params, caption }: { params: TrussLoadParams; caption?: string }) {
  const nodes = params.nodes ?? DEFAULT_NODES;
  const bars = params.bars ?? DEFAULT_BARS;
  const supports = params.supports ?? DEFAULT_SUPPORTS;
  const loadNode = params.loadNode ?? 1;
  const [minL, maxL] = params.loadRange ?? [0, 120];
  const allowN = params.allowN ?? 106;
  const [last, setLast] = useState(() => params.load ?? 49.05);

  // Eiserne Regel 1: alle Stabkräfte aus dem Engine-Löser.
  const loesung = useMemo(() => {
    try {
      return solveTruss({
        nodes: nodes.map(([x, y]) => ({ x, y })),
        bars: bars.map(([from, to]) => ({ from, to })),
        supports,
        loads: [{ node: loadNode, fy: -last }],
      });
    } catch {
      return null;
    }
  }, [nodes, bars, supports, loadNode, last]);

  // Auflagerkraft für Rechner-Kontext publizieren (Formel beam_reaction).
  useEngineValue('beam_reaction', { F: last }, 'Auflagerkraft');

  // Maßstab: Knoten-Bounding-Box randscharf in die Zeichenfläche einpassen.
  const xs = nodes.map((n) => n[0]);
  const ys = nodes.map((n) => n[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const scale = Math.min(
    (W - M.left - M.right) / Math.max(maxX - minX, 1),
    (H - M.top - M.bottom) / Math.max(maxY - minY, 1),
  );
  const offX = (W - (maxX - minX) * scale) / 2 - minX * scale;
  const baseY = H - M.bottom;
  const sx = (x: number) => offX + x * scale;
  const sy = (y: number) => baseY - (y - minY) * scale;

  // Überzeichnete Verformung: der Lastknoten senkt sich ∝ Last (Anschauung).
  const sag = allowN > 0 ? Math.min(1, last / allowN) * MAX_SAG : 0;
  const punkt = (i: number): { x: number; y: number } => ({
    x: sx(nodes[i][0]),
    y: sy(nodes[i][1]) + (i === loadNode ? sag : 0),
  });

  const kraefte = loesung?.barForces ?? bars.map(() => 0);
  const maxRef = Math.max(allowN, ...kraefte.map((k) => Math.abs(k)), 1);
  const ueberlastet = kraefte
    .map((k, i) => ({ k, i }))
    .filter(({ k }) => Math.abs(k) > allowN);

  const millimeter: React.ReactNode[] = [];
  for (let gx = M.left; gx <= W - M.right; gx += 20) {
    millimeter.push(<line key={`gx${gx}`} x1={gx} y1={M.top - 20} x2={gx} y2={baseY + 26} stroke="var(--ink)" strokeOpacity={0.07} />);
  }
  for (let gy = M.top - 20; gy <= baseY + 26; gy += 20) {
    millimeter.push(<line key={`gy${gy}`} x1={M.left} y1={gy} x2={W - M.right} y2={gy} stroke="var(--ink)" strokeOpacity={0.07} />);
  }

  const lastPunkt = punkt(loadNode);
  const spannweite = maxX - minX;

  const beschreibung = loesung
    ? bars
        .map((_, i) => {
          const s = kraefte[i];
          return `Stab ${i + 1} ${s >= 0 ? 'Zug' : 'Druck'} ${fmt(Math.abs(s))} Newton`;
        })
        .join(', ')
    : 'Gleichungssystem nicht lösbar';
  const label =
    `Fachwerk unter ${fmt(last)} Newton Last: ${beschreibung}.` +
    (ueberlastet.length > 0 ? ` ${ueberlastet.length} Stab/Stäbe über der zulässigen Kraft von ${fmt(allowN)} Newton.` : '');

  return (
    <figure className="rounded border border-black/10 bg-paper-2 p-4 shadow">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={label}>
        <desc>
          Technische Seitenansicht einer Fachwerkbrücke auf Millimeterpapier: Festlager links,
          Loslager rechts, Last in der Mitte. Zugstäbe sind blau (Glyphe Z), Druckstäbe rot
          (Glyphe D); die Strichdicke wächst mit der Stabkraft. Überlastete Stäbe tragen ein
          Warnzeichen.
        </desc>

        {/* Millimeterpapier */}
        {millimeter}

        {/* Zweite, versetzt-abgedunkelte Fachwerkebene dahinter (Pseudo-Tiefe) */}
        <g transform="translate(9 -7)" opacity={0.16}>
          {bars.map(([a, b], i) => (
            <line key={`bg${i}`} x1={r2(sx(nodes[a][0]))} y1={r2(sy(nodes[a][1]))} x2={r2(sx(nodes[b][0]))} y2={r2(sy(nodes[b][1]))} stroke="var(--ink)" strokeWidth={2.5} strokeLinecap="round" />
          ))}
        </g>

        {/* Stäbe: Farbe = Zug/Druck, Dicke + Deckkraft ∝ |S| */}
        {bars.map(([a, b], i) => {
          const s = kraefte[i];
          const frac = Math.abs(s) / maxRef;
          const istUeber = Math.abs(s) > allowN;
          const farbe = Math.abs(s) < 1e-9 ? 'var(--ink-faint)' : s > 0 ? 'var(--viz-zug)' : 'var(--viz-high)';
          const pa = punkt(a);
          const pb = punkt(b);
          return (
            <line
              key={`bar${i}`}
              x1={r2(pa.x)}
              y1={r2(pa.y)}
              x2={r2(pb.x)}
              y2={r2(pb.y)}
              stroke={farbe}
              strokeWidth={istUeber ? 7 : 2 + frac * 4.5}
              strokeOpacity={istUeber ? 1 : 0.55 + frac * 0.45}
              strokeLinecap="round"
            />
          );
        })}

        {/* Knoten (Knotenbleche) */}
        {nodes.map((_, i) => {
          const p = punkt(i);
          return <circle key={`k${i}`} cx={r2(p.x)} cy={r2(p.y)} r={4.4} fill="var(--paper-2)" stroke="var(--ink)" strokeWidth={1.4} />;
        })}

        {/* Z/D-Glyphen + ⚠ an den Stab-Mitten (nie nur Farbe) */}
        {loesung &&
          bars.map(([a, b], i) => {
            const s = kraefte[i];
            const pa = punkt(a);
            const pb = punkt(b);
            const mx = (pa.x + pb.x) / 2;
            const my = (pa.y + pb.y) / 2;
            const istUeber = Math.abs(s) > allowN;
            return (
              <g key={`gl${i}`} pointerEvents="none" className={istUeber ? 'bl-quittung' : undefined}>
                <rect x={r2(mx - (istUeber ? 26 : 9))} y={r2(my - 8)} width={istUeber ? 52 : 18} height={15} rx={3} fill="var(--paper-3)" stroke="var(--rule)" />
                <text x={r2(mx)} y={r2(my + 3.5)} textAnchor="middle" fontSize={10} className="font-mono" fill={istUeber ? 'var(--fehl)' : 'var(--ink-2)'}>
                  {istUeber ? `⚠ ${s >= 0 ? 'Z' : 'D'} ${fmt(Math.abs(s), 0)} N` : s >= 0 ? `Z${i + 1}` : `D${i + 1}`}
                </text>
              </g>
            );
          })}

        {/* Lager-Symbole: Festlager (Dreieck + Schraffur), Loslager (Dreieck + Rollen) */}
        {supports.map((sup, i) => {
          const p = punkt(sup.node);
          const fest = !!sup.fx;
          const t = 13;
          return (
            <g key={`sup${i}`} stroke="var(--ink)" fill="var(--paper-sink)" strokeWidth={1.3}>
              <polygon points={`${r2(p.x)},${r2(p.y + 4)} ${r2(p.x - t)},${r2(p.y + 4 + t)} ${r2(p.x + t)},${r2(p.y + 4 + t)}`} />
              {fest ? (
                Array.from({ length: 5 }, (_, k) => {
                  const hx = p.x - t + 3 + k * (t / 2.2);
                  return <line key={k} x1={r2(hx)} y1={r2(p.y + 4 + t)} x2={r2(hx - 5)} y2={r2(p.y + 4 + t + 6)} strokeWidth={1} />;
                })
              ) : (
                <>
                  <circle cx={r2(p.x - t / 2)} cy={r2(p.y + 4 + t + 3.4)} r={3} fill="var(--paper-2)" strokeWidth={1} />
                  <circle cx={r2(p.x + t / 2)} cy={r2(p.y + 4 + t + 3.4)} r={3} fill="var(--paper-2)" strokeWidth={1} />
                  <line x1={r2(p.x - t - 2)} y1={r2(p.y + 4 + t + 7)} x2={r2(p.x + t + 2)} y2={r2(p.y + 4 + t + 7)} strokeWidth={1} />
                </>
              )}
            </g>
          );
        })}

        {/* Auflagerreaktionen (aus dem Löser): grüne Pfeile nach oben */}
        {loesung &&
          loesung.reactions.map((re, i) => {
            const p = punkt(re.node);
            const len = 16 + (Math.abs(re.fy) / maxRef) * 34;
            return (
              <g key={`re${i}`}>
                {upArrow({ x: p.x, y: p.y + 24 }, len, `rp${i}`)}
                <text x={r2(p.x + 8)} y={r2(p.y + 34 + len)} fontSize={9.5} className="fill-[color:var(--ink-2)] font-mono">
                  {fmt(re.fy)} N
                </text>
              </g>
            );
          })}

        {/* Die Last: Ampel-Pfeil senkrecht nach unten auf den Lastknoten */}
        <AmpelArrow tip={{ x: lastPunkt.x, y: lastPunkt.y - 6 }} length={22 + (last / Math.max(maxL, 1)) * 46} frac={allowN > 0 ? Math.min(1, last / (allowN * 1.2)) : 0} />
        <text x={r2(lastPunkt.x + 10)} y={r2(lastPunkt.y - 34)} fontSize={10.5} className="fill-[color:var(--ink)] font-mono">
          F = {fmt(last)} N
        </text>

        {/* Maßlinie der Spannweite */}
        <g stroke="var(--ink-faint)" strokeOpacity={0.85}>
          <line x1={r2(sx(minX))} y1={baseY + 40} x2={r2(sx(maxX))} y2={baseY + 40} />
          <line x1={r2(sx(minX))} y1={baseY + 35} x2={r2(sx(minX))} y2={baseY + 45} />
          <line x1={r2(sx(maxX))} y1={baseY + 35} x2={r2(sx(maxX))} y2={baseY + 45} />
        </g>
        <text x={r2(sx(minX + spannweite / 2))} y={baseY + 37} textAnchor="middle" fontSize={9.5} className="fill-[color:var(--ink-faint)] font-mono">
          {fmt(spannweite, 0)} mm
        </text>
      </svg>

      {/* Stabkraft-Tabelle (aus der Engine) */}
      <div className="mt-3 border-t border-black/10 pt-3 font-mono text-sm" aria-live="polite">
        {loesung ? (
          <p className="flex flex-wrap gap-x-4 gap-y-1">
            {kraefte.map((s, i) => (
              <span key={i} className={Math.abs(s) > allowN ? 'font-bold' : undefined} style={{ color: Math.abs(s) > allowN ? 'var(--fehl)' : s > 0 ? 'var(--viz-zug)' : 'var(--viz-high)' }}>
                S{i + 1} = {fmt(s)} N {s >= 0 ? '(Z)' : '(D)'}
              </span>
            ))}
            <span className="text-xs text-ink-faint">aus der Engine · Zug blau (Z), Druck rot (D)</span>
          </p>
        ) : (
          <p className="text-viz-high">Dieses Fachwerk ist nicht statisch bestimmt lösbar.</p>
        )}
        {ueberlastet.length > 0 && (
          <p className="bl-quittung mt-1" style={{ color: 'var(--fehl)' }}>
            ⚠ {ueberlastet.map(({ k, i }) => `S${i + 1} = ${fmt(Math.abs(k))} N`).join(', ')} &gt; zulässig ({fmt(allowN)} N)
          </p>
        )}
      </div>

      <div className="mt-4">
        <Slider label="Last (mittig)" symbol="F" value={last} min={minL} max={maxL} step={1} unit="N" onChange={setLast} />
      </div>

      {caption && <figcaption className="mt-3 text-sm text-ink-2">{caption}</figcaption>}
    </figure>
  );
}
