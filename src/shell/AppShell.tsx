// src/shell/AppShell.tsx — Globales Gerüst (SCREENS.md §2): Rail links
// (mobile: Bottom-Bar), Topbar mit Breadcrumb + Mastery-Ring, Rechner-Lasche
// rechts (CalculatorDrawer), Inhalt als <Outlet/>.

import { useCallback, useEffect, useState } from 'react';
import { NavLink, Navigate, Outlet, useLocation, useMatches, useNavigate } from 'react-router-dom';
import {
  Button, CalculatorDrawer, ContentProvider, Dialog, ScreenSkeleton, StatusBadge,
  buttonClass, focusRing, useCountUp, type Concept, type Formula,
} from '@buildlab/ui';
import { Link } from 'react-router-dom';
import { componentIds, concepts, formulas } from '../content';
import { addCalcEntry, useCalcHistory, useConceptStates, useSettings, isDbHealthy } from '../db/repo';
import { ErrorBoundary } from './RouteError';
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
  // Motion „zaehlen" (DESIGN.md §8): Ring + Prozentzahl zählen zum neuen Stand.
  const shownPct = Math.round(useCountUp(pct));
  const r = 9;
  const c = 2 * Math.PI * r;
  return (
    // Mobil ausgeblendet (SCREENS.md §2): globaler Fortschritt ist dort nicht
    // aufgaben-relevant — die Skill-Map zeigt ihn vollständig.
    <div
      className="hidden items-center gap-2 md:flex"
      role="img"
      aria-label={`Gesamtfortschritt ${pct} Prozent der Konzepte angewendet`}
      title="Anteil der Konzepte, die du schon angewendet hast"
    >
      <svg viewBox="0 0 24 24" className="h-6 w-6 -rotate-90">
        <circle cx="12" cy="12" r={r} fill="none" stroke="var(--rule)" strokeWidth="3" />
        <circle
          cx="12" cy="12" r={r} fill="none" stroke="var(--accent)" strokeWidth="3"
          strokeDasharray={`${(shownPct / 100) * c} ${c}`} strokeLinecap="round"
        />
      </svg>
      <span className="font-mono text-xs text-ink-2">{shownPct} %</span>
    </div>
  );
}

interface Crumb {
  crumb?: string;
}

/** Speicher-Warnung (VOICE.md §4) als Badge-Knopf → Dialog mit Backup-CTA. */
function QuotaWarning() {
  const [open, setOpen] = useState(false);
  if (isDbHealthy()) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`rounded-sm ${focusRing}`}
        aria-label="Speicher-Warnung — Details anzeigen"
      >
        <StatusBadge tone="warn">Konnte nicht speichern</StatusBadge>
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Speichern klemmt gerade">
        <p className="text-sm leading-relaxed text-ink-2">
          Dein Browser-Speicher scheint voll zu sein. Dein bisheriger Stand bleibt
          erhalten — exportier zur Sicherheit ein Backup.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link to="/einstellungen" className={buttonClass()} onClick={() => setOpen(false)}>
            Sicherung exportieren
          </Link>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            später
          </Button>
        </div>
      </Dialog>
    </>
  );
}

export default function AppShell() {
  const settings = useSettings();
  const location = useLocation();
  const matches = useMatches();
  const navigate = useNavigate();
  const openConcept = useCallback((id: string) => navigate(`/konzept/${id}`), [navigate]);

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
     ${isActive ? 'text-ink before:absolute before:left-0 before:top-2 before:hidden before:h-7 before:w-0.5 before:bg-accent md:before:block after:absolute after:left-1/2 after:top-0 after:h-0.5 after:w-7 after:-translate-x-1/2 after:bg-accent md:after:hidden' : ''}`;

  return (
    // ContentProvider umschließt die GANZE Shell: der Rechner (useContent)
    // muss auf jedem Screen funktionieren, nicht nur im Workspace.
    <ContentProvider
      formulas={formulas as unknown as Formula[]}
      concepts={concepts as unknown as Concept[]}
      componentIds={componentIds}
      onOpenConcept={openConcept}
    >
    <div className="mm-grid flex min-h-screen flex-col bg-paper font-body text-ink antialiased md:flex-row">
      {/* Rail (Desktop) */}
      <nav
        aria-label="Hauptnavigation"
        className="fixed bottom-0 left-0 right-0 z-40 hidden border-t border-black/10 bg-paper-2 md:static md:flex md:w-44 md:flex-col md:gap-1 md:border-r md:border-t-0 md:px-2 md:py-4"
      >
        {/* Wordmark — einziger Marken-Moment der Shell (DESIGN.md §2). */}
        <div className="hidden px-3 pb-4 pt-1 md:block" aria-hidden="true">
          <span className="font-display text-lg font-bold tracking-tight text-ink-strong">
            Buildlab<span className="text-accent">.</span>
          </span>
        </div>
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={navClass}>
            {({ isActive }) => (
              <>
                <Icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-accent' : ''}`} />
                <span className={`hidden text-sm md:inline ${isActive ? 'font-medium text-ink' : ''}`}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
        <div className="mt-auto hidden md:block">
          <NavLink to="/einstellungen" className={navClass}>
            {({ isActive }) => (
              <>
                <IconEinstellungen className={`h-5 w-5 shrink-0 ${isActive ? 'text-accent' : ''}`} />
                <span className={`hidden text-sm md:inline ${isActive ? 'font-medium text-ink' : ''}`}>
                  Einstellungen
                </span>
              </>
            )}
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
            <QuotaWarning />
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
          {/* Bis die Einstellungen geladen sind, kein Inhalt — sonst blitzt das
              Dashboard vor der Onboarding-Weiche auf. */}
          {settings === undefined ? (
            <ScreenSkeleton layout="list" />
          ) : (
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          )}
        </main>
      </div>

      {/* Bottom-Bar (Mobile) */}
      <nav
        aria-label="Hauptnavigation"
        className="fixed bottom-0 left-0 right-0 z-40 flex justify-around border-t border-black/10 bg-paper-2 py-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] md:hidden"
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

/** Rechner mit persistentem Verlauf (DATENMODELL.md §2: calcHistory, Ring 50).
    Die Lasche ist sofort da; der Verlauf zeigt Skeleton-Zeilen, bis er geladen ist. */
function PersistentCalculator() {
  const history = useCalcHistory();
  return (
    <CalculatorDrawer
      historyLoading={history === undefined}
      initialHistory={
        history && [...history].reverse().map(({ expr, display }) => ({ expr, display }))
      }
      onEvaluate={(entry) => void addCalcEntry(entry)}
    />
  );
}
