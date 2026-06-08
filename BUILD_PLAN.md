# BUILD_PLAN.md — Genauer Bauplan

Prinzip: **Verifikation zuerst, Inhalt zuletzt.** Wir bauen erst das Sicherheitsnetz
(Schema + Engine + Golden Tests + verify), dann erst alles andere. Jede Phase endet
mit einem **Gate**: `pnpm verify` muss grün sein und die "Definition of Done" (DoD)
erfüllt. Claude Code arbeitet immer nur **eine** Phase.

---

## Phase 0 — Fundament & Sicherheitsnetz
**Ziel:** Das System kann sich selbst prüfen, bevor es Inhalte gibt.
- [ ] Monorepo (pnpm workspaces), Vite + React + TS + Tailwind aufsetzen.
- [ ] `schema/content.schema.json` und `schema/formula.schema.json` schreiben
      (die 6 Blocktypen + das Formel-/Variablen-Objekt aus dem Konzept).
- [ ] `packages/engine`: Auswertung von `expr` via mathjs **mit Einheiten**.
- [ ] CLI `tools/eval.mjs` (dünne Hülle um die Engine) — liefert jede Zahl
      deterministisch für Generierung **und** verify. Vorlage liegt im Repo.
- [ ] `tools/verify` + `pnpm verify` (Lint, Typecheck, Schema-Validierung,
      Golden Tests, Build) — siehe `VERIFICATION.md`.
- [ ] PostToolUse-Hook + `/verify` Command einrichten (siehe `VERIFICATION.md`).
**DoD:** `pnpm verify` läuft grün auf einem leeren Repo. Hook feuert nach Edits.

## Phase 1 — Block-Renderer (statisch)
**Ziel:** Ein Beispiel-Projekt-JSON wird korrekt dargestellt — ohne Interaktion.
- [ ] `packages/ui`: je ein Renderer für `text`, `formula`, `calc`, `check`.
- [ ] `text` rendert die drei Tiefen-Ebenen mit Umschalter (verspielt/praxis/genau).
- [ ] `formula` rendert LaTeX + macht jede Variable antippbar
      (Name, Einheit, Erklärung, typischer Bereich aus dem Formel-Objekt).
- [ ] Antippen-erklärt: Begriffe + Variablen → Popover aus `concepts.json`
      (Kurz-Erklärung + Voraussetzung + Link „tiefer eintauchen"). Siehe `SCREENS.md`.
- [ ] Eine handgeschriebene Beispiel-JSON in `content/_demo.json`.
**DoD:** `_demo.json` rendert; Variablen-Erklärung erscheint beim Antippen;
schema-validiert; `pnpm verify` grün.

## Phase 2 — Pseudo-3D Visual-Layer
**Ziel:** Isometrische Darstellung + erste Interaktivität.
- [ ] `packages/iso`: isometrische Projektion, Schattierung, Explosionsansicht.
- [ ] `interactive`-Renderer + Komponenten-Registry (KI wählt nur aus dieser).
- [ ] Erste geprüfte Komponente: **Kraft/Hebel-Slider** (2.5D-Vektoren, live).
- [ ] **Ausziehbarer Universal-Rechner** (Drawer rechts, andockbar/schwebend):
      wissenschaftlich, Einheiten, formelbewusst (zieht aktuelle Projektformeln/
      -werte), Verlauf — auf Basis von mathjs. Siehe `SCREENS.md` §7.
**DoD:** Slider verändert sichtbar Kräfte; Werte kommen aus `packages/engine`;
`pnpm verify` grün.

## Phase 3 — CAD-Vorschau & STL-Export
**Ziel:** Ein parametrisches Bauteil als Vorschau + Download.
- [ ] OpenSCAD-WASM einbinden; `cad/`: ein parametrisches Modell (.scad).
- [ ] Parameter als Slider → Modell regeneriert → isometrische Vorschau.
- [ ] STL-Export-Button ("herunterladen & weiterbauen").
**DoD:** Parameteränderung aktualisiert Vorschau; Export erzeugt valides STL;
`pnpm verify` grün.

## Phase 4 — Autoren-Pipeline (Content-Generierung über das Abo)
**Ziel:** Claude Code erzeugt schema-konformen Content über dein Abo, der die
Prüfung besteht — ohne API-Key, ohne Token-Abrechnung.
- [ ] Sicherstellen, dass `ANTHROPIC_API_KEY` **nicht** gesetzt ist (sonst läuft
      die Generierung an deinem Abo vorbei über die kostenpflichtige API).
- [ ] Generierungs-Skill anlegen: `.claude/skills/generate-project/SKILL.md`
      (Seed → Skelett → Inhalt → Formel-/Komponentenauswahl), aufrufbar als
      `/generate-project "<thema>"`. Läuft **in der Claude-Code-Session**.
- [ ] Der Skill liest die verbindliche Spezifikation des Projekts aus
      `PROJECT_SPECS.md` (Schritte, Konzepte, Formeln, Golden Tests) als Bauplan.
- [ ] Output wird **erst gespeichert, wenn `pnpm verify` darauf grün ist**.
- [ ] Selbstkritik: ein zweiter Durchlauf in derselben Session prüft den ersten
      gegen das Lernziel und korrigiert.
- [ ] Generierung in Häppchen takten (Abo hat ein 5-Stunden-Fenster) — pro Lauf
      ein bis wenige Projektschritte, nicht der ganze Katalog auf einmal.
**DoD:** `/generate-project "<thema>"` erzeugt ein Projekt-JSON, das schema-valide
ist und alle Math-Checks besteht — ohne manuelle Korrektur, ohne API-Kosten.

## Phase 5 — Erste benutzbare Version: Stirnradgetriebe end-to-end
**Ziel:** Ein vollständiges, baubares Projekt + dauerhafte Speicherung = die erste
Version, die ein Nutzer wirklich von Anfang bis Download durchlaufen kann.
- [ ] Projekt **Stirnradgetriebe** in kleine Schritte (Vorbild:
      `content/_example.getriebe.json`).
- [ ] Alle 6 Blocktypen kommen vor; STL herunterladbar; Übersetzung/Achsabstand
      prüfungsgenau aus der Engine.
- [ ] **Dauerhafte lokale Speicherung** (IndexedDB, `navigator.storage.persist()`):
      Fortschritt überlebt Neuladen und Schließen.
- [ ] **Backup-Export/Import** als Datei, damit der Stand nie verloren geht.
**DoD:** Nutzer durchläuft das Getriebe von Anfang bis STL-Download; Fortschritt
bleibt nach Neustart erhalten; jeder Rechenschritt durch Golden Test gedeckt;
`pnpm verify` grün.

> Die **Rakete** (Projekt 13) bleibt das spätere Schaustück mit voller
> Flug-Simulation — nach der ersten benutzbaren Version, nicht davor.

## Phase 6 — Lern-UX & Fortschritt
**Ziel:** Aus Schritten wird ein motivierender Lernpfad.
- [ ] Skill-Map, Projekt-Fortschritt, Quiz-Auswertung, Portfolio.
- [ ] Concept-Graph + `seen`-Status: Voraussetzungen in der Skill-Map sichtbar;
      bereits erklärte Konzepte erscheinen nur noch als Auffrischung + Link
      (nicht doppelt erklären). Siehe `concepts.json` / `SCREENS.md`.
- [ ] Spaced-Repetition-Karten zwischen Projekten.
**DoD:** Fortschritt bleibt erhalten; Skill-Map spiegelt abgeschlossene Schritte;
`pnpm verify` grün.

## Phase 7 — Optional/später
- STEP-Export (serverseitig, OpenCASCADE). Onshape/Fusion-Brücke. Live-Tutor.
**Erst beginnen, wenn Phasen 0–6 stabil sind.**

---

### Regeln für die Abarbeitung
- Niemals eine Phase überspringen oder Gates aufweichen.
- Beißt sich eine Aufgabe mit einer Eisernen Regel aus `CLAUDE.md` → stoppen,
  nachfragen, nicht umgehen.
- Pro Phase ein Commit mit grünem `pnpm verify`.
