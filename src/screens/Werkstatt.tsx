// src/screens/Werkstatt.tsx — Portfolio (SCREENS.md §9): gebaute Teile
// (nur Parameter persistiert, STL wird bei Bedarf neu kompiliert — keine
// Blobs, DATENMODELL.md §1) und Projekt-Laufzettel.

import { useState } from 'react';
import { Button, EmptyState, ScreenSkeleton, buttonClass } from '@buildlab/ui';
import { Link } from 'react-router-dom';
import { compileGear, compilePulley } from '@buildlab/cad';
import { projectById, projects, personaStartProject } from '../content';
import { useAllProgress, useBuilds, useSettings } from '../db/repo';
import type { BuildEntry } from '../db/types';

// Anzeige-Namen der CAD-Parameter (UI spricht deutsch, das Modell englisch).
const PARAM_LABELS: Record<string, string> = {
  m: 'm', z: 'z', z1: 'z₁', z2: 'z₂', thickness: 'Breite', bore: 'Bohrung',
  d: 'Ø', groove: 'Rille', d_seil: 'Seil-Ø',
};

// Gezeichnetes Zahnrad in der Linien-Sprache der Bühnen (DESIGN.md §6/§9).
function GearDoodle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <circle cx="16" cy="16" r="8" fill="none" stroke="var(--ink-2)" strokeWidth="1.3" />
      <circle cx="16" cy="16" r="2.6" fill="none" stroke="var(--accent)" strokeWidth="1.3" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <line
          key={a}
          x1={16 + 8 * Math.cos((a * Math.PI) / 180)}
          y1={16 + 8 * Math.sin((a * Math.PI) / 180)}
          x2={16 + 11 * Math.cos((a * Math.PI) / 180)}
          y2={16 + 11 * Math.sin((a * Math.PI) / 180)}
          stroke="var(--ink-2)"
          strokeWidth="1.3"
        />
      ))}
    </svg>
  );
}

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
      let stl: string;
      if (build.cadModel === 'gear') {
        const { m, z, thickness, bore } = build.params;
        stl = await compileGear({ m, z, thickness, bore });
      } else if (build.cadModel === 'rolle') {
        const { d, groove, bore, thickness } = build.params;
        stl = await compilePulley({ d, groove, bore, thickness });
      } else {
        throw new Error(`Unbekanntes Modell '${build.cadModel}'`);
      }
      // Dateiname robust halten: Sonderzeichen (Ø, Umlaute) brechen sonst das
      // download-Attribut in manchen Browsern.
      const safe = build.label
        .toLowerCase()
        .replaceAll('ø', 'd')
        .replace(/[äöüß]/g, (c) => ({ ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' })[c] ?? c)
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      downloadStl(stl, `${safe}.stl`);
    } catch {
      setError('Kompilieren fehlgeschlagen — öffne das Teil im Projekt und exportiere dort.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded border border-black/10 bg-paper-2 p-4 shadow">
      {/* Kleine Iso-Vorschau-Well (SCREENS.md §9) — gezeichnetes Teil, kein Foto. */}
      <div className="mb-3 flex h-16 items-center justify-center rounded-sm bg-paper-deep/60">
        <GearDoodle className="h-12 w-12" />
      </div>
      <p className="font-display font-semibold text-ink">{build.label}</p>
      <p className="mt-1 font-mono text-xs text-ink-2">
        {Object.entries(build.params)
          .map(([k, v]) => `${PARAM_LABELS[k] ?? k} = ${String(v).replace('.', ',')}`)
          .join(' · ')}
      </p>
      <p className="mt-0.5 font-mono text-[10px] text-ink-faint">
        {new Date(build.at).toLocaleDateString('de-DE')} · {project?.title ?? build.projectId}
      </p>
      {error && (
        <p role="alert" className="mt-2 text-xs text-fehl">
          <span aria-hidden="true">✗ </span>
          {error}
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <Button variant="secondary" size="sm" onClick={recompile} disabled={busy}>
          {busy ? 'Fräse läuft …' : 'STL laden'}
        </Button>
        <Link to={`/projekt/${build.projectId}`} className={buttonClass({ variant: 'ghost', size: 'sm' })}>
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
    return <ScreenSkeleton layout="list" />;
  }

  const completed = projects.filter((p) => allProgress[p.id]?.completedAt);
  const empty = builds.length === 0 && completed.length === 0;
  const start = personaStartProject(settings?.persona);
  // Ehrliche CTA: läuft das Projekt schon, heißt es „weitermachen", nicht „starten".
  const startBegonnen = !!allProgress[start.id];

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-6 font-display text-display-sm text-ink-strong md:text-display">Werkstatt</h1>

      {empty ? (
        <EmptyState
          title="Noch nichts gebaut — das erste Zahnrad wartet."
          hint="Jedes fertige Projekt legt hier ein Teil ab, das du als STL mitnehmen kannst."
          illustration={<GearDoodle className="h-14 w-14" />}
          action={
            <Link to={`/projekt/${start.id}`} className={buttonClass()}>
              {start.title} {startBegonnen ? 'weitermachen' : 'starten'} →
            </Link>
          }
        />
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
                        <span className="font-mono text-ok">✓</span>
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
