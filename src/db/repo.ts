// src/db/repo.ts — Die einzige Lese-/Schreib-Schicht über der IndexedDB.
// Schreib-Zeitpunkte und Ableitungsregeln: DATENMODELL.md §2.2–2.3.
// Mastery-/Leitner-Logik: LERNMODELL.md §3 und §7.4.

import { useEffect, useState } from 'react';
import { getDb, closeDb } from './db';
import {
  BOX_INTERVALS,
  taskKey,
  type BuildEntry,
  type CalcHistoryEntry,
  type ConceptStateEntry,
  type ProjectProgress,
  type SettingsShape,
  type TaskStateEntry,
} from './types';

const nowIso = () => new Date().toISOString();
const inDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();

// ── Änderungs-Signal für die Hooks (DATENMODELL.md §3) ───────────────────────
type Listener = () => void;
const listeners = new Set<Listener>();
let dbVersionCounter = 0;

export function notifyDbChanged() {
  dbVersionCounter++;
  for (const l of listeners) l();
}
const notifyChanged = notifyDbChanged;

/** Lädt asynchron aus der Repo-Schicht und lädt bei jedem Write neu. */
export function useDbValue<T>(loader: () => Promise<T>, deps: unknown[] = []): T | undefined {
  const [value, setValue] = useState<T | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    const run = () => {
      loader().then((v) => {
        if (alive) setValue(v);
      }).catch(() => {
        /* Quota/Fehler: UI zeigt Warnkarte über useDbHealthy */
      });
    };
    run();
    listeners.add(run);
    return () => {
      alive = false;
      listeners.delete(run);
    };
    // deps steuert bewusst nur die Neu-Initialisierung (loader ist stabil gedacht).
  }, deps);
  return value;
}

let healthy = true;
export const isDbHealthy = () => healthy;

async function write(fn: (db: Awaited<ReturnType<typeof getDb>>) => Promise<unknown>) {
  try {
    const db = await getDb();
    await fn(db);
    healthy = true;
  } catch {
    healthy = false;
  }
  notifyChanged();
}

// ── settings ─────────────────────────────────────────────────────────────────
export const SETTINGS_DEFAULTS: SettingsShape = {
  onboardingDone: false,
  depth: 'practical',
  reducedMotion: false,
  schemaVersion: 1,
};

export async function getSettings(): Promise<SettingsShape> {
  const db = await getDb();
  const entries: Partial<SettingsShape> = {};
  let cursor = await db.transaction('settings').store.openCursor();
  while (cursor) {
    (entries as Record<string, unknown>)[String(cursor.key)] = cursor.value;
    cursor = await cursor.continue();
  }
  return { ...SETTINGS_DEFAULTS, ...entries };
}

export async function setSetting<K extends keyof SettingsShape>(name: K, value: SettingsShape[K]) {
  await write((db) => db.put('settings', value, name));
}

// ── projectProgress ──────────────────────────────────────────────────────────
export async function getProgress(projectId: string): Promise<ProjectProgress | undefined> {
  return (await getDb()).get('projectProgress', projectId);
}

export async function getAllProgress(): Promise<Record<string, ProjectProgress>> {
  const db = await getDb();
  const out: Record<string, ProjectProgress> = {};
  let cursor = await db.transaction('projectProgress').store.openCursor();
  while (cursor) {
    out[String(cursor.key)] = cursor.value as ProjectProgress;
    cursor = await cursor.continue();
  }
  return out;
}

/** Schritt betreten (DATENMODELL §2.3): currentStep, ggf. startedAt/maxStepReached. */
export async function enterStep(projectId: string, stepIndex: number) {
  await write(async (db) => {
    const prev = (await db.get('projectProgress', projectId)) as ProjectProgress | undefined;
    const next: ProjectProgress = prev ?? {
      currentStep: 0,
      maxStepReached: 0,
      stepsDone: [],
      startedAt: nowIso(),
    };
    next.currentStep = stepIndex;
    next.maxStepReached = Math.max(next.maxStepReached, stepIndex);
    await db.put('projectProgress', next, projectId);
  });
}

/** Schritt abgeschlossen: stepsDone + Konzepte des Schritts auf `gesehen`. */
export async function completeStep(
  projectId: string,
  stepId: string,
  introducedConcepts: string[],
  isLast: boolean,
) {
  await write(async (db) => {
    const prev = (await db.get('projectProgress', projectId)) as ProjectProgress | undefined;
    const next: ProjectProgress = prev ?? {
      currentStep: 0,
      maxStepReached: 0,
      stepsDone: [],
      startedAt: nowIso(),
    };
    if (!next.stepsDone.includes(stepId)) next.stepsDone.push(stepId);
    if (isLast) next.completedAt ??= nowIso();
    await db.put('projectProgress', next, projectId);

    for (const conceptId of introducedConcepts) {
      const state = await readConcept(db, conceptId);
      if (state.status === 'neu') state.status = 'gesehen';
      state.lastSeenIn = projectId;
      await db.put('conceptState', state, conceptId);
    }
  });
}

// ── taskState + Mastery-Buchung (LERNMODELL §7.4) ────────────────────────────
export async function getTaskStates(projectId: string): Promise<Record<string, TaskStateEntry>> {
  const db = await getDb();
  const out: Record<string, TaskStateEntry> = {};
  const range = IDBKeyRange.bound(`${projectId}/`, `${projectId}/￿`);
  let cursor = await db.transaction('taskState').store.openCursor(range);
  while (cursor) {
    out[String(cursor.key)] = cursor.value as TaskStateEntry;
    cursor = await cursor.continue();
  }
  return out;
}

export async function setTaskResult(
  projectId: string,
  stepId: string,
  blockIndex: number,
  result: TaskStateEntry,
  concepts: string[],
) {
  await write(async (db) => {
    const entry: TaskStateEntry = { ...result, solvedAt: result.solved ? nowIso() : undefined };
    await db.put('taskState', entry, taskKey(projectId, stepId, blockIndex));

    // Mastery: gelöst im 1./2. Versuch ohne Hilfe → `angewendet` (Box startet bei 2).
    if (result.solved && !result.usedHelp && result.attempts <= 2) {
      for (const conceptId of concepts) {
        const state = await readConcept(db, conceptId);
        if (state.status === 'neu' || state.status === 'gesehen') {
          state.status = 'angewendet';
          state.box = 2;
          state.due = inDays(BOX_INTERVALS[2]);
        }
        state.lastSeenIn = projectId;
        await db.put('conceptState', state, conceptId);
      }
    }
  });
}

// ── conceptState (Leitner, LERNMODELL §3.1) ──────────────────────────────────
const EMPTY_CONCEPT: ConceptStateEntry = { status: 'neu', box: 1, due: null, refreshShown: [] };

async function readConcept(
  db: Awaited<ReturnType<typeof getDb>>,
  conceptId: string,
): Promise<ConceptStateEntry> {
  return ((await db.get('conceptState', conceptId)) as ConceptStateEntry | undefined) ?? {
    ...EMPTY_CONCEPT,
    refreshShown: [],
  };
}

export async function getConceptStates(): Promise<Record<string, ConceptStateEntry>> {
  const db = await getDb();
  const out: Record<string, ConceptStateEntry> = {};
  let cursor = await db.transaction('conceptState').store.openCursor();
  while (cursor) {
    out[String(cursor.key)] = cursor.value as ConceptStateEntry;
    cursor = await cursor.continue();
  }
  return out;
}

/** Trainings-Ausgang: Erfolg Box+1, Fehlversuch/Hilfe Box−1 (LERNMODELL §3.1, §6). */
export async function applyTrainingOutcome(conceptId: string, success: boolean) {
  await write(async (db) => {
    const state = await readConcept(db, conceptId);
    const box = Math.min(5, Math.max(1, state.box + (success ? 1 : -1))) as ConceptStateEntry['box'];
    state.box = box;
    state.due = success ? inDays(BOX_INTERVALS[box]) : inDays(1);
    if (box >= 4) state.status = 'sicher';
    else if (state.status === 'sicher') state.status = 'angewendet';
    await db.put('conceptState', state, conceptId);
  });
}

/** Auffrisch-Karte wurde gezeigt (pro Konzept und Projekt nur einmal). */
export async function markRefreshShown(conceptId: string, projectId: string) {
  await write(async (db) => {
    const state = await readConcept(db, conceptId);
    if (!state.refreshShown.includes(projectId)) state.refreshShown.push(projectId);
    await db.put('conceptState', state, conceptId);
  });
}

/** Fällige Konzepte: due erreicht und mindestens `angewendet` (DATENMODELL §2.2). */
export function dueConcepts(states: Record<string, ConceptStateEntry>): string[] {
  const today = nowIso();
  return Object.entries(states)
    .filter(([, s]) => s.due !== null && s.due <= today && s.status !== 'neu' && s.status !== 'gesehen')
    .sort(([, a], [, b]) => (a.due! < b.due! ? -1 : 1))
    .map(([id]) => id);
}

// ── calcHistory (Ring, max. 50) ──────────────────────────────────────────────
export async function addCalcEntry(entry: Omit<CalcHistoryEntry, 'at'>) {
  await write(async (db) => {
    const tx = db.transaction('calcHistory', 'readwrite');
    await tx.store.add({ ...entry, at: nowIso() });
    const count = await tx.store.count();
    if (count > 50) {
      let cursor = await tx.store.openCursor();
      let toDelete = count - 50;
      while (cursor && toDelete > 0) {
        await cursor.delete();
        toDelete--;
        cursor = await cursor.continue();
      }
    }
    await tx.done;
  });
}

export async function getCalcHistory(): Promise<CalcHistoryEntry[]> {
  return (await (await getDb()).getAll('calcHistory')) as CalcHistoryEntry[];
}

// ── builds ───────────────────────────────────────────────────────────────────
export async function addBuild(entry: Omit<BuildEntry, 'at'>) {
  await write((db) => db.add('builds', { ...entry, at: nowIso() }));
}

export async function getBuilds(): Promise<BuildEntry[]> {
  return (await (await getDb()).getAll('builds')) as BuildEntry[];
}

// ── Alles löschen (Einstellungen, zweistufig bestätigt) ──────────────────────
export async function wipeAll() {
  await closeDb();
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase('buildlab');
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
  notifyChanged();
}

// ── React-Hooks ──────────────────────────────────────────────────────────────
export const useSettings = () => useDbValue(getSettings);
export const useProgress = (projectId: string) => useDbValue(() => getProgress(projectId), [projectId]);
export const useAllProgress = () => useDbValue(getAllProgress);
export const useConceptStates = () => useDbValue(getConceptStates);
export const useTaskStates = (projectId: string) =>
  useDbValue(() => getTaskStates(projectId), [projectId]);
export const useCalcHistory = () => useDbValue(getCalcHistory);
export const useBuilds = () => useDbValue(getBuilds);
export { dbVersionCounter };
