// Calculator.tsx — der ausziehbare Universal-Rechner (SCREENS.md §7).
//
// Wissenschaftlich, einheitenbewusst (mathjs — dieselbe Logik wie die Engine),
// formelbewusst (zieht die aktive Projektformel + aktuelle Slider-Werte herein)
// und mit Verlauf. Bewusst auf den Ingenieur-Bedarf fokussiert, kein voller CAS.

import { useEffect, useMemo, useRef, useState } from 'react';
import { create, all } from 'mathjs';
import { Latex } from './Latex';
import { useContent } from './content-context';
import { formatUnit } from './units';
import { Skeleton } from './primitives/Skeleton';
import { useWorkspaceStore } from './store';
import type { Formula } from './types';

const math = create(all, {});

type Tab = 'numbers' | 'units' | 'formulas';

export interface CalcHistoryItem {
  expr: string;
  /** Formatiertes Ergebnis inkl. Einheit. */
  display: string;
}

interface HistoryItem extends CalcHistoryItem {
  /** Roher Zahlenwert (nur bei dimensionslosen Ergebnissen, fürs Einsetzen). */
  value?: number;
}

export interface CalculatorProps {
  /** Persistierter Verlauf (DATENMODELL.md §2: calcHistory), neueste zuerst.
      Darf nachgeliefert werden — der Rechner sät ihn dann einmalig ein. */
  initialHistory?: CalcHistoryItem[];
  /** Verlauf lädt noch → Skeleton-Zeilen statt leerem Hinweis. */
  historyLoading?: boolean;
  /** Wird bei jedem „=" gerufen (Persistenz-Anbindung). */
  onEvaluate?: (entry: CalcHistoryItem) => void;
}

// Konstanten, die ein Maschinenbau-Lernender braucht (SCREENS.md §7).
const SCOPE_CONSTANTS = { g: 9.81 };

function formatResult(value: unknown): string {
  if (typeof value === 'number') {
    return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 6 }).format(value);
  }
  if (math.isUnit(value as never)) {
    // Zahlteil deutsch formatieren statt mathjs-toString (engl. Dezimalpunkt).
    try {
      const u = value as { toNumeric: () => number; formatUnits: () => string };
      return `${new Intl.NumberFormat('de-DE', { maximumFractionDigits: 6 }).format(u.toNumeric())} ${formatUnit(u.formatUnits())}`;
    } catch {
      return (value as { toString: () => string }).toString();
    }
  }
  return String(value);
}

// Deutsche Eingabe: Komma ist Dezimaltrenner. mathjs erwartet Punkt — vor dem
// Parsen normalisieren. Bewusster Trade-off: Mehrarg-Funktionen wie max(1,2)
// sind damit nicht tippbar; das Keypad bietet nur Einarg-Funktionen, und das
// Komma-Versprechen der Aufgaben („Komma oder Punkt sind beide ok") wiegt
// für die Zielgruppe schwerer.
const normalizeGermanExpr = (expr: string) => expr.replace(/,/g, '.');

// Fachlich dimensionslose Labels, die mathjs nicht als Unit kennt (wie in der Engine).
const DIMENSIONLESS_LABELS = new Set(['-', 'Kaliber']);

/** Baut aus einer Formel + Werten einen einheitenbehafteten mathjs-Ausdruck. */
function withValues(formula: Formula, values: Record<string, number>): string {
  let expr = formula.expr;
  for (const v of formula.variables) {
    const val = values[v.var];
    if (typeof val !== 'number') continue;
    const unit = DIMENSIONLESS_LABELS.has(v.unit) ? '' : ` ${v.unit}`;
    expr = expr.replace(new RegExp(`\\b${v.var}\\b`, 'g'), `(${val}${unit})`);
  }
  // Ergebnis in der deklarierten Formel-Einheit anzeigen (mathjs würde sonst
  // z. B. N·m zu J zusammenfassen).
  const ru = formula.result.unit;
  if (!DIMENSIONLESS_LABELS.has(ru)) expr = `(${expr}) to ${ru}`;
  return expr;
}

// Klassische Anordnung: Ziffernblock zusammenhängend (7–9 / 4–6 / 1–3 / 0),
// Operatoren als rechte Spalte, wissenschaftliche Funktionen darunter.
const KEYS: { label: string; insert?: string; action?: 'eval' | 'clear' | 'back' }[] = [
  { label: '7', insert: '7' }, { label: '8', insert: '8' }, { label: '9', insert: '9' }, { label: '÷', insert: '/' },
  { label: '4', insert: '4' }, { label: '5', insert: '5' }, { label: '6', insert: '6' }, { label: '×', insert: '*' },
  { label: '1', insert: '1' }, { label: '2', insert: '2' }, { label: '3', insert: '3' }, { label: '−', insert: '-' },
  { label: '0', insert: '0' }, { label: ',', insert: ',' }, { label: 'DEL', action: 'back' }, { label: '+', insert: '+' },
  { label: 'sin', insert: 'sin(' }, { label: 'cos', insert: 'cos(' }, { label: 'tan', insert: 'tan(' }, { label: '√', insert: 'sqrt(' },
  { label: 'π', insert: 'pi' }, { label: 'e', insert: 'e' }, { label: 'x²', insert: '^2' }, { label: 'xⁿ', insert: '^' },
  { label: '(', insert: '(' }, { label: ')', insert: ')' }, { label: 'ans', insert: 'ans' }, { label: 'C', action: 'clear' },
];

const UNITS = ['N', 'mm', 'm', 'kg', 'MPa', 'N*m', 'deg', 'm/s^2'];

export function Calculator({ initialHistory, historyLoading, onEvaluate }: CalculatorProps = {}) {
  const { formulas } = useContent();
  const active = useWorkspaceStore((s) => s.active);
  const answerSink = useWorkspaceStore((s) => s.answerSink);

  const [tab, setTab] = useState<Tab>('numbers');
  const [expr, setExpr] = useState('');
  const [ans, setAns] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>(() => initialHistory ?? []);

  // Verlauf kann nach dem Mount eintreffen (Drawer ist sofort da, IndexedDB
  // lädt noch) — einmalig einsäen, lokale Einträge bleiben vorn.
  const seeded = useRef(initialHistory !== undefined);
  useEffect(() => {
    if (seeded.current || initialHistory === undefined) return;
    seeded.current = true;
    setHistory((h) => [...h, ...initialHistory].slice(0, 50));
  }, [initialHistory]);

  const preview = useMemo(() => {
    if (!expr.trim()) return '';
    try {
      const scope = { ...SCOPE_CONSTANTS, ...(ans !== null ? { ans } : {}) };
      return formatResult(math.evaluate(normalizeGermanExpr(expr), scope));
    } catch {
      return '';
    }
  }, [expr, ans]);

  const append = (s: string) => {
    setExpr((e) => e + s);
    setError(null);
  };

  const evaluate = () => {
    if (!expr.trim()) return;
    try {
      const scope = { ...SCOPE_CONSTANTS, ...(ans !== null ? { ans } : {}) };
      const value = math.evaluate(normalizeGermanExpr(expr), scope);
      const display = formatResult(value);
      setAns(value);
      setHistory((h) =>
        [{ expr, display, value: typeof value === 'number' ? value : undefined }, ...h].slice(0, 50),
      );
      onEvaluate?.({ expr, display });
      setError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(/unit/i.test(msg) ? 'Einheiten passen nicht zusammen.' : 'Das kann ich so nicht rechnen.');
    }
  };

  const onKey = (k: (typeof KEYS)[number]) => {
    if (k.action === 'clear') {
      setExpr('');
      setError(null);
    } else if (k.action === 'back') {
      setExpr((e) => e.slice(0, -1));
    } else if (k.insert !== undefined) {
      append(k.insert);
    }
  };

  const activeFormula = active ? formulas.get(active.formulaId) : undefined;

  return (
    <div className="flex h-full flex-col">
      {/* Verlauf */}
      <div className="min-h-[64px] flex-1 overflow-auto border-b border-black/10 bg-paper-sink/40 p-3">
        {historyLoading && history.length === 0 ? (
          <div className="flex flex-col gap-2" role="status" aria-label="Verlauf lädt">
            <span className="sr-only">Verlauf lädt …</span>
            <Skeleton className="h-3.5 w-4/5" />
            <Skeleton className="h-3.5 w-3/5" />
            <Skeleton className="h-3.5 w-2/3" />
          </div>
        ) : history.length === 0 ? (
          <p className="font-mono text-xs text-ink-faint">Verlauf — Ergebnisse sind anklickbar.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {history.map((h, i) => (
              <li key={i} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => append(h.display.replace(/\s/g, ' '))}
                  title="Ergebnis übernehmen"
                  className="min-h-9 min-w-0 flex-1 truncate text-left font-mono text-xs text-ink-2 outline-none hover:text-accent-ink focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {h.expr} = <span className="text-ink">{h.display}</span>
                </button>
                {answerSink && h.value !== undefined && (
                  <button
                    type="button"
                    onClick={() => answerSink(h.value!)}
                    title="In das aktive Antwortfeld einsetzen"
                    aria-label={`${h.display} in die Aufgabe einsetzen`}
                    className="min-h-9 shrink-0 rounded border border-black/10 px-2 font-mono text-xs text-accent-ink outline-none hover:border-rule-strong focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    ⇥
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Anzeige */}
      <div className="bg-paper-2 px-3 py-2">
        <input
          value={expr}
          onChange={(e) => {
            setExpr(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => e.key === 'Enter' && evaluate()}
          placeholder="Ausdruck …"
          spellCheck={false}
          className="w-full bg-transparent text-right font-mono text-lg text-ink outline-none"
        />
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs text-viz-high">{error ?? ''}</span>
          <span className="font-mono text-sm text-ink-faint">{preview && !error ? `= ${preview}` : ''}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-y border-black/10 text-xs">
        {([
          ['numbers', 'Zahlen'],
          ['units', 'Einheiten'],
          ['formulas', 'Σ Formeln'],
        ] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={[
              'flex-1 px-2 py-2 font-mono uppercase tracking-wide transition-colors',
              tab === key ? 'bg-accent text-paper' : 'text-ink-2 hover:text-ink',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab-Inhalt */}
      <div className="bg-paper-2 p-3">
        {tab === 'numbers' && (
          <div className="grid grid-cols-4 gap-1.5">
            {KEYS.map((k) => (
              <button
                key={k.label}
                type="button"
                onClick={() => onKey(k)}
                className="min-h-11 rounded border border-black/10 bg-paper-sink/60 py-2 font-mono text-sm text-ink transition-colors hover:border-accent hover:text-accent-ink"
              >
                {k.label}
              </button>
            ))}
            <button
              type="button"
              onClick={evaluate}
              aria-label="ist gleich — ausrechnen"
              className="col-span-4 min-h-11 rounded border border-black/10 bg-accent py-2 font-mono text-xl leading-none text-paper transition-opacity hover:opacity-90"
            >
              =
            </button>
          </div>
        )}

        {tab === 'units' && (
          <div>
            <p className="mb-2 font-mono text-xs text-ink-faint">
              Rechnet mit Einheiten — z. B. <span className="text-ink-2">3 N * 2 m</span>.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {UNITS.map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => append(` ${u}`)}
                  className="rounded border border-black/10 bg-paper-sink/60 px-2 py-1 font-mono text-sm text-ink transition-colors hover:border-accent hover:text-accent-ink"
                  title={u !== formatUnit(u) ? `fügt ${u} ein` : undefined}
                >
                  {formatUnit(u)}
                </button>
              ))}
              <button
                type="button"
                onClick={() => append(' to ')}
                title="Einheit umrechnen, z. B. 5 N*m to N*mm"
                className="rounded border border-black/10 bg-paper-sink/60 px-2 py-1 font-mono text-sm text-ink transition-colors hover:border-accent hover:text-accent-ink"
              >
                to
              </button>
            </div>
            <p className="mt-3 font-mono text-xs text-ink-faint">
              Konstante: <button type="button" onClick={() => append('g')} className="text-accent-ink hover:underline">g</button> = 9,81 m/s²
            </p>
          </div>
        )}

        {tab === 'formulas' && (
          <div className="flex flex-col gap-3">
            {activeFormula && active ? (
              <div className="rounded border border-accent/40 bg-paper-sink/40 p-2">
                <p className="mb-1 font-mono text-xs uppercase tracking-wide text-ink-faint">
                  Aktiv: {active.label}
                </p>
                <Latex className="text-ink" src={activeFormula.latex} />
                <p className="mt-1 font-mono text-xs text-ink-2">
                  {Object.entries(active.values)
                    .map(([k, v]) => `${k} = ${v}`)
                    .join(' · ')}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setExpr(withValues(activeFormula, active.values));
                    setTab('numbers');
                  }}
                  className="mt-2 rounded border border-black/10 bg-accent px-2 py-1 font-mono text-xs text-paper transition-opacity hover:opacity-90"
                >
                  mit aktuellen Werten einsetzen
                </button>
              </div>
            ) : (
              <p className="font-mono text-xs text-ink-faint">
                Kein aktiver Slider — spiel mit einer Interaktion, dann erscheint ihre Formel hier.
              </p>
            )}

            <div>
              <p className="mb-1 font-mono text-xs uppercase tracking-wide text-ink-faint">
                Projektformeln
              </p>
              <ul className="flex flex-col gap-1">
                {[...formulas.values()].map((f) => (
                  <li key={f.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setExpr(f.expr);
                        setTab('numbers');
                      }}
                      className="flex min-h-9 w-full items-center gap-2 rounded px-1 py-0.5 text-left outline-none transition-colors hover:bg-paper-sink/60 focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      <Latex className="text-sm text-ink" src={f.latex} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
