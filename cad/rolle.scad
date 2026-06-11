// rolle.scad — EINE parametrische Umlenkrolle: die geometrische Wahrheit (Eiserne Regel 4).
//
// Zylinder mit umlaufender Seilrille (halbrunder Querschnitt am Außenrand) und zentraler
// Bohrung für Achse bzw. Karabiner. Vorschau UND STL-Export leiten sich aus genau diesem
// Modell ab. Die Parameter (Außendurchmesser d, Rillenradius groove, Bohrung bore,
// Breite thickness) injiziert der build-Block als Aufruf-Zeile; $fn wird separat
// davor gesetzt (Vorschau-Qualität).

module rolle(d, groove, bore, thickness) {
  difference() {
    // Grundkörper
    cylinder(d = d, h = thickness, center = true);

    // Umlaufende Seilrille: Kreisquerschnitt (Radius groove) um den Außenrand rotiert.
    // Der Querschnitt liegt bei x = d/2 — die Rille schneidet also genau bis zur
    // Tiefe groove in den Rand ein.
    rotate_extrude()
      translate([d / 2, 0])
        circle(r = groove);

    // Zentrale Bohrung (etwas länger als der Körper, saubere Differenz).
    cylinder(d = bore, h = thickness + 2, center = true);
  }
}
