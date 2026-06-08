# CLAUDE.md — Projekt-Verfassung

> Diese Datei liest Claude Code in **jeder** Session zuerst. Sie ist die einzige
> Quelle der Wahrheit für *wie* dieses Repo funktioniert. Kurz halten, aktuell halten.

## Was wir bauen

Eine interaktive, projektbasierte Lern-App für Maschinenbau. Lernende bauen echte
Projekte (z. B. eine Rakete, ein Getriebe) in kleinen Schritten, mit drei
Tiefen-Ebenen (verspielt → praxisnah → prüfungsgenau). Visualisierung ist
**pseudo-3D** (isometrisch, SVG/Canvas2D). Inhalte werden mit **Claude Code über
dein Claude-Abo** (kein API-Key) erzeugt, geprüft und eingefroren — **nie live pro Nutzer**.

**Festgelegte Entscheidungen (fix):** Sprache = nur Deutsch · Speicherung = lokal
(IndexedDB, dauerhaft) + Backup-Datei, kein Konto · erste benutzbare Version =
Projekt *Stirnradgetriebe* komplett.

## Eiserne Regeln (nicht verhandelbar)

1. **KI schreibt, Engine rechnet.** Kein LLM-Output enthält jemals eine selbst
   ausgerechnete Zahl. Jede Zahl kommt aus `packages/engine` (deterministisch).
2. **Ein Schema.** Aller Content ist JSON nach `schema/content.schema.json`.
   Sechs Blocktypen, nicht mehr: `text`, `formula`, `interactive`, `calc`,
   `build`, `check`. Neue Inhaltsart = erst Schema-Diskussion, kein Ad-hoc-Feld.
3. **Pseudo-3D, kein WebGL.** Keine `three`, kein `@react-three/*`. Visuals nur
   über SVG + Canvas2D + isometrische Helfer in `packages/iso`.
4. **Ein parametrisches Modell pro Bauteil** ist die geometrische Wahrheit.
   Daraus entstehen: (a) die pseudo-3D-Vorschau, (b) der Download (STL, später STEP).
5. **Keine Phase ohne grünes Gate.** `pnpm verify` muss vor jedem Phasenwechsel
   und vor jedem Commit grün sein. Siehe `VERIFICATION.md`.
6. **Prüfungsgenauigkeit ist getestet, nicht behauptet.** Jede Formel und jedes
   gerechnete Beispiel ist durch Golden Tests abgedeckt.
7. **Generierung läuft über das Abo, nicht die API.** Content entsteht in
   Claude-Code-Sessions (offizielles Tool, Abo-Kontingent). ⚠️ `ANTHROPIC_API_KEY`
   darf **nicht** gesetzt sein — sonst rechnet Claude Code still über die
   kostenpflichtige API ab statt über dein Abo.
8. **Design folgt `DESIGN.md`:** clean, modern, warmes Beige, technisch. Nicht
   vom Token-Set abweichen.

## Tech-Stack (fix — nicht ohne Rücksprache ändern)

- App: **React + TypeScript + Vite**, **Tailwind** für Styling.
- State: **Zustand** (bewusst minimal, kein Redux).
- Math: **mathjs** (Einheiten + sichere Auswertung von `expr`-Strings).
- Pseudo-3D: eigenes Modul `packages/iso` (SVG/Canvas2D, isometrische Projektion).
- Animation: CSS + `requestAnimationFrame`, keine schwere Lib.
- CAD/Vorschau+Export: **OpenSCAD-WASM** (clientseitig, parametrisch → STL).
  STEP-Export ist Phase 7 (serverseitig, OpenCASCADE) — vorher nicht anfassen.
- Content-Generierung: **läuft in Claude Code über dein Abo** — kein API-Key,
  keine Token-Abrechnung. `tools/authoring` enthält nur Prompt-Vorlagen +
  Validierung, **keine** eigenen API-Calls (das würde am Abo vorbeilaufen).
- Persistenz: **lokal via IndexedDB** (z. B. `idb`), dauerhaft per
  `navigator.storage.persist()`, plus **Backup als Datei** (Export/Import) — der
  Stand geht nie verloren. Kein Backend, kein Konto im MVP.
- Tests: **Vitest**. Validierung: **ajv** (JSON-Schema).

## Verzeichnisstruktur

```
/schema            content.schema.json + formula.schema.json   (Vertrag für alles)
/packages/engine   deterministische Rechen-Engine + Golden Tests
/packages/iso      pseudo-3D Renderer (isometrisch)
/packages/ui       die 6 Block-Renderer + Lern-Workspace
/content           generierte, geprüfte Projekt-JSONs (eingefroren)
/tools/authoring   Claude-API-Generierungs-Pipeline
/tools/verify      Selbstprüfungs-Harness (siehe VERIFICATION.md)
/cad               parametrische Modelle (.scad) + Export-Logik
```

## Visuelle Sprache (pseudo-3D)

- Isometrische oder dimetrische Projektion. Tiefe über drei Mittel: Schattierung,
  leichte Parallax-Versätze, Explosionsansichten.
- Simulationen sind 2.5D: isometrische Kraftvektoren, farbcodierte Spannungs-
  Overlays (grün→rot), animierte Gelenke. Keine Kamera-Steuerung nötig.
- Die CAD-Vorschau ist eine statische/leicht rotierbare isometrische Projektion
  des parametrischen Modells, **kein** Echtzeit-3D.

## Kern-Interaktionen (auf jedem Lern-Screen verfügbar)

- **Antippen erklärt alles.** Jeder Fachbegriff und jede Formel-Variable ist
  antippbar → kurzes, verspieltes Popover (1–2 Sätze + Einheit) mit Link
  „tiefer eintauchen". Begriffe + Erklärungen leben in `concepts.json` (Concept-Graph).
- **Concept-Graph mit Voraussetzungen.** Jedes Konzept kennt seine `prerequisites`.
  Das ist „alles, was man braucht, um dorthin zu kommen". Die Skill-Map zeigt den Graphen.
- **Nicht doppelt erklären.** Ein Konzept wird beim **ersten** Auftreten voll erklärt;
  danach nur kurze Auffrischung + Link. Der Generator nutzt den `seen`-Status für die Tiefe.
- **Ausziehbarer Universal-Rechner**, von jedem Screen erreichbar (Details in `SCREENS.md`).
- **Tiefen-Umschalter** (verspielt / praxis / genau) auf jedem `text`-Block.
- **Ton: spielerisch & freundlich.** Lockere, kurze Microcopy. Scheitern wird als
  Lernschritt gefeiert, nicht bestraft.

## So arbeitest du (Claude Code) in diesem Repo

1. Lies `BUILD_PLAN.md`. Arbeite **genau eine** Phase, nie mehrere gleichzeitig.
2. Halte dich an die Eisernen Regeln oben.
3. Nach jeder Änderung läuft automatisch `pnpm verify` (PostToolUse-Hook).
   Ist es rot, reparierst du, bevor du weitermachst.
4. Eine Phase gilt erst als fertig, wenn ihr "Definition of Done" in
   `BUILD_PLAN.md` erfüllt **und** `pnpm verify` grün ist. Erst dann committen.
5. Bei Unklarheit über das Schema oder eine Formel: stop und nachfragen, nicht raten.

## Weiterführend

- `BUILD_PLAN.md` — der genaue, phasenweise Plan mit Gates.
- `VERIFICATION.md` — was geprüft wird und wie die Selbstprüfung verdrahtet ist.
- `DESIGN.md` — die visuelle Sprache (Tokens, Typografie, Beige-Technik-Look).
- `SCREENS.md` — das genaue Layout aller Screens und Interaktions-Muster.
- `PROJECTS.md` — der grobe Plan aller Lernprojekte (Curriculum-Überblick).
- `PROJECT_SPECS.md` — detaillierte Spezifikation je Projekt (Vorlage für /generate-project).
- `ENGINE_SPEC.md` — Rechenmethoden je Simulationstyp, Präzision, Quiz-Logik.
- `VOICE.md` — Ton & Stimme (spielerisch, aber präzise).

Fundament-Dateien liegen bereits vor: `schema/*.schema.json`, `content/formulas.json`,
`content/concepts.json`, `components.registry.json`, `packages/engine/golden/cases.json`
und das Gold-Standard-Beispiel `content/_example.getriebe.json`.
