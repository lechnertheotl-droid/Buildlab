# VERIFICATION.md — Selbstprüfung

> Das Sicherheitsnetz, das KI-generierten Content prüfungsgenau hält und
> verhindert, dass mit kaputtem Stand weitergebaut wird. Ein Befehl prüft alles,
> Claude Code ruft ihn automatisch auf — und der Verifier prüft sich selbst
> (Fixtures, §4).

## Der eine Befehl

```
pnpm verify
```

führt nacheinander aus (bricht beim ersten Fehler ab):

1. **lint** — eslint.
2. **typecheck** — `tsc --noEmit`.
3. **verify:content** — `node tools/verify/index.mjs` (alle Content-Prüfungen, §2).
4. **test** — `vitest run` (Golden Tests, Render-Tests, Iso/CAD-Tests,
   Verifier-Selbsttest).
5. **build** — `vite build` muss durchlaufen.

## §1 Basis-Prüfungen (Bestand)

1. **schema** — jede Datei in `/content` gegen die Schemas (ajv).
   Unbekannte Felder = Fehler (`additionalProperties: false`).
2. **units** — Dimensionsanalyse: jede Formel einheitenbehaftet ausgewertet;
   passt die Ergebnis-Einheit nicht zu `result.unit` → Fehler.
3. **examples** — *Run-the-example*: jeder `calc`-Block wird durch
   `packages/engine` nachgerechnet; Abweichung über Toleranz → Fehler.
   **Kein falsch gerechnetes Beispiel geht je live.**
4. **ranges** — Ergebnis außerhalb `typicalRange` → Warnung (Lernbeispiele)
   bzw. Fehler (Sollwerte).
5. **cross-refs** — jedes referenzierte Konzept, jede Formel, jede
   Komponenten-ID existiert.

## §2 Aufgaben- & Struktur-Prüfungen (Redesign)

6. **task/source** — `numeric`-Aufgaben **müssen** eine `source`
   (`formulaId` + `inputs`) tragen; die Engine rechnet `answer` nach
   (Toleranz wie `calc`). `estimate` ebenso (der Referenzwert der Log-Skala).
7. **task/target** — `target.proof.pass` muss das Ziel erfüllen,
   `target.proof.fail` muss es verfehlen (beides via `evaluateById`).
   Ohne Beweis-Paar → Fehler.
8. **task/error-find** — genau **eine** Zeile weicht von der Engine ab
   (über Toleranz); alle anderen stimmen. 0 oder ≥ 2 Abweichungen → Fehler.
9. **task/steps** — jede Stufe wird wie ein `calc`-Beispiel nachgerechnet;
   `"$prev"` in den Inputs referenziert das Ergebnis der Vorstufe.
10. **task/order+match** — Indizes vollständig und eindeutig; `match`-Paare
    eindeutig.
11. **task/options** — `single`/`multi`: jede **falsche** Option trägt ein
    `why` (Feedback-Pflicht); `multi` hat ≥ 2 richtige Optionen.
12. **build/constraints** — jeder Constraint hat `proof.pass`/`proof.fail`;
    beide werden über mathjs mit den Build-Parametern ausgewertet
    (pass → erfüllt, fail → verfehlt, sonst Fehler).
13. **konzept-abdeckung** — jedes `conceptsIntroduced` eines Projekts wird von
    ≥ 1 `task.concepts` desselben Projekts referenziert, sonst **Warnung**
    („Konzept ohne Prüfung").
14. **loop-check** — `lernen`-Schritt ohne `task`-Block oder ohne
    `interactive`/`calc` → Warnung. Projekt ohne genau einen
    `meilenstein`-Schritt (als letzter Schritt) → **Fehler**.
15. **einführungs-eindeutigkeit** — jedes Konzept wird projektübergreifend
    höchstens einmal `introduces`-t (draft-Projekte zählen mit) → sonst Fehler.
16. **registry-status** — Komponenten mit `status: "geplant"` dürfen nur in
    Projekten mit `draft: true` verwendet werden. Draft-Projekte erscheinen
    nicht in der App.
17. **index-generierung** — der Verifier erzeugt `content/_index.json`
    (Konzept → { introducedIn, usedIn } mit Projekt/Schritt) deterministisch
    aus den `introduces`/`uses`-Feldern. Die Datei wird committet; Drift
    zwischen generiert und committet → Fehler.

## §3 Golden Tests — das Herz der Prüfungsgenauigkeit

In `packages/engine/golden/cases.json` liegen Klausur-/Lehrbuchaufgaben mit
bekannter Lösung. Regeln:

- **Bevor eine Formel in die Bibliothek kommt, existiert ≥ 1 Golden Test.**
  Der Test-Runner (`golden.test.ts`) erzwingt die Abdeckung.
- Standard-Toleranz relativ 1e-3, pro Fall überschreibbar (`tol`).
- Bricht ein Golden Test, ist „prüfungsgenau" verletzt → `pnpm verify` rot.

## §4 Der Verifier prüft sich selbst

`tools/verify/fixtures/` enthält **pro Prüfregel aus §2 ein absichtlich
kaputtes Beispiel** (z. B. `task-numeric-ohne-source.json`,
`error-find-zwei-fehler.json`, `constraint-ohne-proof.json`).
`tools/verify/verify.test.mjs` (vitest) führt den Verifier gegen jedes Fixture
aus und erwartet den jeweiligen Fehler. Neue Prüfregel ohne Fixture = die Regel
gilt als nicht existent (Review-Mangel).

## §5 Verdrahtung in Claude Code

**Hook** (`.claude/settings.json`): `PostToolUse` auf `Edit|Write` führt
`pnpm verify` aus — Claude Code prüft sich nach jeder Änderung selbst; rot →
reparieren, bevor es weitergeht.

**Command** `/verify-content`: prüft nur den Content (`pnpm verify:content`),
berichtet pro Datei (schema/units/examples/tasks/ranges) und nennt bei Fehlern
Datei, Block-ID und die genaue Abweichung — nichts raten.

**Phasen-Gate:** keine Phase fertig, kein Commit, ohne grünes `pnpm verify`
(siehe `BUILD_PLAN.md`).

## §6 Autoren-Pipeline

Generierung läuft **in Claude Code über das Abo** (kein API-Key). Generierter
Content wird erst gespeichert, wenn `pnpm verify` darauf grün ist, und
durchläuft vorher einen Selbstkritik-Pass (zweiter Durchlauf: „prüfe gegen das
Lernziel und die Generator-Regeln aus `PROJECT_SPECS.md`"). Mensch bleibt für
die Stichprobe je neuem Projekttyp in der Schleife.

## package.json — Skript-Konventionen

```json
{
  "scripts": {
    "verify": "pnpm lint && pnpm typecheck && pnpm verify:content && pnpm test && pnpm build",
    "verify:content": "node tools/verify/index.mjs",
    "test": "vitest run"
  }
}
```

> Bewusst **kein** `gen`-npm-Skript: Content entsteht über `/generate-project`
> (Abo), nicht über einen API-Aufruf.

Merksatz: **Wenn `pnpm verify` grün ist, ist der Stand auslieferbar — und die
Mathematik stimmt.**
