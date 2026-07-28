// bruecke.scad — EINE parametrische Fachwerkbrücke: die geometrische Wahrheit
// (Eiserne Regel 4).
//
// Knoten- und Stabliste werden NICHT hier gerechnet, sondern von bridgePreset()
// aus @buildlab/engine übergeben — derselben Funktion, mit der solveTruss die
// Stabkräfte bestimmt und das Bau-Panel die Vorschau zeichnet. Damit kann das
// gedruckte Teil nicht von der Statik abweichen, die der Lernende gerade
// durchgerechnet hat (dasselbe Muster wie gearProfile beim Zahnrad).
//
// Koordinaten: x = Spannweite, y = Höhe des Fachwerks, z = Bautiefe.
// Gedruckt wird flach liegend — die Scheibe liegt in der xy-Ebene auf z = 0.

// ── Bauregeln, die nicht am Regler hängen ────────────────────────────────────
knoten_faktor = 1.6;  // Knotenblech-Durchmesser als Vielfaches der Stabbreite
fuss_breite   = 16;   // Auflagerfuß in x [mm]
fuss_hoehe    = 4;    // Auflagerfuß in y [mm], ragt unter den Untergurt
oese_r        = 3.2;  // Radius der Lastöse (Schlaufe für das Prüfgewicht) [mm]
oese_ring     = 2.4;  // Materialstärke um die Öse [mm]

/**
 * nodes  : [[x,y], …] in mm
 * bars   : [[i,j], …] Indexpaare
 * feet   : [i, …] Knoten, die einen Auflagerfuß bekommen
 * eye    : Knotenindex für die Lastöse (-1 = keine)
 * b      : Stabbreite in der Scheibenebene [mm]
 * tiefe  : Bautiefe (Extrusion) [mm]
 */
module bruecke(nodes, bars, feet, eye, b, tiefe) {
  // Die Scheibe wird in der xy-Ebene konstruiert und dann aufgestellt: x bleibt
  // die Spannweite, die Fachwerkhöhe wandert auf die Welt-Hochachse z, die
  // Bautiefe nach hinten. So steht die Brücke in der Vorschau, statt flach wie
  // eine Bodenplatte zu liegen — gedruckt wird sie trotzdem liegend.
  rotate([90, 0, 0])
  linear_extrude(height = tiefe)
    union() {
      // Stäbe: je ein Rechteck der Breite b zwischen zwei Knoten.
      for (e = bars) {
        p = nodes[e[0]];
        q = nodes[e[1]];
        dx = q[0] - p[0];
        dy = q[1] - p[1];
        len = sqrt(dx * dx + dy * dy);
        translate([p[0], p[1]])
          rotate([0, 0, atan2(dy, dx)])
            translate([0, -b / 2])
              square([len, b]);
      }

      // Knotenbleche: runden die Stabübergänge aus und verschmelzen sie.
      for (n = nodes)
        translate([n[0], n[1]])
          circle(r = b * knoten_faktor / 2, $fn = 32);

      // Auflagerfüße: schaffen eine ebene Standfläche unter den Lagerknoten.
      for (i = feet)
        translate([nodes[i][0] - fuss_breite / 2, nodes[i][1] - fuss_hoehe])
          square([fuss_breite, fuss_hoehe + b / 2]);

      // Lastöse: Ring unter dem Lastknoten, durch den die Schlaufe läuft.
      // Der Ring sitzt so tief, dass die Bohrung den Untergurt NICHT anschneidet
      // (Lochoberkante bleibt unter der Gurtunterkante), überlappt ihn aber mit
      // seinem Material — sonst hinge er nur tangential am Rest.
      if (eye >= 0)
        translate([nodes[eye][0], nodes[eye][1] - (b / 2 + oese_r + 0.5)])
          difference() {
            circle(r = oese_r + oese_ring, $fn = 40);
            circle(r = oese_r, $fn = 40);
          }
    }
}
