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

function findBuildBlock(project: Project): BuildBlock | null {
  for (const step of project.steps) {
    for (const block of step.blocks) {
      if (block.type === 'build') return block as BuildBlock;
    }
  }
  return null;
}

export function ChallengeCheck({ project, buildParams }: ChallengeCheckProps) {
  const build = useMemo(() => findBuildBlock(project), [project]);

  const { werte, eigen } = useMemo(() => {
    if (!build) return { werte: null as Record<string, number> | null, eigen: false };
    const defaults = Object.fromEntries(
      Object.entries(build.parameters).map(([k, c]) => [k, c.default]),
    );
    // Nur Parameter übernehmen, die der Bau-Block überhaupt kennt — ein alter
    // Bau mit anderen Feldern darf die Auswertung nicht kippen.
    const passend = buildParams
      ? Object.fromEntries(
          Object.keys(defaults)
            .filter((k) => typeof buildParams[k] === 'number')
            .map((k) => [k, buildParams[k]]),
        )
      : {};
    const vollstaendig = Object.keys(passend).length === Object.keys(defaults).length;
    return {
      werte: vollstaendig ? (passend as Record<string, number>) : defaults,
      eigen: vollstaendig,
    };
  }, [build, buildParams]);

  const zeilen = useMemo(() => {
    if (!build || !werte) return [];
    return (build.constraints ?? []).map((c) => {
      try {
        return { label: c.label, ok: evaluateExpr(c.expr, werte) === true };
      } catch {
        return { label: c.label, ok: false };
      }
    });
  }, [build, werte]);

  if (!build || !werte || zeilen.length === 0) return null;

  const allesOk = zeilen.every((z) => z.ok);

  return (
    <section className="rounded border border-black/10 bg-paper-2 p-4 shadow">
      <h3 className="font-display text-title text-ink">Der Nachweis</h3>
      <p className="mt-1 text-sm text-ink-2">
        {eigen
          ? 'Die Engine rechnet die Anforderungen der Challenge mit deinen Bauwerten durch:'
          : 'Du hast noch nichts gebaut — hier steht die Referenz-Auslegung. Bau deine eigene, und der Nachweis rechnet mit deinen Werten.'}
      </p>

      <ul className="mt-3 space-y-1" aria-label="Nachweis der Challenge">
        {zeilen.map((z, i) => (
          <li
            key={i}
            className={`flex items-start gap-2 font-mono text-sm ${z.ok ? 'text-ok' : 'text-fehl'}`}
          >
            <span aria-hidden className="mt-px">
              {z.ok ? '✓' : '✗'}
            </span>
            <span className="text-ink-2">{z.label}</span>
          </li>
        ))}
      </ul>

      <p className="mt-3 border-t border-black/10 pt-2 font-mono text-xs text-ink-faint">
        {eigen ? 'deine Werte: ' : 'Referenz: '}
        {Object.entries(werte)
          .map(([k, v]) => `${build.parameters[k]?.label ?? k} = ${fmt(v)}`)
          .join(' · ')}
      </p>

      {!allesOk && (
        <p className="mt-2 text-sm text-fehl">
          Eine Anforderung ist noch offen. Geh zurück in den Bau-Schritt und stell nach — die
          rote Zeile sagt dir, woran es liegt.
        </p>
      )}
    </section>
  );
}
