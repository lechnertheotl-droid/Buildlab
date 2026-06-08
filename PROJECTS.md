# PROJECTS.md — Projekt-Curriculum (grober Plan)

Jedes Projekt ist ein **baubares Ergebnis**, das echte Maschinenbau-Themen abdeckt.
Aufbau über vier Niveaus; spätere Projekte setzen frühere Skill-Map-Knoten voraus.
Format je Projekt: **Name** → *Bau-Ergebnis* · Skill-Map-Knoten · Kerninhalte.

Skill-Map-Knoten: Zeichnen&Toleranzen · Statik · Festigkeit · Kinematik/Dynamik ·
Werkstoffe · Maschinenelemente · Fertigung · Thermo/Strömung · Konstruktionsmethodik.

---

## Niveau 1 — Grundlagen (verspielt, schnelle Erfolge)

1. **Passungs-Trainer** → *3D-gedrucktes Steck-Set (Spiel-/Übergangs-/Presspassung)*
   · Zeichnen&Toleranzen · ISO-Passungen, Maße, Toleranzfelder, Oberflächen.
2. **Fachwerkbrücke** → *Strebenmodell (Karton/Holz/Druck)*
   · Statik · Kräftegleichgewicht, Stabkräfte, Knotenpunktverfahren.
3. **Flaschenzug & Hebel** → *funktionierender Flaschenzug*
   · Statik · Hebelgesetz, Drehmoment, mechanische Übersetzung, Wirkungsgrad.
4. **Material-Biegeprobe** → *Halter für eigene Biegeversuche*
   · Werkstoffe · Steifigkeit, E-Modul, elastisch/plastisch (intuitiv).

## Niveau 2 — Aufbau (echte Auslegung, Maschinenelemente)

5. **Stirnradgetriebe** → *3D-gedrucktes Getriebe*
   · Maschinenelemente · Kinematik · Übersetzung, Modul, Zähnezahl, Achsabstand,
   Drehmomentwandlung (DIN 3990 vereinfacht).
6. **Welle auslegen** → *Welle mit Lagerung*
   · Festigkeit · Biegung, Torsion, Vergleichsspannung, Welle nach DIN 743.
7. **Schraubverbindung** → *verschraubte Baugruppe*
   · Maschinenelemente · Vorspannkraft, Schraubengröße, Reibung, Anziehmoment.
8. **Wälzlagerung** → *gelagerte Welle*
   · Maschinenelemente · Lagertypen, Belastung, L10-Lebensdauer.
9. **Kurbelschwinge (Viergelenk)** → *bewegliches Gestängemodell*
   · Kinematik · ebene Mechanismen, Geschwindigkeit/Beschleunigung, Totlagen.

## Niveau 3 — Vertiefung (Dynamik, Wärme, Strömung)

10. **Schwungrad-Energiespeicher** → *Schwungrad auf Lager*
    · Dynamik · Massenträgheitsmoment, Rotationsenergie, Drehimpuls.
11. **Kragträger optimieren** → *Lasthalter (Leichtbau)*
    · Festigkeit · Biegelinie, Durchbiegung, Materialeinsatz, Spannungs-Overlay.
12. **Stirling-Motor** → *3D-druckbarer Stirling-Motor*
    · Thermo/Strömung · Kreisprozess, Wärme→Arbeit, Wirkungsgrad.
13. **★ Modellrakete (Flaggschiff)** → *druckbare Rakete (STL), real flugfähig*
    · Thermo/Strömung · Festigkeit · Stabilität (Barrowman, CP vs. CG), Schubkurve,
    Luftwiderstand, Flugbahn-Simulation (Apogäum, Maximalgeschwindigkeit).

## Niveau 4 — Meisterstücke (Integration ganzer Maschinen)

14. **Antriebsstrang komplett** → *Motor → Getriebe → Welle → Last*
    · Maschinenelemente · Dynamik · Integration der Knoten aus Niveau 2/3.
15. **Robotergreifer** → *3D-gedruckter Greifmechanismus (optional Servo)*
    · Kinematik · Fertigung · Konstruktion · Mechatronik-Basis.
16. **Tischkran / Hebezeug** → *funktionierender kleiner Kran*
    · Statik · Festigkeit · Maschinenelemente · end-to-end-Auslegung.
17. **Eigenes Projekt (Sandbox)** → *freie Konstruktion nach Anforderung*
    · Konstruktionsmethodik · Anforderung → Konzept → Auslegung → Bau → Test.

---

## Reihenfolge & Abhängigkeiten

- **Empfohlener Pfad:** 1→4 in beliebiger Reihenfolge, dann 5 als erstes „echtes"
  Auslegungsprojekt. 6–9 bauen darauf auf. Niveau 4 setzt Niveau 2 weitgehend voraus.
- **Drei Einstiegstüren** (für die drei Personas): Studium startet bei 2 (Statik),
  Azubi/Technik bei 1 (Toleranzen), Maker bei 5 (Getriebe, sofort druckbar).
- **Erste benutzbare Version: Projekt 5 (Stirnradgetriebe)** — schneller Erfolg, nutzt
  alle 6 Blocktypen, Pseudo-3D, CAD/STL-Export und prüfungsgenaue Auslegung. Wird in
  `BUILD_PLAN.md` Phase 5 komplett gebaut. Die **Rakete (13)** folgt danach als
  Schaustück mit voller Flug-Simulation.

## Generierungs-Hinweis

Alle Projekte werden über `/generate-project "<name>"` in Claude Code (Abo) erzeugt,
ein Projekt nach dem anderen, jeweils erst nach grünem `pnpm verify`. Pro Projekt in
kleine Schritte (5–15 Min.) zerlegen — siehe Schema in `CLAUDE.md`.
