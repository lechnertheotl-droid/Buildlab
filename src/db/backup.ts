// src/db/backup.ts — Sicherung exportieren/importieren (DATENMODELL.md §4).
// Import ist transaktional: nie ein halber Import.

import { getDb } from './db';
import { ALL_STORES, BACKUP_MIGRATIONS, DB_VERSION } from './migrations';
import { notifyDbChanged } from './repo';

export interface BackupFile {
  format: 'buildlab-backup';
  version: number;
  exportedAt: string;
  stores: Record<string, unknown>;
}

export interface BackupSummary {
  projects: number;
  concepts: number;
  builds: number;
  calcEntries: number;
}

const KEYED_STORES = ['settings', 'projectProgress', 'taskState', 'conceptState'] as const;
const LIST_STORES = ['calcHistory', 'builds'] as const;

export async function exportBackup(): Promise<BackupFile> {
  const db = await getDb();
  const stores: Record<string, unknown> = {};
  for (const name of KEYED_STORES) {
    const out: Record<string, unknown> = {};
    let cursor = await db.transaction(name).store.openCursor();
    while (cursor) {
      out[String(cursor.key)] = cursor.value;
      cursor = await cursor.continue();
    }
    stores[name] = out;
  }
  for (const name of LIST_STORES) {
    stores[name] = await db.getAll(name);
  }
  return { format: 'buildlab-backup', version: DB_VERSION, exportedAt: new Date().toISOString(), stores };
}

export function downloadBackup(backup: BackupFile) {
  const date = backup.exportedAt.slice(0, 10);
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `buildlab-backup-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Format-/Versionsprüfung; liefert die (hochmigrierte) Sicherung oder einen Fehlertext. */
export function validateBackup(raw: unknown): { backup?: BackupFile; error?: string } {
  if (typeof raw !== 'object' || raw === null) return { error: 'Keine gültige Sicherungsdatei.' };
  const data = raw as Partial<BackupFile>;
  if (data.format !== 'buildlab-backup') return { error: 'Das ist keine Buildlab-Sicherung.' };
  if (typeof data.version !== 'number' || data.version < 1 || data.version > DB_VERSION) {
    return { error: `Sicherungs-Version ${data.version} wird nicht unterstützt (erwartet 1–${DB_VERSION}).` };
  }
  if (typeof data.stores !== 'object' || data.stores === null) {
    return { error: 'Sicherung enthält keine Daten.' };
  }
  let stores = data.stores as Record<string, unknown>;
  for (let v = data.version; v < DB_VERSION; v++) {
    stores = BACKUP_MIGRATIONS[v](stores);
  }
  return {
    backup: {
      format: 'buildlab-backup',
      version: DB_VERSION,
      exportedAt: data.exportedAt ?? new Date().toISOString(),
      stores,
    },
  };
}

export function summarizeBackup(backup: BackupFile): BackupSummary {
  const stores = backup.stores;
  const keyed = (name: string) => Object.keys((stores[name] as Record<string, unknown>) ?? {}).length;
  const list = (name: string) => ((stores[name] as unknown[]) ?? []).length;
  return {
    projects: keyed('projectProgress'),
    concepts: keyed('conceptState'),
    builds: list('builds'),
    calcEntries: list('calcHistory'),
  };
}

/** Ersetzt ALLE Stores in einer Transaktion durch den Sicherungsstand. */
export async function importBackup(backup: BackupFile): Promise<void> {
  const db = await getDb();
  const tx = db.transaction([...ALL_STORES], 'readwrite');
  for (const name of KEYED_STORES) {
    const store = tx.objectStore(name);
    await store.clear();
    const entries = (backup.stores[name] as Record<string, unknown>) ?? {};
    for (const [key, value] of Object.entries(entries)) {
      await store.put(value, key);
    }
  }
  for (const name of LIST_STORES) {
    const store = tx.objectStore(name);
    await store.clear();
    for (const value of (backup.stores[name] as unknown[]) ?? []) {
      await store.add(value);
    }
  }
  await tx.done;
  notifyDbChanged();
}
