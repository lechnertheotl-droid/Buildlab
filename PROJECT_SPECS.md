# PROJECT_SPECS.md — Detaillierte Projekt-Spezifikationen

Dies ist die verbindliche Vorlage, aus der `/generate-project` (siehe `BUILD_PLAN.md`
Phase 4) den Content erzeugt. `PROJECTS.md` gibt den Überblick; **hier** steht je
Projekt, *was genau* hineingehört, damit die Generierung gut wird.

Drei Projekte sind voll ausgearbeitet (sie werden zuerst gebaut). Die übrigen haben
generierungsfertige Kurz-Specs; der Generator dehnt sie nach **demselben Muster** in
Mikro-Schritte aus, danach Stichprobe durch einen Menschen.

---

## Die Vorlage (jedes Projekt füllt genau diese Felder)

```
### <Nr>. <Name>
- Bau-Ergebnis:        was man am Ende physisch in der Hand hat
- Challenge:           reale Aufgabe mit messbarer Anforderung (das Briefing)
- Voraussetzungen:     Projekte/Konzepte vorher (= Kanten im Concept-Graph)
- Neue Konzepte:       hier ERSTMALS voll erklärt (sonst nur Auffrischung + Link)
- Formeln:             Formel-Bibliothek-IDs + Kurzform
- Mikro-Schritte:      je 5–15 Min · Ziel · genutzte Blocktypen · Interaktion
- Bau-Output:          welche CAD-Parameter → STL, Stückliste
- Simulation & Erfolg: was die Engine rechnet + klares Erfolgskriterium
- Golden Tests:        Prüfaufgaben mit bekanntem Ergebnis (Pflicht!)
- Tiefen-Hinweis:      was auf verspielt / praxis / genau gezeigt wird
```

Regeln für den Generator: pro Schritt **ein** Lernziel; jede neue Formel braucht ein
Formel-Objekt mit Variablen-Erklärungen; jedes gerechnete Beispiel und jede Formel ist
durch einen Golden Test gedeckt; bereits erklärte Konzepte nicht wiederholen.

---

## ★ Voll ausgearbeitet

### 2. Fachwerkbrücke  *(zuerst — beweist exakte Analytik ohne CAD-Komplexität)*
- **Bau-Ergebnis:** Strebenmodell (Stäbchen/Druck), das eine definierte Last trägt.
- **Challenge:** „Brücke über 30 cm Spannweite, trägt 5 kg mittig, möglichst wenig Material."
- **Voraussetzungen:** keine (Einstieg).
- **Neue Konzepte:** Kraft, Kraftvektor, Gleichgewicht (ΣF=0, ΣM=0), Auflagerreaktion,
  Zug-/Druckstab, Knotenpunktverfahren, statische Bestimmtheit.
- **Formeln:** `sum_fx` ΣFₓ=0 · `sum_fy` ΣF_y=0 · `sum_m` ΣM=0 ·
  `det_truss` 2k = s+r (Bestimmtheit) · Stabkraft aus Knotengleichgewicht.
- **Mikro-Schritte:**
  1. Was ist eine Kraft? — text + interactive (Vektor ziehen).
  2. Gleichgewicht ΣF=0 — interactive (Kräfte addieren bis Ruhe).
  3. Auflagerreaktionen — formula + calc (einfacher Balken).
  4. Zug vs. Druck — interactive (Stab färbt sich 2.5D blau/rot).
  5. Knotenpunktverfahren — calc (zwei Knoten lösen).
  6. Statische Bestimmtheit prüfen — check.
  7. Eigene Brücke dimensionieren — build (Geometrie → Stabkräfte berechnet).
  8. Lasttest & Iteration — simulation (welcher Stab versagt?) → optimieren.
- **Bau-Output:** Knotenkoordinaten → Stablängen → druckbare Knoten/Streben (STL); Stabliste.
- **Simulation & Erfolg:** Engine berechnet alle Stabkräfte + Auflagerreaktionen.
  Erfolg = kein Stab über zulässiger Kraft, Modell trägt die Soll-Last.
- **Golden Tests:** symmetrisches Dreieck-Fachwerk mit bekannten Stabkräften;
  Auflagerreaktionen eines mittig belasteten Balkens (Fₐ=F_b=F/2).
- **Tiefen-Hinweis:** verspielt = Kräfte schieben & sehen; praxis = Knoten lösen;
  genau = vollständiges Gleichungssystem + Bestimmtheit.

### 5. Stirnradgetriebe  *(beweist Maschinenelemente + CAD + Variablen-Antippen)*
- **Bau-Ergebnis:** 3D-gedrucktes, drehbares Getriebe mit Ziel-Übersetzung.
- **Challenge:** „Getriebe, das die Motordrehzahl auf 1/3 senkt und das Drehmoment hebt."
- **Voraussetzungen:** Hebel/Übersetzung (Projekt 3), Drehmoment.
- **Neue Konzepte:** Zahnrad, Zähnezahl, Modul, Teilkreisdurchmesser, Achsabstand,
  Übersetzungsverhältnis, Drehmomentwandlung, Wirkungsgrad (qualitativ).
- **Formeln:** `ratio` i=z₂/z₁ · `pitch_d` d=m·z · `axis_dist` a=m(z₁+z₂)/2 ·
  `speed_out` n₂=n₁/i · `torque_out` M₂=M₁·i·η.
- **Mikro-Schritte:**
  1. Warum Zahnräder? — interactive (zwei Räder drehen, Verhältnis spüren).
  2. Übersetzung i=z₂/z₁ — formula (Variablen antippbar) + interactive (Slider z₁,z₂ → i live).
  3. Modul & Teilkreis d=m·z — formula + interactive (Modul ändern → Rad wächst).
  4. Achsabstand a — calc + build (beide Räder müssen zusammenpassen).
  5. Drehzahl & Drehmoment wandeln — formula + calc.
  6. Wirkungsgrad η — text (praxis/genau).
  7. Getriebe parametrisieren — build (z₁,z₂,m → CAD-Vorschau → STL).
  8. Test & Iteration — simulation (dreht es wie gewünscht? Achsabstand ok?).
- **Bau-Output:** Parameter z₁,z₂,m → parametrisches Zahnradpaar (OpenSCAD) → STL;
  Stückliste (2 Räder, 2 Achsen).
- **Simulation & Erfolg:** Engine rechnet i, n₂, M₂, a. Erfolg = i trifft Ziel ±5 %,
  Module beider Räder gleich, Achsabstand baubar.
- **Golden Tests:** z₁=20,z₂=60 → i=3 · m=2,z=20 → d=40 mm · (20,60,m=2) → a=80 mm.
- **Tiefen-Hinweis:** verspielt = Slider + drehende Räder; praxis = Auslegung mit
  Modul-Reihe; genau = Eingriffsverhältnisse, Profilverschiebung (Verweis).

### 13. Modellrakete  *(Flaggschiff — beweist die ganze Pipeline inkl. Simulation + STL)*
- **Bau-Ergebnis:** druckbare, real flugfähige Rakete (Rohr, Nase, Finnen) als STL.
- **Challenge:** „Stabile Rakete mit Motor X, steigt stabil auf und erreicht ≥ 100 m."
- **Voraussetzungen:** Kraft/Statik (2), Schwerpunkt-Idee, Strömungs-Basis.
- **Neue Konzepte:** Schub, Gesamtimpuls, Schwerpunkt (CG), Druckpunkt (CP),
  Stabilitätsmaß (Kaliber), Luftwiderstand, Flugphasen, Barrowman-Methode (qualitativ).
- **Formeln:** `stability` (CP−CG)/d · `drag` Fw=½·ρ·v²·c_w·A · `newton` F=m·a (Flug-ODE) ·
  `impulse` I=∫F dt · Apogäum aus ODE/Energie.
- **Mikro-Schritte:**
  1. Wie fliegt eine Rakete? Schub vs. Gewicht — interactive.
  2. Schwerpunkt finden — interactive (CG wandert mit Masseverteilung).
  3. Druckpunkt & warum Finnen — interactive (Finnen ändern → CP wandert).
  4. Stabilitätsmaß (CP−CG)/d — formula (antippbar) + Regel 1–2 Kaliber.
  5. Luftwiderstand Fw — formula + interactive (Slider v → Fw).
  6. Schubkurve eines echten Motors — calc (Gesamtimpuls).
  7. Finnen & Nase parametrisieren — build (→ CAD-Vorschau → STL).
  8. Flug simulieren — simulation (Apogäum, v_max, Stabilität; Barrowman + ODE).
  9. Iterieren bis stabil & Zielhöhe — iterate.
- **Bau-Output:** Parameter (Rohr-Ø, Länge, Finnengeometrie, Nasenform, Motorklasse)
  → parametrisches Modell → STL; Stückliste.
- **Simulation & Erfolg:** Engine rechnet CG, CP, Stabilitätsmaß, Flugbahn.
  Erfolg = Stabilitätsmaß 1–2 Kaliber **und** Apogäum ≥ Ziel.
- **Golden Tests:** Fw bei gegebenen ρ,v,c_w,A · Stabilitätsmaß bei bekannten CP,CG,d ·
  Apogäum einer dokumentierten Beispielrakete (Toleranz).
- **Tiefen-Hinweis:** verspielt = Slider + „stabil?"-Ampel; praxis = Faustregel
  1–2 Kaliber; genau = Barrowman-Gleichungen + Flug-ODE-Herleitung.

---

## Generierungsfertige Kurz-Specs (übrige Projekte)

Format: *Voraussetzungen · neue Konzepte · Formeln · Bau-Output · Erfolg.*

**1. Passungs-Trainer** — keine · Nennmaß, oberes/unteres Abmaß, Spiel-/Übergangs-/
Presspassung, ISO-System · Höchst-/Mindestmaß, Spiel/Übermaß · Steckpaare definierten
Spiels → STL · Passung verhält sich wie berechnet.

**3. Flaschenzug & Hebel** — (2) · Hebelgesetz, Drehmoment, lose/feste Rolle,
Übersetzung, Wirkungsgrad · M=F·r, F=Last/n, η · Flaschenzug-Teile → STL · berechnete
Zugkraft entspricht Versuch.

**4. Material-Biegeprobe** — keine · Spannung σ=F/A, Dehnung, E-Modul,
elastisch/plastisch · σ=F/A, ε=ΔL/L, E=σ/ε · Probenhalter → STL · vorhergesagte vs.
gemessene Steifigkeit.

**6. Welle auslegen** — (4,5) · Biege-/Torsionsmoment, Widerstandsmoment,
Vergleichsspannung, Sicherheit (DIN 743) · σ_b=M_b/W_b, τ_t=M_t/W_t,
σ_v=√(σ²+3τ²), W_b=πd³/32 · Wellendurchmesser → STL · σ_v < zul. Spannung mit Sicherheit.

**7. Schraubverbindung** — (4) · Vorspannkraft, Anziehmoment, Reibung,
Festigkeitsklasse, Flächenpressung · M_A=k·F_V·d · verschraubte Baugruppe → STL ·
Vorspannung hält Last ohne Überlastung.

**8. Wälzlagerung** — (6) · Lagertypen, Trag­zahl, äquivalente Last, L10-Lebensdauer ·
L10=(C/P)^p, P=X·F_r+Y·F_a · Lagerwahl + Wellensitz → STL · L10 ≥ Soll-Lebensdauer.

**9. Kurbelschwinge (Viergelenk)** — (3) · Gelenk, Freiheitsgrad, Kurbel/Schwinge,
Totlage, Übertragungswinkel · Grübler F=3(n−1)−2g, Grashof-Bedingung · bewegliches
Gestänge → STL · Mechanismus läuft durch, Grashof erfüllt.

**10. Schwungrad** — (5,9) · Massenträgheitsmoment, Rotationsenergie, Drehimpuls ·
E=½Jω², J=½mr², L=Jω · Schwungrad → STL · gespeicherte Energie wie berechnet.

**11. Kragträger optimieren** — (4,6) · Biegelinie, Durchbiegung, Flächenträgheits­moment,
Leichtbau · f=FL³/(3EI), I=bh³/12, σ=M/W · optimiertes Profil → STL · Durchbiegung <
Grenze bei minimaler Masse.

**12. Stirling-Motor** — keine (Thermo-Ast) · ideales Gas, Zustandsänderungen,
Stirling-Kreisprozess, Wirkungsgrad · pV=nRT, W=∮p dV, η=1−T_kalt/T_warm · Stirling-Teile
→ STL · theoretischer Wirkungsgrad berechnet, Modell läuft.

**14. Antriebsstrang komplett** — (5,6,8) · Leistungsfluss, Wirkungsgradkette,
Drehzahl-/Drehmomentverlauf · P=M·ω, η_ges=∏η_i, Übersetzungskette · Baugruppe →
STL/Stückliste · Soll-Abtrieb (n,M) erreicht.

**15. Robotergreifer** — (9, Fertigung) · Greifkinematik, Kraftübersetzung, Gelenkkette,
Aktuator-Basis · Hebel/Kinematik, Greifkraft · Greifer → STL (+ optional Servo-Halter) ·
greift Zielobjekt mit ausreichender Kraft.

**16. Tischkran / Hebezeug** — (2,4,6) · Standsicherheit, Kippmoment, Auslegerbiegung,
Umlenkung · Standmoment vs. Kippmoment, Biegung Ausleger · Kran → STL/Stückliste · hebt
Last ohne Kippen, Spannung im Rahmen.

**17. Eigenes Projekt (Sandbox)** — viele · Konstruktionsmethodik (Anforderungsliste,
Konzeptvarianten, Bewertung, Auslegung, Test) · projektabhängig (Engine + Rechner offen)
· freies Modell → STL · erfüllt die selbst gesetzte Anforderungsliste.

---

## Reihenfolge der Erstellung

Zuerst **5 (Stirnradgetriebe)** komplett — das ist die erste benutzbare Version
(Vorbild: `content/_example.getriebe.json`). Danach **2 (Fachwerkbrücke)** und als
Schaustück **13 (Rakete)**. Sind diese stabil und durch Golden Tests gedeckt, folgen
die übrigen Projekte nach demselben Muster — eins nach dem anderen, jeweils erst nach
grünem `pnpm verify`.
