// src/screens/ProjectDetail.tsx — Briefing vor dem Start (SCREENS.md §5.2):
// Challenge, Konzept-Chips, Schrittliste, Soft-Lock-Hinweiskasten, CTA.

import { Link, useNavigate, useParams } from 'react-router-dom';
import { conceptById, missingPrerequisites, projectById } from '../content';
import { useAllProgress } from '../db/repo';

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const allProgress = useAllProgress();
  const project = id ? projectById.get(id) : undefined;

  if (!project) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <p className="font-display text-xl">Hier ist nichts gezeichnet.</p>
        <Link to="/projekte" className="mt-4 inline-block min-h-11 content-center text-sm text-accent-ink underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-accent">
          zu den Projekten
        </Link>
      </div>
    );
  }
  if (!allProgress) return <div className="p-8 font-mono text-sm text-ink-faint">lädt …</div>;

  const progress = allProgress[project.id];
  const missing = missingPrerequisites(project, allProgress);
  const missingConcepts = missing
    .flatMap((p) => p.conceptsIntroduced ?? [])
    .map((c) => conceptById.get(c)?.name ?? c)
    .slice(0, 3);
  const nextStep = (progress?.currentStep ?? 0) + 1;
  const done = new Set(progress?.stepsDone ?? []);

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">Niveau {project.level}</p>
      <h1 className="mt-1 font-display text-3xl">
        <span aria-hidden className="mr-3 font-mono">{project.icon}</span>
        {project.title}
      </h1>
      <p className="mt-2 font-mono text-xs text-ink-2">
        ~{project.durationMin ?? '?'} min · {project.steps.length} Schritte
      </p>

      <section aria-label="Deine Challenge" className="mt-6 rounded border border-black/10 bg-paper-2 p-5 shadow">
        <h2 className="font-mono text-xs uppercase tracking-widest text-ink-2">Deine Challenge</h2>
        <p className="mt-2 font-display text-lg leading-snug">„{project.challenge}“</p>
        <p className="mt-3 text-sm text-ink-2">
          <span className="font-mono text-xs uppercase tracking-wider text-ink-faint">Du baust: </span>
          {project.buildResult}
        </p>
        {(project.conceptsIntroduced?.length ?? 0) > 0 && (
          <p className="mt-2 flex flex-wrap items-center gap-1.5 text-sm">
            <span className="font-mono text-xs uppercase tracking-wider text-ink-faint">Du lernst:</span>
            {project.conceptsIntroduced!.map((c) => (
              <Link
                key={c}
                to={`/konzept/${c}`}
                className="rounded border border-black/10 bg-paper px-2 py-0.5 text-xs text-accent-ink outline-none hover:border-ink-2 focus-visible:ring-2 focus-visible:ring-accent"
              >
                {conceptById.get(c)?.name ?? c}
              </Link>
            ))}
          </p>
        )}
      </section>

      {missing.length > 0 && !progress && (
        <section
          aria-label="Hinweis zu Voraussetzungen"
          className="mt-4 rounded border border-black/10 bg-paper-sink p-4"
        >
          <p className="text-sm">
            <span className="font-mono text-xs uppercase tracking-wider text-[color:var(--viz-mid)]">⚠ </span>
            Dir fehlen noch: <strong>{missingConcepts.join(' · ') || missing.map((m) => m.title).join(' · ')}</strong> — ein
            paar Minuten in „{missing[0].title}“, oder du legst direkt los und holst es unterwegs nach.
          </p>
          <div className="mt-3 flex gap-3">
            <Link
              to={`/projekt/${missing[0].id}`}
              className="inline-flex min-h-11 items-center rounded border border-black/10 px-4 text-sm outline-none hover:border-ink-2 focus-visible:ring-2 focus-visible:ring-accent active:translate-y-px"
            >
              Erst auffrischen
            </Link>
            <button
              onClick={() => navigate(`/projekt/${project.id}/schritt/1`)}
              className="inline-flex min-h-11 items-center rounded bg-accent px-4 text-sm text-paper outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper active:translate-y-px"
            >
              Trotzdem starten
            </button>
          </div>
        </section>
      )}

      <section aria-label="Schritte" className="mt-6">
        <h2 className="mb-2 font-mono text-xs uppercase tracking-widest text-ink-2">Schritte</h2>
        <ol className="space-y-1">
          {project.steps.map((s, i) => {
            const reachable = progress && i <= progress.maxStepReached;
            const row = (
              <>
                <span className="w-6 text-right font-mono text-xs text-ink-faint">{i + 1}</span>
                <span className={done.has(s.id) ? 'text-ink-2' : ''}>{s.title}</span>
                {done.has(s.id) && <span className="ml-auto font-mono text-xs text-[color:var(--viz-low)]">✓</span>}
                {progress && i === progress.currentStep && !progress.completedAt && (
                  <span className="ml-auto font-mono text-xs text-accent-ink">▸ aktuell</span>
                )}
              </>
            );
            return (
              <li key={s.id}>
                {reachable ? (
                  <Link
                    to={`/projekt/${project.id}/schritt/${i + 1}`}
                    className="flex min-h-10 items-center gap-3 rounded px-2 outline-none hover:bg-paper-2 focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    {row}
                  </Link>
                ) : (
                  <span className="flex min-h-10 items-center gap-3 px-2 text-ink-2">{row}</span>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      {(missing.length === 0 || progress) && (
        <Link
          to={`/projekt/${project.id}/schritt/${nextStep}`}
          className="mt-6 inline-flex min-h-11 items-center rounded bg-accent px-6 text-sm text-paper outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper active:translate-y-px"
        >
          {progress ? (progress.completedAt ? 'Nochmal ansehen →' : 'Fortsetzen →') : 'Starten →'}
        </Link>
      )}
    </div>
  );
}
