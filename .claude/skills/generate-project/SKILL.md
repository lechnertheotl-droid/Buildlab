---
name: generate-project
description: >
  Erzeugt aus der Spezifikation in PROJECT_SPECS.md ein vollständiges,
  schema-konformes Maschinenbau-Lernprojekt (content/<id>.json), das `pnpm verify`
  besteht. Orientiert sich am Gold-Standard content/stirnradgetriebe.json. Aufruf:
  /generate-project <projekt-id>. Verwenden, wenn ein neues Lernprojekt erstellt
  oder ein bestehendes um Schritte erweitert werden soll. Läuft über das Claude-Abo
  (kein API-Key).
---

# generate-project

Erzeugt den Inhalt eines Lernprojekts streng nach Schema und Spezifikation.
Du (Claude Code) schreibst Struktur, Erklärungen und Ton — **aber nie eine Zahl
selbst**. Jede Zahl kommt aus der Engine.

## Eiserne Regeln (siehe CLAUDE.md)

1. **Du rechnest nichts.** Jede Beispiel- oder Ergebniszahl holst du über
   `node tools/eval.mjs <formulaId> '<inputs>'` aus der Engine.
2. **Nur das Schema.** Alles validiert gegen `schema/content.schema.json` (v2):
   sechs Blockfamilien (`text`, `formula`, `interactive`, `calc`, `build`, `task`),
   `task` mit neun `kind`-Arten — keine erfundenen Felder.
3. **Nur vorhandene Bausteine.** `formulaId` nur aus `content/formulas.json`,
   `componentId` nur aus `components.registry.json` (Status beachten: `geplant`
   nur in `draft: true`-Projekten!), Konzepte aus `content/concepts.json`.
4. **Nur Deutsch.** Ton nach `VOICE.md`. Jeder normale `text`-Block hat die drei
   Tiefen-Ebenen.
5. **Nicht doppelt erklären.** Ein Konzept beim ersten Auftreten voll
   (`introduces` — projektübergreifend genau einmal, der Verifier prüft das),
   danach nur `uses`.
6. **Lern-Loop einhalten** (`LERNMODELL.md` §2): jeder Schritt hat `kind`
   (`lernen`/`bauen`/`meilenstein`), `lernen`-Schritte haben Aufhänger
   (`text.variant: hook`) + Anwenden (`interactive`/`calc`) + Prüfen (`task`).
   Genau **ein** `meilenstein`-Schritt, immer zuletzt. Ein Lernziel pro Schritt,
   5–15 Minuten.

## Zuerst lesen

`PROJECT_SPECS.md` (die Spec für `<id>` **und** die Generator-Regeln oben),
`LERNMODELL.md` (§2 Loop, §8 Aufgabenarten-Wahl), `content/stirnradgetriebe.json`
(Gold-Standard), `schema/content.schema.json`, `content/formulas.json`,
`content/concepts.json`, `components.registry.json`, `VOICE.md`, `ENGINE_SPEC.md`.

## Ablauf

1. **Spec laden.** Finde in `PROJECT_SPECS.md` das Projekt `<id>`: Metadaten
   (icon, durationMin, difficulty, recommendedAfter), Challenge, neue Konzepte,
   Formeln, Mikro-Schritte (mit kind + Aufgabenarten), Bau-Output/Constraints,
   Meilenstein, Golden Tests.
2. **Schritte planen.** Übernimm die Mikro-Schritte der Spec. Generiere pro Lauf
   nur **ein bis wenige Schritte** (Abo-Fenster schonen).
3. **Blöcke bauen** je Schritt, nach Vorbild `stirnradgetriebe.json`:
   - `text`: drei Ebenen; `variant: hook|merksatz|hinweis` wo die Spec es vorsieht.
   - `formula`: `formulaId` aus der Bibliothek.
   - `interactive`: `componentId` aus der Registry + passende `params`;
     `step.canvas` auf diesen Block zeigen lassen.
   - `calc`: `inputs` setzen, **`expected` aus `tools/eval.mjs`** übernehmen.
   - `build`: Parameter mit min/max/default/unit; `constraints` mit `expr`,
     `label` und `proof.pass`/`proof.fail` (beide Parametersätze selbst über
     eval prüfen lassen — der Verifier rechnet nach); `exports:["stl"]`; `bom`.
   - `task`: Art nach Lernziel wählen (`LERNMODELL.md` §8) — pro Projekt
     mindestens 4 verschiedene Arten. Pflichten je Art (der Verifier erzwingt sie):
     `numeric`/`estimate` brauchen `source` (Engine rechnet `answer` nach);
     `single`/`multi`: jede falsche Option mit `why`; `target`: `proof.pass/fail`;
     `error-find`: genau eine falsche Zeile; `steps`: `$prev` für Folgewerte.
     Immer `concepts` (Mastery), `hint` (Stufe 2) und `explanation` (Stufe 3).
4. **Konzepte pflegen.** Für jedes neue Konzept ein Eintrag in
   `content/concepts.json` (id, name, short, **group**, prerequisites, ggf.
   explanation/relatedFormulas) + Knoten in `content/skillmap.layout.json`.
   Jedes `conceptsIntroduced` muss von ≥ 1 `task.concepts` geprüft werden.
5. **Formeln pflegen.** Fehlt eine Formel: Formel-Objekt in
   `content/formulas.json` (latex, expr, result, variables mit
   Erklärung+Einheit) **und** mindestens ein Golden-Case in
   `packages/engine/golden/cases.json` — vor der ersten Verwendung.
6. **Zahlen holen.** Für jedes `expected`, jede `answer`, jede `shown`-Zeile und
   jeden Proof: `node tools/eval.mjs <formulaId> '{"var":wert,...}'`.
7. **Schreiben** nach `content/<id>.json` (Metadaten: `version: 2`, `icon`,
   `durationMin`, `difficulty`, `recommendedAfter`; solange Kern-Interactives
   `geplant` sind: `draft: true`).
8. **Selbstkritik.** Lies das Ergebnis komplett: Trifft jeder Schritt sein
   Lernziel? Folgt er dem Loop? Stimmt der Ton? Wird nichts doppelt erklärt?
   Sind alle Zahlen aus der Engine? Aufgabenarten abwechslungsreich? Korrigiere.
9. **Verifizieren.** `pnpm verify`. Bei Rot reparieren. **Erst bei Grün ist der
   Lauf fertig.** (`content/_index.json` wird dabei neu generiert — mit committen.)

## Definition of Done

`content/<id>.json` ist schema-valide · jede Zahl durch Golden Test bzw.
Verifier-Nachrechnung gedeckt · Lern-Loop je Schritt erfüllt · ≥ 4 Aufgabenarten ·
genau ein Meilenstein · drei Tiefen-Ebenen · Ton nach VOICE.md · `pnpm verify` grün.

## Hinweis Abo

Läuft in der Claude-Code-Session über dein Abo. Stelle sicher, dass `ANTHROPIC_API_KEY`
**nicht** gesetzt ist (sonst Abrechnung über die kostenpflichtige API).
