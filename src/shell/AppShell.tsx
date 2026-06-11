// src/shell/AppShell.tsx — Globales Gerüst (SCREENS.md §2): eine Topbar
// (Wortmarke → Projektkarte, Breadcrumb, Mastery-Ring, Einstellungen),
// Rechner-Lasche rechts (CalculatorDrawer), Inhalt als <Outlet/>.
// Keine Rail, keine Bottom-Bar: die Projektkarte ist der einzige Hub.

import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useMatches, useNavigate } from 'react-router-dom';
import {
  Button, CalculatorDrawer, ContentProvider, Dialog, ScreenSkeleton, StatusBadge,
  buttonClass, focusRing, useCountUp, type Concept, type Formula,
} from '@buildlab/ui';
import { Link } from 'react-router-dom';
import { componentIds, concepts, formulas } from '../content';
import { addCalcEntry, useCalcHistory, useConceptStates, useSettings, isDbHealthy } from '../db/repo';
import { ErrorBoundary } from './RouteError';
import { IconEinstellungen } from './icons';

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
    // aufgaben-relevant.
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

  return (
    // ContentProvider umschließt die GANZE Shell: der Rechner (useContent)
    // muss auf jedem Screen funktionieren, nicht nur im Workspace.
    <ContentProvider
      formulas={formulas as unknown as Formula[]}
      concepts={concepts as unknown as Concept[]}
      componentIds={componentIds}
      onOpenConcept={openConcept}
    >
    <div className="mm-grid flex min-h-screen flex-col bg-paper font-body text-ink antialiased">
      {/* Topbar — Wortmarke ist der Heim-Anker zur Projektkarte. */}
      <header className="flex h-12 items-center justify-between border-b border-black/10 px-4">
        <div className="flex min-w-0 items-baseline gap-3">
          <Link
            to="/"
            className={`shrink-0 rounded-sm font-display text-lg font-bold tracking-tight text-ink-strong ${focusRing}`}
          >
            Buildlab<span className="text-accent">.</span>
          </Link>
          <span className="min-w-0 truncate font-display text-sm text-ink-2">
            {crumb ?? 'Projektkarte'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <QuotaWarning />
          <MasteryRing />
          <NavLink
            to="/einstellungen"
            aria-label="Einstellungen"
            className={({ isActive }) =>
              `flex h-11 w-11 items-center justify-center rounded outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-accent ${
                isActive ? 'text-accent' : 'text-ink-2'
              }`
            }
          >
            <IconEinstellungen className="h-5 w-5" />
          </NavLink>
        </div>
      </header>

      <main className="min-w-0 flex-1">
        {/* Bis die Einstellungen geladen sind, kein Inhalt — sonst flackern
            Motion-Präferenz und aktives Projekt beim ersten Aufbau. */}
        {settings === undefined ? (
          <ScreenSkeleton layout="list" />
        ) : (
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        )}
      </main>

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
