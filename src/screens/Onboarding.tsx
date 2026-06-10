// src/screens/Onboarding.tsx — Drei Schritte, < 60 s, überspringbar
// (SCREENS.md §3). Schreibt persona/depth/onboardingDone und startet das
// empfohlene Projekt.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { personaStartProject } from '../content';
import { setSetting } from '../db/repo';
import type { Depth, Persona } from '../db/types';

const PERSONAS: { id: Persona; title: string; sub: string }[] = [
  { id: 'studium', title: 'Studium verstehen', sub: 'Klausuren knacken, Statik & Co. wirklich begreifen' },
  { id: 'azubi', title: 'Technik / Azubi', sub: 'Werkstatt-Wissen mit schnellen Erfolgen' },
  { id: 'maker', title: 'Bauen / Maker', sub: 'Sofort etwas Druckbares in der Hand' },
];

const DEPTHS: { id: Depth; label: string; sample: string }[] = [
  { id: 'playful', label: 'verspielt', sample: 'Zwei Zahnräder, ein Tauschgeschäft: Tempo gegen Kraft. Wie viel getauscht wird, verraten dir die Zähnezahlen.' },
  { id: 'practical', label: 'praxis', sample: 'Die Übersetzung i liest du direkt aus den Zähnezahlen ab: i = z₂/z₁. Bei i = 3 dreht der Abtrieb dreimal langsamer.' },
  { id: 'rigorous', label: 'genau', sample: 'Am Eingriffspunkt gilt z₁·n₁ = z₂·n₂, also i = n₁/n₂ = z₂/z₁. Mit P = M·ω folgt M₂ = M₁·i·η.' },
];

const PERSONA_DEPTH: Record<Persona, Depth> = {
  studium: 'practical',
  azubi: 'practical',
  maker: 'playful',
};

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [persona, setPersona] = useState<Persona | null>(null);
  const [depth, setDepth] = useState<Depth>('practical');

  const start = personaStartProject(persona ?? undefined);

  const finish = async (target: string) => {
    if (persona) await setSetting('persona', persona);
    await setSetting('depth', depth);
    await setSetting('onboardingDone', true);
    navigate(target);
  };

  return (
    <div className="mm-grid flex min-h-screen items-center justify-center bg-paper px-6 font-body text-ink">
      <div className="w-full max-w-2xl">
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-ink-faint">
          Schritt {step + 1} / 3
        </p>

        {step === 0 && (
          <section aria-labelledby="ob-h1">
            <h1 id="ob-h1" className="mb-6 font-display text-2xl">Worauf hast du Lust?</h1>
            <div className="grid gap-3 md:grid-cols-3">
              {PERSONAS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setPersona(p.id);
                    setDepth(PERSONA_DEPTH[p.id]);
                    setStep(1);
                  }}
                  className="rounded border border-black/10 bg-paper-2 p-4 text-left shadow outline-none transition hover:border-ink-2 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper active:translate-y-px"
                >
                  <span className="font-display text-lg">{p.title}</span>
                  <span className="mt-1 block text-sm text-ink-2">{p.sub}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {step === 1 && (
          <section aria-labelledby="ob-h2">
            <h1 id="ob-h2" className="mb-6 font-display text-2xl">Wie soll Buildlab mit dir reden?</h1>
            <div className="mb-4 inline-flex rounded border border-black/10" role="radiogroup" aria-label="Erklärtiefe">
              {DEPTHS.map((d) => (
                <button
                  key={d.id}
                  role="radio"
                  aria-checked={depth === d.id}
                  onClick={() => setDepth(d.id)}
                  className={`min-h-11 px-4 py-2 text-sm outline-none first:rounded-l last:rounded-r focus-visible:ring-2 focus-visible:ring-accent ${
                    depth === d.id ? 'bg-accent text-paper' : 'bg-paper-2 text-ink-2 hover:text-ink'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <blockquote className="rounded border border-black/10 bg-paper-2 p-4 text-sm leading-relaxed shadow">
              „{DEPTHS.find((d) => d.id === depth)!.sample}“
            </blockquote>
            <p className="mt-2 text-xs text-ink-faint">Du kannst das jederzeit umstellen — global in den Einstellungen, lokal an jedem Text.</p>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setStep(2)}
                className="min-h-11 rounded bg-accent px-5 text-sm text-paper outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper active:translate-y-px"
              >
                Weiter ›
              </button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section aria-labelledby="ob-h3">
            <h1 id="ob-h3" className="mb-6 font-display text-2xl">Dein erstes Projekt</h1>
            <div className="rounded border border-black/10 bg-paper-2 p-5 shadow">
              <p className="font-display text-xl">
                <span aria-hidden className="mr-2">{start.icon}</span>
                {start.title}
              </p>
              <p className="mt-2 text-sm text-ink-2">{start.buildResult}</p>
              <p className="mt-1 font-mono text-xs text-ink-faint">~{start.durationMin ?? 45} min</p>
              <button
                onClick={() => finish(`/projekt/${start.id}/schritt/1`)}
                className="mt-4 min-h-11 w-full rounded bg-accent px-5 text-sm text-paper outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper active:translate-y-px"
              >
                Los geht's →
              </button>
            </div>
            <button
              onClick={() => finish('/projekte')}
              className="mt-3 min-h-11 text-sm text-ink-2 underline decoration-black/20 underline-offset-4 outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-accent"
            >
              lieber selbst aussuchen
            </button>
          </section>
        )}

        <div className="mt-8">
          <button
            onClick={() => finish('/')}
            className="min-h-11 text-xs text-ink-faint underline decoration-black/20 underline-offset-4 outline-none hover:text-ink-2 focus-visible:ring-2 focus-visible:ring-accent"
          >
            Erstmal umsehen →
          </button>
        </div>
      </div>
    </div>
  );
}
