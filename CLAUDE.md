# CLAUDE.md — Projekt-Verfassung

> Diese Datei liest Claude Code in **jeder** Session zuerst. Sie ist die einzige
> Quelle der Wahrheit für *wie* dieses Repo funktioniert. Kurz halten, aktuell halten.

## Was wir bauen

Eine interaktive, projektbasierte Lern-App für Maschinenbau. Lernende bauen echte
Projekte (z. B. ein Getriebe, eine Rakete) in kleinen Schritten, mit drei
Tiefen-Ebenen (verspielt → praxis → genau). Visualisierung ist **pseudo-3D**
(isometrisch, SVG/Canvas2D). Inhalte werden mit **Claude Code über dein
Claude-Abo** (kein API-Key) erzeugt, geprüft und eingefroren — **nie live pro Nutzer**.

**Festgelegte Entscheidungen (fix):** Sprache = nur Deutsch · Speicherung = lokal
(IndexedDB, dauerhaft) + Backup-Datei, kein Konto · erstes komplettes Projekt =
*Stirnradgetriebe* (`content/stirnradgetriebe.json`).

## Eiserne Regeln (nicht verhandelbar)

1. **KI schreibt, Engine rechnet.** Kein LLM-Output enthält jemals eine selbst
   ausgerechnete Zahl. Jede Zahl kommt aus `packages/engine` (deterministisch).
2. **Ein Schema.** Aller Content ist JSON nach `schema/content.schema.json`.
   Sechs Blockfamilien: `text`, `formula`, `interactive`, `calc`, `build`,
   `task` — wobei `task` neun definierte Aufgabenarten hat (`kind`, siehe
   `ENGINE_SPEC.md` §3). Neue Blockfamilie oder Aufgabenart = erst
   Schema-Diskussion **und** Verifier-Strategie, kein Ad-hoc-Feld.
3. **Pseudo-3D, kein WebGL.** Keine `three`, kein `@react-three/*`. Visuals nur
   über SVG + Canvas2D + isometrische Helfer in `packages/iso` bzw. die
   Bühnen-Primitiven in `packages/ui/src/iso-scene`.
4. **Ein parametrisches Modell pro Bauteil** ist die geometrische Wahrheit.
   Daraus entstehen: (a) die pseudo-3D-Vorschau, (b) der Download (STL, später STEP).
5. **Keine Phase ohne grünes Gate.** `pnpm verify` muss vor jedem Phasenwechsel
   und vor jedem Commit grün sein. Siehe `VERIFICATION.md`.
6. **Prüfungsgenauigkeit ist getestet, nicht behauptet.** Jede Formel, jedes
   gerechnete Beispiel und jede Aufgaben-Antwort ist durch Golden Tests bzw.
   Verifier-Nachrechnung gedeckt.
7. **Generierung läuft über das Abo, nicht die API.** Content entsteht in
   Claude-Code-Sessions (offizielles Tool, Abo-Kontingent). ⚠️ `ANTHROPIC_API_KEY`
   darf **nicht** gesetzt sein — sonst rechnet Claude Code still über die
   kostenpflichtige API ab statt über dein Abo.
8. **Design folgt `DESIGN.md`:** clean, modern, warmes Beige, technisch. Nicht
   vom Token-Set abweichen.
9. **Kein persistenter Zustand ohne Datenmodell.** Alles, was IndexedDB berührt,
   steht versioniert in `DATENMODELL.md` (Store, Key, Migration). UI-Zustand
   bleibt flüchtig.

## Tech-Stack (fix — nicht ohne Rücksprache ändern)

- App: **React + TypeScript + Vite**, **Tailwind** für Styling.
- Routing: **react-router-dom** (HashRouter — statisch hostbar).
- State: **Zustand** (bewusst minimal, kein Redux); Persistenz über die
  Repo-Schicht `src/db/` (**idb**, IndexedDB) nach `DATENMODELL.md`.
- Math: **mathjs** (Einheiten + sichere Auswertung von `expr`-Strings).
- Pseudo-3D: eigenes Modul `packages/iso` (SVG/Canvas2D, isometrische Projektion)
  + Bühnen-Primitiven `packages/ui/src/iso-scene`.
- Animation: CSS + `requestAnimationFrame`, keine schwere Lib. Nur das
  Motion-Vokabular aus `DESIGN.md` §8.
- CAD/Vorschau+Export: **OpenSCAD-WASM** (clientseitig, parametrisch → STL).
  STEP-Export ist spätere Phase (serverseitig, OpenCASCADE) — vorher nicht anfassen.
- Content-Generierung: **läuft in Claude Code über dein Abo** — kein API-Key,
  keine Token-Abrechnung. `tools/` enthält nur Validierung + Eval-CLI,
  **keine** eigenen API-Calls.
- Tests: **Vitest**. Validierung: **ajv** (JSON-Schema).

## Verzeichnisstruktur

```
/schema            content/formula/concept.schema.json      (Vertrag für alles)
/packages/engine   deterministische Rechen-Engine + Golden Tests
/packages/iso      pseudo-3D Renderer (isometrische Basis)
/packages/ui       Block-/Task-Renderer, iso-scene, Workspace
/packages/cad      OpenSCAD-WASM-Pipeline (compile, STL, mesh→iso)
/content           generierte, geprüfte Projekt-JSONs (eingefroren)
                   + concepts/formulas/training/skillmap.layout/_index
/tools/verify      Selbstprüfungs-Harness + Fixtures (siehe VERIFICATION.md)
/tools/eval.mjs    deterministische Formel-Auswertung (CLI)
/cad               parametrische Modelle (.scad)
/src               App-Shell: Router, Screens, db (Persistenz)
```

## Das Lernmodell (Kurzfassung — verbindlich in `LERNMODELL.md`)

- **Lern-Loop je Schritt:** Aufhänger → Begreifen → Anwenden → Prüfen (Bauen).
  `step.kind: lernen | bauen | meilenstein` — genau ein Meilenstein pro Projekt.
- **Mastery je Konzept:** neu → gesehen → angewendet → sicher, mit Leitner-Boxen
  und Trainings-Screen. Keine Punkte, keine Streaks, keine Strafen.
- **Antippen erklärt alles.** Jeder Fachbegriff und jede Formel-Variable ist
  antippbar → Popover (1–2 Sätze + Einheit) mit „tiefer eintauchen" zur
  Konzept-Seite. Begriffe leben in `content/concepts.json` (Concept-Graph mit
  `prerequisites` und `group`).
- **Nicht doppelt erklären.** Ein Konzept wird beim **ersten** Auftreten voll
  erklärt (`introduces`); danach Chip + Popover. Quereinsteiger bekommen
  automatische Auffrisch-Karten.
- **Soft-Lock statt Hard-Lock.** Voraussetzungen sind Empfehlungen mit
  Hinweiskasten — nie Sperren.
- **Aufgaben:** 9 Arten (`single`, `multi`, `numeric`, `estimate`, `target`,
  `error-find`, `order`, `match`, `steps`), alle engine-validiert, Feedback in
  drei Stufen (heuristischer Hinweis → gezielter Hinweis → Lösungsweg).
- **Ausziehbarer Universal-Rechner** auf jedem Screen (persistenter Verlauf,
  formelbewusst). **Tiefen-Umschalter** auf jedem `text`-Block (global
  vorbelegt, lokal überschreibbar).
- **Ton: spielerisch & freundlich** (`VOICE.md`). Scheitern ist ein Lernschritt.

## So arbeitest du (Claude Code) in diesem Repo

1. Lies `BUILD_PLAN.md`. Arbeite **genau eine** Phase, nie mehrere gleichzeitig.
2. Halte dich an die Eisernen Regeln oben.
3. Nach jeder Änderung läuft automatisch `pnpm verify` (PostToolUse-Hook).
   Ist es rot, reparierst du, bevor du weitermachst.
4. Eine Phase gilt erst als fertig, wenn ihr "Definition of Done" in
   `BUILD_PLAN.md` erfüllt **und** `pnpm verify` grün ist. Erst dann committen.
5. Bei Unklarheit über Schema, Formel oder Lernmodell: stop und nachfragen,
   nicht raten.

## Weiterführend

- `BUILD_PLAN.md` — der phasenweise Plan mit Gates (R0–R8).
- `LERNMODELL.md` — Lern-Loop, Mastery, Tiefen, Feedback, Training. **Didaktik-Wahrheit.**
- `SCREENS.md` — Routen, alle Screens, Interaktions-Muster, Mobile, Tastatur.
- `DESIGN.md` — Tokens, Zustände, Pseudo-3D-Systematik, Motion, A11y-Baseline.
- `DATENMODELL.md` — IndexedDB-Stores, Backup-Format, Migrationen.
- `PROJECTS.md` — das 12-Projekte-Curriculum mit Abhängigkeiten.
- `PROJECT_SPECS.md` — Spezifikation je Projekt (Vorlage für /generate-project).
- `ENGINE_SPEC.md` — Rechenmethoden, Aufgaben-Validierung, Feedback-Heuristiken.
- `VERIFICATION.md` — was geprüft wird, inkl. Verifier-Selbsttest.
- `VOICE.md` — Ton & Stimme inkl. Microcopy-Inventar.

Fundament-Dateien: `schema/*.schema.json`, `content/formulas.json`,
`content/concepts.json`, `components.registry.json`,
`packages/engine/golden/cases.json` und der Gold-Standard
`content/stirnradgetriebe.json`.
