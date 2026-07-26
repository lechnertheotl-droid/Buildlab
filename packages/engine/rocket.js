// packages/engine/rocket.js — Raketen-Modul: Motordaten, Massenmodell,
// Barrowman-Druckpunkt und Flugbahn per RK4 (ENGINE_SPEC.md §2 „Rakete").
//
// EISERNE REGEL 1 gilt auch hier: Jede Zahl im Content kommt aus diesen
// Funktionen (bzw. aus den Formeln rocket_cg/rocket_cp/stability, deren
// Mathematik dieses Modul spiegelt — ein Paritätstest hält beide deckungsgleich).
// Alles ist deterministisch: feste Schrittweite, keine Zufälle, keine Adaptivität.

// ── Motordaten ───────────────────────────────────────────────────────────────
// Schubkurven im Stil des offenen .eng-Formats: Stützpunkte [t in s, F in N].
// Estes C6: 18-mm-Klasse-C-Motor. Eckwerte laut NAR-Zertifizierungsdatenblatt
// (thrustcurve.org, Datei c6.eng): Gesamtimpuls ≈ 8,8 N·s, Brenndauer 1,86 s,
// Spitzenschub ≈ 14,1 N, Startmasse 24 g, davon 10,8 g Treibsatz.

export const MOTORS = {
  C6: {
    name: 'Estes C6',
    diameterMm: 18,
    lengthMm: 70,
    totalMassKg: 0.024,
    propellantMassKg: 0.0108,
    points: [
      [0, 0],
      [0.031, 0.946],
      [0.092, 4.826],
      [0.139, 9.936],
      [0.192, 14.09],
      [0.209, 11.446],
      [0.231, 7.381],
      [0.248, 6.151],
      [0.292, 5.489],
      [0.37, 4.921],
      [0.475, 4.448],
      [0.671, 4.258],
      [0.702, 4.542],
      [0.723, 4.164],
      [0.85, 4.448],
      [1.063, 4.353],
      [1.211, 4.353],
      [1.242, 4.069],
      [1.303, 4.258],
      [1.468, 4.353],
      [1.656, 4.448],
      [1.821, 4.448],
      [1.834, 2.933],
      [1.847, 1.325],
      [1.86, 0],
    ],
  },
};

/** Schub zum Zeitpunkt t (linear interpoliert; 0 außerhalb der Kurve). */
export function thrustAt(motor, t) {
  const pts = motor.points;
  if (t <= pts[0][0] || t >= pts[pts.length - 1][0]) return 0;
  for (let i = 1; i < pts.length; i++) {
    const [t1, f1] = pts[i - 1];
    const [t2, f2] = pts[i];
    if (t <= t2) return f1 + ((f2 - f1) * (t - t1)) / (t2 - t1);
  }
  return 0;
}

/** Gesamtimpuls I = ∫F dt, diskret als Trapezsumme über die Stützpunkte. */
export function totalImpulse(motor) {
  const pts = motor.points;
  let sum = 0;
  for (let i = 1; i < pts.length; i++) {
    sum += ((pts[i][1] + pts[i - 1][1]) / 2) * (pts[i][0] - pts[i - 1][0]);
  }
  return sum;
}

// ── Massenmodell (EINE Wahrheit für Interactive, Bau-Vorschau und Constraints) ──
// Konventionen (identisch in cad/rakete.scad und den Build-Constraint-Ausdrücken
// in content/modellrakete.json — der Paritätstest in rocket.test.ts wacht darüber):
//   Werkstoff PLA, Dichte 1,24 g/cm³ = 0.00124 g/mm³ · Wandstärke 1,2 mm ·
//   Finnendicke 2 mm · Finnen-Hinterkante bündig mit dem Heck ·
//   Ballast (Knete) sitzt in der Nase bei noseLen/2 ·
//   Motor steckt ganz im Heck (Mitte = motor.lengthMm/2 vor dem Heck).
//   Nase = dünne Kegelschale (Schwerpunkt bei ⅔·noseLen von der Spitze),
//   Rohr = Kreisring-Zylinder, Finnen-Schwerpunkt genähert bei halber Wurzeltiefe.

const PLA_G_PRO_MM3 = 0.00124;
const WAND_MM = 1.2;
const FINNEN_DICKE_MM = 2;

/** Dichte der Knete (Plastilin) in g/mm³ — für die Ballast-Lage in der Nase. */
const KNETE_G_PRO_MM3 = 0.0017;

/**
 * Schwerpunkt des Ballasts in der kegelförmigen Nasenkavität (mm ab Spitze).
 *
 * Die Kavität ist ein Kegel der Höhe U = noseLen·di/d mit Basisradius di/2 an
 * der Nasenbasis. Knete wird von der Basis her eingedrückt und füllt einen
 * Kegelstumpf; dessen Schwerpunkt folgt aus zwei ähnlichen Kegeln.
 */
function ballastSchwerpunkt(d, di, noseLen, ballastG) {
  if (ballastG <= 0) return noseLen / 2;
  const U = noseLen * (di / d); // Höhe der Kavität, Spitze bei x = noseLen − U
  const vGesamt = (Math.PI / 3) * (di / 2) ** 2 * U;
  const vBallast = ballastG / KNETE_G_PRO_MM3;
  if (vGesamt <= 0) return noseLen / 2;
  // Rest-Kegel (ungefüllt, an der Spitze): Höhe u_f aus dem Volumenverhältnis.
  const anteilLeer = Math.max(0, 1 - Math.min(1, vBallast / vGesamt));
  const uf = U * Math.cbrt(anteilLeer);
  // Schwerpunkt des Kegelstumpfs, gemessen ab der Kegelspitze der Kavität:
  //   x̄ = ¾·(U⁴ − u_f⁴)/(U³ − u_f³)
  const nenner = U ** 3 - uf ** 3;
  const xAbSpitze = nenner > 0 ? 0.75 * ((U ** 4 - uf ** 4) / nenner) : 0.75 * U;
  return noseLen - U + xAbSpitze;
}

/**
 * Leitet aus der Bau-Geometrie Massen, Schwerpunkt (mit Motor), Druckpunkt
 * (Barrowman) und Stabilitätsmaß ab. Alle Längen in mm, Massen in g.
 */
export function computeRocket({ d, tubeLen, noseLen, finRoot, finTip, finSpan, finCount, ballast = 0, motor = MOTORS.C6 }) {
  const di = d - 2 * WAND_MM;
  // Kegelschale: Volumen = äußerer Kegel minus innerer (ähnlicher) Kegel.
  const mNaseSchale = PLA_G_PRO_MM3 * (Math.PI / 12) * noseLen * (d * d - (di * di * di) / d);
  const mRohr = PLA_G_PRO_MM3 * (Math.PI / 4) * (d * d - di * di) * tubeLen;
  const mFin = PLA_G_PRO_MM3 * finCount * ((finRoot + finTip) / 2) * finSpan * FINNEN_DICKE_MM;
  const mMotor = motor.totalMassKg * 1000;

  // Schwerpunkt der Kegelschale: Differenz zweier Kegel, nicht ⅔·L des
  // Vollkegels — die Schale liegt weiter hinten als der massive Kegel.
  //   x = (V_a·¾L − V_i·L·(1 − ¼·di/d)) / (V_a − V_i)
  const vAussen = (Math.PI / 12) * d * d * noseLen;
  const vInnen = (Math.PI / 12) * ((di * di * di) / d) * noseLen;
  const xNaseSchale =
    vAussen - vInnen > 0
      ? (vAussen * 0.75 * noseLen - vInnen * noseLen * (1 - 0.25 * (di / d))) / (vAussen - vInnen)
      : (2 / 3) * noseLen;

  // Ballast-Schwerpunkt: Knete wird von der BASIS her in die Nasenkavität
  // gedrückt und füllt den Kegelstumpf von hinten. Sie sitzt deshalb nicht in
  // der Spitze (dort ist der Innenradius nur wenige Zehntel), sondern deutlich
  // weiter hinten. Vorher war noseLen/2 angesetzt — der größte Einzelfehler
  // des Massenmodells und der Grund, warum das Stabilitätsmaß zu optimistisch
  // ausfiel (die Bau-Constraint S ≥ 1 gab damit zu knappe Entwürfe frei).
  const xBallast = ballastSchwerpunkt(d, di, noseLen, ballast);

  const mNase = mNaseSchale + ballast;
  const xNase = mNase > 0 ? (mNaseSchale * xNaseSchale + ballast * xBallast) / mNase : xNaseSchale;
  const xRohr = noseLen + tubeLen / 2;
  // Flächenschwerpunkt des Trapezes, von der Hinterkante aus gemessen:
  //   ξ = (C_R² + C_R·C_T + C_T²) / (3·(C_R + C_T))
  const xiFin =
    finRoot + finTip > 0
      ? (finRoot * finRoot + finRoot * finTip + finTip * finTip) / (3 * (finRoot + finTip))
      : finRoot / 2;
  const xFin = noseLen + tubeLen - xiFin;
  const xMotor = noseLen + tubeLen - motor.lengthMm / 2;

  const masses = { mNase, xNase, mRohr, xRohr, mFin, xFin, mMotor, xMotor };
  const xcg =
    (mNase * xNase + mRohr * xRohr + mFin * xFin + mMotor * xMotor) /
    (mNase + mRohr + mFin + mMotor);
  const xcp = barrowmanCp({ d, tubeLen, noseLen, finRoot, finTip, finSpan, finCount });
  return {
    masses,
    massEmptyG: mNaseSchale + ballast + mRohr + mFin,
    xcg,
    xcp,
    stability: (xcp - xcg) / d,
  };
}

/**
 * Druckpunkt nach Barrowman (reduziert): Kegelnase (C_N = 2 bei ⅔·L_n) +
 * Trapezflossen mit Körper-Interferenzfaktor, Hinterkanten bündig am Heck.
 * Identische Mathematik wie die Formel rocket_cp in content/formulas.json.
 */
export function barrowmanCp({ d, tubeLen, noseLen, finRoot, finTip, finSpan, finCount }) {
  const xNose = (2 / 3) * noseLen;
  // Mittellinien-Länge der Flosse (Pfeilung der Vorderkante = finRoot − finTip).
  const l = Math.sqrt(finSpan * finSpan + ((finRoot - finTip) / 2) ** 2);
  const cnFin =
    (1 + d / 2 / (finSpan + d / 2)) *
    ((4 * finCount * (finSpan / d) ** 2) /
      (1 + Math.sqrt(1 + ((2 * l) / (finRoot + finTip)) ** 2)));
  const xFin =
    (noseLen + tubeLen - finRoot) +
    ((finRoot - finTip) / 3) * ((finRoot + 2 * finTip) / (finRoot + finTip)) +
    ((finRoot + finTip) - (finRoot * finTip) / (finRoot + finTip)) / 6;
  return (2 * xNose + cnFin * xFin) / (2 + cnFin);
}

// ── Flugbahn (RK4) ───────────────────────────────────────────────────────────

const G = 9.81; // m/s²

/**
 * Senkrechter Flug per Runge-Kutta 4. Ordnung, feste Schrittweite.
 * Zustand [h, v]; Kräfte: Schub (Kurve) − Gewicht − Luftwiderstand (½ρc_wAv²,
 * stets gegen die Bewegung). Masse nimmt während des Brennens proportional
 * zum bereits verbrauchten Impuls ab. Die Rakete hebt erst ab, wenn der
 * Schub das Gewicht übersteigt (Haltebock).
 */
export function simulateFlight({ motor = 'C6', massEmptyG, d, cw = 0.75, rho = 1.225, dt = 0.01 }) {
  const mot = typeof motor === 'string' ? MOTORS[motor] : motor;
  if (!mot) throw new Error(`Motor '${motor}' unbekannt.`);
  const iTotal = totalImpulse(mot);
  const tBurnout = mot.points[mot.points.length - 1][0];
  const area = Math.PI * (d / 2000) ** 2; // mm → m, Stirnfläche in m²

  // Verbrauchter Impuls bis t (Trapez, konsistent zu totalImpulse).
  const impulseUntil = (t) => {
    const pts = mot.points;
    let sum = 0;
    for (let i = 1; i < pts.length; i++) {
      const [t1, f1] = pts[i - 1];
      const [t2, f2] = pts[i];
      if (t >= t2) {
        sum += ((f1 + f2) / 2) * (t2 - t1);
      } else if (t > t1) {
        const f = f1 + ((f2 - f1) * (t - t1)) / (t2 - t1);
        sum += ((f1 + f) / 2) * (t - t1);
        break;
      } else {
        break;
      }
    }
    return sum;
  };

  const massAt = (t) => {
    const burned = mot.propellantMassKg * (t >= tBurnout ? 1 : impulseUntil(t) / iTotal);
    return massEmptyG / 1000 + mot.totalMassKg - burned;
  };

  const accel = (t, v) => {
    const drag = 0.5 * rho * cw * area * v * Math.abs(v);
    return (thrustAt(mot, t) - drag) / massAt(t) - G;
  };

  const trajectory = [];
  let t = 0;
  let h = 0;
  let v = 0;
  let lifted = false;
  let vMax = 0;
  let apogee = 0;
  let tApogee = 0;
  let vBurnout = 0;
  const T_MAX = 120;

  while (t < T_MAX) {
    if (lifted && h <= 0) {
      trajectory.push({ t, h: 0, v }); // sauber am Boden enden
      break;
    }
    trajectory.push({ t, h, v });

    if (!lifted) {
      // Haltebock: erst loslassen, wenn der Schub das Gewicht übersteigt.
      if (thrustAt(mot, t) > massAt(t) * G) {
        lifted = true;
      } else {
        t += dt;
        continue;
      }
    }

    // Klassisches RK4 auf [h, v].
    const k1h = v;
    const k1v = accel(t, v);
    const k2h = v + (dt / 2) * k1v;
    const k2v = accel(t + dt / 2, v + (dt / 2) * k1v);
    const k3h = v + (dt / 2) * k2v;
    const k3v = accel(t + dt / 2, v + (dt / 2) * k2v);
    const k4h = v + dt * k3v;
    const k4v = accel(t + dt, v + dt * k3v);
    h += (dt / 6) * (k1h + 2 * k2h + 2 * k3h + k4h);
    v += (dt / 6) * (k1v + 2 * k2v + 2 * k3v + k4v);
    t += dt;

    if (v > vMax) vMax = v;
    if (h > apogee) {
      apogee = h;
      tApogee = t;
    }
    if (Math.abs(t - tBurnout) < dt / 2) vBurnout = v;
  }

  return { apogee, vMax, tApogee, tBurnout, vBurnout, trajectory };
}
