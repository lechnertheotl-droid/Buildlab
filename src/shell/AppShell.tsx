// src/shell/AppShell.tsx — Globales Gerüst (SCREENS.md §2): Rail links
// (mobile: Bottom-Bar), Topbar mit Breadcrumb + Mastery-Ring, Rechner-Lasche
// rechts (CalculatorDrawer), Inhalt als <Outlet/>.

import { useEffect } from 'react';
import { NavLink, Navigate, Outlet, useLocation, useMatches } from 'react-router-dom';
import { CalculatorDrawer, ContentProvider, type Concept, type Formula } from '@buildlab/ui';
import { componentIds, concepts, formulas } from '../content';
import { addCalcEntry, useCalcHistory, useConceptStates, useSettings, isDbHealthy } from '../db/repo';
import {
  IconEinstellungen, IconKarte, IconProjekte, IconStart, IconTraining, IconWerkstatt,
} from './icons';

const NAV = [
  { to: '/', label: 'Start', icon: IconStart, end: true },
  { to: '/karte', label: 'Karte', icon: IconKarte },
  { to: '/projekte', label: 'Projekte', icon: IconProjekte },
  { to: '/werkstatt', label: 'Werkstatt', icon: IconWerkstatt },
  { to: '/training', label: 'Training', icon: IconTraining },
];

function MasteryRing() {
  const states = useConceptStates();
  const total = concepts.length;
  const mastered = states
    ? Object.values(states).filter((s) => s.status === 'angewendet' || s.status === 'sicher').length
    : 0;
  const pct = total ? Math.round((mastered / total) * 100) : 0;
  const r = 9;
  const c = 2 * Math.PI * r;
  return (
    <div
      className="flex items-center gap-2"
      role="img"
      aria-label={`Gesamtfortschritt ${pct} Prozent der Konzepte angewendet`}
      title="Anteil der Konzepte, die du schon angewendet hast"
    >
      <svg viewBox="0 0 24 24" className="h-6 w-6 -rotate-90">
        <circle cx="12" cy="12" r={r} fill="none" stroke="var(--rule)" strokeWidth="3" />
        <circle
          cx="12" cy="12" r={r} fill="none" stroke="var(--accent)" strokeWidth="3"
          strokeDasharray={`${(pct / 100) * c} ${c}`} strokeLinecap="round"
        />
      </svg>
      <span className="font-mono text-xs text-ink-2">{pct} %</span>
    </div>
  );
}

interface Crumb {
  crumb?: string;
}

export default function AppShell() {
  const settings = useSettings();
  const location = useLocation();
  const matches = useMatches();

  // App-Einstellung „Animationen reduzieren" ODER-verknüpft mit der
  // System-Präferenz (DESIGN.md §7): CSS-Hebel ist html.bl-reduced-motion.
  useEffect(() => {
    document.documentElement.classList.toggle('bl-reduced-motion', !!settings?.reducedMotion);
  }, [settings?.reducedMotion]);
  const crumb = matches
    .map((m) => (m.handle as Crumb | undefined)?.crumb)
    .filter(Boolean)
    .slice(-1)[0];

  if (settings && !settings.onboardingDone && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `group relative flex h-12 w-12 items-center justify-center rounded text-ink-2 outline-none transition-colors
     hover:text-ink focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper
     md:h-11 md:w-full md:justify-start md:gap-3 md:px-3
     ${isActive ? 'text-ink before:absolute before:left-0 before:top-2 before:hidden before:h-7 before:w-0.5 before:bg-accent md:before:block' : ''}`;

  return (
    // ContentProvider umschließt die GANZE Shell: der Rechner (useContent)
    // muss auf jedem Screen funktionieren, nicht nur im Workspace.
    <ContentProvider
      formulas={formulas as unknown as Formula[]}
      concepts={concepts as unknown as Concept[]}
      componentIds={componentIds}
    >
    <div className="mm-grid flex min-h-screen flex-col bg-paper font-body text-ink antialiased md:flex-row">
      {/* Rail (Desktop) */}
      <nav
        aria-label="Hauptnavigation"
        className="fixed bottom-0 left-0 right-0 z-40 hidden border-t border-black/10 bg-paper-2 md:static md:flex md:w-44 md:flex-col md:gap-1 md:border-r md:border-t-0 md:px-2 md:py-4"
      >
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={navClass}>
            <Icon className="h-5 w-5 shrink-0" />
            <span className="hidden text-sm md:inline">{label}</span>
          </NavLink>
        ))}
        <div className="mt-auto hidden md:block">
          <NavLink to="/einstellungen" className={navClass}>
            <IconEinstellungen className="h-5 w-5 shrink-0" />
            <span className="hidden text-sm md:inline">Einstellungen</span>
          </NavLink>
        </div>
      </nav>

      <div className="flex min-w-0 flex-1 flex-col pb-16 md:pb-0">
        {/* Topbar */}
        <header className="flex h-12 items-center justify-between border-b border-black/10 px-4">
          <div className="min-w-0 truncate font-display text-sm text-ink-2">
            {crumb ?? 'Buildlab'}
          </div>
          <div className="flex items-center gap-3">
            {!isDbHealthy() && (
              <span className="rounded border border-black/10 bg-paper-sink px-2 py-0.5 font-mono text-xs text-[color:var(--viz-high)]">
                Konnte nicht speichern — Speicher voll?
              </span>
            )}
            <MasteryRing />
            <NavLink
              to="/einstellungen"
              aria-label="Einstellungen"
              className="flex h-11 w-11 items-center justify-center rounded text-ink-2 outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-accent md:hidden"
            >
              <IconEinstellungen className="h-5 w-5" />
            </NavLink>
          </div>
        </header>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>

      {/* Bottom-Bar (Mobile) */}
      <nav
        aria-label="Hauptnavigation"
        className="fixed bottom-0 left-0 right-0 z-40 flex justify-around border-t border-black/10 bg-paper-2 py-1 md:hidden"
      >
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={navClass} aria-label={label}>
            <Icon className="h-5 w-5" />
          </NavLink>
        ))}
      </nav>

      <PersistentCalculator />
    </div>
    </ContentProvider>
  );
}

/** Rechner mit persistentem Verlauf (DATENMODELL.md §2: calcHistory, Ring 50). */
function PersistentCalculator() {
  const history = useCalcHistory();
  if (history === undefined) return null; // erst mounten, wenn der Verlauf da ist
  return (
    <CalculatorDrawer
      initialHistory={[...history].reverse().map(({ expr, display }) => ({ expr, display }))}
      onEvaluate={(entry) => void addCalcEntry(entry)}
    />
  );
}
