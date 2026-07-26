// GearPair — zwei kämmende Stirnräder, isometrisch (Registry: gear-pair).
//
// Die Zahnkontur kommt aus gearProfile() (@buildlab/iso) — derselben Quelle,
// aus der cad/gear.scad das druckbare Teil erzeugt. Bild und Bauteil zeigen
// damit exakt dieselbe Evolvente; der Content verspricht im genauen Layer
// ausdrücklich eine Evolventenverzahnung.
//
// Die Räder drehen im echten Drehzahlverhältnis (ω2 = −ω1·z1/z2, rAF) und
// greifen phasenrichtig ineinander (gearMeshPhase — Zahn in Lücke, hergeleitet
// statt geraten). Der Maßstab ist ein fester Weltmaßstab mit Deckel: ein
// größerer Modul macht die Räder sichtbar größer, statt sich herauszukürzen.
// Alle Zahlen kommen aus der Engine; publiziert {z1, z2, m}.

import { useEffect, useMemo, useRef, useState } from 'react';
import { evaluateById } from '@buildlab/engine';
import {
  dimension, gearMeshPhase, gearProfile, project, projectCircle, shade, toPolygonPoints,
} from '@buildlab/iso';
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

const r2 = (n: number) => Math.round(n * 100) / 100;

// Weltmaßstab: Pixel je mm. Gedeckelt, damit große Paarungen ins Bild passen,
// aber NICHT auf die Paarung normiert — sonst wäre der Modul unsichtbar.
const PX_PER_MM = 2.1;
const STAGE = { w: 460, h: 250, origin: { x: 230, y: 150 } };
const HEIGHT_MM = 7; // Zahnbreite im Bild (Radkörper-Dicke)

/** Projizierter Umriss eines Zahnrads (Bodenebene) als SVG-Polygon-String. */
function outlinePoints(z: number, m: number, k: number): string {
  const prof = gearProfile({ z, m, steps: 5 });
  return toPolygonPoints(
    prof.points.map((p) => project({ x: p.x * k, y: p.y * k, z: 0 })),
  );
}

function Gear({
  cx, cy, z, m, k, height, color, boreMm, groupRef, phase,
}: {
  cx: number;
  cy: number;
  z: number;
  m: number;
  k: number;
  height: number;
  color: string;
  boreMm: number;
  groupRef: (el: SVGGElement | null) => void;
  /** Grundstellung des Rads — trägt die Eingriffsphase, auch ohne Animation. */
  phase: number;
}) {
  const outline = useMemo(() => outlinePoints(z, m, k), [z, m, k]);
  const prof = useMemo(() => gearProfile({ z, m, steps: 5 }), [z, m]);
  const bore = projectCircle({ x: 0, y: 0, z: 0 }, (boreMm / 2) * k);
  const nabe = projectCircle({ x: 0, y: 0, z: 0 }, Math.min(prof.rf * 0.55, boreMm * 1.6) * k);

  return (
    <g transform={`translate(${cx} ${cy})`}>
      {/* weicher Kontaktschatten (DESIGN.md §6) */}
      <ellipse
        cx={0}
        cy={height * 0.4}
        rx={r2(prof.ra * k * Math.SQRT2 * Math.cos(Math.PI / 6))}
        ry={r2(prof.ra * k * Math.SQRT2 * Math.sin(Math.PI / 6))}
        fill="var(--ink)"
        opacity={0.14}
        filter="url(#iso-soft)"
      />
      {/* Bodenfläche und Deckfläche derselben Kontur, um die Radbreite versetzt —
          der sichtbare Zwischenraum gibt dem Zahnkranz Volumen. Beide tragen
          von Anfang an die Eingriffsphase, damit auch die statische Pose
          (reduzierte Bewegung) Zahn in Lücke zeigt. */}
      <g ref={groupRef} data-part="bottom" transform={groundRotationMatrix(phase)}>
        <polygon points={outline} fill={shade(color, -0.3)} stroke="var(--ink)" strokeOpacity={0.25} strokeWidth={0.6} />
      </g>
      <g ref={groupRef} data-part="top" data-h={-height} transform={`translate(0 ${-height}) ${groundRotationMatrix(phase)}`}>
        <polygon points={outline} fill={shade(color, 0.22)} stroke="var(--ink)" strokeOpacity={0.35} strokeWidth={0.7} />
        {/* Nabe und Wellenbohrung — dieselbe Konstruktion wie im CAD-Modell */}
        <ellipse cx={0} cy={0} rx={r2(nabe.rx)} ry={r2(nabe.ry)} fill={shade(color, 0.08)} stroke="var(--ink)" strokeOpacity={0.2} strokeWidth={0.5} />
        <ellipse cx={0} cy={0} rx={r2(bore.rx)} ry={r2(bore.ry)} fill="var(--paper-sink)" stroke="var(--ink)" strokeOpacity={0.35} strokeWidth={0.6} />
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
  // Unterschnittfreie Untergrenze (z_g = 17 bei α = 20°) statt 12 — darunter
  // kämmen echte Evolventenräder ohne Profilverschiebung nicht mehr.
  const [z1Min, z1Max] = params.z1Range ?? [17, 80];
  const [z2Min, z2Max] = params.z2Range ?? [17, 120];
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

  const r1 = (d1 ?? 1) / 2;
  const rr2 = (d2 ?? 1) / 2;
  const aVal = a.value ?? r1 + rr2;

  // Weltmaßstab. Der Knackpunkt: bei fester Zähnezahl sind Zahnräder
  // verschiedener Module geometrisch ÄHNLICH — der Modul ist reiner Maßstab.
  // Ein auf die aktuelle Paarung normierter Maßstab kürzt ihn deshalb komplett
  // heraus (vorher waren m=1 und m=4 pixelgleich).
  //
  // Darum ein Bezugsmaßstab aus der AUSGANGS-Paarung des Schritts, der beim
  // Schieben stehen bleibt: dann wachsen die Räder wirklich. Erst wenn die
  // Paarung darüber hinauswächst, wird so weit verkleinert, dass sie ins Bild
  // passt — Sichtbarkeit im Lernbereich, Vollständigkeit an den Rändern.
  const breiteMm = (mm: number, a: number, zz1: number, zz2: number) =>
    a + (mm * zz1) / 2 + (mm * zz2) / 2 + 2 * mm;
  const projX = Math.SQRT2 * Math.cos(Math.PI / 6);
  const kRef = useMemo(() => {
    const rz1 = params.z1 ?? 20;
    const rz2 = params.z2 ?? 60;
    // Bezugsmodul ist das KLEINSTE des Reglerbereichs, nicht der aktuelle Wert —
    // sonst hinge der Maßstab wieder an m und würde ihn erneut herauskürzen.
    const rm = mMin;
    const ra = (rm * (rz1 + rz2)) / 2;
    // Die Bezugs-Paarung füllt rund 72 % der Bühne — Luft nach oben für größere Module.
    return ((STAGE.w - 60) * 0.72) / (breiteMm(rm, ra, rz1, rz2) * projX);
  }, [params.z1, params.z2, mMin]);
  const kFit = (STAGE.w - 60) / (breiteMm(m, aVal, z1, z2) * projX);
  const k = Math.min(PX_PER_MM, kRef, kFit);

  const c1 = project({ x: -(aVal / 2) * k, y: 0, z: 0 });
  const c2 = project({ x: (aVal / 2) * k, y: 0, z: 0 });
  const height = HEIGHT_MM * k;

  // Drehung: ω2 = −ω1·z1/z2 mit korrekter Eingriffsphase. Beide Winkel werden
  // GETRENNT integriert — sonst springt Rad 2 beim Verstellen von z um mehrere
  // Umdrehungen (der Winkel wurde vorher absolut aus dem Verhältnis gerechnet).
  const refs = useRef<{ el: SVGGElement; gear: 1 | 2; part: string }[]>([]);
  const collect = (gear: 1 | 2) => (el: SVGGElement | null) => {
    if (!el) return;
    refs.current = refs.current.filter((r) => !(r.gear === gear && r.part === el.dataset.part));
    refs.current.push({ el, gear, part: el.dataset.part ?? '' });
  };
  const ratioRef = useRef(z1 / z2);
  ratioRef.current = z1 / z2;
  const phaseRef = useRef(gearMeshPhase(z2));
  phaseRef.current = gearMeshPhase(z2);

  useEffect(() => {
    if (reducedMotionActive()) return;
    let raf = 0;
    let last = performance.now();
    let theta1 = 0;
    let theta2 = phaseRef.current;
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      theta1 += dt * 0.7;
      theta2 -= dt * 0.7 * ratioRef.current;
      const m1 = groundRotationMatrix(theta1);
      const m2 = groundRotationMatrix(theta2);
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

  // Teilkreise: exakte Projektion statt geratenem Achsverhältnis. Vorher lag
  // der „Teilkreis" wegen des fehlenden Faktors √2·cos α im Fußkreis.
  const pitch1 = projectCircle({ x: 0, y: 0, z: 0 }, r1 * k);
  const pitch2 = projectCircle({ x: 0, y: 0, z: 0 }, rr2 * k);

  // Wälzpunkt C: der Berührpunkt der Teilkreise auf der Zentralen. Der Content
  // nennt ihn „Grundlage aller folgenden Beziehungen" — hier ist er sichtbar.
  const waelz = project({ x: (-(aVal / 2) + r1) * k, y: 0, z: 0 });

  // Achsabstands-Maßkette nach DIN 406 (Pfeile senkrecht zur Maßlinie).
  const dim = dimension(
    { x: c1.x, y: c1.y },
    { x: c2.x, y: c2.y },
    { offset: 42, overshoot: 5 },
  );

  const label =
    `Zahnradpaar: z1 ${z1}, z2 ${z2}, Modul ${fmt(m, 2)} mm, ` +
    `Übersetzung ${i === null ? '—' : fmt(i, 2)}, Achsabstand ${a.value === null ? '—' : fmt(a.value)} mm`;

  return (
    <div className="rounded border border-black/10 bg-paper-2 p-4 shadow">
      <IsoStage
        label={label}
        desc="Zwei verzahnte Räder auf einer isometrischen Bühne drehen sich im echten Drehzahlverhältnis; ihre Zähne greifen phasenrichtig ineinander. Die Regler ändern Zähnezahlen und Modul, die Räder wachsen sichtbar mit."
        height={STAGE.h}
        origin={STAGE.origin}
        floor={120}
      >
        <Gear cx={c1.x} cy={c1.y} z={z1} m={m} k={k} height={height} color="#a9a294" boreMm={Math.max(4, m * 2.5)} groupRef={collect(1)} phase={0} />
        <Gear cx={c2.x} cy={c2.y} z={z2} m={m} k={k} height={height} color="#9a9489" boreMm={Math.max(5, m * 3)} groupRef={collect(2)} phase={gearMeshPhase(z2)} />

        {/* Teilkreise als Maßhilfe, wenn der Schritt d behandelt */}
        {hl === 'd' && (
          <>
            <ellipse cx={c1.x} cy={c1.y - height} rx={r2(pitch1.rx)} ry={r2(pitch1.ry)} fill="none" stroke="var(--accent)" strokeDasharray="4 3" />
            <ellipse cx={c2.x} cy={c2.y - height} rx={r2(pitch2.rx)} ry={r2(pitch2.ry)} fill="none" stroke="var(--accent)" strokeDasharray="4 3" />
            <text x={r2(c1.x)} y={r2(c1.y - height - pitch1.ry - 6)} textAnchor="middle" fontSize="10" className="fill-[color:var(--accent-ink)] font-mono">
              d₁ = {d1 === null ? '—' : fmt(d1)} mm
            </text>
            <text x={r2(c2.x)} y={r2(c2.y - height - pitch2.ry - 6)} textAnchor="middle" fontSize="10" className="fill-[color:var(--accent-ink)] font-mono">
              d₂ = {d2 === null ? '—' : fmt(d2)} mm
            </text>
          </>
        )}

        {/* Wälzpunkt C: dort rollen die Teilkreise schlupffrei aufeinander ab */}
        <g>
          <circle cx={r2(waelz.x)} cy={r2(waelz.y - height)} r={3} fill="var(--accent)" stroke="var(--paper)" strokeWidth={1.2} />
          <text x={r2(waelz.x + 7)} y={r2(waelz.y - height - 6)} fontSize="10" className="fill-[color:var(--accent-ink)] font-mono">
            C
          </text>
        </g>

        {/* Achsabstand als normgerechte Maßkette */}
        {(hl === 'a' || hl === undefined) && (
          <g stroke="var(--accent)" strokeWidth={1}>
            {dim.extensions.map((e, idx) => (
              <line key={idx} x1={r2(e[0].x)} y1={r2(e[0].y)} x2={r2(e[1].x)} y2={r2(e[1].y)} strokeOpacity={0.7} />
            ))}
            <line x1={r2(dim.line[0].x)} y1={r2(dim.line[0].y)} x2={r2(dim.line[1].x)} y2={r2(dim.line[1].y)} />
            {dim.arrows.map((pts, idx) => (
              <polygon key={idx} points={toPolygonPoints(pts)} fill="var(--accent)" stroke="none" />
            ))}
            <text
              x={r2(dim.label.at.x)}
              y={r2(dim.label.at.y)}
              textAnchor="middle"
              fontSize="11"
              stroke="none"
              className="fill-[color:var(--accent-ink)] font-mono"
            >
              a = {a.value === null ? '—' : fmt(a.value)} mm
            </text>
          </g>
        )}
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
        {([['i', i === null ? '—' : fmt(i, 2)], ['d₁', d1 === null ? '—' : `${fmt(d1)} mm`], ['d₂', d2 === null ? '—' : `${fmt(d2)} mm`], ['a', a.value === null ? '—' : `${fmt(a.value)} mm`]] as const).map(([key, v]) => {
          const on = (hl === 'i' && key === 'i') || (hl === 'd' && (key === 'd₁' || key === 'd₂')) || (hl === 'a' && key === 'a');
          return (
            <span key={key} className={on ? 'rounded border border-accent/60 bg-paper px-1.5 py-0.5' : hl ? 'opacity-60' : ''}>
              {key} = <span className="text-accent-ink">{v}</span>
            </span>
          );
        })}
      </p>
      {caption && <p className="mt-2 text-sm text-ink-2">{caption}</p>}
    </div>
  );
}
