// src/screens/ProjectDetail.tsx — Briefing vor dem Start (SCREENS.md §5.2):
// Challenge, Konzept-Chips, Schrittliste, Soft-Lock-Hinweiskasten, CTA.

import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Collapse, ScreenSkeleton, StatusBadge, buttonClass } from '@buildlab/ui';
import { conceptById, missingPrerequisites, projectById } from '../content';
import { useAllProgress } from '../db/repo';

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const allProgress = useAllProgress();
  const project = id ? projectById.get(id) : undefined;
  // Schrittliste: erledigt + aktuell + nächster sichtbar, Rest auf Wunsch
  // (SCREENS.md §5.2 — nur zeigen, was gerade wichtig ist).
  const [showAllSteps, setShowAllSteps] = useState(false);

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
  if (!allProgress) return <ScreenSkeleton layout="detail" />;

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
      <h1 className="font-display text-display-sm text-ink-strong md:text-display">
        <span aria-hidden className="mr-3 font-mono">{project.icon}</span>
        {project.title}
      </h1>
      <p className="mt-2 font-mono text-xs text-ink-2">
        Niveau {project.level} · ~{project.durationMin ?? '?'} min · {project.steps.length} Schritte
      </p>

      <section aria-label="Deine Challenge" className="bl-einzeichnen mt-6 rounded border border-black/10 bg-paper-2 p-5 shadow">
        <h2 className="font-mono text-xs uppercase tracking-widest text-ink-2">
          <span aria-hidden className="mr-2 inline-block h-2.5 w-0.5 bg-accent align-[-2px]" />
          Deine Challenge
        </h2>
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
                className="rounded-sm border border-black/10 bg-paper px-2 py-0.5 text-xs text-accent-ink outline-none transition-colors hover:border-rule-strong focus-visible:ring-2 focus-visible:ring-accent"
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
          className="mt-4 rounded border border-black/10 border-l-4 border-l-warn bg-paper-2 p-4 shadow"
        >
          <StatusBadge tone="warn">Voraussetzung offen</StatusBadge>
          <p className="mt-2 text-sm leading-relaxed">
            Dir fehlen noch: <strong>{missingConcepts.join(' · ') || missing.map((m) => m.title).join(' · ')}</strong> — ein
            paar Minuten in „{missing[0].title}“, oder du legst direkt los und holst es unterwegs nach.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link to={`/projekt/${missing[0].id}`} className={buttonClass({ variant: 'secondary' })}>
              Erst auffrischen
            </Link>
            <button
              onClick={() => navigate(`/projekt/${project.id}/schritt/1`)}
              className={buttonClass()}
            >
              Trotzdem starten
            </button>
          </div>
        </section>
      )}

      <section aria-label="Schritte" className="bl-einzeichnen bl-einzeichnen-d1 mt-6">
        <h2 className="mb-2 font-mono text-xs uppercase tracking-widest text-ink-2">
          <span aria-hidden className="mr-2 inline-block h-2.5 w-0.5 bg-accent align-[-2px]" />
          Schritte
        </h2>
        {(() => {
          const lastVisible = progress ? progress.maxStepReached + 1 : 2;
          const renderStep = (s: (typeof project.steps)[number], i: number) => {
            const reachable = progress && i <= progress.maxStepReached;
            const row = (
              <>
                <span className="w-6 text-right font-mono text-xs text-ink-faint">{i + 1}</span>
                <span className={done.has(s.id) ? 'text-ink-2' : ''}>{s.title}</span>
                {done.has(s.id) && <span className="ml-auto font-mono text-xs text-ok">✓</span>}
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
          };
          const rest = project.steps.slice(lastVisible + 1);
          return (
            <>
              <ol className="space-y-1">
                {project.steps.slice(0, lastVisible + 1).map((s, i) => renderStep(s, i))}
              </ol>
              {rest.length > 0 && (
                <>
                  <Collapse open={showAllSteps} id="schrittliste-rest">
                    <ol className="space-y-1 pt-1">
                      {rest.map((s, i) => renderStep(s, lastVisible + 1 + i))}
                    </ol>
                  </Collapse>
                  <button
                    type="button"
                    onClick={() => setShowAllSteps((v) => !v)}
                    aria-expanded={showAllSteps}
                    aria-controls="schrittliste-rest"
                    className="mt-1 inline-flex min-h-11 items-center px-2 font-mono text-xs text-accent-ink outline-none hover:underline focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    {showAllSteps ? 'weniger anzeigen' : `alle ${project.steps.length} Schritte anzeigen ›`}
                  </button>
                </>
              )}
            </>
          );
        })()}
      </section>

      {(missing.length === 0 || progress) && (
        <Link to={`/projekt/${project.id}/schritt/${nextStep}`} className={`mt-6 ${buttonClass()}`}>
          {progress ? (progress.completedAt ? 'Nochmal ansehen →' : 'Fortsetzen →') : 'Starten →'}
        </Link>
      )}
    </div>
  );
}
