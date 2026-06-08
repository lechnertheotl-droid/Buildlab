---
name: generate-project
description: >
  Erzeugt aus der Spezifikation in PROJECT_SPECS.md ein vollständiges,
  schema-konformes Maschinenbau-Lernprojekt (content/<id>.json), das `pnpm verify`
  besteht. Orientiert sich am Gold-Standard content/_example.getriebe.json. Aufruf:
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
2. **Nur das Schema.** Alles validiert gegen `schema/content.schema.json`. Sechs
   Blocktypen, keine erfundenen Felder.
3. **Nur vorhandene Bausteine.** `formulaId` nur aus `content/formulas.json`,
   `componentId` nur aus `components.registry.json`, Konzepte aus `content/concepts.json`.
4. **Nur Deutsch.** Ton nach `VOICE.md`. Jeder `text`-Block hat die drei Tiefen-Ebenen.
5. **Nicht doppelt erklären.** Ein Konzept beim ersten Auftreten voll (`introduces`),
   danach nur `uses` + Antippen-Popover.
6. **Ein Lernziel pro Schritt.** Schritte 5–15 Minuten.

## Zuerst lesen

`PROJECT_SPECS.md` (die Spec für `<id>`), `content/_example.getriebe.json` (Vorbild),
`schema/*.schema.json`, `content/formulas.json`, `content/concepts.json`,
`components.registry.json`, `VOICE.md`, `ENGINE_SPEC.md`.

## Ablauf

1. **Spec laden.** Finde in `PROJECT_SPECS.md` das Projekt `<id>`: Challenge,
   Voraussetzungen, neue Konzepte, Formeln, Mikro-Schritte, Bau-Output, Golden Tests.
2. **Schritte planen.** Übernimm die Mikro-Schritte der Spec; je Schritt genau ein Ziel.
   Generiere pro Lauf nur **ein bis wenige Schritte** (Abo-Fenster schonen).
3. **Blöcke bauen** je Schritt, nach Vorbild `_example.getriebe.json`:
   - `text`: drei Ebenen (verspielt / praxis / genau), Ton nach VOICE.md.
   - `formula`: `formulaId` aus der Bibliothek.
   - `interactive`: `componentId` aus der Registry + passende `params`.
   - `calc`: `inputs` setzen, **`expected` aus `tools/eval.mjs`** übernehmen.
   - `build`: nur wenn der Schritt baut; Parameter mit min/max/default/unit; `exports:["stl"]`.
   - `check`: `single`/`multi`/`numeric` mit `explanation`.
4. **Konzepte pflegen.** Für jedes neue Konzept einen Eintrag in `content/concepts.json`
   (id, name, short, prerequisites, ggf. explanation/relatedFormulas) anlegen.
   Bereits erklärte Konzepte nur in `uses` listen.
5. **Formeln pflegen.** Fehlt eine Formel: Formel-Objekt in `content/formulas.json`
   anlegen (latex, expr, result, variables mit Erklärung+Einheit) **und** mindestens
   einen Golden-Case in `packages/engine/golden/cases.json`.
6. **Zahlen holen.** Für jedes `expected` und jede genannte Zahl:
   `node tools/eval.mjs <formulaId> '{"var":wert,...}'` → Wert übernehmen. Existiert
   `tools/eval.mjs` nicht, lege es zuerst an (Vorlage liegt im Repo).
7. **Schreiben** nach `content/<id>.json`.
8. **Selbstkritik.** Lies das Ergebnis noch einmal komplett: Trifft jeder Schritt sein
   Lernziel? Stimmt der Ton? Wird nichts doppelt erklärt? Sind alle Zahlen aus der
   Engine? Korrigiere gefundene Fehler.
9. **Verifizieren.** `pnpm verify`. Bei Rot reparieren. **Erst bei Grün ist der Lauf fertig.**

## Definition of Done

`content/<id>.json` ist schema-valide · jede Formel/Beispielrechnung durch Golden Test
gedeckt · drei Tiefen-Ebenen vorhanden · Ton nach VOICE.md · `pnpm verify` grün.

## Hinweis Abo

Läuft in der Claude-Code-Session über dein Abo. Stelle sicher, dass `ANTHROPIC_API_KEY`
**nicht** gesetzt ist (sonst Abrechnung über die kostenpflichtige API).
