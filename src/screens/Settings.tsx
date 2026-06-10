// src/screens/Settings.tsx — Einstellungen (SCREENS.md §13): Tiefe, Bewegung,
// Backup-Export/-Import (mit Diff-Bestätigung), Speicher-Status, Daten löschen.

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { requestPersistentStorage } from '../db/db';
import { setSetting, useSettings, wipeAll } from '../db/repo';
import {
  downloadBackup, exportBackup, importBackup, summarizeBackup, validateBackup,
  type BackupFile,
} from '../db/backup';
import type { Depth } from '../db/types';

const DEPTHS: { id: Depth; label: string }[] = [
  { id: 'playful', label: 'verspielt' },
  { id: 'practical', label: 'praxis' },
  { id: 'rigorous', label: 'genau' },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="mb-8">
      <h2 className="mb-3 border-b border-black/10 pb-1 font-mono text-xs uppercase tracking-widest text-ink-2">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function Settings() {
  const settings = useSettings();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [pending, setPending] = useState<BackupFile | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [wipeWord, setWipeWord] = useState('');
  const [wipeStage, setWipeStage] = useState(0);

  useEffect(() => {
    requestPersistentStorage().then(setPersisted);
  }, []);

  if (!settings) return <div className="p-8 font-mono text-sm text-ink-faint">lädt …</div>;

  const onImportFile = async (file: File) => {
    setImportError(null);
    try {
      const raw = JSON.parse(await file.text());
      const { backup, error } = validateBackup(raw);
      if (error || !backup) {
        setImportError(error ?? 'Unbekannter Fehler.');
        return;
      }
      setPending(backup);
    } catch {
      setImportError('Datei ließ sich nicht lesen — ist das wirklich eine .json-Sicherung?');
    }
  };

  const summary = pending ? summarizeBackup(pending) : null;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-8 font-display text-[2rem] leading-[1.1] tracking-tight md:text-[2.75rem]">Einstellungen</h1>

      <Section title="Erklärtiefe">
        <div className="inline-flex rounded border border-black/10" role="radiogroup" aria-label="Erklärtiefe">
          {DEPTHS.map((d) => (
            <button
              key={d.id}
              role="radio"
              aria-checked={settings.depth === d.id}
              onClick={() => setSetting('depth', d.id)}
              className={`min-h-11 px-4 text-sm outline-none first:rounded-l last:rounded-r focus-visible:ring-2 focus-visible:ring-accent ${
                settings.depth === d.id ? 'bg-accent text-paper' : 'bg-paper-2 text-ink-2 hover:text-ink'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-ink-faint">
          Gilt überall als Voreinstellung; an jedem Text kannst du lokal umschalten.
        </p>
      </Section>

      <Section title="Bewegung">
        <label className="flex min-h-11 cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={settings.reducedMotion}
            onChange={(e) => setSetting('reducedMotion', e.target.checked)}
            className="h-5 w-5 accent-[var(--accent)] outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
          <span className="text-sm">Animationen reduzieren</span>
        </label>
        <p className="mt-1 text-xs text-ink-faint">
          Wirkt zusätzlich zur System-Einstellung („prefers-reduced-motion“).
        </p>
      </Section>

      <Section title="Sicherung">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={async () => downloadBackup(await exportBackup())}
            className="inline-flex min-h-11 items-center rounded border border-black/10 px-4 text-sm outline-none hover:border-ink-2 focus-visible:ring-2 focus-visible:ring-accent active:translate-y-px"
          >
            Sicherung exportieren
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="inline-flex min-h-11 items-center rounded border border-black/10 px-4 text-sm outline-none hover:border-ink-2 focus-visible:ring-2 focus-visible:ring-accent active:translate-y-px"
          >
            Sicherung importieren
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onImportFile(f);
              e.target.value = '';
            }}
          />
        </div>
        {importError && <p className="mt-2 text-sm text-[color:var(--viz-high)]">{importError}</p>}
        {pending && summary && (
          <div role="dialog" aria-label="Import bestätigen" className="mt-3 rounded border border-black/10 bg-paper-sink p-4">
            <p className="text-sm">
              Ersetzt deinen Stand durch: Fortschritt von <strong>{summary.projects}</strong> Projekt(en),{' '}
              <strong>{summary.concepts}</strong> Konzept(en), <strong>{summary.builds}</strong> gebaute(n)
              Teil(en), {summary.calcEntries} Rechner-Einträge.
            </p>
            <div className="mt-3 flex gap-3">
              <button
                onClick={() => setPending(null)}
                className="inline-flex min-h-11 items-center rounded border border-black/10 px-4 text-sm outline-none hover:border-ink-2 focus-visible:ring-2 focus-visible:ring-accent"
              >
                Abbrechen
              </button>
              <button
                onClick={async () => {
                  await importBackup(pending);
                  setPending(null);
                }}
                className="inline-flex min-h-11 items-center rounded bg-accent px-4 text-sm text-paper outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper active:translate-y-px"
              >
                Ja, ersetzen
              </button>
            </div>
          </div>
        )}
      </Section>

      <Section title="Speicher">
        <p className="font-mono text-sm">
          Dauerhafter Speicher:{' '}
          {persisted === null ? '…' : persisted ? (
            <span className="text-[color:var(--viz-low)]">gewährt ✓</span>
          ) : (
            <span className="text-ink-2">nicht gewährt — Backup empfohlen</span>
          )}
        </p>
        <p className="mt-1 text-xs text-ink-faint">Alles bleibt auf deinem Gerät. Kein Konto, kein Server.</p>
      </Section>

      <Section title="Daten">
        {wipeStage === 0 && (
          <button
            onClick={() => setWipeStage(1)}
            className="inline-flex min-h-11 items-center rounded border border-black/10 px-4 text-sm text-[color:var(--viz-high)] outline-none hover:border-ink-2 focus-visible:ring-2 focus-visible:ring-accent"
          >
            Alles löschen …
          </button>
        )}
        {wipeStage === 1 && (
          <div role="dialog" aria-label="Löschen bestätigen" className="rounded border border-black/10 bg-paper-sink p-4">
            <p className="text-sm">
              Das löscht <strong>allen</strong> Fortschritt, alle gebauten Teile und alle Einstellungen —
              endgültig. Tippe <span className="font-mono">LÖSCHEN</span>, um fortzufahren.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <input
                value={wipeWord}
                onChange={(e) => setWipeWord(e.target.value)}
                className="min-h-11 rounded border border-black/10 bg-paper px-3 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent"
                aria-label="Bestätigungswort"
              />
              <button
                onClick={() => {
                  setWipeStage(0);
                  setWipeWord('');
                }}
                className="inline-flex min-h-11 items-center rounded border border-black/10 px-4 text-sm outline-none hover:border-ink-2 focus-visible:ring-2 focus-visible:ring-accent"
              >
                Abbrechen
              </button>
              <button
                disabled={wipeWord !== 'LÖSCHEN'}
                onClick={async () => {
                  await wipeAll();
                  navigate('/onboarding');
                }}
                className="inline-flex min-h-11 items-center rounded bg-[color:var(--viz-high)] px-4 text-sm text-paper outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-40"
              >
                Endgültig löschen
              </button>
            </div>
          </div>
        )}
      </Section>

      <Section title="Über">
        <p className="text-sm text-ink-2">
          Buildlab — projektbasiertes Maschinenbau-Lernen. Pseudo-3D, prüfungsgenau, lokal.
        </p>
      </Section>
    </div>
  );
}
