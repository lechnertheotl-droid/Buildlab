# DESIGN.md — Visuelle Sprache

**Aesthetic-Direction:** *Technische Zeichnung auf warmem Papier.* Clean, modern,
präzise wie ein Messinstrument – aber warm statt kalt. Kein steriles Weiß, kein
generisches Dashboard. Beiges Papier, Tuschelinien, monospace-Messwerte, viel Luft.

> Diese Datei ist verbindlich. Keine Farben, Fonts oder Effekte außerhalb dieser
> Tokens. Pseudo-3D-Grafik (siehe `CLAUDE.md`) nutzt dieselbe Palette.

## Tokens (CSS-Variablen)

```css
:root {
  /* Flächen — warmes Beige als dominante Fläche */
  --paper:      #EDE6D6;  /* App-Hintergrund (warmes Sandbeige) */
  --paper-2:    #F4EEE0;  /* Karten/erhöhte Flächen, etwas heller */
  --paper-sink: #E3DAC6;  /* vertiefte Bereiche, Eingabefelder */

  /* Tinte — Graphit statt reinem Schwarz */
  --ink:        #23211C;  /* Haupttext */
  --ink-2:      #57534A;  /* Sekundärtext, Labels */
  --ink-faint:  #8B857A;  /* Hilfslinien, Platzhalter */

  /* Akzent — ein einziger, scharfer „Drafting"-Ton */
  --accent:     #C2562B;  /* gebranntes Orange: aktiv, interaktiv, Messmarken */
  --accent-ink: #8E3C1C;  /* Akzent auf hellem Grund (Text/Links) */

  /* Linien */
  --rule:       #00000014; /* Hairline-Rahmen (Tinte, transparent) */
  --grid:       #00000008; /* Millimeterpapier-Raster, sehr dezent */

  /* Datenvisualisierung (NUR für Sim-Overlays, nie als Markenfarbe) */
  --viz-low:    #4F7A4A;  /* grün = unkritisch */
  --viz-mid:    #C9A227;  /* gelb */
  --viz-high:   #B23A2E;  /* rot = kritisch */

  /* Radius & Schatten — minimal, präzise */
  --radius:     6px;
  --shadow:     0 1px 0 #00000010, 0 8px 24px -16px #00000033;
}
```

Optionaler **Blueprint-Dark-Mode** (später): Tinte→helles Beige, Fläche→tiefes
Anthrazit, Akzent bleibt Orange. Nicht für MVP nötig.

## Typografie

Drei freie Schriften, bewusst nicht generisch:

- **Headings:** `Bricolage Grotesque` — charaktervoll, modern, technisch-warm.
- **Body:** `Hanken Grotesk` — ruhig, sehr gut lesbar.
- **Mono:** `IBM Plex Mono` — für **alle** Zahlen, Einheiten, Formel-Variablen,
  Messwerte und technische Labels. Das Mono-Detail erzeugt den „technischen" Look.

```css
--font-display: 'Bricolage Grotesque', sans-serif;
--font-body:    'Hanken Grotesk', sans-serif;
--font-mono:    'IBM Plex Mono', monospace;
```

Größenskala (rem): 0.75 / 0.875 / 1 / 1.25 / 1.5 / 2 / 2.75.
Body 1rem, Zeilenhöhe 1.6. Headings eng (1.1), leicht negative Laufweite.

## Texturen & Atmosphäre (statt flacher Flächen)

- **Millimeterpapier-Raster** als App-Hintergrund: sehr dezente `--grid`-Linien
  (z. B. 8px-Raster), kaum sichtbar – gibt dem Beige Tiefe wie Konstruktionspapier.
- **Hairline-Rahmen** (`--rule`) statt dicker Kanten. Karten wirken wie Zeichenfelder.
- **Tick-Marks**: kurze Strichmarken an Achsen, Slidern und Trennlinien – wie an
  einem Lineal. Wiederkehrendes technisches Motiv.
- **Maßlinien-Stil** für Diagramme: dünne Linien mit Pfeil-Enden, Mono-Beschriftung.

## Komponenten-Regeln

- Buttons: flach, Hairline-Rahmen; primär = `--accent`-Fläche, Text `--paper`.
- Slider (zentrales Interaktions-Element): Tick-Marks an der Schiene, aktueller
  Wert in Mono direkt am Griff. Live-Feedback ohne Verzögerung.
- Formel-Variablen: Mono, antippbar, beim Tippen unterstrichen in `--accent-ink`.
- Tiefen-Ebenen-Umschalter: drei segmentierte Tabs (verspielt / praxis / genau).

## Pseudo-3D-Sims (Hebel/Kraft als Referenz)

Die 2.5D-Simulationen folgen einer festen visuellen Sprache (Beispiel: Kraft/Hebel-
Slider, `packages/ui/.../LeverSlider.tsx`). Sie nutzt **nur** die obigen Tokens:

- **Plastische Körper:** jede sichtbare Fläche bekommt einen `--ink-2`-Farbverlauf
  (oben hell → unten dunkel, Licht von oben) statt einer flachen Füllung. Dazu eine
  helle **Glanzkante** an den Oberkanten und eine dünne dunkle **Bevel-Linie** unten.
- **Weiche Tiefe:** ein dezenter Gauß-Blur-Schatten (`feGaussianBlur`, niedriges Alpha)
  unter den Körpern — **kein** dicker Schlagschatten (siehe Verboten).
- **Perspektivischer Boden:** eine isometrische Bühne mit projiziertem Welt-Gitter
  (Konstruktionspapier in 3D) statt nur flachem Hintergrundraster. Der saubere
  Hairline-Rahmen bleibt erhalten.
- **Wirkung sichtbar machen:** physikalische Größen werden **geometrisch** gezeigt, nicht
  nur eingefärbt. Der Hebel **neigt sich unter Last** (Drehwinkel ∝ Drehmoment); der
  Kraftvektor ist ein **Ampel-Pfeil** (`--viz-low → --viz-mid → --viz-high`) mit
  `--ink`-Kontur und kräftiger Spitze, damit der Betrag auch im grünen Bereich klar lesbar
  ist. Zahlen kommen aus der Engine (Eiserne Regel 1).

## Motion (zurückhaltend, präzise)

- Seiteneinstieg: gestaffeltes Erscheinen (`animation-delay`), Bauteile „zeichnen"
  sich isometrisch ein. Ein gut orchestrierter Moment statt vieler Effekte. In den Sims
  blenden sich die Ebenen gestaffelt ein (Boden → Drehpunkt → Körper → Vordergrund,
  `.lever-in`/`.lever-d1..d4`), `prefers-reduced-motion` schaltet das ab.
- Slider/Sim: sofortige, flüssige Reaktion (60 fps), kein Bounce. Live-Werte fließen
  direkt in die Geometrie (Neigung, Pfeil, Farbe) — keine CSS-Transition, kein Nachziehen.
- Übergänge 150–250 ms, weiche Easing-Kurve. Keine verspielten Federn.

## Verboten (gegen den generischen KI-Look)

- Kein Inter/Roboto/Arial/System-Font, kein Lila-Verlauf auf Weiß.
- Kein reines Weiß als Fläche, kein reines Schwarz als Text.
- Keine bunten Karten – Farbe nur über `--accent` und (nur in Sims) die Viz-Skala.
- Keine dicken Schlagschatten, keine abgerundeten „Bubble"-Buttons.
