# DESIGN.md — Visuelle Sprache

**Aesthetic-Direction:** *Technische Zeichnung auf warmem Papier.* Clean, modern,
präzise wie ein Messinstrument — aber warm statt kalt. Kein steriles Weiß, kein
generisches Dashboard. Beiges Papier, Tuschelinien, Monospace-Messwerte, viel Luft.

> Diese Datei ist verbindlich. Keine Farben, Fonts oder Effekte außerhalb dieser
> Tokens. Pseudo-3D-Grafik nutzt dieselbe Palette (§6).

---

## 1. Tokens (CSS-Variablen)

```css
:root {
  /* Flächen — warmes Beige als dominante Fläche */
  --paper:      #EDE6D6;  /* App-Hintergrund (warmes Sandbeige) */
  --paper-2:    #F4EEE0;  /* Karten/erhöhte Flächen, etwas heller */
  --paper-sink: #E3DAC6;  /* vertiefte Bereiche, Eingabefelder, Skeletons */

  /* Tinte — Graphit statt reinem Schwarz */
  --ink:        #23211C;  /* Haupttext */
  --ink-2:      #57534A;  /* Sekundärtext, Labels */
  --ink-faint:  #8B857A;  /* Hilfslinien, Platzhalter (nur dekorativ, §7) */

  /* Akzent — ein einziger, scharfer „Drafting"-Ton */
  --accent:     #C2562B;  /* gebranntes Orange: aktiv, interaktiv, Messmarken */
  --accent-ink: #8E3C1C;  /* Akzent auf hellem Grund (Text/Links) */

  /* Linien */
  --rule:       #00000014; /* Hairline-Rahmen (Tinte, transparent) */
  --grid:       #00000008; /* Millimeterpapier-Raster, sehr dezent */

  /* Datenvisualisierung (NUR Sim-Overlays + Aufgaben-Feedback, nie Marke) */
  --viz-low:    #4F7A4A;  /* grün = unkritisch */
  --viz-mid:    #C9A227;  /* gelb */
  --viz-high:   #B23A2E;  /* rot = kritisch */

  /* Semantische Aliasse fürs Feedback (immer diese verwenden, §5) */
  --ok:         var(--viz-low);
  --warn:       var(--viz-mid);
  --fehl:       var(--viz-high);

  /* Fokus */
  --focus:      var(--accent); /* 2px-Ring, 2px Offset, §7 */

  /* Radius & Schatten — minimal, präzise (3 Elevation-Stufen, §4) */
  --radius:     6px;
  --shadow-1:   0 1px 0 #00000010, 0 8px 24px -16px #00000033;  /* Karte */
  --shadow-2:   0 12px 32px -16px #00000040;                     /* Popover/Drawer */
  --shadow:     var(--shadow-1); /* Alias (Bestand) */
}
```

Optionaler **Blueprint-Dark-Mode** (später): Tinte→helles Beige, Fläche→tiefes
Anthrazit, Akzent bleibt Orange. Nicht für die erste Version.

---

## 2. Typografie

Drei freie Schriften, bewusst nicht generisch:

- **Headings:** `Bricolage Grotesque` — charaktervoll, modern, technisch-warm.
- **Body:** `Hanken Grotesk` — ruhig, sehr gut lesbar.
- **Mono:** `IBM Plex Mono` — für **alle** Zahlen, Einheiten, Formel-Variablen,
  Messwerte und technischen Labels. Das Mono-Detail erzeugt den „technischen" Look.

```css
--font-display: 'Bricolage Grotesque', sans-serif;
--font-body:    'Hanken Grotesk', sans-serif;
--font-mono:    'IBM Plex Mono', monospace;
```

Größenskala (rem): 0.75 / 0.875 / 1 / 1.25 / 1.5 / 2 / 2.75.
Body 1 rem, Zeilenhöhe 1.6. Headings eng (1.1), leicht negative Laufweite.
Zahlen immer mit Einheit, Dezimal-**Komma** (deutsche Anzeige), Mono.

---

## 3. Texturen & Atmosphäre

- **Millimeterpapier-Raster** als App-Hintergrund: sehr dezente `--grid`-Linien
  (8-px-Raster), kaum sichtbar — gibt dem Beige Tiefe wie Konstruktionspapier.
- **Hairline-Rahmen** (`--rule`) statt dicker Kanten. Karten wirken wie Zeichenfelder.
- **Tick-Marks:** kurze Strichmarken an Achsen, Slidern, Trennlinien und
  Schwierigkeits-Anzeigen (●●○○○) — wie an einem Lineal. Wiederkehrendes Motiv.
- **Maßlinien-Stil** für Diagramme: dünne Linien mit Pfeil-Enden, Mono-Beschriftung.

---

## 4. Komponenten-Regeln & Zustände

Jede interaktive Komponente definiert **alle fünf** Zustände:

| Zustand | Darstellung |
|---|---|
| Ruhe | Hairline-Rahmen (`--rule`), Fläche `--paper-2` |
| Hover | Rahmen → `--ink-2`, Fläche 1 % dunkler; Cursor zeigt Interaktivität |
| Fokus | `:focus-visible`: 2-px-Ring in `--focus`, 2 px Offset — **immer**, auch auf SVG-Elementen |
| Aktiv | `translateY(1px)`, Schatten entfällt (gedrückt = aufliegend) |
| Deaktiviert | 40 % Opazität, `cursor: not-allowed`, Tooltip erklärt warum |

**Elevation (genau drei Stufen):**
0 = Fläche (kein Schatten) · 1 = Karte (`--shadow-1`) · 2 = Popover/Drawer/
schwebender Rechner (`--shadow-2`). Keine weiteren Stufen, kein Stapeln.

- **Buttons:** flach, Hairline-Rahmen; primär = `--accent`-Fläche, Text `--paper`;
  sekundär = Outline. Höhe ≥ 44 px (Touch).
- **Slider** (zentrales Interaktions-Element): Tick-Marks an der Schiene,
  aktueller Wert in Mono am Griff, **−/+-Stepper** an beiden Enden (Feinjustage,
  Touch, Tastatur). Live-Feedback ohne Verzögerung. Unter jedem SVG-Slider liegt
  ein nativer `<input type="range">` (§7).
- **Formel-Variablen:** Mono, antippbar, beim Tippen unterstrichen in `--accent-ink`.
- **Tiefen-Umschalter:** drei segmentierte Tabs (verspielt / praxis / genau);
  globale Ebene = gefüllter Tab, lokale Abweichung = Outline-Tab.
- **Aufgaben-Karten:** eingerückt, Statusecke oben rechts (offen = leer,
  ✓ = `--ok`, „mit Hilfe ✓" = `--ok` mit Ring).
- **Skeleton/Laden:** Flächen in `--paper-sink` mit langsamem Schimmer;
  WASM-Kompilieren zusätzlich Mono-Zeile „Fräse läuft …".

---

## 5. Farbe semantisch

- `--accent` heißt: *hier kannst du etwas tun* (aktive Navigation, primäre
  Buttons, Messmarken, antippbare Begriffe). **Nie** für richtig/falsch.
- Aufgaben-Feedback und Sim-Overlays nutzen **ausschließlich** `--ok` / `--warn`
  / `--fehl`. Richtig ist grün, kritisch ist rot — auch wenn Orange „schöner" wäre.
- Status niemals nur über Farbe: immer Symbol (✓ ⚠ ✗) oder Text dazu (§7).

---

## 6. Pseudo-3D-Sprache (verbindliche Systematik)

Die 2.5D-Simulationen folgen einer festen visuellen Sprache. Referenz-
Implementierung: `packages/ui/src/interactive/LeverSlider.tsx`; die
wiederverwendbaren Bühnen-Primitiven liegen in `packages/ui/src/iso-scene/`
(`IsoStage`, `isoBox`, `AmpelArrow`, `useEngineValue`). Nur Tokens aus §1.

**Licht & Schattierung** (Licht von oben, Werte = `shade()`-Beimischung):

| Fläche | Schattierung |
|---|---|
| Oben (Top) | +0.18 bis +0.30 Richtung hell |
| Rechts | −0.10 bis −0.12 |
| Links | −0.24 bis −0.30 |
| Glanzkante | helle 1-px-Linie an Oberkanten (+0.45) |
| Bevel | dünne dunkle Linie an Unterkanten (−0.35) |

- **Plastische Körper:** jede sichtbare Fläche bekommt einen Verlauf (oben hell
  → unten dunkel) statt flacher Füllung, plus Glanzkante + Bevel.
- **Weiche Tiefe:** dezenter Gauß-Blur-Schatten (`feGaussianBlur`, niedriges
  Alpha) unter Körpern — **kein** harter Schlagschatten.
- **Perspektivischer Boden:** isometrische Bühne mit projiziertem Welt-Gitter
  (Millimeterpapier in 3D). Hairline-Rahmen der Karte bleibt erhalten.
- **Wirkung geometrisch zeigen, nicht nur einfärben:** der Hebel neigt sich
  unter Last (Drehwinkel ∝ Drehmoment), Zahnräder drehen im echten
  Drehzahlverhältnis, ein überlasteter Stab biegt sichtbar durch. Der
  Kraftvektor ist ein **Ampel-Pfeil** (`--ok → --warn → --fehl`) mit
  `--ink`-Kontur und kräftiger Spitze — Betrag bleibt auch im grünen Bereich
  lesbar. Alle Zahlen aus der Engine (Eiserne Regel 1).
- **Explosionsansicht** (`packages/iso/explode`): Belohnungsmoment am
  Meilenstein — Teile gleiten gestaffelt auseinander, Maßlinien beschriften sie.
- **Ziel-Korridor** (bei `target`-Aufgaben): der zulässige Bereich wird als
  dezentes `--ok`-Band auf der Ergebnis-Skala der Canvas markiert.

---

## 7. Accessibility-Baseline (verbindlich)

- **Kontrast:** `--ink` auf `--paper` ≈ 12,8:1 ✓ · `--ink-2` auf `--paper`
  ≈ 7:1 ✓ · `--ink-faint` nur dekorativ oder für Mono-Labels ≥ 0.75 rem ·
  `--accent` auf `--paper` nur für Text ≥ 1 rem fett oder als Fläche mit
  `--paper`-Text. `--accent-ink` ist der Akzent für Fließtext-Links.
- **Tap-Targets ≥ 44 px** (Buttons, Stepper, Chips, Navigationspunkte).
- **Fokus sichtbar:** `:focus-visible`-Ring (§4) überall, auch auf SVG.
- **Interaktive Canvases:** jede Sim hat `role="img"` + sprechendes
  `aria-label` mit Live-Werten („Zahnradpaar, z1 20, z2 60, Übersetzung 3,0");
  die Mono-Ergebniszeile trägt `aria-live="polite"`. **Pflicht:** zu jedem
  SVG-Slider existiert ein paralleles natives `<input type="range">`
  (Muster: `packages/ui/src/Slider.tsx`) — das gilt für alle Komponenten der
  Registry, ohne Ausnahme.
- **Popover/Panels:** `role="dialog"`, Fokus hinein und beim Schließen zurück,
  `Esc` schließt. Keine Fokus-Falle bei leichten Popovers.
- **Reduzierte Bewegung:** `prefers-reduced-motion` **oder** die App-Einstellung
  (ODER-verknüpft) ersetzt jede Animation aus §8 durch den sofortigen Endzustand.
- **Nie nur Farbe:** Status immer mit Symbol/Text (§5).

---

## 8. Motion-Vokabular (benannt, zurückhaltend)

Vier benannte Bewegungen — mehr gibt es nicht. Easing: `cubic-bezier(0.2, 0, 0, 1)`.

| Name | Einsatz | Dauer | Verhalten |
|---|---|---|---|
| `einzeichnen` | Schritt-/Seiteneinstieg, neues Bauteil | 400 ms | gestaffeltes Erscheinen (`animation-delay`: Boden → Drehpunkt → Körper → Vordergrund), Teile „zeichnen" sich isometrisch ein |
| `quittung` | Aufgabe gelöst, Constraint erfüllt | 180 ms | Fade-in + 2 px Rise der Bestätigungszeile |
| `wechsel` | Tiefen-Umschalter, Tab-/Panelwechsel | 200 ms | Cross-Fade in place, Scroll-Position bleibt |
| `zaehlen` | Ergebniszahl ändert sich | 300 ms | Zahl zählt per rAF zum neuen Wert (Mono, keine Layout-Verschiebung) |

- **Slider/Sim:** sofortige, flüssige Reaktion (60 fps), kein Bounce, keine
  CSS-Transition auf Geometrie — Live-Werte fließen direkt in Neigung, Pfeil,
  Farbe (rAF).
- Alles respektiert reduzierte Bewegung (§7).

---

## 9. Verboten (gegen den generischen KI-Look)

- Kein Inter/Roboto/Arial/System-Font, kein Lila-Verlauf auf Weiß.
- Kein reines Weiß als Fläche, kein reines Schwarz als Text.
- Keine bunten Karten — Farbe nur über `--accent` und (in Sims/Feedback) die Viz-Skala.
- Keine dicken Schlagschatten, keine „Bubble"-Buttons, kein Konfetti.
- Keine Emojis als UI-Icons (Ausnahme: 🧮 auf der Rechner-Lasche ist ein
  gezeichnetes Icon, kein Emoji).
- Kein Motion-Effekt außerhalb des Vokabulars aus §8.
