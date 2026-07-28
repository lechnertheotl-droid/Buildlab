// gear.ts — Evolventenverzahnung als EINE geprüfte Quelle.
//
// Bisher gab es zwei unabhängige, beide fehlerhafte Zahnformen: ein Trapez in
// der Simulation und eine verunglückte Evolvente in cad/gear.scad. Beide leiten
// sich künftig hiervon ab, damit Bild und gedrucktes Teil dieselbe Geometrie
// zeigen — der Content verspricht im genauen Layer ausdrücklich eine
// Evolventenverzahnung.
//
// Normbezug (DIN 867, Bezugsprofil α = 20°, Kopfhöhe m, Fußhöhe 1,25·m):
//   Teilkreis      d  = m·z          Grundkreis  d_b = d·cos α
//   Kopfkreis      d_a = d + 2m      Fußkreis    d_f = d − 2,5m
//   Zahndicke am Teilkreis s = p/2 = π·m/2  (also s = e, spielfrei)
//
// Die halbe Zahndickenwinkel bei Radius ρ folgt aus der Evolventenfunktion:
//   ψ(ρ) = π/(2z) + inv(α) − inv(α_ρ)   mit  cos α_ρ = r_b/ρ,  inv(a) = tan a − a
// Bei ρ = r ergibt das π/(2z) (die halbe Teilung), am Kopf weniger — der Zahn
// wird nach außen dünner. Genau das war in beiden alten Implementierungen falsch.

import type { Vec2 } from './project';

/** Evolventenfunktion inv(a) = tan(a) − a (Winkel im Bogenmaß). */
export function involute(a: number): number {
  return Math.tan(a) - a;
}

export interface GearProfileOptions {
  /** Zähnezahl. */
  z: number;
  /** Modul in mm. */
  m: number;
  /** Eingriffswinkel in Grad (Default 20 — Normbezugsprofil). */
  alphaDeg?: number;
  /** Stützpunkte je Zahnflanke (Default 8). */
  steps?: number;
  /** Flankenspiel in mm, beidseitig von der Zahndicke abgezogen (Default 0). */
  backlash?: number;
}

export interface GearProfile {
  /** Geschlossener Umriss in der xy-Ebene, mm, gegen den Uhrzeigersinn. */
  points: Vec2[];
  /** Teilkreisradius r = m·z/2. */
  r: number;
  /** Grundkreisradius r_b = r·cos α. */
  rb: number;
  /** Kopfkreisradius r_a = r + m. */
  ra: number;
  /** Fußkreisradius r_f = r − 1,25·m. */
  rf: number;
  /** Zahndicke auf dem Teilkreis (mm) — normgerecht π·m/2 minus Spiel. */
  toothThickness: number;
  /** Zahndicke auf dem Kopfkreis (mm); 0 = spitzer Zahn. */
  tipThickness: number;
  /**
   * Unterschnitt: unterhalb der Grenzzähnezahl wird der Zahnfuß ausgehöhlt,
   * die Paarung greift nicht mehr sauber. Ohne Profilverschiebung ist das ein
   * echter Konstruktionsfehler, kein Darstellungsproblem.
   */
  undercut: boolean;
}

/**
 * Grenzzähnezahl ohne Profilverschiebung: z_g = 2·ha / (sin α)²,
 * mit dem Kopfhöhenfaktor ha = 1 des Normbezugsprofils.
 * Für α = 20° sind das 17,1 — praktisch also 17 Zähne.
 */
export function minTeethNoUndercut(alphaDeg = 20): number {
  const a = (alphaDeg * Math.PI) / 180;
  return 2 / Math.sin(a) ** 2;
}

/**
 * Erzeugt den vollständigen Zahnrad-Umriss. Zahn 0 ist um den Winkel 0
 * zentriert — darauf baut gearMeshPhase auf.
 */
export function gearProfile(opts: GearProfileOptions): GearProfile {
  const { z, m } = opts;
  const alpha = ((opts.alphaDeg ?? 20) * Math.PI) / 180;
  const steps = Math.max(3, opts.steps ?? 8);
  const backlash = opts.backlash ?? 0;

  const r = (m * z) / 2;
  const rb = r * Math.cos(alpha);
  const ra = r + m;
  const rf = r - 1.25 * m;

  // Halber Zahndickenwinkel auf dem Teilkreis, um das Flankenspiel verringert.
  const psiPitch = Math.PI / (2 * z) - backlash / (2 * r);
  const invAlpha = involute(alpha);

  /** Halber Zahndickenwinkel bei Radius rho (nur für rho ≥ r_b definiert). */
  const psi = (rho: number): number => {
    const cosA = Math.min(1, rb / rho);
    return psiPitch + invAlpha - involute(Math.acos(cosA));
  };

  // Der Zahn wird nach außen dünner; wird er spitz, endet die Flanke dort.
  let raEff = ra;
  if (psi(ra) <= 0) {
    // Spitzenradius numerisch einschachteln (monoton fallendes psi).
    let lo = Math.max(rb, rf);
    let hi = ra;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if (psi(mid) > 0) lo = mid;
      else hi = mid;
    }
    raEff = lo;
  }

  // Radien der Flankenabtastung: von max(r_b, r_f) bis zum Kopf.
  const rStart = Math.max(rb, rf);
  const flankRadii: number[] = [];
  for (let i = 0; i <= steps; i++) {
    flankRadii.push(rStart + ((raEff - rStart) * i) / steps);
  }

  const pitch = (2 * Math.PI) / z;
  const psiRoot = psi(rStart);
  const pt = (rho: number, ang: number): Vec2 => ({ x: rho * Math.cos(ang), y: rho * Math.sin(ang) });

  const points: Vec2[] = [];
  for (let k = 0; k < z; k++) {
    const c = k * pitch; // Zahnmitte

    // Fußpunkt der rechten Flanke: unterhalb des Grundkreises radial nach innen.
    if (rf < rStart) points.push(pt(rf, c - psiRoot));

    // Rechte Flanke: Fuß → Kopf.
    for (const rho of flankRadii) points.push(pt(rho, c - psi(rho)));

    // Kopfkante als Kreisbogen (nicht als Sehne — sonst liegt der Kopf innerhalb d_a).
    const psiTip = psi(raEff);
    if (psiTip > 1e-9) {
      const tipSteps = 3;
      for (let i = 1; i < tipSteps; i++) {
        points.push(pt(raEff, c - psiTip + (2 * psiTip * i) / tipSteps));
      }
    }

    // Linke Flanke: Kopf → Fuß.
    for (let i = flankRadii.length - 1; i >= 0; i--) {
      points.push(pt(flankRadii[i], c + psi(flankRadii[i])));
    }
    if (rf < rStart) points.push(pt(rf, c + psiRoot));

    // Fußkreisbogen bis zur nächsten Zahnlücke.
    const gapSteps = 3;
    const from = c + psiRoot;
    const to = c + pitch - psiRoot;
    for (let i = 1; i < gapSteps; i++) {
      points.push(pt(rf, from + ((to - from) * i) / gapSteps));
    }
  }

  // Zahndicke am Kopf als Bogenlänge (0, wenn der Zahn spitz zuläuft).
  const tipThickness = raEff < ra ? 0 : 2 * ra * psi(ra);

  return {
    points,
    r,
    rb,
    ra,
    rf,
    toothThickness: 2 * r * psiPitch,
    tipThickness,
    // Praktische Grenze: z_g = 17,097 wird auf 17 abgerundet — bei genau 17
    // Zähnen ist der Unterschnitt vernachlässigbar, das ist die übliche
    // Auslegungsgrenze für das Normbezugsprofil.
    undercut: z < Math.floor(minTeethNoUndercut(opts.alphaDeg ?? 20)),
  };
}

/**
 * Phasenversatz des Gegenrads, damit Zahn in Lücke greift.
 *
 * Rad 1 sitzt im Ursprung mit einem Zahn auf der Zentralen (Winkel 0), Rad 2
 * steht bei (a, 0) — dort muss auf der Zentralen (Winkel 180°) eine **Lücke**
 * liegen. Aus 2πk/z₂ + φ + π/z₂ ≡ π folgt φ = π/z₂ bei geradem z₂, sonst 0.
 */
export function gearMeshPhase(z2: number): number {
  return z2 % 2 === 0 ? Math.PI / z2 : 0;
}
