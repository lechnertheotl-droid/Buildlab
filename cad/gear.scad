// gear.scad — EIN parametrisches Stirnrad: die geometrische Wahrheit (Eiserne Regel 4).
//
// Vereinfachte Evolventenverzahnung (Eingriffswinkel 20°, Addendum = m, Dedendum = 1.25·m).
// Vorschau UND STL-Export leiten sich aus genau diesem Modell ab — es gibt kein zweites
// Geometriemodell. Die Parameter (Modul m, Zähnezahl z, Breite, Bohrung) injiziert der
// build-Block als Aufruf-Zeile; $fn wird separat davor gesetzt (Vorschau-Qualität).

PA = 20; // Eingriffswinkel [Grad]

// Ein Punkt auf der Evolvente am Grundkreis rb, Abrollwinkel t [Grad].
function inv_pt(rb, t) = [
  rb * (cos(t) + (t * PI / 180) * sin(t)),
  rb * (sin(t) - (t * PI / 180) * cos(t))
];

// Halbe Zahn-Flanke als Punktliste (steps Stützpunkte vom Grund- bis zum Kopfkreis).
function flank(rb, r_add, steps) = [
  for (i = [0 : steps])
    let (
      r = rb + (r_add - rb) * i / steps,
      t = acos(rb / max(r, rb)) // Abrollwinkel bis zum Radius r
    ) inv_pt(rb, t)
];

function rotate_pt(p, a) = [
  p[0] * cos(a) - p[1] * sin(a),
  p[0] * sin(a) + p[1] * cos(a)
];
function reverse_list(l) = [for (i = [len(l) - 1 : -1 : 0]) l[i]];

module gear(m = 2, z = 20, thickness = 8, bore = 5) {
  r_pitch = m * z / 2;
  r_base  = r_pitch * cos(PA);
  r_add   = r_pitch + m;            // Kopfkreis
  r_root  = max(r_pitch - 1.25 * m, bore / 2 + 0.8); // Fußkreis (über der Bohrung)
  steps   = 5;

  ang_pitch  = 360 / z;
  tooth_half = ang_pitch / 4;       // halbe Zahndicke am Grundkreis (Näherung)
  half       = flank(r_base, r_add, steps);

  // Fußpunkte etwas UNTER dem Fußkreis, damit jeder Zahn die Körperscheibe sicher
  // überlappt und mit ihr verschmilzt (sonst hängen die Zähne lose, wenn r_base > r_root).
  r_inner    = min(r_base, r_root) - 0.2;
  base_l = [r_inner * cos( tooth_half), r_inner * sin( tooth_half)];
  base_r = [r_inner * cos(-tooth_half), r_inner * sin(-tooth_half)];

  linear_extrude(height = thickness, center = true)
    difference() {
      union() {
        circle(r = r_root);
        for (k = [0 : z - 1])
          rotate(k * ang_pitch)
            // Geschlossenes Zahnprofil: Fuß (innen) → linke Flanke hoch → Kopf →
            // rechte Flanke runter → Fuß. Reicht bis unter den Fußkreis (r_inner),
            // damit es mit circle(r_root) eine zusammenhängende Fläche bildet.
            polygon(points = concat(
              [base_l],
              [for (p = half) rotate_pt(p,  tooth_half)],
              [for (p = reverse_list(half)) rotate_pt(p, -tooth_half)],
              [base_r]
            ));
      }
      circle(r = bore / 2);
    }
}
