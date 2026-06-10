// src/db/db.ts — Verbindung zur IndexedDB `buildlab` (idb-Wrapper).
// Komponenten greifen NIE direkt hierauf zu — nur über src/db/repo.ts.

import { openDB, type IDBPDatabase } from 'idb';
import { DB_VERSION, MIGRATIONS } from './migrations';

let dbPromise: Promise<IDBPDatabase> | null = null;

export function getDb(): Promise<IDBPDatabase> {
  dbPromise ??= openDB('buildlab', DB_VERSION, {
    upgrade(db, oldVersion, _newVersion, tx) {
      for (const step of MIGRATIONS.slice(oldVersion)) step(db, tx);
    },
  });
  return dbPromise;
}

/**
 * Dauerhaften Speicher anfragen (DATENMODELL.md §1). Ergebnis wird in den
 * Einstellungen angezeigt; ein "false" ist kein Fehler, nur Information.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    return (await navigator.storage.persisted()) || (await navigator.storage.persist());
  } catch {
    return false;
  }
}

/** Nur für Tests/„Alles löschen“: Verbindung kappen, damit deleteDatabase greift. */
export async function closeDb(): Promise<void> {
  if (!dbPromise) return;
  (await dbPromise).close();
  dbPromise = null;
}
