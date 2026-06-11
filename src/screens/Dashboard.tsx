// src/screens/Dashboard.tsx — „Weitermachen“ mit einem Tipp (SCREENS.md §4):
// Fortsetzen-Karte dominant, Auffrischen sobald etwas fällig ist (sonst kann
// eine einzelne fällige Karte nie abgebaut werden), maximal zwei
// „Als Nächstes“-Empfehlungen.

import { Link } from 'react-router-dom';
import { ProgressBar, ScreenSkeleton, StatusBadge, buttonClass } from '@buildlab/ui';
import {
  conceptById, projectById, projects, recommendNext, remainingMinutes, personaStartProject,
} from '../content';
import { dueConcepts, useAllProgress, useConceptStates, useSettings } from '../db/repo';

export default function Dashboard() {
  const allProgress = useAllProgress();
  const conceptStates = useConceptStates();
  const settings = useSettings();

  if (!allProgress || !conceptStates || !settings) {
    return <ScreenSkeleton layout="list" />;
  }

  const current = projects
    .filter((p) => allProgress[p.id] && !allProgress[p.id].completedAt)
    .sort((a, b) => (allProgress[b.id].startedAt > allProgress[a.id].startedAt ? 1 : -1))[0];

  const due = dueConcepts(conceptStates);
  const mastered = new Set(
    Object.entries(conceptStates)
      .filter(([, s]) => s.status === 'angewendet' || s.status === 'sicher')
      .map(([id]) => id),
  );
  const next = recommendNext(allProgress, mastered);
  const done = projects.filter((p) => allProgress[p.id]?.completedAt);
  const neverStarted = Object.keys(allProgress).length === 0;
  // Hero und „Als Nächstes“ sollen nicht dasselbe Projekt doppelt empfehlen.
  const heroShown = neverStarted || !current;
  const heroId = personaStartProject(settings?.persona).id;
  const nextShown = next && !(heroShown && next.id === heroId) ? next : null;
  const nextSectionEmpty = !nextShown && done.length === 0;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      {neverStarted ? (
        <Hero />
      ) : current ? (
        <section
          aria-label="Weitermachen"
          className="bl-einzeichnen rounded-lg border border-black/10 bg-paper-2 p-6 shadow"
        >
          <p className="font-display text-title text-ink-strong">
            Weiter bei: {current.title} ·{' '}
            <span className="font-normal text-ink-2">
              „{current.steps[allProgress[current.id].currentStep]?.title ?? current.steps[0].title}“
            </span>
          </p>
          <div className="mt-4 flex items-center gap-4">
            <ProgressBar
              className="flex-1"
              value={allProgress[current.id].stepsDone.length}
              max={current.steps.length}
              label={`${allProgress[current.id].stepsDone.length} von ${current.steps.length} Schritten`}
            />
            <span className="font-mono text-xs text-ink-2">
              Schritt {allProgress[current.id].currentStep + 1}/{current.steps.length} · noch ~
              {remainingMinutes(current, allProgress[current.id])} min
            </span>
          </div>
          <Link
            to={`/projekt/${current.id}/schritt/${allProgress[current.id].currentStep + 1}`}
            className={`mt-5 ${buttonClass()}`}
          >
            Weiter ›
          </Link>
        </section>
      ) : (
        <Hero />
      )}

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {due.length >= 1 && (
          <section aria-label="Auffrischen" className="bl-einzeichnen bl-einzeichnen-d1 rounded border border-black/10 bg-paper-2 p-4 shadow">
            <h2 className="font-display">Auffrischen <span className="font-mono text-xs text-ink-2">({due.length} fällig)</span></h2>
            <p className="mt-1 text-sm text-ink-2">
              {due.slice(0, 3).map((id) => conceptById.get(id)?.name ?? id).join(' · ')}
            </p>
            <Link to="/training" className={`mt-3 ${buttonClass({ variant: 'secondary' })}`}>
              Üben →
            </Link>
          </section>
        )}

        {!nextSectionEmpty || !heroShown ? (
        <section aria-label="Als Nächstes" className="bl-einzeichnen bl-einzeichnen-d2 rounded border border-black/10 bg-paper-2 p-4 shadow">
          <h2 className="font-display">Als Nächstes</h2>
          <ul className="mt-2 space-y-2">
            {nextShown && (
              <li>
                <Link to={`/projekt/${nextShown.id}`} className="group flex min-h-11 items-center gap-3 rounded px-1 outline-none focus-visible:ring-2 focus-visible:ring-accent">
                  <span aria-hidden className="font-mono">{nextShown.icon}</span>
                  <span className="group-hover:underline">{nextShown.title}</span>
                  <StatusBadge tone="accent" className="ml-auto uppercase tracking-wider">
                    empfohlen
                  </StatusBadge>
                </Link>
              </li>
            )}
            {done.slice(0, 2).map((p) => (
              <li key={p.id}>
                <Link to={`/projekt/${p.id}`} className="group flex min-h-11 items-center gap-3 rounded px-1 outline-none focus-visible:ring-2 focus-visible:ring-accent">
                  <span aria-hidden className="font-mono">{p.icon}</span>
                  <span className="text-ink-2 group-hover:underline">{p.title}</span>
                  <span className="ml-auto font-mono text-xs text-ok">✓ fertig</span>
                </Link>
              </li>
            ))}
            {!nextShown && done.length === 0 && (
              <li className="text-sm text-ink-faint">
                {current
                  ? `Mach erst „${current.title}“ fertig — danach gibt's hier Nachschub.`
                  : 'Noch keine Empfehlung — starte ein Projekt.'}
              </li>
            )}
          </ul>
        </section>
        ) : null}
      </div>
    </div>
  );

  function Hero() {
    const start = personaStartProject(settings?.persona);
    const p = projectById.get(start.id)!;
    return (
      <section aria-label="Dein erstes Projekt" className="bl-einzeichnen rounded-lg border border-black/10 bg-paper-2 p-6 shadow">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">
          <span aria-hidden className="mr-2 inline-block h-2.5 w-0.5 bg-accent align-[-2px]" />
          Dein erstes Projekt
        </p>
        <p className="mt-2 font-display text-display-sm text-ink-strong md:text-display-xl">
          <span aria-hidden className="mr-2">{p.icon}</span>{p.title}
        </p>
        {/* Tuschestrich (DESIGN.md §2): der eine Marken-Akzent unter der Hero-Zeile. */}
        <span aria-hidden className="mt-3 block h-[3px] w-12 bg-accent" />
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-2">{p.challenge}</p>
        <div className="mt-5 flex items-center gap-4">
          <Link to={`/projekt/${p.id}/schritt/1`} className={buttonClass()}>
            Los geht's →
          </Link>
          <Link to="/projekte" className="min-h-11 content-center text-sm text-ink-2 underline decoration-black/20 underline-offset-4 outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-accent">
            alle Projekte ansehen
          </Link>
        </div>
      </section>
    );
  }
}
