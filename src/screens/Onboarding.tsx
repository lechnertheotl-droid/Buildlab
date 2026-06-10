// src/screens/Onboarding.tsx — Drei Schritte, < 60 s, überspringbar
// (SCREENS.md §3). Schreibt persona/depth/onboardingDone und startet das
// empfohlene Projekt.

import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, SegmentedControl, cardClass, focusRing } from '@buildlab/ui';
import { personaStartProject } from '../content';
import { setSetting } from '../db/repo';
import type { Depth, Persona } from '../db/types';

// Kleine Iso-Doodles je Tür (DESIGN.md §6: dieselbe Linien-Sprache wie die Bühnen).
const DOODLES: Record<Persona, ReactNode> = {
  studium: (
    <svg viewBox="0 0 24 24" className="h-8 w-8" aria-hidden="true">
      <polygon points="5,19 19,19 19,7" fill="none" stroke="var(--ink-2)" strokeWidth="1.2" />
      <line x1="5" y1="19" x2="19" y2="7" stroke="var(--accent)" strokeWidth="1.2" />
      <line x1="9" y1="19" x2="9" y2="16.5" stroke="var(--ink-faint)" strokeWidth="1" />
      <line x1="13" y1="19" x2="13" y2="13.5" stroke="var(--ink-faint)" strokeWidth="1" />
    </svg>
  ),
  azubi: (
    <svg viewBox="0 0 24 24" className="h-8 w-8" aria-hidden="true">
      <circle cx="12" cy="12" r="6" fill="none" stroke="var(--ink-2)" strokeWidth="1.2" />
      <circle cx="12" cy="12" r="2" fill="none" stroke="var(--accent)" strokeWidth="1.2" />
      {[0, 60, 120, 180, 240, 300].map((a) => (
        <line
          key={a}
          x1={12 + 6 * Math.cos((a * Math.PI) / 180)}
          y1={12 + 6 * Math.sin((a * Math.PI) / 180)}
          x2={12 + 8 * Math.cos((a * Math.PI) / 180)}
          y2={12 + 8 * Math.sin((a * Math.PI) / 180)}
          stroke="var(--ink-2)"
          strokeWidth="1.2"
        />
      ))}
    </svg>
  ),
  maker: (
    <svg viewBox="0 0 24 24" className="h-8 w-8" aria-hidden="true">
      <polygon points="12,4 20,8 12,12 4,8" fill="none" stroke="var(--accent)" strokeWidth="1.2" />
      <polygon points="4,8 12,12 12,20 4,16" fill="none" stroke="var(--ink-2)" strokeWidth="1.2" />
      <polygon points="20,8 12,12 12,20 20,16" fill="none" stroke="var(--ink-2)" strokeWidth="1.2" />
    </svg>
  ),
};

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
            <h1 id="ob-h1" className="mb-6 font-display text-display-sm text-ink-strong">
              Worauf hast du Lust?
            </h1>
            <div className="grid gap-3 md:grid-cols-3">
              {PERSONAS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setPersona(p.id);
                    setDepth(PERSONA_DEPTH[p.id]);
                    setStep(1);
                  }}
                  className={`${cardClass()} ${focusRing} text-left transition hover:-translate-y-px hover:border-rule-strong active:translate-y-px`}
                >
                  {DOODLES[p.id]}
                  <span className="mt-2 block font-display text-lg font-semibold text-ink">
                    {p.title}
                  </span>
                  <span className="mt-1 block text-sm text-ink-2">{p.sub}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {step === 1 && (
          <section aria-labelledby="ob-h2">
            <h1 id="ob-h2" className="mb-6 font-display text-display-sm text-ink-strong">
              Wie soll Buildlab mit dir reden?
            </h1>
            <div className="mb-4">
              <SegmentedControl
                value={depth}
                onChange={setDepth}
                options={DEPTHS.map(({ id, label }) => ({ id, label }))}
                ariaLabel="Erklärtiefe"
              />
            </div>
            <blockquote
              key={depth}
              className="bl-wechsel rounded border border-black/10 bg-paper-2 p-4 text-sm leading-relaxed shadow"
            >
              „{DEPTHS.find((d) => d.id === depth)!.sample}“
            </blockquote>
            <p className="mt-2 text-xs text-ink-faint">Du kannst das jederzeit umstellen — global in den Einstellungen, lokal an jedem Text.</p>
            <div className="mt-6 flex justify-end">
              <Button onClick={() => setStep(2)}>Weiter ›</Button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section aria-labelledby="ob-h3">
            <h1 id="ob-h3" className="mb-6 font-display text-display-sm text-ink-strong">
              Dein erstes Projekt
            </h1>
            <div className="rounded-lg border border-black/10 bg-paper-2 p-6 shadow">
              <p className="font-display text-title text-ink-strong">
                <span aria-hidden className="mr-2">{start.icon}</span>
                {start.title}
              </p>
              <p className="mt-2 text-sm text-ink-2">{start.buildResult}</p>
              <p className="mt-1 font-mono text-xs text-ink-faint">~{start.durationMin ?? 45} min</p>
              <Button className="mt-4 w-full" onClick={() => finish(`/projekt/${start.id}/schritt/1`)}>
                Los geht's →
              </Button>
            </div>
            <button
              onClick={() => finish('/projekte')}
              className={`mt-3 min-h-11 text-sm text-ink-2 underline decoration-black/20 underline-offset-4 hover:text-ink ${focusRing}`}
            >
              lieber selbst aussuchen
            </button>
          </section>
        )}

        <div className="mt-8">
          <button
            onClick={() => finish('/')}
            className={`min-h-11 text-xs text-ink-faint underline decoration-black/20 underline-offset-4 hover:text-ink-2 ${focusRing}`}
          >
            Erstmal umsehen →
          </button>
        </div>
      </div>
    </div>
  );
}
