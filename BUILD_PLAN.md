# BUILD_PLAN.md — Bauplan (Redesign-Phasen)

Prinzip: **Verifikation zuerst, Inhalt folgt den Docs.** Jede Phase endet mit
einem **Gate**: `pnpm verify` grün und die "Definition of Done" (DoD) erfüllt.
Claude Code arbeitet immer nur **eine** Phase.

> Historie: Die ursprünglichen Phasen 0–3 (Fundament, Block-Renderer, Pseudo-3D
> + Hebel-Slider + Rechner, CAD/STL) sind **abgeschlossen** und bleiben die Basis.
> Mit dem Konzept-Redesign (Juni 2026) gelten die Phasen R0–R6 unten; die alten
> Phasen 4–7 sind durch sie abgelöst.

---

> Status-Legende: ✅ fertig · ⏳ in Arbeit · ohne Marker = offen.
> Nichts wird stillschweigend als fertig markiert — DoD zählt.

## Phase R0 — Konzept & Verträge ✅
**Ziel:** Die neuen Docs sind die Wahrheit; Schema und Verifier setzen sie durch.
- [x] Alle Konzept-Docs neu: `LERNMODELL.md` (neu), `SCREENS.md`, `DESIGN.md`,
      `PROJECTS.md`, `PROJECT_SPECS.md`, `ENGINE_SPEC.md`, `DATENMODELL.md` (neu),
      `VERIFICATION.md`, `VOICE.md`, `CLAUDE.md`.
- [x] `schema/content.schema.json` v2: Projekt-Metadaten (icon, durationMin,
      difficulty, recommendedAfter, draft, version), `step.kind` + `step.canvas`,
      `text.variant`, `build.constraints`, `check` → `task` mit 9 Arten.
- [x] `schema/concept.schema.json`: + `group`.
- [x] `components.registry.json`: `status`-Feld, `cad-preview` raus, `truss-load` rein.
**DoD:** Schemas valide, Docs konsistent, `pnpm verify` grün.

## Phase R1 — Content-Migration ✅
**Ziel:** Der Gold-Standard-Content nutzt das neue Schema vollständig.
- [x] `content/stirnradgetriebe.json`: 8 Schritte nach `PROJECT_SPECS.md` §4,
      jede neue Aufgabenart mindestens einmal, `meilenstein`-Schritt.
- [x] `content/concepts.json`: `group` je Konzept + neue Konzepte.
- [x] `content/training/maschinenelemente.json`: erster Trainings-Pool.
- [x] `content/skillmap.layout.json`: statisches Karten-Layout.
- [x] `packages/engine/golden/cases.json` erweitert (pulley_force u. a.).
- [x] `_demo.json` und `_example.getriebe.json` entfernt (Getriebe ist der
      neue Gold-Standard).
**DoD:** `pnpm verify` grün; jedes Konzept des Getriebes von ≥ 1 Task geprüft.

## Phase R2 — Verifier-Ausbau ✅
**Ziel:** Jede neue Aufgabenart ist maschinell geprüft — und der Verifier selbst auch.
- [x] Prüfungen 6–17 aus `VERIFICATION.md` §2 in `tools/verify/index.mjs`.
- [x] `content/_index.json`-Generierung (Konzept → Projekte/Schritte).
- [x] `tools/verify/fixtures/` + `verify.test.mjs` (Selbsttest je Prüfregel).
**DoD:** absichtlich kaputter Wert im Content macht `pnpm verify` rot
(Stichprobe); Fixtures-Tests grün.

## Phase R3 — App-Shell & Persistenz ✅
**Ziel:** Aus der Ein-Seiten-Demo wird eine navigierbare App mit Gedächtnis.
- [x] `react-router-dom` (HashRouter) + `idb` einbauen.
- [x] `src/router.tsx`, `src/shell/AppShell.tsx` (Rail/Topbar/Rechner-Lasche,
      mobile Bottom-Bar).
- [x] `src/db/{db,repo,migrations,backup}.ts` nach `DATENMODELL.md`.
- [x] Onboarding (3 Schritte) + Einstellungen (Tiefe, Motion, Backup, Löschen).
**DoD:** Onboarding → Dashboard-Flow läuft; Reload erhält Zustand;
Backup-Roundtrip funktioniert; `pnpm verify` grün.

## Phase R4 — Workspace-Redesign ✅
**Ziel:** Der Kern-Screen setzt das Lernmodell um.
- [x] `packages/ui/src/workspace/WorkspaceStep`: ein Schritt sichtbar,
      sanftes Gating, Canvas-Split (sticky), Feedback-Momente, Meilenstein.
- [x] `packages/ui/src/task/`: Renderer für alle 9 Aufgabenarten inkl.
      dreistufigem Feedback (`LERNMODELL.md` §7) + Heuristiken (ENGINE_SPEC §4).
- [x] `packages/ui/src/iso-scene/`: `IsoStage`, `isoBox`, `groundRotationMatrix`,
      `useEngineValue`. (LeverSlider bleibt vorerst eigenständig; der
      Ampel-Pfeil wandert bei der nächsten Berührung in iso-scene.)
- [x] `value-slider` und `gear-pair` implementiert (Registry: `implementiert`;
      gear-pair dreht im echten Drehzahlverhältnis, Werte aus der Engine).
- [x] Auffrisch-Karten (Quereinstieg), Tiefen-Präferenz global + lokal.
- [x] Route `/projekt/:id/schritt/:n` auf WorkspaceStep + Persistenz
      umgestellt (`src/screens/Workspace.tsx`).
**DoD:** Getriebe Schritt 1–8 durchspielbar; target-Task koppelt an gear-pair;
STL-Download hinter Constraints; `pnpm verify` grün.

## Phase R5 — Übrige Screens ✅
**Ziel:** Die volle Informationsarchitektur aus `SCREENS.md`.
- [x] Dashboard (Fortsetzen / Auffrischen / Als Nächstes).
- [x] Projektliste + Projekt-Detail (Soft-Lock-Kasten).
- [x] Konzept-Seite (3 Ebenen, Formeln, „kommt vor in"). Offen: Inline-Übung
      direkt auf der Seite + Overlay-Variante aus dem Workspace (derzeit
      Link ins Training bzw. Routenwechsel) → R8.
- [x] Werkstatt (Parameter-Karten, STL-Rekompilierung, Laufzettel).
- [x] Training (Karten-Stapel mit Inline-Aufgaben, Leitner-Buchung,
      Abschluss-Karte).
- [x] Skill-Map V1 (statisches SVG aus `skillmap.layout.json`,
      mobile Gruppen-Listen).
**DoD:** alle Routen erreichbar, Leerzustände nach `SCREENS.md`;
`pnpm verify` grün.

## Phase R6 — Politur & Gate ✅
**Ziel:** A11y und Motion verbindlich, Gesamtdurchlauf.
- [x] Fokus-Ringe (`:focus-visible`), aria-labels auf Sims, `aria-live` auf
      Ergebniszeilen, native Range-Inputs + −/+-Stepper, Tap-Targets ≥ 44 px.
- [x] Motion-Vokabular (`einzeichnen`/`quittung`/`wechsel`) + reduzierte
      Bewegung (System ODER Einstellung, `html.bl-reduced-motion`).
      Offen: `zaehlen` (rAF-Hochzählen der Ergebniszahl).
- [x] Rechner-Verlauf persistent (`calcHistory`) + „⇥ in Aufgabe einsetzen".
- [x] Gesamtdurchlauf im Browser (Playwright, headless) nach
      `VERIFICATION.md`-DoD: Onboarding (Persona→Tiefe) → Getriebe
      Schritt 1–8 (estimate · numeric inkl. Kehrwert-Heuristik · error-find ·
      target-Auto-Quittung bei m=2 · steps mit $prev · Einheitenwahl · single ·
      match · build mit Constraints + aktivem STL nach WASM-Kompilat ·
      Meilenstein) → Reload: Fortschritt erhalten → Werkstatt-Abschluss →
      Backup-Download. Alle Punkte PASS (10.06.2026).
**DoD:** `pnpm verify` grün; Durchlauf Onboarding → Meilenstein ohne Bruch.

## Phase R7 — Content-Ausbau (laufend, nach dem Redesign)
**Ziel:** Curriculum füllen — ein Projekt nach dem anderen.
- [ ] `hebel-flaschenzug` (Tür Azubi) — braucht nur vorhandene Komponenten
      (`lever-slider`, `value-slider`) + neue Formeln `pulley_force`,
      `torque_balance` (+ Golden Tests).
- [ ] `fachwerkbruecke` (Tür Studium) — braucht `vector-drag`, `force-balance`,
      `truss-load` (Engine-Löser zuerst, siehe `ENGINE_SPEC.md` §7);
      bis dahin `draft: true`.
- [ ] `modellrakete` — braucht `rocket-stability`, `flight-sim` (RK4 in Engine).
- [ ] danach 3, 5–10, 12 gemäß `PROJECT_SPECS.md`.
- Jedes neue Projekt autorisiert seinen Schritt-Graphen mit (`step.requires`,
  siehe R9) — Verifier-Regeln 18–21 prüfen Form, Azyklik, Meilenstein-Senke
  und Einführung-vor-Verwendung entlang der Äste.
- [x] Aufgabenarten-Abdeckung: alle 9 Arten kommen im Content vor — `multi`
      (stirnradgetriebe „Die Übersetzung") und `order` (hebel-flaschenzug
      Bau-Schritt) ergänzt am 11.06.2026. (`fill` war ein Berichtsfehler —
      die neunte Art ist `order`.)
- [x] `hebel-flaschenzug` hat einen echten Bau-Schritt: parametrische
      Umlenkrolle (cad/rolle.scad → OpenSCAD-WASM → STL), Formel `groove_min`
      mit Golden Test, Constraints mit Beweis-Paaren (11.06.2026).
**Regel:** Projekt erst aus `draft`, wenn alle Kern-Interactives
`status: "implementiert"` haben.

## Phase R8 — Optional/später
- Projektkarte V2 (pan/zoom bei großen Bäumen, isometrische Inszenierung).
  Blueprint-Dark-Mode.
- Wiederhol-Mechanismus im Baum (auf den ruhenden Leitner-Feldern aufsetzend,
  `LERNMODELL.md` §6).
- STEP-Export (serverseitig, OpenCASCADE). Onshape/Fusion-Brücke. Live-Tutor.
- Sandbox-Projekt (erst ab ≥ 8 Live-Projekten).
**Erst beginnen, wenn R0–R7 + R9 stabil sind.**

## Phase R9 — Projektkarten-Umbau ✅ (Juni 2026)
**Ziel:** Der umgekehrte Aufgaben-Baum ist die einzige Ansicht, die zu den
Schritten führt — alle Doppelwege und überflüssigen Screens entfallen.
Löst die R5-Screens Dashboard, Projektliste, Projekt-Detail, Skill-Map,
Werkstatt und Training auf (die Werkstatt-Funktion lebt im Produkt-Knoten
der Projektkarte weiter); auch das Onboarding aus R3 entfällt.
- [x] Schema: `step.requires` (alles-oder-nichts je Projekt) + Verifier-Regeln
      18–21 mit Fixtures (`VERIFICATION.md` §2); `requires`-Graphen für
      stirnradgetriebe (Geometrie- ∥ Kinetik-Ast) und hebel-flaschenzug.
- [x] `src/dag.ts`: stepRequires/unlockedStepIds/nextStepIndex/layoutTree
      (deterministisch, kein Force-Layout) + Tests.
- [x] Workspace: DAG-Gating statt `maxStepReached`, Hub-Fußleiste
      („‹ Projektkarte · x/y erledigt · Weiter ›"), Redirect gesperrter
      Deep-Links auf `/`; `cadModel` aus dem build-Block.
- [x] `src/screens/ProjectTree.tsx`: Baum-SVG (Produkt-Platte oben),
      Gesperrt-Karte, Projekt-Wechsler-Chips, Produkt-Karte mit STL
      (`src/lib/stl.ts`), Quittung für frisch freigeschaltete Knoten.
- [x] Abriss: Routen/Screens/Nav, `content/skillmap.layout.json`,
      `content/training/`, tote Ableitungen; Shell = Topbar + Rechner.
- [x] Docs: SCREENS/DATENMODELL/LERNMODELL/CLAUDE/VERIFICATION/VOICE.
**DoD:** `pnpm verify` grün je Commit; Erststart → Baum; Schritt abschließen
schaltet Nachfolger frei; Meilenstein → Produkt-Karte mit STL.

---

### Regeln für die Abarbeitung
- Niemals eine Phase überspringen oder Gates aufweichen.
- Beißt sich eine Aufgabe mit einer Eisernen Regel aus `CLAUDE.md` → stoppen,
  nachfragen, nicht umgehen.
- Pro Phase ein Commit mit grünem `pnpm verify`.
- Offen gebliebene Stubs werden hier markiert, nie stillschweigend gelassen.
