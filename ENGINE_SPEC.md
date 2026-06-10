# ENGINE_SPEC.md — Rechen-Engine, Aufgaben-Validierung & Laufzeit-Regeln

> Die Engine (`packages/engine`) ist die **einzige Quelle für Zahlen**. Sie wertet
> Formeln aus `content/formulas.json` aus, treibt die Simulationen und validiert
> jede Aufgabenart. Kein KI-Output liefert je selbst eine Zahl.

---

## 1. Formel-Auswertung

- `expr` wird mit **mathjs** ausgewertet; Variablennamen = die `var`-Felder.
- Eingaben kommen als Zahlen in der Basis-Einheit der jeweiligen Variable.
- API: `evaluateFormula(formula, inputs)` · `evaluateById(formulas, id, inputs)`
  → `{ id, value, unit }` · `checkUnits(formula)` (Dimensionsanalyse).
- Die **einheitenbehaftete** Auswertung (mathjs units) dient nur der
  Dimensionsanalyse in `verify` — nie der Anzeige.

## 2. Simulationstypen (Methode · Eingaben → Ausgaben)

- **Statik / Fachwerk** (`truss-load`) — lineares Gleichungssystem aus
  Knotengleichgewicht (ΣFₓ=0, ΣF_y=0 je Knoten), gelöst über `math.lusolve`.
  Ein: Knoten, Stäbe, Auflager, Lasten → Aus: Stabkräfte (+/− = Zug/Druck),
  Auflagerreaktionen.
- **Balkenbiegung** (`stress-bar`) — geschlossene Formeln je Lastfall
  (z. B. f = FL³/(3EI)). Ein: Geometrie, Last, E-Modul → Aus: Durchbiegung,
  Biegespannung, Auslastung (für das Farb-Overlay).
- **Maschinenelemente** (`gear-pair`, `value-slider`) — direkte Formel-Auswertung
  (Getriebe, Welle vereinfacht nach DIN 743, Lager L10).
  Ein: Bauteilparameter → Aus: Kennwerte + Sicherheit.
- **Kinematik** (`linkage-anim`) — Schließbedingung der Gelenkschleife,
  numerisch über den Antriebswinkel. Ein: Gliedlängen, Winkel → Aus: Lagen,
  Geschwindigkeiten, Totlagen.
- **Rakete** (`rocket-stability`, `flight-sim`) — CG = massengewichteter
  Schwerpunkt; CP = Summe der Barrowman-Beiträge; Stabilitätsmaß = (CP−CG)/d.
  Flugbahn via **RK4-Integration** von F = m·a mit Schubkurve(t) und
  Luftwiderstand. Schubkurven aus offenem `.eng`-Datensatz. Ein: Geometrie,
  Massen, Motorklasse → Aus: CG, CP, Stabilitätsmaß, h(t), Apogäum, v_max.

> CAD-Modelle entstehen mit OpenSCAD (`cad/*.scad`); für Zahnräder die
> Evolventen-Geometrie in `cad/gear.scad`. Ein Modell pro Bauteil = die
> geometrische Wahrheit (Vorschau und STL stammen aus derselben Quelle).

## 3. Aufgaben-Validierung (die 9 `task.kind`-Arten)

Jede Art definiert: *was der Lernende tut* · *wie die Engine prüft* · *was der
Verifier zusätzlich erzwingt* (Details `VERIFICATION.md`).

| kind | Lernender | Engine-Prüfung zur Laufzeit | Verifier erzwingt |
|---|---|---|---|
| `single` | wählt 1 Option | Index == `answer` | `why` an jeder falschen Option |
| `multi` | wählt n Optionen | Index-Menge == `answer` | dito; ≥ 2 richtige Optionen |
| `numeric` | gibt Zahl (+ ggf. Einheit aus `unitChoices`) ein | relativ innerhalb `tolerance` von `answer`; Einheit muss exakt stimmen | `source` vorhanden und `answer` von der Engine nachgerechnet |
| `estimate` | schätzt auf Log-Skala | Faktor-Bänder aus `scale.bands` (z. B. ≤2× = „gutes Gefühl", ≤5× = „Richtung stimmt") | `source` (Engine-Wert als Referenz) und `scale` plausibel |
| `target` | stellt Slider der gekoppelten Canvas | `evaluateById(target.formulaId)` mit aktuellen Werten erfüllt `goal` ± Toleranz | `proof.pass` erfüllt das Ziel, `proof.fail` verfehlt es |
| `error-find` | tippt die falsche Zeile an | gewählter Index == die eine Zeile, deren `shown` von der Engine abweicht | genau 1 abweichende Zeile, alle anderen stimmen |
| `order` | sortiert Karten | Reihenfolge == `correctOrder` | Indizes vollständig, keine Duplikate |
| `match` | verbindet Paare | alle Paare korrekt | Paare eindeutig; Anzeige mischt |
| `steps` | rechnet Stufe für Stufe | jede Stufe einzeln innerhalb Toleranz; `$prev` referenziert das **eingegebene** Vorergebnis → Folgefehler werden nicht doppelt bestraft | jede Stufe von der Engine nachgerechnet |

### Numerische Eingabe (UX-Regeln)

- Mono-Eingabefeld, Dezimal-Komma **und** -Punkt akzeptiert.
- Einheit: ist `unitChoices` gesetzt, wählt der Lernende die Einheit als
  Segment-Buttons — die Einheit ist Teil der Antwort. Sonst steht die Einheit
  fix hinter dem Feld (nur die Maßzahl wird geprüft).
- Nach „Prüfen" zeigt das Feedback bei Erfolg den bestätigten Wert in Mono;
  bei Misserfolg greifen die Feedback-Stufen (§4).

## 4. Feedback-Heuristiken (Stufe 1, numerisch)

Reihenfolge der Prüfung (erste zutreffende gewinnt), `a` = erwartete Antwort,
`x` = Eingabe, `tol` = relative Toleranz:

1. **Zehnerpotenz:** ∃ k ∈ {−6…6}\{0}: |x − a·10^k| ≤ 0,02·|a·10^k| →
   Einheiten-Hinweis.
2. **Vorzeichen:** |x + a| ≤ tol·|a| → Richtungs-Hinweis.
3. **Kehrwert:** a ≠ 0 ∧ |x − 1/a| ≤ 0,02·|1/a| → Zähler/Nenner-Hinweis.
4. **Knapp daneben:** |x − a| ≤ 2·tol·|a| → Rundungs-Hinweis.
5. **Sonst:** neutraler Anstoß (Formel-Frage).

Microcopy-Bausteine je Heuristik: `VOICE.md` §5. Stufen 2/3 und die Buchung
(gelöst / mit Hilfe): `LERNMODELL.md` §7.

## 5. Build-Constraints

`build.constraints[]` = `{ expr, label, proof }`. `expr` ist ein
mathjs-Boolescher Ausdruck über die Parameternamen des Build-Blocks
(z. B. `abs(z2/z1 - 3)/3 <= 0.05`). Zur Laufzeit wird jede Constraint-Zeile
live ausgewertet (✓/✗ in `--ok`/`--fehl`); der STL-Download ist erst aktiv,
wenn alle erfüllt sind. Der Verifier rechnet `proof.pass` (muss erfüllen) und
`proof.fail` (muss verfehlen) nach — Constraints ohne Beweis-Paar sind ein Fehler.

## 6. Präzision & Toleranz

- Intern doppelte Genauigkeit (IEEE-754 double), keine vorzeitige Rundung.
- **Anzeige:** sinnvoll gerundet je Größe (Spannungen 0–1 Nachkommastellen,
  Übersetzungen 1–2), Einheiten immer mitführen, deutsches Dezimal-Komma.
- **Toleranzen:** Golden Tests Standard relativ 1e-3, pro Fall überschreibbar
  (`tol` in `cases.json`). `task.tolerance` ist die didaktische Toleranz der
  Aufgabe (typisch 1e-2) — sie darf großzügiger sein als die Engine-Toleranz,
  nie strenger als sinnvoll rundbar.

## 7. Engine-Erweiterungs-Regel

Neue Simulationstypen (z. B. der Fachwerk-Löser) entstehen als **eigene,
deterministische Funktionen in `packages/engine`** mit Golden Tests, bevor die
zugehörige Interactive-Komponente gebaut wird. Reihenfolge immer:
Formel/Löser → Golden Test → Verifier-Anbindung → UI.
