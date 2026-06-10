# LERNMODELL.md — Das didaktische Herzstück

> Dieses Dokument definiert, **wie Lernen in Buildlab funktioniert**: den Lern-Loop
> pro Schritt, das Mastery-Modell pro Konzept, die Tiefen-Ebenen, die „Gesehen"-Logik,
> die Wiederholung (Spaced Repetition) und das Feedback-Design. Alle Screens
> (`SCREENS.md`), alle Aufgabenarten (`ENGINE_SPEC.md`) und der Generator
> (`PROJECT_SPECS.md`) setzen dieses Modell um — nie umgekehrt.

---

## 1. Grundidee: Bauen ist der Lehrplan

Buildlab lehrt Maschinenbau nicht in Kapiteln, sondern in **Projekten mit baubarem
Ergebnis**. Die Theorie kommt genau dann, wenn das Projekt sie braucht — nie auf
Vorrat. Daraus folgen drei Festlegungen:

1. **Jedes Projekt endet in einem Artefakt** (STL-Download, Bauanleitung, laufende
   Simulation). Das Artefakt ist der Beweis des Lernens, nicht das Quiz.
2. **Jedes Konzept wird an dem Ort eingeführt, an dem es zum ersten Mal gebraucht
   wird** — und genau einmal voll erklärt (siehe §5).
3. **Jede Zahl, die der Lernende sieht oder eingeben muss, ist von der Engine
   gerechnet und vom Verifier geprüft** (Eiserne Regel 1). Das Lernmodell darf
   sich auf die Korrektheit verlassen und kann sich ganz auf Didaktik konzentrieren.

---

## 2. Der Lern-Loop: Dramaturgie eines Schritts

Jeder Schritt eines Projekts folgt derselben Dramaturgie. Sie ist kein starres
Block-Rezept, aber der Verifier warnt, wenn eine Station fehlt (siehe
`VERIFICATION.md` §Loop-Check).

```
  AUFHÄNGER  →  BEGREIFEN  →  ANWENDEN  →  PRÜFEN     (Lern-Schritt)
  AUFHÄNGER  →  BEGREIFEN  →  BAUEN     →  PRÜFEN     (Bau-Schritt)
```

| Station | Zweck | Typische Blöcke |
|---|---|---|
| **Aufhänger** | Neugier vor der Formel. Eine Frage, ein Bild, ein Problem. 1–3 Sätze. | `text` mit `variant: "hook"` |
| **Begreifen** | Das Konzept verstehen — erst intuitiv, dann formal. | `text` (Tiefen-Ebenen), `formula` |
| **Anwenden** | Selbst drehen, schieben, rechnen. Die Hand lernt mit. | `interactive`, `calc` |
| **Prüfen** | Kurz zeigen, dass es sitzt. Klein, freundlich, sofortiges Feedback. | `task` (eine der 9 Arten) |
| **Bauen** | Parameter wählen, Bauteil entsteht, Constraints werden geprüft. | `build` (mit `constraints`) |

### 2.1 Schritt-Arten (`step.kind`)

Jeder Schritt deklariert seine Art im Content-Schema:

- **`lernen`** — Standardschritt nach dem Loop oben. Soll mindestens einen
  `task`-Block (Prüfen) und mindestens einen `interactive`- oder `calc`-Block
  (Anwenden) enthalten; fehlt eines, warnt der Verifier.
- **`bauen`** — enthält einen `build`-Block. Das Prüfen übernimmt der
  `constraints`-Mechanismus des Build-Blocks (engine-geprüfte Bau-Anforderungen).
- **`meilenstein`** — genau einer pro Projekt, immer der letzte Schritt. Inhalt:
  Challenge-Verifikation (die Engine prüft die Zielwerte des Projekts gegen die
  tatsächlich gewählten Parameter), Explosionsansicht des fertigen Bauteils,
  Werkstatt-Eintrag, Zusammenfassung der gelernten Konzepte, ggf. Anleitung für
  den realen Test („so druckst und testest du es"). Ein Projekt ohne
  `meilenstein`-Schritt ist ein Verifier-**Fehler**.

### 2.2 Text-Varianten (`text.variant`)

- **`hook`** — der Aufhänger. Wird visuell als Frage-Karte gerendert (siehe
  `SCREENS.md` §6). Maximal 3 Sätze, immer in der verspielten Stimme, unabhängig
  von der Tiefen-Ebene (ein Aufhänger ist nie „prüfungsgenau").
- **`merksatz`** — eine merkfähige Kernaussage, gerendert als eingerückte Karte
  mit Akzent-Strich links. Genau ein Gedanke. („Großes Rad, langsames Rad —
  aber kräftig.")
- **`hinweis`** — Praxis-Warnung oder Werkstatt-Tipp, dezent gerendert.
- *(ohne variant)* — normaler Fließtext mit Tiefen-Ebenen.

### 2.3 Schritt-Abschluss & Gating

- Ein Schritt gilt als **abgeschlossen**, wenn alle Pflicht-`task`-Blöcke gelöst
  sind (auch „gelöst mit Hilfe", siehe §7.4) und — bei `bauen`-Schritten — alle
  `constraints` erfüllt sind.
- **Sanftes Gating:** „Weiter" ist erst aktiv, wenn der Schritt abgeschlossen ist.
  Der deaktivierte Button erklärt sich selbst (Tooltip: „Noch eine Aufgabe offen —
  sie ist direkt über mir."). Zurückblättern ist **immer** frei; Vorblättern bis
  zum höchsten je erreichten Schritt ebenfalls (kein erneutes Lösen beim
  Wiederholen).
- **Vertiefungsaufgaben** (`task.minDepth: "rigorous"`) zählen nie für den
  Abschluss. Sie erscheinen nur, wenn die Tiefen-Ebene „genau" aktiv ist, sind als
  „Vertiefung" gekennzeichnet und überspringbar.

---

## 3. Mastery-Modell: vier Zustände + Leitner-Boxen

Jedes Konzept aus `content/concepts.json` hat pro Lernendem einen Zustand
(persistiert in IndexedDB, Store `conceptState`, siehe `DATENMODELL.md`):

```
  neu ──(eingeführt & Schritt abgeschlossen)──▶ gesehen
  gesehen ──(task mit diesem Konzept im 1./2. Versuch gelöst)──▶ angewendet
  angewendet ──(Leitner-Box ≥ 4)──▶ sicher
```

| Zustand | Bedeutung | Darstellung (Skill-Map / Chips) |
|---|---|---|
| `neu` | noch nie eingeführt | blasser Knoten, gestrichelter Rand |
| `gesehen` | eingeführt, aber noch nicht selbst angewendet | Ring (Outline) |
| `angewendet` | mindestens eine Aufgabe dazu ohne Hilfe gelöst | halbgefüllter Knoten |
| `sicher` | zweimal mit zeitlichem Abstand erfolgreich wiederholt | gefüllter Knoten in Akzentfarbe |

### 3.1 Leitner-Boxen & Fälligkeit

Parallel zum Zustand führt jedes Konzept eine **Box 1–5** mit Wiederhol-Intervallen:

```
Box:        1      2      3      4      5
Intervall:  1 Tag  3 Tage 7 Tage 16 Tage 35 Tage
```

- Beim Übergang zu `angewendet` startet das Konzept in **Box 2** (das Projekt
  selbst war die erste Wiederholung).
- **Erfolgreiche Trainings-Aufgabe** (1. Versuch, ohne Hilfe): Box +1 (max. 5),
  neue Fälligkeit = heute + Intervall der neuen Box.
- **Fehlversuch oder gelöst mit Hilfe:** Box −1 (min. 1), Fälligkeit = morgen.
- `sicher` = Box ≥ 4. Fällt die Box später unter 4, wird der Zustand wieder
  `angewendet` — das ist die **einzige** Regression, und sie passiert nur durch
  tatsächliche Fehlversuche, nie durch bloßen Zeitablauf.

### 3.2 Fälligkeit ist eine Einladung, keine Strafe

Ein überfälliges Konzept **regrediert nicht automatisch**. Es bekommt den Badge
**„auffrischen"** (Skill-Map, Dashboard, Konzept-Seite) und wandert in den
Trainings-Pool. Es gibt keine Streaks, keine Punkte, keinen Verfall — Vergessen
ist normal, die App erinnert freundlich (vgl. `VOICE.md`).

---

## 4. Tiefen-Ebenen: verspielt / praxis / genau

Drei Ebenen, drei Stimmen (Definition in `VOICE.md`). Mechanik:

1. **Globale Präferenz** (`settings.depth`): wird im Onboarding aus der Persona
   vorbelegt — Maker → `verspielt`, Azubi/Technik → `praxis`, Studium → `praxis`
   (mit Hinweis auf „genau" für Prüfungsvorbereitung). Jederzeit in den
   Einstellungen änderbar.
2. **Lokaler Umschalter** an jedem `text`-Block: überschreibt die globale Ebene
   **nur für diesen Block, nur für diese Session**. Der Umschalter zeigt die
   globale Ebene als ausgefüllten Tab, die lokale Abweichung als Outline-Tab —
   so bleibt sichtbar, was „mein Normal" ist.
3. **`task.minDepth`**: Aufgaben können eine Mindest-Ebene tragen. Heute genutzt:
   `rigorous` für Vertiefungsaufgaben (siehe §2.3). `playful`/`practical` sind
   reserviert, werden aber nicht verwendet — jede normale Aufgabe ist auf allen
   Ebenen sichtbar.
4. Die Konzept-Seite zeigt **immer alle drei Ebenen** als Umschalter — sie ist der
   Ort zum Vergleichen der Stimmen.

**Nicht-Regel:** Die Tiefen-Ebene ändert nie die Mathematik, nie die Aufgaben,
nie den Fortschritt. Sie ändert ausschließlich die Erklärsprache.

---

## 5. „Gesehen"-Logik: nichts doppelt erklären — niemanden verlieren

Content deklariert pro `text`-Block, welche Konzepte er **einführt**
(`introduces`) und welche er **verwendet** (`uses`). Der Verifier stellt sicher,
dass jedes Konzept projektübergreifend genau **einmal** eingeführt wird (Quelle:
generierter Index `content/_index.json`).

Zur Laufzeit entscheidet der Renderer anhand von `conceptState`:

| Situation | Verhalten |
|---|---|
| `introduces` + Konzept ist `neu` | Voller Erklärtext im Fließtext (der Normalfall). |
| `introduces` + Konzept schon `gesehen` (z. B. Projekt wird wiederholt) | Text bleibt voll — Wiederholen eines Projekts ist gewollt. |
| `uses` + Konzept `gesehen` oder besser | Begriff erscheint nur als ·antippbarer Chip· mit Kurz-Popover. |
| `uses` + Konzept ist `neu` (**Quereinstieg!**) | Der Workspace blendet **oberhalb des Blocks eine Auffrisch-Karte** ein: `short`-Text des Konzepts + „tiefer eintauchen →" (Konzept-Seite als Overlay). Die Karte ist zuklappbar und erscheint pro Konzept und Projekt nur einmal. |

Die Auffrisch-Karte ist der Mechanismus, der **Soft-Locks erlaubt** (siehe
`SCREENS.md` §5): Wer ein Projekt ohne erfüllte Voraussetzungen startet, wird
nicht ausgesperrt, sondern unterwegs aufgefangen.

---

## 6. Wiederholung: der Trainings-Modus

**Screen `/training`** (Layout in `SCREENS.md` §10). Regeln:

1. **Auswahl:** maximal 10 fällige Konzepte pro Session, sortiert nach
   Überfälligkeit (am längsten fällig zuerst). Unter 3 fälligen Konzepten wirbt
   das Dashboard nicht fürs Training (kein künstlicher Druck).
2. **Aufgaben-Quellen** pro Konzept, in dieser Reihenfolge:
   a. dedizierte Trainings-Pools `content/training/<gruppe>.json` (gleiche
      `task`-Schemata wie im Projekt, ohne Projektkontext),
   b. `task`-Blöcke aus bereits **abgeschlossenen** Projekten, die das Konzept in
      `concepts` taggen.
   Innerhalb einer Quelle wird zufällig gewählt; dieselbe Aufgabe kommt in einer
   Session nicht zweimal.
3. **Bewertung:** wie §3.1 (Box hoch/runter). Feedback-Stufen wie §7 — Training
   ist kein Test, sondern Werkstatt.
4. **Abschluss-Karte:** „Heute gefestigt: Drehmoment · Modul · Achsabstand" mit
   den neuen Box-Ständen als Tick-Leiste. Kein Konfetti, keine Punkte.

---

## 7. Feedback-Design: Scheitern ist ein Lernschritt

Einheitlich für **alle** Aufgabenarten (Details je Art in `ENGINE_SPEC.md` §4).
Drei Stufen, die nacheinander freigeschaltet werden:

### 7.1 Stufe 1 — heuristischer Hinweis (nach dem 1. Fehlversuch)

Die Engine analysiert die Abweichung und wählt den passendsten Hinweis:

| Heuristik | Bedingung (relativ zur erwarteten Antwort `a`) | Microcopy-Muster |
|---|---|---|
| Zehnerpotenz | Eingabe ≈ a·10^k (k ≠ 0, ±2 % Toleranz) | „Die Ziffern stimmen — prüf die Einheiten, da ist eine Zehnerpotenz verrutscht." |
| Vorzeichen | Eingabe ≈ −a | „Betrag richtig, Richtung falsch. Was zieht, was drückt?" |
| Kehrwert | Eingabe ≈ 1/a | „Du hast den Kehrwert erwischt — welcher Wert gehört in den Zähler?" |
| Knapp daneben | Abweichung ≤ 2 × Toleranz | „Fast! Prüf deine Rundung — rechne mit mehr Nachkommastellen weiter." |
| Sonst | — | neutraler Anstoß: „Noch nicht ganz. Welche Formel passt zu dieser Größe?" |

Bei **Wahl-Aufgaben** (`single`/`multi`): Statt Heuristik wird das im Content
hinterlegte `why` der gewählten falschen Option gezeigt — jede Distraktor-Option
erklärt, *warum* sie verführerisch, aber falsch ist.

### 7.2 Stufe 2 — gezielter Hinweis (nach dem 2. Fehlversuch)

Das `hint`-Feld der Aufgabe wird gezeigt, und die zugehörige Formel/Variable wird
im Lektions-Text hervorgehoben (Akzent-Unterstreichung pulsiert einmal kurz).

### 7.3 Stufe 3 — Lösungsweg (ab dem 3. Fehlversuch, auf Wunsch)

Button „Zeig mir den Weg" klappt den Lösungsweg auf: die `explanation` der
Aufgabe **plus** die engine-gerechnete Rechnung (Formel, eingesetzte Werte,
Ergebnis — alles aus `evaluateById`, nie hartkodiert). Microcopy im Ton von
`VOICE.md`: „Gut gescheitert — jetzt weißt du, woran's lag."

### 7.4 Buchung des Ergebnisses

| Ausgang | Schritt-Fortschritt | Mastery |
|---|---|---|
| gelöst im 1. Versuch | ✓ | `angewendet` / Box +1 (im Training) |
| gelöst im 2. Versuch | ✓ | `angewendet` (kein Box-Aufstieg) |
| gelöst mit Hilfe (Stufe 2/3 genutzt oder ≥ 3 Versuche) | ✓ | kein Mastery-Effekt; im Training: Box −1 |
| abgebrochen | ✗ (Schritt bleibt offen) | Box −1 nur im Training |

Es gibt **keinen** Zustand „endgültig falsch". Jede Aufgabe ist beliebig oft
wiederholbar; bei `numeric`-Aufgaben variiert der Renderer dafür nichts — die
Aufgabe bleibt identisch, denn das Ziel ist Verstehen, nicht Raten-Verhindern.

### 7.5 Positive Rückmeldung

- Richtig gelöst: kurze Quittung (Motion `quittung`, 180 ms), Mono-Zeile mit dem
  bestätigten Wert („i = 3 ✓"), Microcopy variiert (Bausteine in `VOICE.md` §5),
  niemals Konfetti oder Sound.
- Schritt abgeschlossen: das nächste Bauteil „zeichnet sich ein" (Motion
  `einzeichnen`).
- Projekt abgeschlossen: Meilenstein-Inszenierung (siehe §2.1) — die
  Explosionsansicht ist die Belohnung.

---

## 8. Die neun Aufgabenarten (Übersicht)

Vollständige Schema- und Validierungsdefinition in `ENGINE_SPEC.md` §3–4 und
`schema/content.schema.json`. Hier die didaktische Rolle jeder Art:

| `kind` | Didaktische Rolle | Beispiel |
|---|---|---|
| `single` | Begriffs-/Verständnis-Check, 1 richtige Option, jede falsche hat ein `why` | „Was passiert mit dem Drehmoment, wenn i steigt?" |
| `multi` | Differenzierung: mehrere richtige Aussagen erkennen | „Welche Aussagen über den Modul stimmen?" |
| `numeric` | klassische Rechenaufgabe, Engine prüft (mit `source` nachgerechnet); optional mit **Einheitenwahl** (`unitChoices`) — die Einheit ist Teil der Antwort | „Berechne a für m=2, z₁=20, z₂=60." |
| `estimate` | Größenordnungs-Gefühl: Schätzen auf Log-Skala mit Faktor-Band-Feedback („Faktor 2 daneben — gutes Gefühl!") | „Wie oft dreht das kleine Rad für eine Umdrehung des großen?" |
| `target` | **Stellaufgabe:** Slider der gekoppelten Canvas-Komponente so einstellen, dass die Engine das Ziel bestätigt | „Stelle m so ein, dass a = 80 mm." |
| `error-find` | Fehlersuche: ein gerechnetes Beispiel enthält genau einen falschen Wert | „Eine Zeile dieser Rechnung lügt — welche?" |
| `order` | Reihenfolge: Lösungs-/Montageschritte sortieren | „Bring den Rechenweg in die richtige Reihenfolge." |
| `match` | Zuordnung: Größe ↔ Einheit, Begriff ↔ Definition | „Ordne zu: M → N·m, n → 1/min …" |
| `steps` | **geführter Rechenweg:** mehrstufige Rechnung, jede Stufe einzeln engine-geprüft, Folgefehler werden nicht doppelt bestraft (`$prev`-Mechanik) | „Erst n₂, dann daraus M₂." |

**Wahlregel für den Generator:** pro Schritt 1–2 Aufgaben; die Art folgt dem
Lernziel (Begriff → `single`/`match`, Rechnen → `numeric`/`steps`, Intuition →
`estimate`, Transfer → `target`/`error-find`). Ein Projekt soll über seine
Schritte mindestens 4 verschiedene Arten nutzen — Monotonie ist ein Review-Mangel.

---

## 9. Personas & Einstieg

Drei Türen im Onboarding, mit klar begrenzter Wirkung (keine getrennten Lehrpläne):

| Persona | Tiefen-Vorbelegung | Empfohlener Start | Begründung |
|---|---|---|---|
| **Studium verstehen** | praxis (+ Hinweis auf „genau") | Fachwerkbrücke | Statik ist der Klausur-Klassiker |
| **Technik / Azubi** | praxis | Hebel & Flaschenzug | Werkstatt-naher Einstieg, schnelle Erfolge |
| **Bauen / Maker** | verspielt | Stirnradgetriebe | sofort druckbares Ergebnis |

Nach dem ersten Projekt konvergieren alle: Die Empfehlung „Als Nächstes" auf dem
Dashboard folgt für alle drei dem Abhängigkeitsgraphen aus `PROJECTS.md` (nächstes
Projekt, dessen `recommendedAfter` erfüllt ist; bei mehreren Kandidaten das mit
den meisten bereits `sicher`/`angewendet`-Konzepten). Die Persona wird danach nur
noch für die Stimme der Empfehlungs-Microcopy genutzt.

---

## 10. Was dieses Modell bewusst NICHT enthält

- **Keine Punkte, Level, Streaks, Ranglisten.** Das Artefakt und die wachsende
  Skill-Map sind die Belohnung. (Entscheidung, kein Versäumnis.)
- **Keine adaptiven Aufgaben-Generatoren zur Laufzeit.** Content ist eingefroren
  und geprüft; Adaptivität entsteht durch Auswahl (Training, Empfehlungen), nie
  durch Live-Generierung.
- **Keine Bestrafung durch Verlust.** Nichts, was der Lernende erreicht hat, wird
  ihm je wieder weggenommen (einzige Ausnahme: Box-Abstieg durch echte
  Fehlversuche, §3.1).
- **Keine Zeitdruck-Mechaniken.** Geschätzte Dauer (`durationMin`) ist eine
  Orientierung, nie ein Timer.
