// src/db/migrations.ts — Migrationskette der IndexedDB `buildlab`.
// Regel R9 (CLAUDE.md): jede Store-Änderung = DB_VERSION +1, ein Schritt hier,
// ein Eintrag in DATENMODELL.md. Schritte sind additiv und verlustfrei.

import type { IDBPDatabase, IDBPTransaction } from 'idb';

export const DB_VERSION = 1;

type Migration = (
  db: IDBPDatabase,
  tx: IDBPTransaction<unknown, string[], 'versionchange'>,
) => void;

/** Index = Zielversion − 1. openDB führt ab `oldVersion` alle folgenden aus. */
export const MIGRATIONS: Migration[] = [
  // v1 (2026-06-09, Redesign-Phase R3): Initialstand nach DATENMODELL.md §2.
  (db) => {
    db.createObjectStore('settings');
    db.createObjectStore('projectProgress');
    db.createObjectStore('taskState');
    db.createObjectStore('conceptState');
    db.createObjectStore('calcHistory', { autoIncrement: true });
    db.createObjectStore('builds', { autoIncrement: true });
  },
];

export const ALL_STORES = [
  'settings',
  'projectProgress',
  'taskState',
  'conceptState',
  'calcHistory',
  'builds',
] as const;

export type StoreName = (typeof ALL_STORES)[number];

/**
 * Backup-Migrationskette: dieselben Versionssprünge als reine
 * Datentransformation auf dem Backup-JSON (DATENMODELL.md §5).
 * Index = Zielversion − 1; v1 hat keinen Vorgänger.
 */
export const BACKUP_MIGRATIONS: ((stores: Record<string, unknown>) => Record<string, unknown>)[] =
  [(stores) => stores];
