// ChallengeCheck — der Nachweis am Meilenstein, gerechnet mit DEN WERTEN,
// die der Lernende wirklich gebaut hat.
//
// Bisher rechneten alle Meilensteine mit fest verdrahteten Autor-Zahlen und
// behaupteten trotzdem „die Engine bestätigt deine Auslegung". Wer anders baute,
// bekam die Autor-Werte vorgesetzt — die einzige Stelle, an der die App den
// Lernenden anlog, ausgerechnet an ihrem emotionalen Höhepunkt.
//
// Hier werden stattdessen die Constraints des Bau-Blocks über den gespeicherten
// Bauwerten ausgewertet (SCREENS.md §6.3 „Anforderungsliste"). Es braucht dafür
// keine Schema-Erweiterung: Der Bau-Block trägt die Anforderungen bereits, und
// seine Beweispaare sind vom Verifier geprüft. Ohne gespeicherten Bau greift die
// Autor-Referenz — sichtbar als solche gekennzeichnet.

import { useMemo } from 'react';
import { evaluateExpr } from '@buildlab/engine';
import type { BuildBlock, Project } from '../types';

export interface ChallengeCheckProps {
  project: Project;
  /** Parameter des jüngsten gespeicherten Baus; fehlt er, gilt die Referenz. */
  buildParams?: Record<string, number> | null;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 }).format(n);

export interface ChallengeResult {
  /** Es gibt überhaupt einen Nachweis (Projekt hat einen Bau-Block mit Anforderungen). */
  vorhanden: boolean;
  /** Alle Anforderungen erfüllt. */
  ok: boolean;
  /** Es wurde mit den eigenen Bauwerten gerechnet (statt mit der Referenz). */
  eigen: boolean;
  zeilen: { label: string; ok: boolean }[];
  werte: Record<string, number> | null;
  build: BuildBlock | null;
}

/**
 * Wertet die Anforderungen des Bau-Blocks über den gespeicherten Bauwerten aus.
 * Getrennt von der Darstellung, damit auch der Meilenstein-Abschluss dieselbe
 * Wahrheit benutzt — er darf nicht „Steht." feiern, während der Nachweis rot ist.
 */
export function evaluateChallenge(
  project: Project,
  buildParams?: Record<string, number> | null,
): ChallengeResult {
  const build = findBuildBlock(project);
  if (!build) return { vorhanden: false, ok: true, eigen: false, zeilen: [], werte: null, build: null };

  const defaults = Object.fromEntries(
    Object.entries(build.parameters).map(([k, c]) => [k, c.default]),
  );
  const passend = buildParams
    ? Object.fromEntries(
        Object.keys(defaults)
          .filter((k) => typeof buildParams[k] === 'number')
          .map((k) => [k, buildParams[k]]),
      )
    : {};
  const eigen = Object.keys(passend).length === Object.keys(defaults).length;
  const werte = (eigen ? passend : defaults) as Record<string, number>;

  const zeilen = (build.constraints ?? []).map((c) => {
    try {
      return { label: c.label, ok: evaluateExpr(c.expr, werte) === true };
    } catch {
      return { label: c.label, ok: false };
    }
  });

  return {
    vorhanden: zeilen.length > 0,
    ok: zeilen.every((z) => z.ok),
    eigen,
    zeilen,
    werte,
    build,
  };
}

function findBuildBlock(project: Project): BuildBlock | null {
  for (const step of project.steps) {
    for (const block of step.blocks) {
      if (block.type === 'build') return block as BuildBlock;
    }
  }
  return null;
}

export function ChallengeCheck({ project, buildParams }: ChallengeCheckProps) {
  const { vorhanden, ok: allesOk, eigen, zeilen, werte, build } = useMemo(
    () => evaluateChallenge(project, buildParams),
    [project, buildParams],
  );

  if (!vorhanden || !build || !werte) return null;

  return (
    <section className="rounded border border-black/10 bg-paper-2 p-4 shadow">
      <h3 className="font-display text-title text-ink">Der Nachweis</h3>
      <p className="mt-1 text-sm text-ink-2">
        {eigen
          ? 'Die Engine rechnet die Anforderungen der Challenge mit deinen Bauwerten durch:'
          : 'Sobald du im Bau-Schritt ein STL herunterlädst, rechnet die Engine diese Anforderungen mit deinen Werten durch:'}
      </p>

      <ul className="mt-3 space-y-1" aria-label="Nachweis der Challenge">
        {zeilen.map((z, i) => (
          <li
            key={i}
            className={`flex items-start gap-2 font-mono text-sm ${
              !eigen ? 'text-ink-2' : z.ok ? 'text-ok' : 'text-fehl'
            }`}
          >
            <span aria-hidden className="mt-px">
              {!eigen ? '·' : z.ok ? '✓' : '✗'}
            </span>
            <span className="text-ink-2">{z.label}</span>
          </li>
        ))}
      </ul>

      {eigen && (
        <p className="mt-3 border-t border-black/10 pt-2 font-mono text-xs text-ink-faint">
          deine Werte:{' '}
          {Object.entries(werte)
            .map(([k, v]) => `${build.parameters[k]?.label ?? k} = ${fmt(v)}`)
            .join(' · ')}
        </p>
      )}

      {eigen && !allesOk && (
        <p className="mt-2 text-sm text-fehl">
          Eine Anforderung ist noch offen. Geh zurück in den Bau-Schritt und stell nach — die
          rote Zeile sagt dir, woran es liegt.
        </p>
      )}
    </section>
  );
}
