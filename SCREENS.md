# SCREENS.md — Informationsarchitektur, Screens & Interaktions-Muster

> Leitsatz: **Zeige nur das Nötige.** Jeder Screen hat genau eine Hauptaufgabe;
> Tiefe liegt hinter Antippen/Aufklappen (progressive disclosure).
> Farben/Fonts/Motion aus `DESIGN.md` · Didaktik aus `LERNMODELL.md` ·
> Persistenz aus `DATENMODELL.md`.

---

## 1. Navigationsmodell & Routen

Routing über `react-router-dom` mit **HashRouter** (läuft auf jedem statischen
Host, auch GitHub Pages, ohne Server-Rewrites).

| Route | Screen | Hauptaufgabe |
|---|---|---|
| `/onboarding` | Onboarding | Persona + Tiefe wählen, < 60 s |
| `/` | Dashboard | „Weitermachen" mit einem Tipp |
| `/karte` | Skill-Map | Wissensstand sehen, Lücken finden |
| `/projekte` | Projektliste | Curriculum überblicken, Projekt wählen |
| `/projekt/:id` | Projekt-Detail | Briefing lesen, starten/fortsetzen |
| `/projekt/:id/schritt/:n` | **Workspace** | lernen & bauen (80 % der Zeit) |
| `/konzept/:id` | Konzept-Seite | ein Konzept in Ruhe verstehen |
| `/werkstatt` | Werkstatt | gebaute Teile & Abschlüsse ansehen |
| `/training` | Training | fällige Konzepte auffrischen |
| `/einstellungen` | Einstellungen | Tiefe, Motion, Backup, Daten |

**Redirect-Regeln:**
- Root-Aufruf ohne `settings.onboardingDone` → `/onboarding`.
- `/projekt/:id/schritt/:n` mit n > höchster erreichter Schritt + 1 → Redirect
  auf den höchsten erlaubten Schritt (kein Vorspulen per URL).
- Unbekannte Route → freundliche 404-Karte („Hier ist nichts gezeichnet.") mit
  Link zum Dashboard.

---

## 2. Globales Gerüst (alle Screens)

```
┌────┬──────────────────────────────────────────────────┬──┐
│    │  ‹ Getriebe · Schritt 4/8 „Achsabstand"   ◔ 50 % │  │ ← Topbar
│ R  │ ┌──────────────────────────────────────────────┐ │ ▌│
│ a  │ │                                              │ │ ▌│
│ i  │ │                Screen-Inhalt                 │ │🧮│ ← Rechner-Lasche
│ l  │ │                                              │ │ ▌│   (immer da)
│    │ └──────────────────────────────────────────────┘ │ ▌│
└────┴──────────────────────────────────────────────────┴──┘
```

- **Rail (links, schmal):** 5 Icons — Start · Karte · Projekte · Werkstatt ·
  Training. Eingeklappt nur Icons (Breite 56 px); Hover/Fokus klappt Labels aus.
  Aktiver Eintrag: Akzent-Strich links + gefülltes Icon. Ganz unten: Zahnrad-Icon
  → Einstellungen.
- **Topbar:** links Breadcrumb (max. 2 Ebenen: Bereich · Unterpunkt), rechts ein
  Fortschrittsring (im Workspace: Projekt-Fortschritt; sonst: Gesamt-Mastery in %
  aller Konzepte ≥ `angewendet`). Keine weiteren Knöpfe.
- **Rechner-Lasche:** vertikale Lasche am rechten Rand, auf jedem Screen.
  Antippen/Ziehen = Rechner fährt als Drawer heraus (§12).
- **Tastatur global:** `Tab`-Reihenfolge Rail → Topbar → Inhalt → Lasche.
  Fokus-Ring nach `DESIGN.md`. `Esc` schließt das oberste Overlay
  (Popover → Konzept-Panel → Rechner, in dieser Reihenfolge).

**Mobile (< 768 px):**
- Rail → **Bottom-Bar** mit denselben 5 Icons (Tap-Targets ≥ 48 px), Einstellungen
  wandern in die Topbar (Zahnrad rechts). Aktives Icon: Akzent-Tick an der
  Oberkante.
- **Topbar mobil = Breadcrumb + Zahnrad.** Der Fortschrittsring erscheint nur
  ≥ 768 px — globaler Fortschritt ist mobil nicht aufgaben-relevant, die
  Skill-Map zeigt ihn vollständig.
- Rechner-Lasche → schwebende Lasche unten rechts, **über** der Bottom-Bar
  **und** der fixen Schritt-Leiste des Workspace (≥ 12 px Abstand), damit
  alle drei bedienbar bleiben.

---

## 3. Onboarding `/onboarding`

Drei Schritte, gesamt unter 60 Sekunden, jederzeit überspringbar
(„Erstmal umsehen →" = Dashboard mit Default `praxis`). Keine Registrierung,
keine Einstufungstests — Einstufung passiert implizit über das Mastery-Modell.

```
Schritt 1/3 · Worauf hast du Lust?
┌────────────┐ ┌────────────┐ ┌────────────┐
│  Studium   │ │  Technik   │ │  Bauen /   │   ← drei Türen, isometrische
│  verstehen │ │  / Azubi   │ │  Maker     │     Mini-Illustration je Tür
└────────────┘ └────────────┘ └────────────┘

Schritt 2/3 · Wie soll Buildlab mit dir reden?
[ verspielt ] [ praxis ] [ genau ]      ← vorbelegt aus Persona
┌──────────────────────────────────────┐
│ „Zwei Zahnräder, ein Tauschgeschäft: │  ← Live-Beispieltext wechselt
│  Tempo gegen Kraft…"                 │    beim Umschalten (Motion `wechsel`)
└──────────────────────────────────────┘

Schritt 3/3 · Dein erstes Projekt
┌──────────────────────────────────────┐
│  ⚙ Stirnradgetriebe                  │  ← Empfehlung aus Persona
│  Ein echtes Getriebe, am Ende        │    (LERNMODELL.md §9)
│  3D-druckbar. ~45 min                │
│            [ Los geht's → ]          │
│  „lieber selbst aussuchen" → /projekte│
└──────────────────────────────────────┘
```

Abschluss schreibt `settings.persona`, `settings.depth`,
`settings.onboardingDone = true` und navigiert in den Workspace (Schritt 1) bzw.
auf die Projektliste.

---

## 4. Dashboard `/`

Dominanz auf **einer** Karte: weitermachen. Maximal drei Module, feste Ordnung.

```
┌──────────────────────────────────────────────────┐
│  Weiter bei: Stirnradgetriebe · „Achsabstand"    │ ← Fortsetzen-Karte
│  ▓▓▓▓▓░░░  Schritt 4 von 8 · noch ~20 min        │   (größtes Element)
│                                    [ Weiter › ]  │
└──────────────────────────────────────────────────┘
  Auffrischen (3 fällig)        Als Nächstes
  ┌────────────────┐            ┌──────────┐ ┌──────────┐
  │ Drehmoment ·   │            │ ⚖ Welle  │ │ ⛁ Brücke │
  │ Modul · Hebel  │            │ empfohlen│ │ ✓ fertig │
  │ [ Üben → ]     │            └──────────┘ └──────────┘
  └────────────────┘
```

- **Fortsetzen-Karte:** zuletzt aktives, nicht abgeschlossenes Projekt.
  Restdauer = Summe `durationMin` der offenen Schritte (Orientierung, kein Timer).
- **Auffrischen-Karte:** nur sichtbar bei ≥ 3 fälligen Konzepten
  (`LERNMODELL.md` §6); listet bis zu 3 Konzept-Namen.
- **Als Nächstes:** bis zu 2 Empfehlungen nach der Regel aus `LERNMODELL.md` §9.
- **Leerzustand** (nie etwas gestartet): Hero-Karte „Dein erstes Projekt" mit
  Persona-Empfehlung + Link zur Projektliste. Keine leeren Modul-Hüllen.

---

## 5. Projektliste `/projekte` & Projekt-Detail `/projekt/:id`

### 5.1 Liste

Vier Niveau-Sektionen (Überschrift + Hairline), darin Projektkarten:

```
┌─────────────────────────────┐
│ ⚙  Stirnradgetriebe         │ ← Icon (Projekt-Metadatum)
│ Niveau 2 · ~45 min · ●●○○○  │ ← Dauer + Schwierigkeit (5 Ticks)
│ ▓▓▓░░░░░ begonnen           │ ← Statuszeile
└─────────────────────────────┘
```

Status (genau einer): `empfohlen` (Akzent-Badge) · `offen` · `begonnen`
(Mini-Fortschrittsbalken) · `fertig` (✓) · `Voraussetzung offen` (blass +
Schloss-Symbol, **trotzdem antippbar** — Soft-Lock).

**Mobil (< 768 px):** Schwierigkeits-Ticks (●●○○○) ausgeblendet — die Karte
zeigt Icon · Titel · Dauer · Status. Schwierigkeit bleibt ein Desktop-Detail.

### 5.2 Detail (Briefing vor dem Start)

```
┌──────────────────────────────────────────────┐
│ ⚙ Stirnradgetriebe                 Niveau 2  │
│ [isometrische Illustration des Ergebnisses]  │
│                                              │
│ DEINE CHALLENGE                              │
│ „Ein Getriebe, das die Motordrehzahl auf 1/3 │
│ senkt — und das Drehmoment hebt."            │
│                                              │
│ Du lernst: ·Übersetzung· ·Modul· ·Achsabstand·│ ← Konzept-Chips (antippbar)
│ Du baust:  2 Zahnräder + 2 Achsen (STL)      │
│                                              │
│ SCHRITTE                                     │
│ ✓ 1 Warum Zahnräder?                         │
│ ✓ 2 Die Übersetzung                          │
│ ▸ 3 Modul & Teilkreis        ← aktueller     │
│   4 Achsabstand …                            │
│                                              │
│              [ Fortsetzen → ]                │
└──────────────────────────────────────────────┘
```

**Schrittliste = Disclosure:** sichtbar sind erledigte + aktueller + nächster
Schritt (bei nicht begonnenem Projekt: die ersten drei); der Rest liegt hinter
„alle n Schritte anzeigen". Nur zeigen, was gerade wichtig ist.

**Soft-Lock-Verhalten** (Voraussetzungen aus `recommendedAfter` unerfüllt):
Oberhalb des CTA erscheint ein Hinweiskasten:

```
┌ ⚠ Dir fehlen noch: ·Drehmoment· ·Hebelarm· ──────────┐
│ 10 Minuten in „Hebel & Flaschenzug" — oder du legst   │
│ direkt los und holst es unterwegs nach.               │
│ [ Erst auffrischen ]        [ Trotzdem starten ]      │
└───────────────────────────────────────────────────────┘
```

„Erst auffrischen" öffnet die Konzept-Seite(n) bzw. das Training; „Trotzdem
starten" startet normal — die Auffrisch-Karten (`LERNMODELL.md` §5) fangen
Quereinsteiger im Workspace auf. **Es gibt keinen Hard-Lock.**

---

## 6. Workspace `/projekt/:id/schritt/:n` — der wichtigste Screen

Zwei Spalten: **lesen/entscheiden** links, **spielen/sehen** rechts.
Es ist immer nur **der aktuelle Schritt** sichtbar, nie die ganze Lektion.

```
┌ Topbar: ‹ Getriebe · Schritt 4/8 „Achsabstand"          ◔ 50 % ┐
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
│                                │
│ a = m·(z₁+z₂)/2   ← Variablen  │
│   antippbar                    │
│ ── AUFGABE ──────────────────  │
│ │ Stell m so ein, dass         │
│ │ a = 80 mm wird.       ⟲ ✓ │  │ ← target-Task, gekoppelt
│ ‹ Zurück   ● ● ● ◉ ○ ○ ○ ○   Weiter › │
└────────────────────────────────┘
```

### 6.1 Lektion (links)

Reihenfolge der Blöcke = Reihenfolge im Content. Render-Regeln:

- **ZIEL-Zeile:** der `goal`-Text des Schritts, immer oben, ein Satz.
- **Aufhänger** (`text.variant: hook`): Frage-Karte mit Akzent-Fragezeichen.
- **Text:** Tiefen-Tabs (global vorbelegt, lokal überschreibbar,
  `LERNMODELL.md` §4); Konzept-Chips antippbar (§11); volle Theorie zugeklappt
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
- **Navigation unten:** ‹ Zurück · Fortschrittspunkte (klickbar bis zum höchsten
  erreichten Schritt; aktueller = ◉) · Weiter ›. „Weiter" deaktiviert, solange
  Pflicht-Aufgaben offen sind (Tooltip erklärt das, sanftes Gating).

### 6.2 Canvas (rechts, sticky)

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

### 6.3 Feedback-Momente

- Aufgabe gelöst → `quittung` (180 ms) + Mono-Bestätigung („i = 3 ✓").
- Schritt abgeschlossen → nächstes Bauteil „zeichnet sich ein" (`einzeichnen`,
  400 ms, gestaffelt), Mono-Zeile „Schritt 4 ✓ · Achsabstand sitzt".
- **Meilenstein-Schritt:** Engine verifiziert die Projekt-Challenge (Soll-Werte
  vs. gewählte Parameter, jede Anforderung als Zeile), dann Explosionsansicht
  des Bauteils (`packages/iso/explode`, langsame Stagger-Animation), Werkstatt-
  Eintrag wird geschrieben, Karte „Dein Getriebe steht in der Werkstatt →".
  Kein Konfetti (Design-Sprache).

### 6.4 Mobile-Workspace (< 768 px)

```
┌────────────────────────┐
│  Canvas (sticky, ≤45vh) │ ← bleibt beim Scrollen oben stehen
│  + Slider mit Steppern  │
├────────────────────────┤
│ ZIEL · Aufhänger        │
│ [verspielt|praxis|genau]│
│ Lektionstext …          │
│ Aufgabe …               │
│ ‹ Zurück  ●●◉○  Weiter ›│ ← fixe Leiste am unteren Rand,
└────────────────────────┘   über der Bottom-Bar
```

- Canvas maximal 45 vh hoch, kollabierbar per Griff-Leiste (Doppel-Strich) auf
  eine 64-px-Ergebniszeile — Lektion bekommt dann den Platz.
- Subheader zeigt mobil nur „Schritt X/Y ‚Titel'" — Projekt-Icon und -Name
  sind dort redundant (man kommt aus dem Projekt-Detail).
- Schritt-Navigation ist eine **fixe Leiste** unten (nie von der Canvas
  verdeckt); Swipe-Gesten sind Zusatz, nie einzige Bedienung.

### 6.5 Tastatur im Workspace

- `←`/`→`: Schritt zurück/vor (wenn erlaubt) — nur, wenn kein Eingabefeld
  fokussiert ist.
- Slider: Pfeiltasten (nativer Range-Input), `Shift` = 10er-Schritte.
- Popover/Panels: `Enter` öffnet, `Esc` schließt.

---

## 7. Konzept-Seite `/konzept/:id`

Ruhige Lese-Seite, erreichbar aus jedem Popover („tiefer eintauchen →"). Aus dem
Workspace heraus öffnet sie sich als **Overlay-Panel** (gleitet von rechts über
die Lektion, `Esc`/‹ zurück), sonst als volle Seite — der Lernfluss reißt nie ab.

```
┌──────────────────────────────────────────────┐
│ Übersetzung   i   [—]            ◐ angewendet│ ← Name·Symbol·Einheit + Mastery
│ [ verspielt ][ praxis ][ genau ]             │ ← alle drei Ebenen lesbar
│ <Erklärtext der gewählten Ebene>             │
│                                              │
│ FORMELN        i = z₂/z₁ · n₂ = n₁/i         │ ← Formula-Renderer, antippbar
│ BAUT AUF       ·Zähnezahl· ·Drehmoment·      │ ← Kette nach oben (Links)
│ KOMMT VOR IN   ⚙ Stirnradgetriebe (S. 2, 5)  │ ← aus content/_index.json
│                ⛓ Antriebsstrang (S. 1)       │
│                                              │
│ ┌ JETZT ÜBEN ────────────────────────────┐   │ ← eine Aufgabe aus dem
│ │ <task inline, gleiche Renderer>        │   │   Trainings-Pool, inline
│ └────────────────────────────────────────┘   │
└──────────────────────────────────────────────┘
```

„Kommt vor in" löst die Mehrdeutigkeit Konzept↔Projekt deterministisch: Quelle
ist der vom Verifier generierte Index (`content/_index.json`), Reihenfolge =
Einführung zuerst, dann Verwendungen.

---

## 8. Skill-Map `/karte`

Der Concept-Graph als geschichtete Landkarte. **V1: statisches SVG-Layout** —
Koordinaten handgepflegt in `content/skillmap.layout.json` (kein Force-Layout,
keine Physik; Determinismus schlägt Effekt).

```
  STATIK            FESTIGKEIT          MASCHINENELEMENTE
  (Kraft)───(Gleichgewicht)  (Spannung)   (Zahnrad)──(Modul)
     │            │              │            │         │
  (Hebelarm)──(Drehmoment)───────┴────────(Übersetzung)─┘
                       └──── Kanten = prerequisites ────┘
```

- **Knoten-Zustände** (aus `conceptState`, Legende in einer zuklappbaren Ecke):
  blass-gestrichelt (`neu`) · Ring (`gesehen`) · halbgefüllt (`angewendet`) ·
  gefüllt in Akzent (`sicher`) · kleines „⟳"-Badge (fällig).
- **Tap auf Knoten** → **Vorschau-Karte**: Name · Symbol · Mastery-Status ·
  Kurztext (`short`) · Button „Konzept öffnen →". Voraussetzungen und
  „kommt vor in" stehen vollständig auf der Konzept-Seite (§7) — die Karte
  bleibt eine Vorschau, keine zweite Konzept-Seite.
- Nur Knoten + Kanten, keine Texttapete; Beschriftung in Mono, 0.75 rem.
- **Mobile:** keine 2D-Pan-Zoom-Fläche, sondern vertikal scrollende
  Gruppen-Ebenen (eine Gruppe = eine Sektion, Kanten innerhalb der Sektion).
- **Leerzustand** (alles `neu`): Karte „Deine Karte ist noch unbeschriftet —
  das erste Projekt zeichnet die ersten Knoten ein."

---

## 9. Werkstatt `/werkstatt`

Das Portfolio: alles, was gebaut wurde.

```
GEBAUTE TEILE
┌────────────┐ ┌────────────┐
│ [iso-Bild] │ │ [iso-Bild] │   ← Vorschau aus gespeicherten Parametern
│ Zahnrad z=20│ │ Zahnrad z=60│     (bei Bedarf neu kompiliert; STL-Blobs
│ m=2 · ⌀40mm │ │ m=2 · ⌀120mm│     werden NICHT gespeichert — Parameter
│ [STL] [öffnen]│ [STL] [öffnen]│   genügen, Regel „ein Modell = Wahrheit")
└────────────┘ └────────────┘
ABSCHLÜSSE
┌──────────────────────────────────┐
│ ✓ Stirnradgetriebe · 12.06.2026  │  ← „Laufzettel": Challenge erfüllt,
│   i = 3,0 · a = 80 mm · 8/8      │     Kennwerte in Mono
└──────────────────────────────────┘
```

- „STL" kompiliert aus den gespeicherten Parametern neu (WASM) und lädt herunter;
  „öffnen" springt in den zugehörigen Bau-Schritt.
- **Leerzustand:** „Noch nichts gebaut — das erste Zahnrad wartet."
  + CTA zum empfohlenen Projekt.

---

## 10. Training `/training`

Karten-Stapel für fällige Konzepte (`LERNMODELL.md` §6).

```
Auffrischen · 3 von heute 7 · ·Drehmoment·
┌──────────────────────────────────────┐
│ <task inline — gleiche Renderer wie   │
│  im Workspace, gleiche Feedback-Stufen>│
└──────────────────────────────────────┘
            [ überspringen ]
```

- Eine Aufgabe pro Karte; „überspringen" ohne Strafe (Konzept bleibt fällig).
- Die Leitner-Box-Nummer ist interner Scheduler-Zustand und erscheint **nicht**
  im UI.
- Ende der Session: Abschluss-Karte „Heute gefestigt: …" mit Box-Tick-Leisten.
- **Leerzustand:** „Nichts fällig. Dein Kopf ist auf Stand — bau lieber was."
  + Link zum aktuellen Projekt.

---

## 11. Antippen-erklärt-Popover (überall)

Jeder ·unterstrichene· Begriff und jede Formel-Variable:

```
   …der ·Achsabstand· muss zur Kiste passen…
        └─▼──────────────────────────────┐
          │ Achsabstand   a   [mm]       │ ← Mono: Symbol + Einheit
          │ Der Abstand der beiden       │
          │ Wellen-Mitten. Zu klein:     │ ← 1–2 Sätze (short)
          │ klemmt. Zu groß: klappert.   │
          │ ↳ baut auf: ·Teilkreis·      │ ← Voraussetzung (Link)
          │ [ tiefer eintauchen → ]      │ ← Konzept-Seite (§7)
          └──────────────────────────────┘
```

Regeln: erstes Auftreten = volle Erklärung im Fließtext, danach nur Chip +
Popover (`LERNMODELL.md` §5). Unerfüllte Voraussetzung wird im Popover zuerst
genannt. Wegtippen/`Esc` schließt; nichts blockiert den Lesefluss.
`role="dialog"`, Fokus springt hinein und beim Schließen zurück.

---

## 12. Universal-Rechner (Drawer, global)

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
  frei. Mobile: volle Breite als Bottom-Sheet (max. 70 vh).

> Scope-Ehrlichkeit: tief, wo es zählt (Einheiten, Projektformeln), simpel
> sonst. Kein Computeralgebra-System.

---

## 13. Einstellungen `/einstellungen`

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
Zusammenfassung und ersetzt transaktional — nie ein halber Import.

---

## 14. Übergänge & Disclosure-Regeln (Zusammenfassung)

- Tiefen-Umschalter wechselt Text **in place** (Cross-Fade `wechsel`, Scroll bleibt).
- Slider → Canvas reagiert sofort (60 fps); Ergebniszahl zählt kurz hoch (`zaehlen`).
- „tiefer eintauchen" gleitet als Panel über die Lektion — kein harter Seitenwechsel.
- Schritt-Wechsel: Bauteil „zeichnet sich ein" (`einzeichnen`) — ein Moment,
  kein Effekt-Feuerwerk.
- Disclosure: 1. Ein Screen, eine Aufgabe. 2. Nur der aktuelle Schritt.
  3. Theorie zugeklappt. 4. Eine Interaktion pro Canvas. 5. Tiefe hinter
  Antippen. 6. Werkzeuge auf Abruf. 7. Erklärtes wird verlinkt, nie wiederholt.
