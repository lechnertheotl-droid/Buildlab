// src/screens/Werkstatt.tsx — Portfolio (SCREENS.md §9): gebaute Teile
// (nur Parameter persistiert, STL wird bei Bedarf neu kompiliert — keine
// Blobs, DATENMODELL.md §1) und Projekt-Laufzettel.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { compileGear } from '@buildlab/cad';
import { projectById, projects, personaStartProject } from '../content';
import { useAllProgress, useBuilds, useSettings } from '../db/repo';
import type { BuildEntry } from '../db/types';

function downloadStl(stl: string, name: string) {
  const blob = new Blob([stl], { type: 'model/stl' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function BuildCard({ build }: { build: BuildEntry }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const project = projectById.get(build.projectId);

  const recompile = async () => {
    setBusy(true);
    setError(null);
    try {
      if (build.cadModel !== 'gear') throw new Error(`Unbekanntes Modell '${build.cadModel}'`);
      const { m, z, thickness, bore } = build.params;
      const stl = await compileGear({ m, z, thickness, bore });
      downloadStl(stl, `${build.label.replaceAll(' ', '-').toLowerCase()}.stl`);
    } catch {
      setError('Kompilieren fehlgeschlagen — öffne das Teil im Projekt und exportiere dort.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded border border-black/10 bg-paper-2 p-4 shadow">
      <p className="font-display">{build.label}</p>
      <p className="mt-1 font-mono text-xs text-ink-2">
        {Object.entries(build.params)
          .map(([k, v]) => `${k} = ${String(v).replace('.', ',')}`)
          .join(' · ')}
      </p>
      <p className="mt-0.5 font-mono text-[10px] text-ink-faint">
        {new Date(build.at).toLocaleDateString('de-DE')} · {project?.title ?? build.projectId}
      </p>
      {error && <p className="mt-2 text-xs text-[color:var(--viz-high)]">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          onClick={recompile}
          disabled={busy}
          className="inline-flex min-h-11 items-center rounded border border-black/10 px-4 font-mono text-xs outline-none hover:border-ink-2 focus-visible:ring-2 focus-visible:ring-accent active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? 'Fräse läuft …' : 'STL laden'}
        </button>
        <Link
          to={`/projekt/${build.projectId}`}
          className="inline-flex min-h-11 items-center rounded px-3 text-sm text-ink-2 outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-accent"
        >
          im Projekt öffnen
        </Link>
      </div>
    </div>
  );
}

export default function Werkstatt() {
  const builds = useBuilds();
  const allProgress = useAllProgress();
  const settings = useSettings();

  if (!builds || !allProgress) {
    return <div className="p-8 font-mono text-sm text-ink-faint">lädt …</div>;
  }

  const completed = projects.filter((p) => allProgress[p.id]?.completedAt);
  const empty = builds.length === 0 && completed.length === 0;
  const start = personaStartProject(settings?.persona);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-6 font-display text-[2rem] leading-[1.1] tracking-tight md:text-[2.75rem]">Werkstatt</h1>

      {empty ? (
        <div className="rounded border border-black/10 bg-paper-2 p-6 text-center shadow">
          <p className="font-display text-lg">Noch nichts gebaut — das erste Zahnrad wartet.</p>
          <Link
            to={`/projekt/${start.id}`}
            className="mt-4 inline-flex min-h-11 items-center rounded bg-accent px-5 text-sm text-paper outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper active:translate-y-px"
          >
            {start.title} starten →
          </Link>
        </div>
      ) : (
        <>
          {builds.length > 0 && (
            <section aria-label="Gebaute Teile">
              <h2 className="mb-3 border-b border-black/10 pb-1 font-mono text-xs uppercase tracking-widest text-ink-2">
                Gebaute Teile
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {[...builds].reverse().map((b, i) => (
                  <BuildCard key={`${b.at}-${i}`} build={b} />
                ))}
              </div>
            </section>
          )}

          {completed.length > 0 && (
            <section aria-label="Abschlüsse" className="mt-8">
              <h2 className="mb-3 border-b border-black/10 pb-1 font-mono text-xs uppercase tracking-widest text-ink-2">
                Abschlüsse
              </h2>
              <ul className="space-y-2">
                {completed.map((p) => {
                  const progress = allProgress[p.id];
                  return (
                    <li key={p.id} className="rounded border border-black/10 bg-paper-2 p-4 shadow">
                      <p className="flex items-center gap-2">
                        <span className="font-mono text-[color:var(--viz-low)]">✓</span>
                        <span className="font-display">{p.title}</span>
                        <span className="ml-auto font-mono text-xs text-ink-2">
                          {progress.completedAt && new Date(progress.completedAt).toLocaleDateString('de-DE')}
                        </span>
                      </p>
                      <p className="mt-1 font-mono text-xs text-ink-faint">
                        {progress.stepsDone.length}/{p.steps.length} Schritte · „{p.challenge}“
                      </p>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
