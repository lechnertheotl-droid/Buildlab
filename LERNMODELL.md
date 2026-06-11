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
  Produkt-Karte oben auf der Projektkarte (Ergebnis + STL), Zusammenfassung der
  gelernten Konzepte, ggf. Anleitung für den realen Test („so druckst und
  testest du es"). Ein Projekt ohne `meilenstein`-Schritt ist ein
  Verifier-**Fehler**; im Schritt-Graphen ist er die einzige Senke — jeder
  Schritt mündet in ihn (Verifier-Regel 20).

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
- **Freischaltung über den Schritt-Graphen:** Ein Schritt ist offen, sobald
  alle seine `requires`-Schritte erledigt sind (`src/dag.ts`; ohne `requires`
  gilt die lineare Reihenfolge). Das ist das Schritt-Gating innerhalb eines
  Projekts — bewusst verbindlich, im Unterschied zum **Soft-Lock zwischen
  Projekten** (`recommendedAfter`, nur Empfehlung, nie Sperre).
- **Sanftes Gating im Schritt:** „Weiter" ist erst aktiv, wenn der Schritt
  abgeschlossen ist. Der deaktivierte Button erklärt sich selbst (Tooltip:
  „Noch eine Aufgabe offen — sie ist direkt über mir."). „Weiter" führt zum
  **eindeutigen** nächsten Schritt; öffnen sich mehrere Äste, entscheidet die
  Projektkarte. Erledigte Schritte bleiben über die Karte **immer** frei
  wieder öffenbar (kein erneutes Lösen beim Wiederholen).
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

| Zustand | Bedeutung | Darstellung (Chips / Konzept-Seite) |
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
- Hoch-/Runterstufen (Box ±1) gehörte zum entfallenen Trainings-Screen und ist
  seit R9 **ruhend** (§3.2): die Felder werden gepflegt, ein künftiger
  Wiederhol-Mechanismus im Baum kann nahtlos aufsetzen.
- `sicher` = Box ≥ 4. Eine Regression passiert nur durch tatsächliche
  Fehlversuche, nie durch bloßen Zeitablauf.

### 3.2 Fälligkeit ist eine Einladung, keine Strafe

Ein überfälliges Konzept **regrediert nicht automatisch**. Es gibt keine
Streaks, keine Punkte, keinen Verfall — Vergessen ist normal (vgl. `VOICE.md`).
Seit dem Projektkarten-Umbau (R9) sind `box`/`due` **ruhende Felder**: sie
werden beim Lösen von Aufgaben weiter gebucht (§3.1, §7.4), aber kein Screen
wertet sie mehr aus — Wiederholung lebt in den Auffrisch-Karten der Projekte
(§5, §6).

---

## 4. Tiefen-Ebenen: verspielt / praxis / genau

Drei Ebenen, drei Stimmen (Definition in `VOICE.md`). Mechanik:

1. **Globale Präferenz** (`settings.depth`): startet auf `praxis` und ist
   jederzeit in den Einstellungen änderbar (Beispieltexte je Ebene direkt
   daneben).
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

## 6. Wiederholung: lebt in den Projekten

Einen separaten Trainings-Screen gibt es seit dem Projektkarten-Umbau (R9)
nicht mehr — er war ein zweiter Weg zu Aufgaben, und der Baum ist der einzige.
Wiederholung passiert dort, wo sie gebraucht wird:

1. **Auffrisch-Karten im Workspace** (§5): Wer ein `uses`-Konzept noch nie
   gesehen hat, bekommt es direkt am Block kurz erklärt — pro Konzept und
   Projekt genau einmal.
2. **Schritte wieder öffnen:** Erledigte Knoten der Projektkarte bleiben frei —
   wer ein Konzept festigen will, baut den Schritt noch einmal durch.
3. **Konzept-Seite** als ruhige Referenz (alle Tiefen, Formeln, Vorkommen mit
   Sprung in den Schritt).

Die Leitner-Buchung (§3.1) läuft im Hintergrund weiter; ein künftiger
Wiederhol-Mechanismus **innerhalb** des Baums kann darauf aufsetzen, ohne dass
Daten fehlen.

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
| gelöst im 1. Versuch | ✓ | `angewendet` (Box startet bei 2) |
| gelöst im 2. Versuch | ✓ | `angewendet` (kein Box-Aufstieg) |
| gelöst mit Hilfe (Stufe 2/3 genutzt oder ≥ 3 Versuche) | ✓ | kein Mastery-Effekt |
| abgebrochen | ✗ (Schritt bleibt offen) | kein Effekt |

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

## 9. Einstieg ohne Onboarding

Es gibt kein Onboarding und keine Personas mehr (seit R9): Der Erststart landet
direkt auf der **Projektkarte** des ersten Projekts — dort sind genau die
Wurzel-Schritte frei, und der Baum zeigt das Ziel oben. Das *ist* der Einstieg:
ein Tap, und man lernt.

- Die **Erklärtiefe** startet auf „praxis" und ist jederzeit in den
  Einstellungen (global) und am Text-Block (lokal) umstellbar (§4).
- Zwischen Projekten führt der **Projekt-Wechsler** auf der Karte;
  `recommendedAfter` aus `PROJECTS.md` erscheint dort als freundlicher
  Hinweis („Empfohlen vorher: …") — Soft-Lock, nie Sperre.

---

## 10. Was dieses Modell bewusst NICHT enthält

- **Keine Punkte, Level, Streaks, Ranglisten.** Das Artefakt und der nach oben
  wachsende Projekt-Baum sind die Belohnung. (Entscheidung, kein Versäumnis.)
- **Keine adaptiven Aufgaben-Generatoren zur Laufzeit.** Content ist eingefroren
  und geprüft; Adaptivität entsteht durch Auswahl (Auffrisch-Karten,
  Empfehlungen), nie durch Live-Generierung.
- **Keine Bestrafung durch Verlust.** Nichts, was der Lernende erreicht hat, wird
  ihm je wieder weggenommen (einzige Ausnahme: Box-Abstieg durch echte
  Fehlversuche, §3.1).
- **Keine Zeitdruck-Mechaniken.** Geschätzte Dauer (`durationMin`) ist eine
  Orientierung, nie ein Timer.
