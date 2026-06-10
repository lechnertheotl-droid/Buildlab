// GearPair — zwei kämmende Stirnräder, isometrisch (Registry: gear-pair).
// Die Räder drehen im echten Drehzahlverhältnis (ω2 = −ω1·z1/z2, rAF), die
// Geometrie folgt d = m·z, der Achsabstand a = m(z1+z2)/2 — alle Zahlen aus
// der Engine. Publiziert {z1, z2, m} für Rechner & target-Aufgaben.

import { useEffect, useMemo, useRef, useState } from 'react';
import { evaluateById } from '@buildlab/engine';
import { project, shade } from '@buildlab/iso';
import { Slider } from '../Slider';
import { useContent } from '../content-context';
import { IsoStage, groundRotationMatrix, useEngineValue } from '../iso-scene';
import { reducedMotionActive } from '../primitives/motion';

export interface GearPairParams {
  z1?: number;
  z2?: number;
  m?: number;
  /** Nur diese Regler zeigen — der Schritt stellt SEINE Stellgrößen frei (LERNMODELL: ein Lernziel). */
  show?: ('z1' | 'z2' | 'm')[];
  /** Dieses Ergebnis betonen (Akzent + passende Geometrie-Hervorhebung). */
  highlight?: 'i' | 'd' | 'a';
  z1Range?: [number, number];
  z2Range?: [number, number];
  mRange?: [number, number];
}

const fmt = (n: number, digits = 1) =>
  new Intl.NumberFormat('de-DE', { maximumFractionDigits: digits }).format(n);

/** Zahnkranz-Umriss in Bodenkoordinaten (Polygonpunkte als String, Ursprung = Radmitte). */
function gearOutline(z: number, rootR: number, tipR: number): string {
  const points: string[] = [];
  const pitch = (2 * Math.PI) / z;
  const push = (radius: number, angle: number) => {
    // Bodenebene (x, y, 0) projiziert — relativ zur Mitte (Projektion ist linear).
    const p = project({ x: radius * Math.cos(angle), y: radius * Math.sin(angle), z: 0 });
    points.push(`${p.x.toFixed(2)},${p.y.toFixed(2)}`);
  };
  for (let i = 0; i < z; i++) {
    const a = i * pitch;
    push(rootR, a);
    push(tipR, a + 0.22 * pitch);
    push(tipR, a + 0.45 * pitch);
    push(rootR, a + 0.62 * pitch);
  }
  return points.join(' ');
}

function Gear({
  cx, cy, z, rootR, tipR, height, color, bore, groupRef,
}: {
  cx: number;
  cy: number;
  z: number;
  rootR: number;
  tipR: number;
  height: number;
  color: string;
  bore: number;
  groupRef: (el: SVGGElement | null) => void;
}) {
  const outline = useMemo(() => gearOutline(z, rootR, tipR), [z, rootR, tipR]);
  return (
    <g transform={`translate(${cx} ${cy})`}>
      {/* weicher Schatten unterm Rad (DESIGN.md §6) */}
      <ellipse cx={0} cy={height * 0.4} rx={tipR * 1.15} ry={tipR * 0.62} fill="var(--ink)" opacity={0.14} filter="url(#iso-soft)" />
      {/* Körper: Unterseite dunkel, Deckfläche hell — eine Geometrie, zwei Lagen */}
      <g ref={groupRef} data-part="bottom">
        <polygon points={outline} fill={shade(color, -0.22)} stroke="var(--ink)" strokeOpacity={0.25} strokeWidth={0.6} />
      </g>
      <g ref={groupRef} data-part="top" data-h={-height} transform={`translate(0 ${-height})`}>
        <polygon points={outline} fill={shade(color, 0.2)} stroke="var(--ink)" strokeOpacity={0.35} strokeWidth={0.7} />
        {/* Bohrung + Teilkreis als Maßhilfe */}
        <ellipse cx={0} cy={0} rx={bore} ry={bore * 0.58} fill="var(--paper-sink)" stroke="var(--ink)" strokeOpacity={0.3} />
      </g>
    </g>
  );
}

export function GearPair({ params, caption }: { params: GearPairParams; caption?: string }) {
  const { formulas } = useContent();
  const list = useMemo(() => [...formulas.values()], [formulas]);
  const [z1, setZ1] = useState(params.z1 ?? 20);
  const [z2, setZ2] = useState(params.z2 ?? 60);
  const [m, setM] = useState(params.m ?? 2);
  const [z1Min, z1Max] = params.z1Range ?? [12, 80];
  const [z2Min, z2Max] = params.z2Range ?? [12, 120];
  const [mMin, mMax] = params.mRange ?? [1, 4];
  const show = params.show ?? ['z1', 'z2', 'm'];
  const hl = params.highlight;

  // Engine-Werte (Eiserne Regel 1) + Publikation für Rechner/target-Aufgaben.
  const a = useEngineValue('axis_dist', { m, z1, z2 }, 'Zahnradpaar');
  const safe = (id: string, inputs: Record<string, number>) => {
    try {
      return evaluateById(list, id, inputs).value;
    } catch {
      return null;
    }
  };
  const i = safe('ratio', { z1, z2 });
  const d1 = safe('pitch_d', { m, z: z1 });
  const d2 = safe('pitch_d', { m, z: z2 });

  // Geometrie in Bildmaß: beide Räder + Achsabstand in die Bühne einpassen.
  const r1 = (d1 ?? 1) / 2;
  const r2 = (d2 ?? 1) / 2;
  const aVal = a.value ?? r1 + r2;
  const k = 150 / (r1 + r2 + aVal);
  const c1 = project({ x: -(aVal / 2) * k, y: 0, z: 0 });
  const c2 = project({ x: (aVal / 2) * k, y: 0, z: 0 });

  // Drehung: ω2 = −ω1·z1/z2; bei reduzierter Bewegung statische Pose.
  const refs = useRef<{ el: SVGGElement; gear: 1 | 2; part: string }[]>([]);
  const collect = (gear: 1 | 2) => (el: SVGGElement | null) => {
    if (!el) return;
    refs.current = refs.current.filter((r) => !(r.gear === gear && r.part === el.dataset.part));
    refs.current.push({ el, gear, part: el.dataset.part ?? '' });
  };
  const ratioRef = useRef(z1 / z2);
  ratioRef.current = z1 / z2;
  useEffect(() => {
    if (reducedMotionActive()) return;
    let raf = 0;
    let last = performance.now();
    let theta = 0;
    const tick = (now: number) => {
      theta += ((now - last) / 1000) * 0.7;
      last = now;
      const m1 = groundRotationMatrix(theta);
      const m2 = groundRotationMatrix(-theta * ratioRef.current + Math.PI / (ratioRef.current * 60));
      for (const { el, gear, part } of refs.current) {
        const matrix = gear === 1 ? m1 : m2;
        el.setAttribute(
          'transform',
          part === 'top' ? `translate(0 ${el.dataset.h ?? -14}) ${matrix}` : matrix,
        );
      }
      raf = requestAnimationFrame(tick);
    };
    // rAF pausiert in verdeckten Tabs (kein Batterie-Verbrauch im Hintergrund).
    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    raf = requestAnimationFrame(tick);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      cancelAnimationFrame(raf);
    };
  }, []);

  const height = 14;
  const label = `Zahnradpaar: z1 ${z1}, z2 ${z2}, Modul ${fmt(m, 2)} mm, Übersetzung ${i === null ? '—' : fmt(i, 2)}, Achsabstand ${a.value === null ? '—' : fmt(a.value)} mm`;

  return (
    <div className="rounded border border-black/10 bg-paper-2 p-4 shadow">
      <IsoStage label={label} height={250} origin={{ x: 230, y: 150 }} floor={120}>
        <Gear cx={c1.x} cy={c1.y} z={z1} rootR={(r1 - 1.25 * m) * k} tipR={(r1 + m) * k} height={height} color="#a9a294" bore={6} groupRef={collect(1)} />
        <Gear cx={c2.x} cy={c2.y} z={z2} rootR={(r2 - 1.25 * m) * k} tipR={(r2 + m) * k} height={height} color="#9a9489" bore={8} groupRef={collect(2)} />
        {/* Teilkreise als Maßhilfe, wenn der Schritt d behandelt */}
        {hl === 'd' && (
          <>
            <ellipse cx={c1.x} cy={c1.y - 14} rx={r1 * k} ry={r1 * k * 0.58} fill="none" stroke="var(--accent)" strokeDasharray="4 3" />
            <ellipse cx={c2.x} cy={c2.y - 14} rx={r2 * k} ry={r2 * k * 0.58} fill="none" stroke="var(--accent)" strokeDasharray="4 3" />
          </>
        )}
        {/* Achsabstand als Maßlinie (Maßlinien-Stil: dünn, Mono-Beschriftung) */}
        {(hl === 'a' || hl === undefined) && (<>
        <line x1={c1.x} y1={c1.y + 36} x2={c2.x} y2={c2.y + 36} stroke="var(--accent)" strokeWidth={1} />
        <line x1={c1.x} y1={c1.y + 31} x2={c1.x} y2={c1.y + 41} stroke="var(--accent)" strokeWidth={1} />
        <line x1={c2.x} y1={c2.y + 31} x2={c2.x} y2={c2.y + 41} stroke="var(--accent)" strokeWidth={1} />
        <text x={(c1.x + c2.x) / 2} y={c1.y + 50} textAnchor="middle" fontSize="11" className="fill-[color:var(--accent-ink)] font-mono">
          a = {a.value === null ? '—' : fmt(a.value)} mm
        </text>
        </>)}
      </IsoStage>

      <div className={`mt-3 grid gap-3 ${show.length >= 3 ? 'md:grid-cols-3' : show.length === 2 ? 'md:grid-cols-2' : ''}`}>
        {show.includes('z1') && (
          <Slider label="Zähne Antrieb" symbol="z₁" value={z1} min={z1Min} max={z1Max} step={1} onChange={setZ1} />
        )}
        {show.includes('z2') && (
          <Slider label="Zähne Abtrieb" symbol="z₂" value={z2} min={z2Min} max={z2Max} step={1} onChange={setZ2} />
        )}
        {show.includes('m') && (
          <Slider label="Modul" symbol="m" value={m} min={mMin} max={mMax} step={0.5} unit="mm" onChange={setM} />
        )}
      </div>

      <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 border-t border-black/10 pt-3 font-mono text-sm" aria-live="polite">
        {([['i', i === null ? '—' : fmt(i, 2)], ['d₁', d1 === null ? '—' : `${fmt(d1)} mm`], ['d₂', d2 === null ? '—' : `${fmt(d2)} mm`], ['a', a.value === null ? '—' : `${fmt(a.value)} mm`]] as const).map(([k, v]) => {
          const on = (hl === 'i' && k === 'i') || (hl === 'd' && (k === 'd₁' || k === 'd₂')) || (hl === 'a' && k === 'a');
          return (
            <span key={k} className={on ? 'rounded border border-accent/60 bg-paper px-1.5 py-0.5' : hl ? 'opacity-60' : ''}>
              {k} = <span className="text-accent-ink">{v}</span>
            </span>
          );
        })}
      </p>
      {caption && <p className="mt-2 text-sm text-ink-2">{caption}</p>}
    </div>
  );
}
