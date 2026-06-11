# SCREENS.md — Informationsarchitektur, Screens & Interaktions-Muster

> Leitsatz: **Zeige nur das Nötige.** Die App hat genau einen Hub — die
> **Projektkarte** (umgekehrter Aufgaben-Baum) — und sie ist der **einzige Weg
> zu den Schritten**. Jeder Screen hat genau eine Hauptaufgabe; Tiefe liegt
> hinter Antippen/Aufklappen (progressive disclosure).
> Farben/Fonts/Motion aus `DESIGN.md` · Didaktik aus `LERNMODELL.md` ·
> Persistenz aus `DATENMODELL.md`.

---

## 1. Navigationsmodell & Routen

Routing über `react-router-dom` mit **HashRouter** (läuft auf jedem statischen
Host, auch GitHub Pages, ohne Server-Rewrites).

| Route | Screen | Hauptaufgabe |
|---|---|---|
| `/` | **Projektkarte** | der Aufgaben-Baum: sehen, wo man steht, Schritt öffnen |
| `/projekt/:id/schritt/:n` | **Workspace** | lernen & bauen (80 % der Zeit) |
| `/konzept/:id` | Konzept-Seite | ein Konzept in Ruhe verstehen |
| `/einstellungen` | Einstellungen | Tiefe, Motion, Backup, Daten |

**Redirect-Regeln:**
- `/projekt/:id` (alte Detail-Route) → `/` — die Projektkarte ist der Hub.
- `/projekt/:id/schritt/:n` mit einem Schritt, der weder erledigt noch
  freigeschaltet ist (`requires` ⊄ `stepsDone`, `src/dag.ts`) → Redirect auf
  `/` — die Karte erklärt die Sperre. Kein Vorspulen per URL.
- Unbekannte Route → freundliche 404-Karte („Hier ist nichts gezeichnet.") mit
  Link zur Projektkarte.

Es gibt **kein Onboarding**: der Erststart landet direkt auf der Projektkarte
des ersten Projekts — dort sind genau die Wurzel-Schritte frei, das *ist* der
Einstieg. Erklärtiefe wird in den Einstellungen (und pro Text-Block) gewählt.

---

## 2. Globales Gerüst (alle Screens)

```
┌──────────────────────────────────────────────────────┬──┐
│ Buildlab.  Projektkarte                    ◔ 50 %  ⚙ │  │ ← Topbar
│ ┌──────────────────────────────────────────────────┐ │ ▌│
│ │                                                  │ │ ▌│
│ │                  Screen-Inhalt                   │ │🧮│ ← Rechner-Lasche
│ │                                                  │ │ ▌│   (immer da)
│ └──────────────────────────────────────────────────┘ │ ▌│
└──────────────────────────────────────────────────────┴──┘
```

Keine Rail, keine Bottom-Bar, keine Tab-Navigation — der Baum ist das Menü.

- **Topbar:** links die Wordmark „Buildlab." (Display-Font, Akzent-Punkt — der
  einzige Marken-Moment, zugleich **Heim-Anker** → `/`), daneben der Breadcrumb
  (eine Ebene: Projektkarte · Projekt · Konzept · Einstellungen). Rechts der
  **Mastery-Ring** (Gesamt-Mastery in % aller Konzepte ≥ `angewendet`, nur
  ≥ 768 px) und das Zahnrad → Einstellungen. Die **Speicher-Warnung**
  (StatusBadge `warn`) erscheint nur bei Quota-Problemen und öffnet einen
  Dialog mit „Sicherung exportieren"-CTA.
- **Rechner-Lasche:** vertikale Lasche am rechten Rand, auf jedem Screen —
  **sofort**, auch während der Verlauf noch lädt (der zeigt dann Skeleton-Zeilen).
  Antippen/Ziehen = Rechner fährt als Drawer heraus (§7).
- **Zustands-Ebenen:** Jeder Screen hat Laden (`ScreenSkeleton`, layout-nah),
  Leer (`EmptyState`) und Fehler (Fehler-Karte „Hier hat sich etwas verklemmt"
  mit Neu-laden-Knopf; ErrorBoundary um den Outlet + Router-`errorElement`).
- **Tastatur global:** `Tab`-Reihenfolge Topbar → Inhalt → Lasche.
  Fokus-Ring nach `DESIGN.md`. `Esc` schließt das oberste Overlay
  (Popover → Gesperrt-Karte → Rechner) und gibt den Fokus an den Auslöser
  zurück.
- **z-Leiter (mobil):** Rechner-Drawer/-Lasche 40 · Workspace-Schritt-Leiste 30
  · Dialog-Overlay 50. Feste Leisten respektieren `env(safe-area-inset-bottom)`.

**Mobile (< 768 px):** identische Topbar (ohne Mastery-Ring). Die
Rechner-Lasche schwebt unten rechts **über** der fixen Schritt-Leiste des
Workspace (≥ 12 px Abstand).

---

## 3. Projektkarte `/` — der umgekehrte Aufgaben-Baum

Das Zentrum der App. **Das fertige Produkt steht oben**, die ersten Schritte
unten; Kanten zeigen, was wofür gebraucht wird. Man klettert von unten nach
oben, bis das Produkt steht.

```
  [⚙ Getriebe ✓◔] [⚖ Hebel ○]            ← Projekt-Wechsler (Chips)
  ⚙ Stirnradgetriebe
  „Baue ein Getriebe, das …"
  ▓▓▓▓░░░░ 4/8 · ~20 min                  ← Fortschritt + Restzeit

        ┌─────────────────────┐
        │ ⚙  DAS ZIEL         │           ← Produkt-Platte (Meilenstein),
        │    Finale frei!     │             gesperrt: gestrichelt
        └──────────┬──────────┘             fertig: gefüllt + „Steht. ✓"
              ┌────┴────┐
          (Bauen)   (Wirkungsgrad)        ← Knoten: ✓ erledigt (gefüllt)
              │          │                   ● frei (Akzent-Ring, antippbar)
        (Achsabstand) (Drehzahl &…)          ┊ gesperrt (gestrichelt, blass)
              └────┬─────┘
             (Übersetzung)
                   │
            (Warum Zahnräder?)            ← Wurzel = Einstieg, unten
```

- **Layout deterministisch** (`src/dag.ts › layoutTree`): Longest-Path-Layering
  über `step.requires`, Meilenstein oben, Wurzeln unten; Reihenfolge in der
  Ebene = Autorenreihenfolge + ein Barycenter-Durchlauf. Kein Force-Layout,
  keine Physik — Determinismus schlägt Effekt.
- **Knoten-Zustände** (nie Farbe allein): **erledigt** = gefüllter Akzent-Kreis
  mit ✓ (antippbar → Schritt wieder ansehen) · **frei** = Ring in Akzent mit
  Punkt (antippbar → Schritt öffnen) · **gesperrt** = gestrichelt, blasses
  Label. Frisch freigeschaltete Knoten bekommen beim Rücksprung aus dem
  Workspace einen Quittungs-Pop (`bl-quittung-pop`, Navigation-State).
- **Gesperrt ist erklärt, nicht blockiert:** Tap auf einen gesperrten Knoten
  öffnet eine Karte „Dafür brauchst du erst: …" mit den direkten
  Voraussetzungen (✓/○ je Stand). Fokus springt auf die Karten-Überschrift,
  `Esc`/„verstanden" gibt ihn an den Knoten zurück.
- **Kanten:** erfüllte Voraussetzung = durchgezogene Akzent-Linie; offene =
  gestrichelt, blass. S-Kurven von der Oberkante des unteren zum unteren Rand
  des oberen Knotens.
- **Produkt-Platte** (Meilenstein, ~3× Knotengröße): Projekt-Icon + „Das Ziel".
  Gesperrt: gestrichelter Rahmen + Projekttitel. Frei: „Finale frei!".
  Fertig: gefüllt, „Steht. ✓" — und oberhalb des Baums erscheint die
  **Produkt-Karte**: Bau-Ergebnis, Abschlussdatum und **„STL laden"**
  (kompiliert aus den gespeicherten Parametern neu, `src/lib/stl.ts`;
  STL-Blobs werden nie gespeichert).
- **Projekt-Wechsler:** Chips über dem Kopf (Icon · Titel · ✓ fertig / ◔
  begonnen / ○ offen, `aria-pressed`). Tap merkt sich `settings.activeProject`.
  Unerfüllte `recommendedAfter` zeigen beim aktiven Projekt einen Hinweis
  („Empfohlen vorher: … — du kannst aber jederzeit hier loslegen") —
  **Soft-Lock, nie Sperre.** Eine eigene Projektliste gibt es nicht.
- **Scroll-Verhalten:** Der Baum ist hoch, nicht breit — eine Spalte, vertikal
  scrollend (mobil wie Desktop, `max-w-2xl`). Beim Einstieg springt die
  Ansicht zum untersten freien Knoten (Sprung, kein Smooth-Scroll —
  reduced-motion-fest); ist das Projekt fertig, bleibt sie oben beim Produkt.
- **A11y:** SVG mit `role="img"` + `<desc>` (Zustandsbilanz: „8 Schritte:
  3 erledigt, 2 frei, 3 gesperrt …"); jeder Knoten `role="button"`,
  `tabIndex=0`, expliziter Fokus-Kreis, `aria-label` mit Zustand und — bei
  gesperrten — den Voraussetzungen.
- **Motion:** Einstieg `einzeichnen` gestaffelt je Ebene (von unten nach
  oben); Fortschrittsbalken `fuellen`; Gesperrt-Karte `gleiten`; alles
  degradiert unter `bl-reduced-motion`.

---

## 4. Workspace `/projekt/:id/schritt/:n` — der wichtigste Screen

Zwei Spalten: **lesen/entscheiden** links, **spielen/sehen** rechts.
Es ist immer nur **der aktuelle Schritt** sichtbar, nie die ganze Lektion.
Erreichbar **nur** über die Projektkarte; Deep-Links auf gesperrte Schritte
leiten dorthin zurück.

```
┌ Topbar: Buildlab. · Projekt                              ◔ 50 % ┐
│ ⚙ Getriebe · Schritt 4/8 „Achsabstand"                          │
┌── LEKTION (38 %) ──────────────┐┌── CANVAS (62 %, sticky) ─────┐
│ ZIEL  Passen beide Räder       ││                              │
│ zusammen?                      ││   [pseudo-3D: gear-pair]     │
│                                ││    zwei Räder, drehend       │
│ ┌ AUFHÄNGER ───────────────┐   ││                              │
│ │ Zwei Räder, eine Kiste — │   ││   z₁  ▭───●────  20  [−][+]  │
│ │ aber passt das überhaupt?│   ││   z₂  ▭─────●──  60  [−][+]  │
│ └──────────────────────────┘   ││   m   ▭──●─────  2,0 [−][+]  │
│ [ verspielt ][ praxis ][genau] ││   ──────────────────────────│
│ Fließtext mit ·Chips·.         ││   a = 80,0 mm     ✓ baubar   │
│ ▸ Theorie (zugeklappt)         │└──────────────────────────────┘
│ ── AUFGABE ──────────────────  │
│ │ Stell m so ein, dass         │
│ │ a = 80 mm wird.       ⟲ ✓ │  │ ← target-Task, gekoppelt
│ ‹ Projektkarte   4/8 erledigt   Weiter › │
└────────────────────────────────┘
```

### 4.1 Lektion (links)

Reihenfolge der Blöcke = Reihenfolge im Content. Render-Regeln:

- **ZIEL-Zeile:** Caption in Mono („Ziel · Schritt 3/8 · lernen" — Akzent-Tick
  davor), darunter der `goal`-Text als `title`-Headline (`--ink-strong`),
  immer oben, ein Satz.
- **Aufhänger** (`text.variant: hook`): Frage-Karte mit Akzent-Fragezeichen.
- **Text:** Tiefen-Tabs (global vorbelegt, lokal überschreibbar,
  `LERNMODELL.md` §4); Konzept-Chips antippbar (§6); volle Theorie zugeklappt
  unter `▸ Theorie`.
- **Auffrisch-Karte** (automatisch bei Quereinstieg, `LERNMODELL.md` §5):
  erscheint oberhalb des betroffenen Blocks, zuklappbar.
- **Formel:** LaTeX, jede Variable antippbar (Popover mit Name · Symbol ·
  Einheit · Erklärung · typischer Bereich).
- **Beispielrechnung (`calc`):** eingesetzte Werte in Mono, Ergebnis mit ✓
  (engine-bestätigt).
- **Aufgaben (`task`):** eingerückte Karte mit Status-Ecke (offen / ✓ / „mit
  Hilfe ✓"). Feedback dreistufig (`LERNMODELL.md` §7). Numerische Eingaben:
  Mono-Feld + ggf. Einheiten-Segmente (`unitChoices`).
- **Navigation unten (Hub-Modell):** links **„‹ Projektkarte"** (immer frei),
  Mitte stilles Mono-Label „x/y erledigt", rechts **„Weiter ›"** — aktiv erst,
  wenn der Schritt abgeschlossen ist (sanftes Gating, Tap auf den gesperrten
  Knopf erklärt warum). „Weiter" führt zum **eindeutigen** nächsten freien
  Schritt; öffnen sich mehrere Äste (oder ist der Meilenstein erledigt), heißt
  der Knopf „Zur Projektkarte ›" — bei Verzweigungen entscheidet die Karte,
  nicht der Knopf. Der Rücksprung trägt Navigation-State, damit die Karte
  frisch freigeschaltete Knoten quittiert.

### 4.2 Canvas (rechts, sticky)

- Zeigt den Block, den `step.canvas` benennt (Index), sonst den ersten
  `interactive`-/`build`-Block des Schritts. Hat ein Schritt keinen solchen
  Block, zeigt die Canvas das Projekt-Standbild (Ergebnis-Illustration) — nie
  leeres Beige.
- **Eine** Interaktion pro Canvas. Keine Werkzeugleisten.
- Slider: Tick-Marks, Mono-Wert am Griff, zusätzlich **−/+-Stepper** (Feinjustage,
  Touch, Tastatur). Unter jedem SVG-Slider liegt ein nativer
  `<input type="range">` (A11y-Pflicht, `DESIGN.md` §A11y).
- Ergebnis-Zeile (Mono, `aria-live="polite"`): Wert + Einheit + Zustand
  („✓ baubar" / „⚠ zu eng" in Viz-Farben).
- **`target`-Task-Kopplung:** Aufgabe (links) und Canvas-Komponente (rechts)
  teilen denselben Engine-Kontext (`useWorkspaceStore.active`). Erfüllt die
  Slider-Stellung das Ziel, quittiert die Aufgabe automatisch (Motion
  `quittung`); die Canvas zeigt einen dezenten Ziel-Korridor auf der Ergebnis-
  Skala.
- **`build`-Block:** Parameter-Slider + CAD-Vorschau (isometrisch, aus
  OpenSCAD-WASM) + Constraint-Liste (jede Anforderung als Zeile mit ✓/✗,
  engine-geprüft) + „STL herunterladen" (aktiv erst, wenn alle Constraints ✓)
  + Stückliste zugeklappt (`▸ Stückliste`).
- **Ladezustand WASM:** Mono-Zeile „Fräse läuft …" + dezenter Schimmer auf der
  Vorschaufläche. **Fehler:** Karte „Das Modell mag diese Werte nicht — stell
  einen Parameter zurück." + Button „Standardwerte".

### 4.3 Feedback-Momente

- Aufgabe gelöst → `quittung` (180 ms) + Mono-Bestätigung („i = 3 ✓").
- Schritt abgeschlossen → Mono-Zeile „Schritt 4 ✓ · Achsabstand sitzt";
  zurück auf der Projektkarte quittieren die frisch freigeschalteten Knoten.
- **Meilenstein-Schritt:** Engine verifiziert die Projekt-Challenge (Soll-Werte
  vs. gewählte Parameter, jede Anforderung als Zeile), dann Explosionsansicht
  des Bauteils (`packages/iso/explode`, langsame Stagger-Animation), Karte
  „Dein Bauteil wartet oben auf deiner Projektkarte." — dort übernimmt die
  Produkt-Karte (§3) Ergebnis + STL. Kein Konfetti (Design-Sprache).

### 4.4 Mobile-Workspace (< 768 px)

```
┌────────────────────────┐
│  Canvas (sticky, ≤45vh) │ ← bleibt beim Scrollen oben stehen
│  + Slider mit Steppern  │
├────────────────────────┤
│ ZIEL · Aufhänger        │
│ [verspielt|praxis|genau]│
│ Lektionstext …          │
│ Aufgabe …               │
│ ‹ Projektkarte  4/8  Weiter › │ ← fixe Leiste am unteren Rand
└────────────────────────┘
```

- Canvas maximal 45 vh hoch, kollabierbar per Griff-Leiste (Doppel-Strich) auf
  eine 64-px-Ergebniszeile — Lektion bekommt dann den Platz. Der Übergang ist
  Motion `aufklappen` (grid-rows 1fr↔0fr, 300 ms); die Ergebniszeile blendet
  per `wechsel` ein. Ab 768 px ist die Canvas immer offen (der Griff existiert
  nur mobil).
- Subheader zeigt mobil nur „Schritt X/Y ‚Titel'" — Projekt-Icon und -Name
  sind dort redundant (man kommt von der Projektkarte).
- Schritt-Navigation ist eine **fixe Leiste** am unteren Rand (nie von der
  Canvas verdeckt, safe-area-bewusst).

### 4.5 Tastatur im Workspace

- `→`: zum eindeutigen nächsten Schritt (wenn der aktuelle abgeschlossen ist) —
  nur, wenn kein Eingabefeld fokussiert ist. Zur Projektkarte führt der
  Knopf links (Tab-erreichbar); lineares `←`-Blättern gibt es nicht mehr.
- Slider: Pfeiltasten (nativer Range-Input), `Shift` = 10er-Schritte.
- Popover/Panels: `Enter` öffnet, `Esc` schließt.

---

## 5. Konzept-Seite `/konzept/:id`

Ruhige Lese-Seite, erreichbar aus jedem Popover („tiefer eintauchen →").

```
┌──────────────────────────────────────────────┐
│ Übersetzung   i   [—]            ◐ angewendet│ ← Name·Symbol·Einheit + Mastery
│ [ verspielt ][ praxis ][ genau ]             │ ← alle drei Ebenen lesbar
│ <Erklärtext der gewählten Ebene>             │
│                                              │
│ FORMELN        i = z₂/z₁ · n₂ = n₁/i         │ ← Formula-Renderer, antippbar
│ BAUT AUF       ·Zähnezahl· ·Drehmoment·      │ ← Kette nach oben (Links)
│ KOMMT VOR IN   ⚙ Stirnradgetriebe            │ ← aus content/_index.json,
│                ⛓ Antriebsstrang              │   verlinkt direkt den Schritt
└──────────────────────────────────────────────┘
```

„Kommt vor in" löst die Mehrdeutigkeit Konzept↔Projekt deterministisch: Quelle
ist der vom Verifier generierte Index (`content/_index.json`), Reihenfolge =
Einführung zuerst, dann Verwendungen. Die Einträge verlinken **direkt auf den
Schritt**; ist er noch gesperrt, leitet der Workspace zur Projektkarte um —
die erklärt die Sperre. Geübt wird in den Projekten selbst (Auffrisch-Karten,
`LERNMODELL.md` §5/§6) — es gibt keinen separaten Übungs-Screen.

---

## 6. Antippen-erklärt-Popover (überall)

Jeder ·unterstrichene· Begriff und jede Formel-Variable:

```
   …der ·Achsabstand· muss zur Kiste passen…
        └─▼──────────────────────────────┐
          │ Achsabstand   a   [mm]       │ ← Mono: Symbol + Einheit
          │ Der Abstand der beiden       │
          │ Wellen-Mitten. Zu klein:     │ ← 1–2 Sätze (short)
          │ klemmt. Zu groß: klappert.   │
          │ ↳ baut auf: ·Teilkreis·      │ ← Voraussetzung (Link)
          │ [ tiefer eintauchen → ]      │ ← Konzept-Seite (§5)
          └──────────────────────────────┘
```

Regeln: erstes Auftreten = volle Erklärung im Fließtext, danach nur Chip +
Popover (`LERNMODELL.md` §5). Unerfüllte Voraussetzung wird im Popover zuerst
genannt — die Voraussetzungs-Namen sind selbst antippbar (→ Konzept-Seite).
„tiefer eintauchen →" ist ein echter Link zur Konzept-Seite (schließt das
Popover und navigiert); ohne Navigationskontext (z. B. in Tests) verschwindet
er — nie eine tote Affordance. Wegtippen/`Esc` schließt; nichts blockiert den
Lesefluss. `role="dialog"` auf `--paper-3` (Elevation 2), `Esc` gibt den
Fokus an den Auslöser zurück (auch beim In-Formel-Antippen).

---

## 7. Universal-Rechner (Drawer, global)

Von jedem Screen über die Lasche rechts. Fährt als Drawer herein, **andockbar**
(schiebt Inhalt) oder **schwebend** (frei beweglich).

```
┌── 🧮 Rechner ────────────[⤢][×]┐
│ VERLAUF (persistent, 50)        │
│  3 · 9,81      = 29,43 N   [↵] │ ← Tipp: Ergebnis → ans
│  m·(z₁+z₂)/2   = 80 mm     [⇥] │ ← „in Aufgabe einsetzen"
│ ─────────────────────────────  │
│ [ Zahlen ][ Einheiten ][ Σ ]   │
│   Anzeige:          80 mm      │
│  7 8 9 ÷   sin cos tan √       │
│  4 5 6 ×   π   e   x²  xⁿ      │
│  1 2 3 −   (   )  ans  C       │
│  0 , = +   [ Einheit ▾ ]       │
└────────────────────────────────┘
```

- **Wissenschaftlich** (Grundrechnen, Potenzen, Wurzeln, trig, log/exp, π, e, g)
  und **einheitenbewusst** (rechnet mit N, mm, MPa, kg, ° — dieselbe
  mathjs-Logik wie die Engine; Einheiten-Unsinn gibt eine freundliche Warnung).
- **Σ Formelbewusst:** zieht über `useWorkspaceStore.active` die Formel + die
  aktuellen Slider-Werte des laufenden Schritts herein (vorbefüllt).
- **Verlauf persistent** (`calcHistory`, Ring aus 50 Einträgen, übersteht
  Neuladen). Wiederverwendung definiert: **Tipp** auf eine Zeile → Ergebnis
  landet als `ans` in der Eingabe; **„⇥ einsetzen"** → Ergebnis füllt das
  zuletzt fokussierte numerische Antwortfeld einer Aufgabe (Button nur aktiv,
  wenn ein solches Feld existiert).
- Rechner schiebt sich über die **Canvas**, nie über die Lektion — Lesen bleibt
  frei. Mobile: volle Breite als Bottom-Sheet (max. 70 vh). Eintritt per
  `gleiten`; schwebend = `--paper-3` (höchste Erhebung).
- **Bedienung:** `Esc` schließt den Drawer und gibt den Fokus an die Lasche
  zurück. Kopfknöpfe (⤢/×) sind visuell kompakt, tragen aber 44-px-Treffflächen
  (`hitArea`). Solange der Verlauf aus IndexedDB lädt, zeigt er Skeleton-Zeilen;
  lokale Einträge bleiben beim Nachladen vorn.

> Scope-Ehrlichkeit: tief, wo es zählt (Einheiten, Projektformeln), simpel
> sonst. Kein Computeralgebra-System.

---

## 8. Einstellungen `/einstellungen`

```
ERKLÄRTIEFE        [ verspielt ][ praxis ][ genau ]
BEWEGUNG           [✓] Animationen reduzieren  (zusätzlich zu System-Einstellung)
SICHERUNG
  [ Sicherung exportieren ]   → buildlab-backup-2026-06-09.json
  [ Sicherung importieren ]   → Datei wählen → Zusammenfassung („ersetzt
                                Fortschritt von 2 Projekten, 14 Konzepten")
                                → [ Abbrechen ] [ Ja, ersetzen ]
SPEICHER           Dauerhafter Speicher: gewährt ✓  (navigator.storage.persist)
DATEN              [ Alles löschen ] → zweistufige Bestätigung mit Tipp-Wort
ÜBER               Version · Lizenz · „alles bleibt auf deinem Gerät"
```

Import validiert Format + Version (`DATENMODELL.md` §4), zeigt den Diff als
Zusammenfassung und ersetzt transaktional — nie ein halber Import. „Alles
löschen" führt zurück auf die Projektkarte (frischer Stand, Wurzeln frei).

Import-Bestätigung und Lösch-Fluss laufen über das **Dialog-Primitiv**
(DESIGN.md §4/§7): Fokus-Falle, `Esc` bricht ab, Fokus kehrt zum Auslöser
zurück; der destruktive Knopf ist `danger` und bleibt deaktiviert, bis das
Tipp-Wort stimmt.

---

## 9. Übergänge & Disclosure-Regeln (Zusammenfassung)

- Tiefen-Umschalter wechselt Text **in place** (Cross-Fade `wechsel`, Scroll bleibt).
- Slider → Canvas reagiert sofort (60 fps); Ergebniszahl zählt kurz hoch (`zaehlen`).
- „tiefer eintauchen" öffnet die Konzept-Seite — der Weg zurück ist der
  Browser-Zurück bzw. die Wordmark.
- Workspace → Projektkarte: frisch freigeschaltete Knoten quittieren
  (`quittung`-Pop); der Baum zeichnet sich beim Einstieg ebenenweise ein
  (`einzeichnen`).
- Höhen-Expansionen (Canvas-Griff, Hinweis/Lösungsweg) laufen über
  `aufklappen`; Drawer/Dialoge/Gesperrt-Karten über `gleiten`;
  Fortschrittsbalken füllen beim ersten Rendern per `fuellen`; Skeletons
  tragen `schimmer`. Alles degradiert bei reduzierter Bewegung (DESIGN.md §8).
- Disclosure: 1. Ein Hub, ein Weg zu den Aufgaben. 2. Ein Screen, eine
  Aufgabe. 3. Nur der aktuelle Schritt. 4. Theorie zugeklappt. 5. Eine
  Interaktion pro Canvas. 6. Tiefe hinter Antippen. 7. Werkzeuge auf Abruf.
  8. Erklärtes wird verlinkt, nie wiederholt.
