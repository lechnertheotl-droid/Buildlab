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

## Phase R6 — Politur & Gate ⏳ (fast fertig)
**Ziel:** A11y und Motion verbindlich, Gesamtdurchlauf.
- [x] Fokus-Ringe (`:focus-visible`), aria-labels auf Sims, `aria-live` auf
      Ergebniszeilen, native Range-Inputs + −/+-Stepper, Tap-Targets ≥ 44 px.
- [x] Motion-Vokabular (`einzeichnen`/`quittung`/`wechsel`) + reduzierte
      Bewegung (System ODER Einstellung, `html.bl-reduced-motion`).
      Offen: `zaehlen` (rAF-Hochzählen der Ergebniszahl).
- [x] Rechner-Verlauf persistent (`calcHistory`) + „⇥ in Aufgabe einsetzen".
- [ ] Manueller Gesamtdurchlauf im Browser nach `VERIFICATION.md`-DoD
      (automatisiert geprüft: 74 Tests, SSR-Smoke aller Kernkomponenten,
      Dev-Server bootet; der klickende Durchlauf steht noch aus).
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
- [ ] Trainings-Pools je Skill-Map-Gruppe füllen.
**Regel:** Projekt erst aus `draft`, wenn alle Kern-Interactives
`status: "implementiert"` haben.

## Phase R8 — Optional/später
- Skill-Map V2 (pan/zoom, isometrische Landschaft). Blueprint-Dark-Mode.
- STEP-Export (serverseitig, OpenCASCADE). Onshape/Fusion-Brücke. Live-Tutor.
- Sandbox-Projekt (erst ab ≥ 8 Live-Projekten).
**Erst beginnen, wenn R0–R7 stabil sind.**

---

### Regeln für die Abarbeitung
- Niemals eine Phase überspringen oder Gates aufweichen.
- Beißt sich eine Aufgabe mit einer Eisernen Regel aus `CLAUDE.md` → stoppen,
  nachfragen, nicht umgehen.
- Pro Phase ein Commit mit grünem `pnpm verify`.
- Offen gebliebene Stubs werden hier markiert, nie stillschweigend gelassen.
