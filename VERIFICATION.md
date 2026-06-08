# VERIFICATION.md — Selbstprüfung

Das ist das Sicherheitsnetz, das KI-generierten Content prüfungsgenau hält und
verhindert, dass Claude Code mit kaputtem Stand weiterbaut. Ein einziger Befehl
prüft alles, und Claude Code ruft ihn automatisch auf.

## Der eine Befehl

```
pnpm verify
```

führt nacheinander aus (bricht beim ersten Fehler ab):

1. **lint** — Code-Stil (eslint).
2. **typecheck** — `tsc --noEmit`.
3. **schema** — jede Datei in `/content` gegen `schema/content.schema.json`
   (via ajv). Unbekannte Felder = Fehler.
4. **units** — Dimensionsanalyse: jede Formel wird mit Einheiten ausgewertet;
   passt die Einheit des Ergebnisses nicht zu `result.unit`, ist es ein Fehler.
5. **examples** — *Run-the-example*: für jeden `calc`-Block werden die Eingaben
   in `expr` durch `packages/engine` gerechnet. Weicht das Ergebnis vom im JSON
   genannten Wert ab (über Toleranz), ist es ein Fehler. **So kann kein falsch
   gerechnetes Beispiel je live gehen.**
6. **ranges** — liegt ein Ergebnis außerhalb des plausiblen `typicalRange`,
   wird es markiert (Warnung bei Lernbeispielen, Fehler bei Sollwerten).
7. **golden** — Golden Tests (siehe unten).
8. **build** — `vite build` muss durchlaufen.

## Golden Tests — das Herz der Prüfungsgenauigkeit

In `packages/engine/golden/` liegen **Klausur-/Lehrbuchaufgaben mit bekannter
Lösung**. Beispiel:

```ts
// golden/uebersetzung.test.ts
test("Getriebe-Übersetzung z1=20, z2=60", () => {
  expect(engine.eval("z2 / z1", { z1: 20, z2: 60 })).toBeCloseTo(3, 6);
});
```

Regel: **Bevor eine Formel in der Formel-Bibliothek landet, gibt es mindestens
einen Golden Test dafür.** Ändert jemand die Engine und ein Golden Test bricht,
ist „prüfungsgenau" sofort verletzt — und `pnpm verify` ist rot.

## Verdrahtung in Claude Code (die Selbst-Prüfung)

### 1) Hook: nach jeder Änderung automatisch prüfen
`.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          { "type": "command", "command": "pnpm verify" }
        ]
      }
    ]
  }
}
```

Damit prüft sich Claude Code nach jeder Datei-Änderung selbst. Rotes Ergebnis →
Claude Code repariert, bevor es weitermacht.

### 2) Command: gezielt nur den Content prüfen
`.claude/commands/verify-content.md`:

```md
Prüfe ausschließlich den generierten Content, nicht den App-Code.
Führe aus: pnpm verify:content
Berichte pro Datei: schema ok?, units ok?, examples ok?, ranges ok?
Bei Fehlern: nenne Datei, Block-ID und die genaue Abweichung. Nichts raten.
```

Aufruf in Claude Code: `/verify-content`.

### 3) Phasen-Gate als feste Regel
Steht bereits in `CLAUDE.md` und `BUILD_PLAN.md`: keine Phase gilt als fertig und
es wird nicht committet, solange `pnpm verify` nicht grün ist.

## Was die Autoren-Pipeline zusätzlich prüft

Die Generierung läuft **in Claude Code über dein Abo** (kein API-Key). Generierter
Content wird **erst** gespeichert, wenn `pnpm verify` darauf grün ist, und durchläuft
vorher einen **Selbstkritik-Pass** (zweiter Durchlauf in derselben Session: „Prüfe
diesen Schritt gegen das Lernziel, finde Fehler"). So bleibt der Mensch nur für die
Stichprobe je *neuem Projekttyp* in der Schleife.

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

> Hinweis: Es gibt bewusst **kein** `gen`-npm-Skript. Content wird über den
> Claude-Code-Skill `/generate-project` erzeugt (Abo), nicht über einen API-Aufruf.

Merksatz: **Wenn `pnpm verify` grün ist, ist der Stand auslieferbar — und die
Mathematik stimmt.**
