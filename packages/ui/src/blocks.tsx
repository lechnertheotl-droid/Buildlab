// blocks.tsx — die Block-Renderer: text · formula · calc · task · interactive · build.

import { useEffect, useRef, useState } from 'react';
import { evaluateFormula } from '@buildlab/engine';
import { Latex } from './Latex';
import { useContent } from './content-context';
import { InteractiveRenderer } from './interactive/InteractiveRenderer';
import { CadBuild } from './build/CadBuild';
import { ConceptChip, VariableChip, VariablePopoverBody } from './TapExplain';
import { TaskView } from './task/TaskView';
import type {
  Block,
  FormulaVariable,
  CalcBlock,
  FormulaBlock,
  Layer,
  TaskResult,
  TextBlock,
} from './types';

const LAYER_LABELS: { key: Layer; label: string }[] = [
  { key: 'intuitive', label: 'verspielt' },
  { key: 'practical', label: 'praxis' },
  { key: 'rigorous', label: 'genau' },
];

function fmt(n: number): string {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 4 }).format(n);
}

function unitLabel(unit: string): string {
  return unit && unit !== '-' ? ` ${unit}` : '';
}

// ── text (mit Varianten + globaler Tiefe, lokal überschreibbar) ──────────────

function TextBlockView({ block, depth }: { block: TextBlock; depth?: Layer }) {
  const available = LAYER_LABELS.filter(({ key }) => block.layers[key]);
  // Lokaler Umschalter überschreibt die globale Ebene nur für diesen Block
  // und nur für diese Session (LERNMODELL.md §4).
  const [override, setOverride] = useState<Layer | null>(null);
  const globalLayer: Layer =
    depth && block.layers[depth] ? depth : (available[0]?.key ?? 'intuitive');
  const layer = override && block.layers[override] ? override : globalLayer;
  const text = block.layers[layer] ?? block.layers.intuitive;
  const terms = [...new Set([...(block.introduces ?? []), ...(block.uses ?? [])])];

  // Varianten (LERNMODELL.md §2.2): hook = Frage-Karte, merksatz = Akzent-Karte,
  // hinweis = dezente Karte. Varianten haben genau eine Stimme — kein Umschalter.
  if (block.variant === 'hook') {
    return (
      <div className="bl-einzeichnen rounded border border-black/10 bg-paper-2 p-4 shadow">
        <p className="flex gap-3">
          <span aria-hidden className="font-display text-2xl leading-none text-accent">?</span>
          <span className="font-display text-lg leading-snug text-ink">{block.layers.intuitive}</span>
        </p>
      </div>
    );
  }
  if (block.variant === 'merksatz') {
    return (
      <p className="rounded border-l-4 border-accent bg-paper-2 py-2 pl-4 pr-3 font-display text-ink shadow">
        {block.layers.intuitive}
      </p>
    );
  }
  if (block.variant === 'hinweis') {
    return (
      <p className="rounded border border-black/10 bg-paper-sink/60 p-3 text-sm leading-relaxed text-ink-2">
        <span className="font-mono text-xs uppercase tracking-wider text-ink-faint">Hinweis · </span>
        {block.layers.intuitive}
      </p>
    );
  }

  return (
    <div>
      {available.length > 1 && (
        <div
          className="mb-3 inline-flex rounded border border-black/10 bg-paper-sink p-0.5 text-xs"
          role="radiogroup"
          aria-label="Erklärtiefe für diesen Text"
        >
          {available.map(({ key, label }) => {
            const active = layer === key;
            const isGlobal = key === globalLayer;
            return (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setOverride(key === globalLayer ? null : key)}
                title={isGlobal ? 'deine globale Einstellung' : 'nur für diesen Text'}
                className={[
                  'rounded-[4px] px-3 py-1 font-mono uppercase tracking-wide outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent',
                  active
                    ? isGlobal
                      ? 'bg-accent text-paper'
                      : 'border border-accent bg-transparent text-accent-ink'
                    : 'text-ink-2 hover:text-ink',
                ].join(' ')}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      <p key={layer} className="bl-wechsel max-w-prose leading-relaxed text-ink">
        {text}
      </p>

      {terms.length > 0 && (
        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-2">
          <span className="font-mono text-xs uppercase tracking-wide text-ink-faint">
            antippen erklärt
          </span>
          {terms.map((id) => (
            <ConceptChip key={id} id={id} />
          ))}
        </p>
      )}
    </div>
  );
}

// ── formula: Variablen sind DIREKT in der Formel antippbar ──────────────────
//
// KaTeX rendert statisches HTML; nach dem Mount suchen wir die DOM-Knoten der
// Variablensymbole (Buchstabe + optionaler Subskript, griechisch inklusive),
// machen sie antippbar und öffnen das bekannte Popover. Kompakt: keine
// Extra-Chip-Zeile mehr — nur Symbole ohne DOM-Treffer fallen dorthin zurück.

const GREEK: Record<string, string> = { '\\eta': 'η', '\\rho': 'ρ', '\\omega': 'ω', '\\sigma': 'σ', '\\tau': 'τ', '\\varepsilon': 'ε' };

/** „z_1" → „z1", „x_{CP}" → „xCP", „\eta" → „η" — Vergleichsschlüssel fürs KaTeX-DOM. */
function symbolKey(symbol: string): string {
  let k = symbol;
  for (const [tex, ch] of Object.entries(GREEK)) k = k.replace(new RegExp(tex, 'g'), ch);
  return k.replace(/[_{}\s]/g, '');
}

function FormulaTap({ latex, variables }: { latex: string; variables: FormulaVariable[] }) {
  const host = useRef<HTMLDivElement>(null);
  const [openVar, setOpenVar] = useState<{ v: FormulaVariable; x: number } | null>(null);
  const [unmatched, setUnmatched] = useState<FormulaVariable[]>([]);

  useEffect(() => {
    const root = host.current;
    if (!root) return;
    const byKey = new Map(variables.map((v) => [symbolKey(v.symbol), v]));
    const found = new Set<string>();
    const cleanups: (() => void)[] = [];
    const matches: { el: HTMLElement; v: FormulaVariable }[] = [];

    // KaTeX hängt Zero-Width-Spaces an Subskripte — fürs Matching entfernen.
    const norm = (el: Element) => (el.textContent ?? '').replace(/[\u200B\s]/g, '');

    // Kleinste .mord-Gruppe je Vorkommen: Wrapper, deren Kind denselben
    // Schlüssel trägt, überspringen (sonst doppelt verdrahtet).
    const candidates = [...root.querySelectorAll<HTMLElement>('.katex-html .mord')];
    for (const el of candidates) {
      const key = norm(el);
      const v = byKey.get(key);
      if (!v) continue;
      const inner = [...el.querySelectorAll('.mord')].some((c) => norm(c) === key);
      if (inner) continue;
      found.add(key);
      el.style.cursor = 'pointer';
      el.style.borderBottom = '1px dotted var(--accent-ink)';
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      el.setAttribute('aria-label', `${v.name} — antippen für Erklärung`);
      matches.push({ el, v });
      const open = () => openFor(el, v);
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      };
      el.addEventListener('keydown', onKey);
      cleanups.push(() => el.removeEventListener('keydown', onKey));
    }

    // KaTeX' Bruch-Layout (vlist) liegt ÜBER den Symbolen und schluckt Klicks —
    // daher Delegation am Container mit Koordinaten-Hit-Test (4 px Toleranz).
    const onRootClick = (e: MouseEvent) => {
      const pad = 4;
      let best: { el: HTMLElement; v: FormulaVariable; area: number } | null = null;
      for (const m of matches) {
        const r = m.el.getBoundingClientRect();
        if (
          e.clientX >= r.left - pad && e.clientX <= r.right + pad &&
          e.clientY >= r.top - pad && e.clientY <= r.bottom + pad
        ) {
          const area = r.width * r.height;
          if (!best || area < best.area) best = { ...m, area };
        }
      }
      if (best) openFor(best.el, best.v);
    };
    root.addEventListener('click', onRootClick);
    cleanups.push(() => root.removeEventListener('click', onRootClick));

    setUnmatched(variables.filter((v) => !found.has(symbolKey(v.symbol))));
    return () => cleanups.forEach((fn) => fn());

    function openFor(el: HTMLElement, v: FormulaVariable) {
      const rect = el.getBoundingClientRect();
      const rootRect = root!.getBoundingClientRect();
      setOpenVar((cur) =>
        cur?.v.var === v.var
          ? null
          : { v, x: Math.max(0, Math.min(rect.left - rootRect.left, rootRect.width - 260)) },
      );
    }
  }, [latex, variables]);

  useEffect(() => {
    if (!openVar) return;
    const onDoc = (e: MouseEvent) => {
      if (host.current && !host.current.contains(e.target as Node)) setOpenVar(null);
    };
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && setOpenVar(null);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onEsc);
    };
  }, [openVar]);

  return (
    <div ref={host} className="relative">
      <Latex className="text-xl text-ink md:text-2xl" src={latex} />
      {openVar && (
        <span
          role="dialog"
          style={{ left: openVar.x }}
          className="animate-fade absolute top-full z-20 mt-2 block w-64 rounded border border-black/10 bg-paper-2 p-3 text-left shadow"
        >
          <VariablePopoverBody v={openVar.v} />
        </span>
      )}
      {unmatched.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          {unmatched.map((v) => (
            <VariableChip key={v.var} v={v} />
          ))}
        </div>
      )}
    </div>
  );
}

function FormulaBlockView({ block }: { block: FormulaBlock }) {
  const { formulas } = useContent();
  const formula = formulas.get(block.formulaId);
  if (!formula) return <Missing what={`Formel „${block.formulaId}"`} />;

  return (
    <div className="rounded border border-black/10 bg-paper-2 p-4 shadow">
      <FormulaTap latex={formula.latex} variables={formula.variables} />
      {block.note && <p className="mt-2 text-sm text-ink-2">{block.note}</p>}
    </div>
  );
}

// ── calc (Run-the-example: Zahl kommt aus der Engine) ────────────────────────--

function CalcBlockView({ block }: { block: CalcBlock }) {
  const { formulas } = useContent();
  const formula = formulas.get(block.formulaId);
  if (!formula) return <Missing what={`Formel „${block.formulaId}"`} />;

  let value: number | null = null;
  try {
    value = evaluateFormula(formula, block.inputs);
  } catch {
    value = null;
  }

  const givens = formula.variables.filter((v) => v.var in block.inputs);

  return (
    <div className="rounded border border-dashed border-black/15 bg-paper-2/60 p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-sm text-ink-2">
        {givens.map((v) => (
          <span key={v.var}>
            <Latex src={v.symbol} /> = {fmt(block.inputs[v.var])}
            {unitLabel(v.unit)}
          </span>
        ))}
      </div>

      <div className="mt-2 flex items-baseline gap-2 font-mono text-lg">
        <Latex className="text-ink" src={formula.result.symbol} />
        <span className="text-ink">=</span>
        {value === null ? (
          <span className="text-fehl">—</span>
        ) : (
          <span className="text-accent-ink">
            {fmt(value)}
            {unitLabel(formula.result.unit)}
          </span>
        )}
        {value !== null && <span className="text-ok" aria-hidden>✓</span>}
      </div>

      {block.narrative && (
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-2">{block.narrative}</p>
      )}
    </div>
  );
}

// ── Dispatcher ────────────────────────────────────────────────────────────────

function Missing({ what }: { what: string }) {
  return (
    <p className="rounded border border-fehl/40 bg-paper-2 p-3 font-mono text-sm text-fehl">
      {what} nicht gefunden.
    </p>
  );
}

export interface BlockRendererProps {
  block: Block;
  /** Globale Tiefen-Ebene (Einstellungen); Blöcke können lokal überschreiben. */
  depth?: Layer;
  /** Persistierter Aufgaben-Zustand (nur für task-Blöcke relevant). */
  taskState?: TaskResult;
  onTaskResult?: (result: TaskResult) => void;
}

export function BlockRenderer({ block, depth, taskState, onTaskResult }: BlockRendererProps) {
  switch (block.type) {
    case 'text':
      return <TextBlockView block={block} depth={depth} />;
    case 'formula':
      return <FormulaBlockView block={block} />;
    case 'calc':
      return <CalcBlockView block={block} />;
    case 'task':
      return <TaskView block={block} state={taskState} onResult={onTaskResult} depth={depth} />;
    case 'interactive':
      return <InteractiveRenderer block={block} />;
    case 'build':
      return <CadBuild block={block} />;
    default:
      return null;
  }
}
