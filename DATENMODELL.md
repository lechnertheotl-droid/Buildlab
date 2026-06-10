# DATENMODELL.md — Persistenter Zustand & Backup

> **Regel:** Kein persistenter Zustand ohne Eintrag in dieser Datei. Jede Änderung
> an einem Store bedeutet: DB-Version +1, Migrationsschritt, Update hier.
> Implementierung: `src/db/` (`db.ts`, `repo.ts`, `migrations.ts`, `backup.ts`).

---

## 1. Grundsätze

1. **Lokal-first, kein Konto.** Alles liegt in IndexedDB auf dem Gerät
   (Wrapper: `idb`). Beim App-Start wird `navigator.storage.persist()`
   angefragt; das Ergebnis ist in den Einstellungen sichtbar.
2. **UI-Zustand ist flüchtig** (Zustand-Store im Speicher); nur was hier
   dokumentiert ist, wird persistiert. `src/db/repo.ts` ist die einzige
   Lese-/Schreib-Schicht — Komponenten greifen nie direkt auf IndexedDB zu.
3. **Keine STL-Blobs.** Gebaute Teile speichern nur ihre Parameter; die
   Geometrie ist jederzeit reproduzierbar (Eiserne Regel „ein parametrisches
   Modell ist die Wahrheit").
4. **Nichts wird dem Lernenden weggenommen.** Löschen gibt es nur als explizite,
   zweistufig bestätigte Nutzeraktion.

---

## 2. Datenbank `buildlab`, Version 1

| Store | Key | Wert |
|---|---|---|
| `settings` | `name` (string) | beliebiger JSON-Wert (siehe 2.1) |
| `projectProgress` | `projectId` | `{ currentStep, maxStepReached, stepsDone: string[], startedAt, completedAt? }` |
| `taskState` | `"<projectId>/<stepId>/<blockIndex>"` | `{ solved: boolean, attempts: number, usedHelp: boolean, solvedAt? }` |
| `conceptState` | `conceptId` | `{ status: "neu"\|"gesehen"\|"angewendet"\|"sicher", box: 1–5, due: ISO-Datum \| null, lastSeenIn?: projectId, refreshShown: projectId[] }` |
| `calcHistory` | auto-increment | `{ expr: string, display: string, at: ISO }` — formatiertes Ergebnis inkl. Einheit; Ring, max. 50 (ältester fliegt) |
| `builds` | auto-increment | `{ projectId, cadModel: string, params: Record<string, number>, label: string, at: ISO }` |

### 2.1 `settings`-Einträge

| name | Typ | Default | Bedeutung |
|---|---|---|---|
| `onboardingDone` | boolean | false | Root-Redirect-Schalter |
| `persona` | `"studium"\|"azubi"\|"maker"` | — | nur für Empfehlungs-Microcopy |
| `depth` | `"playful"\|"practical"\|"rigorous"` | `"practical"` | globale Tiefen-Ebene |
| `reducedMotion` | boolean | false | ODER-verknüpft mit `prefers-reduced-motion` |
| `schemaVersion` | number | 1 | für Backup-Migration |

### 2.2 Ableitungsregeln (nicht gespeichert, immer berechnet)

- **Projekt-Status** (`empfohlen/offen/begonnen/fertig/Voraussetzung offen`)
  wird aus `projectProgress` + `recommendedAfter` der Projekt-JSONs berechnet.
- **Fälligkeit** eines Konzepts: `due <= heute`. Die Trainings-Auswahl sortiert
  nach Überfälligkeit; nichts davon wird zusätzlich gespeichert.
- **Mastery-Gesamtwert** (Topbar-Ring): Anteil Konzepte ≥ `angewendet`.

### 2.3 Schreib-Zeitpunkte (wer schreibt wann)

| Ereignis | Schreibt |
|---|---|
| Onboarding abgeschlossen | `settings` (persona, depth, onboardingDone) |
| Schritt betreten | `projectProgress.currentStep` (+ `startedAt` beim ersten) |
| Aufgabe gelöst/versucht | `taskState`; ggf. `conceptState` (Status/Box gem. `LERNMODELL.md` §3, §7.4) |
| Schritt abgeschlossen | `projectProgress.stepsDone`, `maxStepReached`; `conceptState.status` → `gesehen` für `introduces` |
| Auffrisch-Karte gezeigt | `conceptState.refreshShown` (pro Projekt einmal) |
| Meilenstein erreicht | `projectProgress.completedAt`; `builds`-Eintrag |
| Rechner „=" | `calcHistory` (Ring) |
| Trainings-Aufgabe | `conceptState.box/due/status` |

---

## 3. Repo-Schicht & Hooks

`src/db/repo.ts` exportiert asynchrone, typisierte Funktionen
(`getProgress`, `setTaskSolved`, `bumpConceptBox`, …) plus React-Hooks mit
In-Memory-Cache (`useProgress(projectId)`, `useConceptState()`,
`useSettings()`). Schreiben ist fire-and-forget mit optimistischem UI-Update;
ein fehlgeschlagener Write zeigt eine dezente Warnkarte („Konnte nicht
speichern — Speicher voll?").

---

## 4. Backup (Export / Import)

**Export** (`src/db/backup.ts`): lädt alle Stores und erzeugt eine Datei
`buildlab-backup-JJJJ-MM-TT.json`:

```json
{
  "format": "buildlab-backup",
  "version": 1,
  "exportedAt": "2026-06-09T12:00:00Z",
  "stores": {
    "settings": { "...": "..." },
    "projectProgress": { "stirnradgetriebe": { "...": "..." } },
    "taskState": { "...": "..." },
    "conceptState": { "...": "..." },
    "calcHistory": [ { "...": "..." } ],
    "builds": [ { "...": "..." } ]
  }
}
```

**Import:**
1. Datei parsen; `format` muss `"buildlab-backup"` sein, `version` ≤ aktuelle
   DB-Version — sonst freundliche Fehlerkarte (keine Teilimporte).
2. Migrationskette anwenden (ältere Backups werden hochmigriert, §5).
3. Zusammenfassung anzeigen: „Ersetzt Fortschritt von N Projekten, M Konzepten,
   K gebauten Teilen." → [Abbrechen] [Ja, ersetzen].
4. **Transaktional ersetzen** (alle Stores in einer Transaktion leeren und
   füllen) — nie ein halber Import.

---

## 5. Migrationen

`src/db/migrations.ts` exportiert eine geordnete Liste von Schritten
`(db, transaction, oldVersion) => void`. Die `upgrade`-Callback von `idb`
durchläuft sie ab `oldVersion`; der Backup-Import nutzt **dieselbe Kette**
auf dem JSON-Objekt (reine Datentransformation pro Versionssprung).

Regeln:
- Migrationen sind additiv und verlustfrei (umbenennen ja, löschen nur mit
  dokumentierter Begründung hier).
- Jeder Schritt hat einen Kommentar mit Datum + Anlass.
- Version 1 = Initialstand (diese Datei).

---

## 6. Speicher-Grenzen & Fehlerfälle

- `calcHistory` ist hart auf 50 begrenzt (Ring) — der einzige Store mit
  unbeschränktem Wachstumspotenzial wäre sonst der Rechner.
- `builds` wächst pro Meilenstein um einen kleinen Parameter-Datensatz
  (< 1 kB) — unkritisch.
- Quota-Fehler beim Schreiben → Warnkarte mit Link auf die Einstellungen
  (Export empfehlen). Die App bleibt benutzbar; nur Persistenz pausiert.
- „Alles löschen" (Einstellungen): zweistufig (Bestätigung + Tipp-Wort
  „LÖSCHEN"), löscht alle Stores und setzt auf Onboarding zurück.
