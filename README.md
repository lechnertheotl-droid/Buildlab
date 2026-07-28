# Buildlab

**Maschinenbau lernen, indem du baust.** Vier Projekte in kleinen Schritten —
mit Simulationen, die wirklich rechnen, und einem druckbaren Bauteil am Ende.

▶ **[Live: lechnertheotl-droid.github.io/Buildlab](https://lechnertheotl-droid.github.io/Buildlab/)**

Deutsch · keine Anmeldung · alles bleibt lokal auf deinem Gerät (IndexedDB).

## Die Projekte

| Projekt | Schritte | Dauer | Challenge |
| --- | --- | --- | --- |
| ⚙ Stirnradgetriebe | 8 | ~49 min | Drehzahl auf ein Drittel senken (3000 → 1000 1/min), Drehmoment fast verdreifachen |
| ⚖ Hebel & Flaschenzug | 8 | ~43 min | 2 kg (19,62 N) mit höchstens 8 N Zugkraft heben — und erklären, woher der Rabatt kommt |
| 🚀 Modellrakete | 9 | ~70 min | Stabile Rakete für den Estes C6: 1–2 Kaliber Stabilitätsmaß, mindestens 100 m Gipfelhöhe |
| ⛁ Fachwerkbrücke | 8 | ~56 min | 30 cm Spannweite, 5 kg mittig (49,05 N) — mit möglichst wenig Material |

Jedes Projekt endet an einem echten Bauteil: Die Regler formen ein
parametrisches Modell, die Engine prüft live die Anforderungen, und erst wenn
alle grün sind, gibt sie das STL frei.

## Wie es funktioniert

- **Die Projektkarte ist der einzige Weg zu den Schritten** — ein umgekehrter
  Aufgaben-Baum: das Produkt oben, die Wurzel-Schritte unten.
- **Vier Phasen je Schritt:** Aufhänger → Begreifen → Anwenden → Prüfen.
- **Drei Tiefen** auf jedem Text (verspielt · praxis · genau), umschaltbar.
- **Antippen erklärt alles:** jeder Fachbegriff und jede Formel-Variable führt
  zu einem Popover mit Einheit und Weiterlesen-Link.
- **Neun Aufgabenarten**, alle von der Engine validiert, Feedback in drei
  Stufen: heuristischer Hinweis → gezielter Hinweis → Lösungsweg.
- **Soft-Lock statt Hard-Lock:** Voraussetzungen sind Empfehlungen, keine
  Sperren. Keine Punkte, keine Streaks, keine Strafen.

## Die zwei Regeln, die alles bestimmen

**Die KI schreibt, die Engine rechnet.** Kein Text der App enthält je eine
selbst ausgerechnete Zahl. Jede Zahl — im Fließtext, im Beispiel, in der
Aufgabenantwort, in der Simulation — kommt aus `packages/engine`,
deterministisch und durch Golden Tests gedeckt. Content wird in
Claude-Code-Sessions erzeugt, geprüft und eingefroren, nie live pro Nutzer.

**Pseudo-3D, kein WebGL.** Alle Visualisierungen sind SVG und Canvas2D mit
isometrischer Projektion (`packages/iso`). Ein Fachwerk wird mit dem
Knotenpunktverfahren gelöst (mathjs `lusolve`), ein Zahnrad aus der echten
Evolvente konstruiert, ein Raketenflug mit Runge-Kutta 4. Ordnung integriert —
und dieselbe Geometrie speist Bild *und* Bauteil, damit beide nicht
auseinanderlaufen können.

## Aufbau

```
schema/            JSON-Schema — der Vertrag für allen Content
packages/engine/   deterministische Rechen-Engine + Golden Tests
packages/iso/      pseudo-3D: isometrische Projektion, Bemaßung, Schraffur
packages/ui/       Block- und Aufgaben-Renderer, Bühne, Workspace
packages/cad/      OpenSCAD-WASM-Pipeline (parametrisch → STL → Vorschau)
content/           geprüfte, eingefrorene Projekt-JSONs
tools/verify/      22 Prüfregeln + Selbsttest über Fixtures
cad/               parametrische Modelle (.scad)
src/               App-Shell: Router, Screens, IndexedDB
```

## Entwickeln

```bash
pnpm install
pnpm dev        # Vite-Dev-Server
pnpm verify     # lint · typecheck · Content-Prüfung · Tests · Build
```

`pnpm verify` ist das Gate: Es muss vor jedem Commit und jedem Deploy grün
sein — lint, typecheck, 22 Content-Regeln und die komplette Testsuite. Die
Details stehen in [`VERIFICATION.md`](VERIFICATION.md).

Die Projekt-Verfassung — was gebaut wird, welche Regeln nicht verhandelbar
sind, wie man in diesem Repo arbeitet — steht in
[`CLAUDE.md`](CLAUDE.md). Vertiefend: [`LERNMODELL.md`](LERNMODELL.md)
(Didaktik), [`DESIGN.md`](DESIGN.md) (Tokens, Motion, A11y),
[`ENGINE_SPEC.md`](ENGINE_SPEC.md) (Rechenmethoden),
[`SCREENS.md`](SCREENS.md) (Routen und Interaktionsmuster).
