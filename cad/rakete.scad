// rakete.scad — EINE parametrische Modellrakete: die geometrische Wahrheit (Eiserne Regel 4).
//
// Zwei druckbare Teile aus demselben Parametersatz (part wählt aus):
//   "rumpf" — Körperrohr (hohl, Wand 1,2 mm) mit Motorschacht-Anschlagring für einen
//             18-mm-Motor (Estes C6) und finCount radialen Trapezflossen, deren
//             Hinterkanten bündig mit dem Heck (z = 0) abschließen.
//   "nase"  — Kegelschale mit Steckschulter, die ins Rohr-Innere greift (0,4 mm Spiel).
//
// Die Konventionen (Wand 1,2 · Finnendicke 2 · Hinterkante bündig · Motor im Heck)
// sind DIESELBEN wie im Massenmodell packages/engine/rocket.js — der Paritätstest
// dort wacht über die Formeln; hier entsteht nur die Geometrie für Vorschau + STL.

wand = 1.2;         // Wandstärke [mm]
finnen_dicke = 2;   // Finnendicke [mm]
motor_l = 70;       // Länge des 18-mm-Motors [mm] (Estes C6)
motor_d = 18;       // Durchmesser des Motors [mm]
schulter_h = 12;    // Höhe der Nasen-Steckschulter [mm]
einbettung = 0.5;   // Finnen greifen so tief in die Rohrwand (Druckhaftung) [mm]

module rakete(part, d, tubeLen, noseLen, finRoot, finTip, finSpan, finCount) {
  di = d - 2 * wand;

  if (part == "rumpf") {
    // Körperrohr: außen d, innen di, Heck bei z = 0.
    difference() {
      cylinder(d = d, h = tubeLen);
      translate([0, 0, -1]) cylinder(d = di, h = tubeLen + 2);
    }

    // Anschlagring für den Motor: der Motor steckt von unten im Heck und
    // stößt 4 mm vor seinem oberen Ende an (typische Einbautiefe).
    translate([0, 0, motor_l - 4]) difference() {
      cylinder(d = di + 0.02, h = 4);
      translate([0, 0, -1]) cylinder(d = motor_d - 1, h = 6);
    }

    // Trapezflossen: Profil in der (radial, axial)-Ebene — Wurzeltiefe finRoot am
    // Rohr, Spitzentiefe finTip außen, Hinterkanten auf z = 0. Die Platte greift
    // 0,5 mm in die Wand (saubere Vereinigung; aerodynamisch vernachlässigbar).
    for (i = [0 : finCount - 1])
      rotate([0, 0, i * 360 / finCount])
        translate([d / 2 - einbettung, 0, 0])
          rotate([90, 0, 0])
            linear_extrude(height = finnen_dicke, center = true)
              polygon([[0, 0], [0, finRoot], [finSpan, finTip], [finSpan, 0]]);
  }

  if (part == "nase") {
    // Kegelschale: äußerer Kegel minus innerer (ähnlicher) Kegel — wie das
    // Massenmodell der Engine sie rechnet.
    difference() {
      cylinder(d1 = d, d2 = 0, h = noseLen);
      translate([0, 0, -0.01]) cylinder(d1 = di, d2 = 0, h = noseLen * di / d);
    }

    // Steckschulter: greift mit 0,4 mm Spiel ins Rohr-Innere.
    translate([0, 0, -schulter_h]) difference() {
      cylinder(d = di - 0.4, h = schulter_h + 0.01);
      translate([0, 0, -1]) cylinder(d = di - 0.4 - 2 * wand, h = schulter_h + 2);
    }
  }
}
