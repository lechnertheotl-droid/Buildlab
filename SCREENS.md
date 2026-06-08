# SCREENS.md — Screen-Layout & Interaktions-Muster

Leitsatz: **Zeige nur das Nötige.** Jeder Screen hat genau eine Hauptaufgabe.
Alles Weitere ist standardmäßig verborgen und erscheint auf Wunsch (progressive
disclosure). Aufgeräumtes Beige-Papier, viel Luft, verspielte Microcopy.

Bezug: Farben/Fonts aus `DESIGN.md`, Grafik pseudo-3D aus `CLAUDE.md`.

---

## 1. Globales Gerüst (auf allen Screens gleich)

```
┌────┬───────────────────────────────────────────────┬──┐
│    │  ‹ Rakete · Schritt 4/12              ◷ 78%    │  │ ← Topbar: nur Breadcrumb
│ R  │ ┌───────────────────────────────────────────┐ │ ▌│   + Fortschritt. Sonst leer.
│ a  │ │                                           │ │ ▌│
│ i  │ │            Screen-Inhalt                  │ │🧮│ ← Rechner-Griff am
│ l  │ │                                           │ │ ▌│   rechten Rand (immer da)
│    │ └───────────────────────────────────────────┘ │ ▌│
└────┴───────────────────────────────────────────────┴──┘
```

- **Rail (links, schmal):** 4 Icons — Start · Skill-Map · Projekt · Portfolio.
  Eingeklappt = nur Icons; Hover/Tippen klappt Labels aus. Mehr gibt es nicht.
- **Topbar:** links Breadcrumb (wo bin ich), rechts ein Fortschrittsring. Keine
  weiteren Knöpfe — Einstellungen liegen im Profil.
- **Rechner-Griff:** vertikale Lasche ganz rechts, auf **jedem** Screen. Antippen/
  ziehen = Rechner fährt heraus (siehe §7).
- Mobile: Rail wird zur Bottom-Bar (4 Icons), Topbar bleibt schlank.

---

## 2. Onboarding (nur beim ersten Start)

Eine Aufgabe pro Schritt, max. 4 Schritte, dann sofort ins erste Projekt:

```
   Worauf hast du Lust?
   ┌──────────┐ ┌──────────┐ ┌──────────┐
   │ Studium  │ │  Technik │ │  Bauen   │   ← drei Türen (Personas)
   │ verstehen│ │  /Azubi  │ │ /Maker   │
   └──────────┘ └──────────┘ └──────────┘
```
Danach 2–3 spielerische Mini-Aufgaben zur Einstufung (kein Test-Gefühl), dann
„Los geht's" → Workspace. Keine Pflicht-Registrierung vor dem ersten Erfolg.

---

## 3. Dashboard / Start

Dominanz auf **einer** Karte: weitermachen. Darunter höchstens zwei dezente Module.

```
┌───────────────────────────────────────────┐
│  Weiter bei: Rakete · Finnen auslegen      │ ← große Fortsetzen-Karte
│  ▓▓▓▓▓▓▓░░░  Schritt 4 von 12   [ Weiter ] │
└───────────────────────────────────────────┘
  Als Nächstes empfohlen        Dein Baukasten
  ┌─────────┐ ┌─────────┐       ┌───────────┐
  │ Getriebe│ │  Welle  │       │ 3 Projekte│
  └─────────┘ └─────────┘       │ fertig 🛠 │
                                └───────────┘
```

---

## 4. Skill-Map

Der Concept-Graph als isometrische Landkarte. Erledigte Knoten leuchten (Akzent),
gesperrte sind blass mit Schloss; Linien zeigen **Voraussetzungen**.

```
        (Statik)───────(Festigkeit)
           │               │
        (Hebel)        (Welle)──(Lager)
           ╲             ╱
            (Maschinen-elemente)──(Getriebe ✓)
```
- Knoten antippen → kleine Karte: „deckt X ab", „braucht Y", Button „Projekt öffnen".
- Nur Knoten + Kanten, keine Texttapete. Tiefe kommt beim Antippen.

---

## 5. Projekt-Workspace (der wichtigste Screen)

Hier wird 80 % der Zeit verbracht. Zwei Spalten: **lesen/entscheiden** links,
**spielen/sehen** rechts.

```
┌── LEKTION  (38%) ────────────┐┌── CANVAS  (62%) ──────────────┐
│ Schritt 4 · Finnen           ││                               │
│ [ verspielt ][praxis][genau] ││        pseudo-3D Ansicht       │
│                              ││     (Simulation / CAD-Vorschau)│
│ Kurzer Fließtext mit         ││                               │
│ ·antippbaren· Begriffen.     ││   ┌─────────────────────────┐ │
│                              ││   │ Finnenhöhe   ▭──●──── 40 │ │ ← Slider mit
│ ▸ Theorie (zugeklappt)       ││   │ Finnenzahl   ▭●────── 3  │ │   Tick-Marks,
│                              ││   └─────────────────────────┘ │   Mono-Wert
│ σ_v = … (Variablen antippbar)││                               │
│ Beispiel: 142 MPa  ✓         ││   Stabilität: stabil ✓        │
│                              ││                               │
│ ‹ Zurück   ● ● ● ○ ○ ○   › ││                               │
└──────────────────────────────┘└───────────────────────────────┘
```

**„Nur das Nötige"-Regeln für diesen Screen:**
- Es ist **immer nur der aktuelle Schritt** sichtbar — nie die ganze Lektion.
- `text` zeigt zuerst die gewählte Tiefen-Ebene. Vollständige Theorie/Herleitung
  ist **zugeklappt** (`▸ Theorie`) und nur bei Bedarf da.
- Die Canvas zeigt **eine** Interaktion, passend zum Schritt. Keine Werkzeugleisten.
- Ergebnis-Feedback ist visuell (✓ / Bauteil bricht sichtbar), kein Zahlenfriedhof.
- Navigation unten: Zurück/Weiter + Fortschrittspunkte. Sonst nichts.

**Mobile-Workspace** (gestapelt, Canvas zuerst, da am wichtigsten):
```
┌───────────────────────┐
│   Canvas (sticky)      │
│   + Slider             │
├───────────────────────┤
│ [verspielt|praxis|genau]│
│ Lektionstext …         │
│ ‹ Zurück   ● ● ●   › │
└───────────────────────┘
```

---

## 6. Konzept-Seite (Ziel von „tiefer eintauchen")

Erreichbar aus jedem Popover/Begriff. Eine ruhige Lese-Seite: voller Erklärtext in
allen drei Ebenen, die zugehörige(n) Formel(n), die **Voraussetzungen** als Links
nach oben und „kommt vor in"-Links zu Projekten. Hierher wird verlinkt, statt im
Projekt alles zu wiederholen.

---

## 7. Der ausziehbare Universal-Rechner

Von jedem Screen über den Griff am rechten Rand. Fährt als Drawer herein, lässt sich
**andocken** (schiebt Inhalt) oder **herausziehen** zu einem frei beweglichen,
schwebenden Fenster.

```
                              ┌── 🧮 Rechner ───────[⤢][×]┐
                              │ Verlauf                    │
                              │  3 · 9,81  = 29,43 N       │ ← Mono, Ergebnisse
                              │  142 MPa < 235 MPa  ✓      │   wiederverwendbar
                              │ ───────────────────────── │
                              │ [ Zahlen ][ Einheiten ][ Σ Formeln ]
                              │   Anzeige:        29,43 N  │
                              │  7 8 9 ÷   sin cos tan √   │
                              │  4 5 6 ×   π   e   x²  xⁿ  │
                              │  1 2 3 −   (   )  ans  C   │
                              │  0 , = +   [ Einheit ▾ ]   │
                              └────────────────────────────┘
```

Was er kann (bewusst auf den Ingenieur-Bedarf fokussiert, nicht „alles im Universum"):
- **Wissenschaftlich:** Grundrechnen, Potenzen, Wurzeln, Trigonometrie, log/exp, π, e.
- **Einheiten & Umrechnung:** rechnet *mit* Einheiten (N, mm, MPa, kg, °, …) und
  warnt bei Einheiten-Unsinn — dieselbe Logik wie die Rechen-Engine (mathjs).
- **Σ Formelbewusst:** zieht per Tipp die Formeln & aktuellen Slider-Werte des
  laufenden Schritts herein (z. B. `i = z₂/z₁` mit z₁, z₂ vorbefüllt). Das ist der
  Clou: Rechner ↔ Engine ↔ aktuelles Projekt sind verbunden.
- **Verlauf** als Mono-Streifen; jedes Ergebnis ist anklickbar/weiterverwendbar.
- **Konstanten** (g, …). Optional später: eine Funktion plotten.

> Scope-Ehrlichkeit: „kann alles, was gebraucht wird" = alles, was ein
> Maschinenbau-Lernender braucht. Ein voller Computeralgebra-Solver ist bewusst
> nicht das Ziel — tief dort, wo es zählt (Einheiten, die Projektformeln), simpel sonst.

---

## 8. Antippen-erklärt-Popover (überall)

Jeder ·unterstrichene· Begriff und jede Formel-Variable:

```
   …die ·Vergleichsspannung· übersteigt die Streckgrenze…
          └─▼──────────────────────────────┐
            │ Vergleichsspannung  σ_v  [MPa] │ ← Mono-Symbol + Einheit
            │ Fasst mehrere Lastarten zu     │
            │ einer einzigen Vergleichszahl  │ ← 1–2 Sätze, verspielt
            │ zusammen.                      │
            │ ↳ baut auf: ·Spannung·         │ ← Voraussetzung (Link)
            │ [ tiefer eintauchen → ]        │ ← zur Konzept-Seite (§6)
            └────────────────────────────────┘
```

Regeln:
- **Erstes Auftreten** eines Konzepts: volle Erklärung im Fließtext.
  **Spätere Male:** nur dieses Kurz-Popover + Link — nie wieder die ganze Erklärung.
- Hat der Begriff eine **unerfüllte Voraussetzung**, zeigt das Popover sie zuerst an.
- Popover schließt beim Wegtippen; nichts blockiert den Lesefluss.

---

## 9. Smooth kombinieren — die Übergänge

- Tiefen-Umschalter wechselt den Text **in place** (sanftes Cross-Fade), Scroll bleibt.
- Slider → Canvas reagiert sofort (60 fps); Ergebniszahl zählt kurz hoch.
- „tiefer eintauchen" gleitet als Panel über die Lektion statt hartem Seitenwechsel.
- Rechner schiebt sich über die Canvas, nie über die Lektion (Lesen bleibt frei).
- Schritt-Wechsel: Bauteil „zeichnet" sich isometrisch neu ein (ein Moment, kein Effekt-Feuerwerk).

## 10. Zusammenfassung der Disclosure-Regeln

1. Ein Screen, eine Aufgabe. 2. Nur der aktuelle Schritt. 3. Theorie/Herleitung
zugeklappt. 4. Eine Interaktion pro Canvas. 5. Tiefe immer hinter Antippen/Aufklappen.
6. Werkzeuge (Rechner) auf Abruf, nicht im Sichtfeld. 7. Bereits Erklärtes wird
verlinkt, nicht wiederholt.
