// gear.scad — EIN parametrisches Stirnrad: die geometrische Wahrheit (Eiserne Regel 4).
//
// Die Zahnkontur wird NICHT mehr hier gerechnet, sondern von gearProfile() aus
// @buildlab/iso übergeben (Punktliste `profile`, mm, geschlossen, gegen den
// Uhrzeigersinn). Damit zeigen Simulation und gedrucktes Teil exakt dieselbe
// Evolvente — vorher gab es zwei unabhängige, beide fehlerhafte Zahnformen:
// Der Kopfkreis lag 29 % zu tief und die zweite Flanke war rotiert statt
// gespiegelt, wodurch die Zahndicke nach außen wuchs und zwei Räder auf dem
// korrekten Achsabstand kollidierten.
//
// Der Körper (Nabe, Bohrung, Fasen) entsteht weiterhin hier — er ist reine
// Konstruktion und hat keine Entsprechung im 2D-Bild.

module gear(profile, thickness = 8, bore = 5, hub = 0, hubHeight = 0, chamfer = 0.6) {
  r_bore = bore / 2;

  difference() {
    union() {
      // Zahnkranz + Scheibe aus der übergebenen Evolventen-Kontur.
      // Die Kontur ist bereits geschlossen und enthält den Fußkreis, deshalb
      // genügt ein einziges Polygon — keine Vereinigung mit einem Kreis, deren
      // Facettierung die Zähne bei großen Rädern abreißen ließ.
      linear_extrude(height = thickness, center = true)
        polygon(points = profile);

      // Nabe (optional): verlängert die Lagerlänge auf der Welle.
      if (hub > 0 && hubHeight > 0)
        cylinder(h = thickness + 2 * hubHeight, r = hub / 2, center = true, $fn = 64);
    }

    // Wellenbohrung, durchgehend.
    cylinder(h = thickness + 2 * hubHeight + 2, r = r_bore, center = true, $fn = 48);

    // Fasen an den Bohrungskanten (Druckhilfe + entgratete Kante).
    if (chamfer > 0) {
      zTop = (hub > 0 && hubHeight > 0) ? thickness / 2 + hubHeight : thickness / 2;
      translate([0, 0, zTop - chamfer + 0.01])
        cylinder(h = chamfer, r1 = r_bore, r2 = r_bore + chamfer, $fn = 48);
      translate([0, 0, -zTop - 0.01])
        cylinder(h = chamfer, r1 = r_bore + chamfer, r2 = r_bore, $fn = 48);
    }
  }
}
