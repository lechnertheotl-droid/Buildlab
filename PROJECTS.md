# PROJECTS.md — Projekt-Curriculum

> Jedes Projekt ist ein **baubares Ergebnis**, das echte Maschinenbau-Themen
> abdeckt. Zwölf Projekte über vier Niveaus — bewusst kuratiert statt Katalog.
> Detail-Spezifikationen je Projekt: `PROJECT_SPECS.md`. Didaktik: `LERNMODELL.md`.

**Redesign-Entscheidung:** Das Curriculum wurde von 17 auf **12 Projekte**
gekürzt. Gestrichen: *Passungs-Trainer* (schwache Interaktivität als Einstieg),
*Stirling-Motor* (eigener Thermo-Engine-Ast für ein einziges Projekt),
*Robotergreifer* und *Tischkran* (redundant zu Antriebsstrang/Kragträger),
*Sandbox* (erst sinnvoll, wenn ≥ 8 Projekte live sind — dann als eigene Phase).
Die Konzept-Gruppe „Thermo/Strömung" reduziert sich auf die Strömungs-Konzepte
der Rakete; „Zeichnen & Toleranzen" fließt in die Bau-Schritte aller Projekte ein.

**Konzept-Gruppen** (`concept.group`):
`statik` · `festigkeit` · `kinematik` · `werkstoffe` · `maschinenelemente` ·
`fertigung` · `stroemung` · `methodik`.

---

## Das Curriculum

### Niveau 1 — Grundlagen (verspielt, schnelle Erfolge)

| # | Projekt | Bau-Ergebnis | Gruppen | Kern-Interactives |
|---|---|---|---|---|
| 1 | **Hebel & Flaschenzug** | funktionierender Flaschenzug (Druck) | statik | `lever-slider`, `value-slider` |
| 2 | **Fachwerkbrücke** | Strebenmodell, trägt 5 kg über 30 cm | statik | `vector-drag`, `force-balance`, `truss-load` |
| 3 | **Material-Biegeprobe** | Halter für eigene Biegeversuche | werkstoffe, festigkeit | `stress-bar`, `value-slider` |

### Niveau 2 — Aufbau (echte Auslegung, Maschinenelemente)

| # | Projekt | Bau-Ergebnis | Gruppen | Kern-Interactives |
|---|---|---|---|---|
| 4 | **★ Stirnradgetriebe** | 3D-gedrucktes Getriebe mit i = 3 | maschinenelemente, kinematik | `gear-pair`, `build` (gear) |
| 5 | **Welle auslegen** | Welle mit Lagerung | festigkeit | `value-slider`, `stress-bar`, `build` |
| 6 | **Schraubverbindung** | verschraubte Baugruppe | maschinenelemente | `value-slider` |
| 7 | **Wälzlagerung** | gelagerte Welle (Lagersitz) | maschinenelemente | `value-slider` |
| 8 | **Kurbelschwinge** | bewegliches Viergelenk | kinematik | `linkage-anim`, `build` |

### Niveau 3 — Vertiefung (Dynamik, Strömung, Optimierung)

| # | Projekt | Bau-Ergebnis | Gruppen | Kern-Interactives |
|---|---|---|---|---|
| 9 | **Kragträger-Leichtbau** | optimierter Lasthalter | festigkeit | `stress-bar`, `build` |
| 10 | **Schwungrad** | Schwungrad auf Lager | kinematik | `value-slider`, `build` |
| 11 | **★ Modellrakete** | druckbare, real flugfähige Rakete (STL) | stroemung, festigkeit | `rocket-stability`, `flight-sim`, `build` |

### Niveau 4 — Meisterstück (Integration)

| # | Projekt | Bau-Ergebnis | Gruppen | Kern-Interactives |
|---|---|---|---|---|
| 12 | **Antriebsstrang** | Motor → Getriebe → Welle → Last | maschinenelemente, methodik | Kombination aus 4/5/7 |

---

## Reihenfolge & Abhängigkeiten

```
1 Hebel ──┬─▶ 4 Getriebe ──┬─▶ 5 Welle ──▶ 7 Lager ──┐
2 Brücke ─┤                └─▶ 8 Kurbelschwinge      ├─▶ 12 Antriebsstrang
3 Probe ──┴─▶ 5 Welle      9 Kragträger ◀── 3,5      │
              10 Schwungrad ◀── 5,8      11 Rakete ◀─ 2 (+3 empfohlen)
```

- `recommendedAfter` (Projekt-Metadatum) bildet diese Kanten ab. Es ist eine
  **Empfehlung (Soft-Lock)**, kein Zwang — siehe `SCREENS.md` §5.2.
- **Drei Einstiegstüren** (Personas, `LERNMODELL.md` §9): Studium → 2 (Brücke),
  Azubi/Technik → 1 (Hebel), Maker → 4 (Getriebe, sofort druckbar).
- **Erste komplette Version: Projekt 4 (Stirnradgetriebe)** — nutzt alle
  Blockfamilien, Pseudo-3D, CAD/STL und prüfungsgenaue Auslegung; liegt fertig
  in `content/stirnradgetriebe.json`. Die **Rakete (11)** folgt als Schaustück
  mit voller Flug-Simulation.
- Empfehlung „Als Nächstes": nächstes Projekt mit erfüllten `recommendedAfter`;
  bei mehreren Kandidaten das mit den meisten bereits gemeisterten Konzepten.

## Generierungs-Hinweis

Alle Projekte entstehen über `/generate-project <projekt-id>` in Claude Code
(Abo), ein Projekt nach dem anderen, jeweils erst nach grünem `pnpm verify`.
Vorlage und verbindliche Detailtiefe: `PROJECT_SPECS.md`. Pro Projekt 5–9
Mikro-Schritte (5–15 Min.), mindestens 4 verschiedene Aufgabenarten, genau ein
`meilenstein`-Schritt.
