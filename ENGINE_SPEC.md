# ENGINE_SPEC.md — Rechen-Engine & Laufzeit-Regeln

Die Engine (`packages/engine`) ist die **einzige Quelle für Zahlen**. Sie wertet
Formeln aus `formulas.json` aus und löst die Simulationen unten. Kein KI-Output
liefert je selbst eine Zahl.

## Formel-Auswertung

- `expr` wird mit **mathjs** ausgewertet; Variablennamen = die `var`-Felder.
- Eingaben kommen als Zahlen in der Basis-Einheit der jeweiligen Variable.
- Zusätzlich existiert eine **einheitenbehaftete** Auswertung (mathjs units) nur für
  die Dimensionsanalyse in `verify` (siehe `VERIFICATION.md`), nicht für die Anzeige.

## Simulationstypen (je Typ: Methode · Eingaben → Ausgaben)

- **Statik / Fachwerk** — lineares Gleichungssystem aus Knotengleichgewicht
  (ΣFₓ=0, ΣF_y=0 je Knoten), gelöst über `math.lusolve`.
  Ein: Knoten, Stäbe, Auflager, Lasten → Aus: Stabkräfte (+/− = Zug/Druck), Auflagerreaktionen.
- **Balkenbiegung** — geschlossene Formeln je Lastfall (z. B. f = FL³/(3EI)).
  Ein: Geometrie, Last, E-Modul → Aus: Durchbiegung, Biegespannung.
- **Maschinenelemente** — direkte Formel-Auswertung (Getriebe, Welle nach DIN 743
  vereinfacht, Lager L10). Ein: Bauteilparameter → Aus: Kennwerte + Sicherheit.
- **Kinematik (Gelenkgetriebe)** — Schließbedingung der Gelenkschleife, numerisch
  gelöst über den Antriebswinkel. Ein: Gliedlängen, Winkel → Aus: Lagen, Geschwindigkeit.
- **Rakete** — CG = massengewichteter Schwerpunkt; CP = Summe der Barrowman-Beiträge;
  Stabilitätsmaß = (CP−CG)/d. Flugbahn via **RK4-Integration** von F = m·a mit
  Schubkurve(t) und Luftwiderstand. Ein: Geometrie, Massen, Motorklasse → Aus: CG, CP,
  Stabilitätsmaß, Höhe(t), Apogäum, v_max.
- **Thermodynamik (Stirling)** — Zustandspunkte des Kreisprozesses; Arbeit = ∮p dV;
  Wirkungsgrad mit Carnot-Obergrenze η = 1 − T_kalt/T_warm.

> Hinweis (Default, von dir überstimmbar): Schubkurven der Motoren werden aus einem
> offenen Schubkurven-Datensatz im verbreiteten `.eng`-Format gelesen. CAD-Modelle
> entstehen mit OpenSCAD; für Zahnräder wird eine offene Evolventen-Zahnrad-Bibliothek
> eingebunden, statt die Verzahnung selbst zu schreiben.

## Präzision & Toleranz

- Intern doppelte Genauigkeit (IEEE-754 double), keine vorzeitige Rundung.
- **Anzeige**: sinnvoll gerundet je Größe (z. B. Spannungen 0–1 Nachkommastelle,
  Übersetzung 2 Nachkommastellen); Einheiten immer mitführen.
- **Golden Tests**: Standard-Toleranz relativ 1e-3, pro Fall in `cases.json`
  überschreibbar (`tol`). `calc`-Beispiele im Content werden gegen die Engine geprüft
  und müssen innerhalb dieser Toleranz stimmen.

## Quiz / `check`-Logik

- `single` — eine richtige Option (Index in `answer`).
- `multi` — mehrere richtige Optionen (Index-Array in `answer`).
- `numeric` — Zahl in `answer`, akzeptiert innerhalb `tolerance` (relativ); `unit` wird angezeigt.
- Sofortiges, freundliches Feedback: richtig → kurze Bestätigung; falsch → die
  `explanation` zeigen, kein Punktabzug, kein Bloßstellen. Wiederholen ist erlaubt.
