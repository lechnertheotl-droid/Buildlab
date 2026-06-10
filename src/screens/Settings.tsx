// src/screens/Settings.tsx — Einstellungen (SCREENS.md §13): Tiefe, Bewegung,
// Backup-Export/-Import (mit Diff-Bestätigung), Speicher-Status, Daten löschen.
// Import-Bestätigung und Lösch-Fluss laufen über das Dialog-Primitiv
// (Fokus-Falle, Esc, Fokus-Rückgabe — DESIGN.md §7).

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Dialog, ScreenSkeleton, SegmentedControl } from '@buildlab/ui';
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
  const [wipeOpen, setWipeOpen] = useState(false);

  useEffect(() => {
    requestPersistentStorage().then(setPersisted);
  }, []);

  if (!settings) return <ScreenSkeleton layout="detail" />;

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
  const closeWipe = () => {
    setWipeOpen(false);
    setWipeWord('');
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-6 md:py-10">
      <h1 className="mb-8 font-display text-display-sm text-ink-strong md:text-display">
        Einstellungen
      </h1>

      <Section title="Erklärtiefe">
        <SegmentedControl
          value={settings.depth}
          onChange={(d) => void setSetting('depth', d)}
          options={DEPTHS}
          ariaLabel="Erklärtiefe"
        />
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
          <Button variant="secondary" onClick={async () => downloadBackup(await exportBackup())}>
            Sicherung exportieren
          </Button>
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            Sicherung importieren
          </Button>
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
        {importError && (
          <p role="alert" className="mt-2 text-sm text-fehl">
            <span aria-hidden="true">✗ </span>
            {importError}
          </p>
        )}
        <Dialog
          open={pending !== null && summary !== null}
          onClose={() => setPending(null)}
          title="Sicherung einspielen?"
        >
          <p className="text-sm leading-relaxed text-ink-2">
            Ersetzt deinen Stand durch: Fortschritt von <strong>{summary?.projects}</strong>{' '}
            Projekt(en), <strong>{summary?.concepts}</strong> Konzept(en),{' '}
            <strong>{summary?.builds}</strong> gebaute(n) Teil(en), {summary?.calcEntries}{' '}
            Rechner-Einträge.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              onClick={async () => {
                if (pending) await importBackup(pending);
                setPending(null);
              }}
            >
              Ja, ersetzen
            </Button>
            <Button variant="secondary" onClick={() => setPending(null)}>
              Abbrechen
            </Button>
          </div>
        </Dialog>
      </Section>

      <Section title="Speicher">
        <p className="font-mono text-sm">
          Dauerhafter Speicher:{' '}
          {persisted === null ? '…' : persisted ? (
            <span className="text-ok">gewährt ✓</span>
          ) : (
            <span className="text-ink-2">nicht gewährt — Backup empfohlen</span>
          )}
        </p>
        <p className="mt-1 text-xs text-ink-faint">Alles bleibt auf deinem Gerät. Kein Konto, kein Server.</p>
      </Section>

      <Section title="Daten">
        <Button variant="secondary" className="text-fehl" onClick={() => setWipeOpen(true)}>
          Alles löschen …
        </Button>
        <Dialog open={wipeOpen} onClose={closeWipe} title="Wirklich alles löschen?" danger>
          <p className="text-sm leading-relaxed text-ink-2">
            Das löscht <strong>allen</strong> Fortschritt, alle gebauten Teile und alle
            Einstellungen — endgültig. Tippe <span className="font-mono">LÖSCHEN</span>, um
            fortzufahren.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <input
              value={wipeWord}
              onChange={(e) => setWipeWord(e.target.value)}
              className="min-h-11 rounded border border-black/10 bg-paper-sink px-3 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label="Bestätigungswort"
            />
            <Button
              variant="danger"
              disabled={wipeWord !== 'LÖSCHEN'}
              title={wipeWord !== 'LÖSCHEN' ? 'Tippe LÖSCHEN ins Feld' : undefined}
              onClick={async () => {
                await wipeAll();
                navigate('/onboarding');
              }}
            >
              Endgültig löschen
            </Button>
            <Button variant="secondary" onClick={closeWipe}>
              Abbrechen
            </Button>
          </div>
        </Dialog>
      </Section>

      <Section title="Über">
        <p className="text-sm text-ink-2">
          Buildlab — projektbasiertes Maschinenbau-Lernen. Pseudo-3D, prüfungsgenau, lokal.
        </p>
      </Section>
    </div>
  );
}
