# VOICE.md — Ton & Stimme

Ziel: **spielerisch und freundlich, aber nie auf Kosten der Korrektheit.** Wie ein
kluger Werkstatt-Kumpel, der dich ernst nimmt, dir aber die Angst vor der Formel nimmt.

## 1. Grundhaltung

- Du sprichst den Lernenden direkt mit „du" an.
- Kurze Sätze. Ein Gedanke pro Satz. Lieber ein gutes Bild als drei Fachwörter.
- Neugier wecken, bevor die Formel kommt („Klingt nach schlechtem Deal? Ist es nicht…").
- Scheitern wird gefeiert: „Welle gebrochen? Super – jetzt weißt du, wo die Grenze liegt."
- Humor ja, aber dezent und nie auf Kosten der Klarheit. Kein Albern-Sein.

## 2. Tiefen-Ebenen haben verschiedene Stimmen

- **verspielt** — Bilder, Alltagsvergleiche, ein Augenzwinkern. Keine Formel nötig.
- **praxis** — ruhig, anwendungsorientiert, Faustregeln. „So machst du's."
- **genau** — präzise, vollständig, prüfungstauglich. Strenge und Vollständigkeit
  vor Lockerheit (aber immer noch verständlich).

Sonderfälle: `text.variant: hook` ist **immer** verspielt (ein Aufhänger ist nie
prüfungsgenau); `merksatz` ist auf allen Ebenen gleich (ein Satz, merkfähig);
`hinweis` spricht in der Praxis-Stimme.

## 3. Beispiele (vorher → nachher)

- Trocken: „Das Übersetzungsverhältnis ist als Quotient der Zähnezahlen definiert."
  Besser (verspielt): „Zwei Zahnräder, ein Tauschgeschäft: Tempo gegen Kraft. Wie viel
  getauscht wird, verraten dir die Zähnezahlen."
- Trocken: „Die Vergleichsspannung überschreitet die zulässige Spannung."
  Besser (praxis): „Hier wird's eng: die Vergleichsspannung liegt über dem, was das
  Material aushält. Zeit, die Welle dicker zu machen."
- Bevormundend: „Sie müssen nun den Achsabstand berechnen."
  Besser: „Jetzt prüfen wir, ob die beiden Räder überhaupt zusammenpassen."

## 4. Microcopy-Inventar (UI-Texte)

| Ort | Ton-Beispiel |
|---|---|
| Deaktivierter Weiter-Button | „Noch eine Aufgabe offen — sie ist direkt über mir." |
| Weiter-Button bei Verzweigung/Finale | „Zur Projektkarte ›" — bei mehreren offenen Ästen entscheidet die Karte. |
| Gesperrter Baum-Knoten (Karte) | „Dafür brauchst du erst: ‚Modul & Teilkreis'." + [verstanden] |
| Produkt-Platte | gesperrt: Projekttitel · frei: „Finale frei!" · fertig: „Steht. ✓" |
| Wechsler-Hinweis (Soft-Lock) | „Empfohlen vorher: Hebel & Flaschenzug — du kannst aber jederzeit hier loslegen." |
| WASM lädt | „Fräse läuft …" |
| CAD-Fehler | „Das Modell mag diese Werte nicht — stell einen Parameter zurück." |
| 404 | „Hier ist nichts gezeichnet." |
| Speicher-Warnung (Badge) | „Konnte nicht speichern" |
| Speicher-Dialog | „Dein Browser-Speicher scheint voll zu sein. Dein bisheriger Stand bleibt erhalten — exportier zur Sicherheit ein Backup." + [Sicherung exportieren] [später] |
| Fehler-Karte (Error-Boundary) | „Hier hat sich etwas verklemmt. Lad die Seite einmal neu — dein Stand ist gespeichert." + [Neu laden] |

## 5. Feedback-Bausteine (für die drei Stufen aus `LERNMODELL.md` §7)

**Richtig (variieren, nie zwei gleiche hintereinander):**
„Sitzt." · „Genau so." · „Passt — weiter im Takt." · „Sauber gerechnet."

**Stufe 1 — Heuristiken (numerisch):**
- Zehnerpotenz: „Die Ziffern stimmen — prüf die Einheiten, da ist eine
  Zehnerpotenz verrutscht."
- Vorzeichen: „Betrag richtig, Richtung falsch. Was zieht, was drückt?"
- Kehrwert: „Du hast den Kehrwert erwischt — welcher Wert gehört in den Zähler?"
- Knapp daneben: „Fast! Prüf deine Rundung — rechne mit mehr Nachkommastellen weiter."
- Sonst: „Noch nicht ganz. Welche Formel passt zu dieser Größe?"

**Stufe 1 — Wahl-Aufgaben:** das `why` der gewählten Option zeigen — jedes `why`
erklärt freundlich, *warum* die Option verführerisch, aber falsch ist
(„Verlockend — das wäre die Drehzahl, nicht das Drehmoment.").

**Stufe 2:** „Schau dir <Formel> nochmal an — ich hab sie dir markiert." + `hint`.

**Stufe 3 (Lösungsweg):** „Gut gescheitert — jetzt weißt du, woran's lag.
Hier ist der Weg:" + engine-gerechnete Rechnung.

**Schritt fertig:** „Schritt 4 ✓ · Achsabstand sitzt."
**Meilenstein:** „Steht." — und: „Dein Bauteil wartet oben auf deiner Projektkarte."

## 6. Tabu

- Kein erhobener Zeigefinger, kein „falsch!" ohne Erklärung.
- Keine Witze, die eine Aussage ungenau machen. Im Zweifel: korrekt schlägt witzig.
- Keine Wand aus Fachbegriffen ohne Antippen-Erklärung dahinter.
- Nicht wiederholen, was schon erklärt wurde — kurz erinnern und verlinken.
- Kein Druck: keine Streaks, kein „verpasst", kein Countdown. Fälligkeit ist
  eine Einladung („auffrischen?"), nie ein Vorwurf.
- Keine Superlative über die App selbst. Das Bauteil ist der Star.
