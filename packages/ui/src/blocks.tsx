// blocks.tsx — die Phase-1-Block-Renderer: text · formula · calc · check.
// interactive & build sind Phase 2/3 und erscheinen hier nur als ruhiger Platzhalter.

import { useState } from 'react';
import { evaluateFormula } from '@buildlab/engine';
import { Latex } from './Latex';
import { useContent } from './content-context';
import { InteractiveRenderer } from './interactive/InteractiveRenderer';
import { ConceptChip, VariableChip } from './TapExplain';
import type {
  Block,
  CalcBlock,
  CheckBlock,
  FormulaBlock,
  Layer,
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

// ── text ─────────────────────────────────────────────────────────────────────

function TextBlockView({ block }: { block: TextBlock }) {
  const available = LAYER_LABELS.filter(({ key }) => block.layers[key]);
  const [layer, setLayer] = useState<Layer>(available[0]?.key ?? 'intuitive');
  const text = block.layers[layer] ?? block.layers.intuitive;
  const terms = [...new Set([...(block.introduces ?? []), ...(block.uses ?? [])])];

  return (
    <div>
      {available.length > 1 && (
        <div className="mb-3 inline-flex rounded border border-black/10 bg-paper-sink p-0.5 text-xs">
          {available.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setLayer(key)}
              className={[
                'rounded-[4px] px-3 py-1 font-mono uppercase tracking-wide transition-colors',
                layer === key ? 'bg-accent text-paper' : 'text-ink-2 hover:text-ink',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <p key={layer} className="animate-fade max-w-prose leading-relaxed text-ink">
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

// ── formula ────────────────────────────────────────────────────────────────--

function FormulaBlockView({ block }: { block: FormulaBlock }) {
  const { formulas } = useContent();
  const formula = formulas.get(block.formulaId);
  if (!formula) return <Missing what={`Formel „${block.formulaId}"`} />;

  return (
    <div className="rounded border border-black/10 bg-paper-2 p-5 shadow">
      <Latex className="text-2xl text-ink" src={formula.latex} />
      {block.note && <p className="mt-3 text-sm text-ink-2">{block.note}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-black/10 pt-3 text-sm">
        <span className="font-mono text-xs uppercase tracking-wide text-ink-faint">
          Variablen
        </span>
        {formula.variables.map((v) => (
          <span key={v.var} className="text-ink-2">
            <VariableChip v={v} />
            <span className="ml-1 text-ink-faint">{v.name}</span>
          </span>
        ))}
      </div>
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
          <span className="text-viz-high">—</span>
        ) : (
          <span className="text-accent-ink">
            {fmt(value)}
            {unitLabel(formula.result.unit)}
          </span>
        )}
        {value !== null && <span className="text-viz-low" aria-hidden>✓</span>}
      </div>

      {block.narrative && (
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-2">{block.narrative}</p>
      )}
    </div>
  );
}

// ── check ──────────────────────────────────────────────────────────────────--

function CheckBlockView({ block }: { block: CheckBlock }) {
  return (
    <div className="rounded border border-black/10 bg-paper-2 p-5 shadow">
      <p className="font-display text-base text-ink">{block.question}</p>
      <div className="mt-3">
        {block.kind === 'numeric' ? (
          <NumericCheck block={block} />
        ) : (
          <ChoiceCheck block={block} />
        )}
      </div>
    </div>
  );
}

function Verdict({ ok, explanation }: { ok: boolean; explanation?: string }) {
  return (
    <div className="mt-3 text-sm">
      <span className={ok ? 'font-mono text-viz-low' : 'font-mono text-viz-high'}>
        {ok ? '✓ Sitzt!' : '✗ Noch nicht — schau nochmal.'}
      </span>
      {explanation && <p className="mt-1 max-w-prose leading-relaxed text-ink-2">{explanation}</p>}
    </div>
  );
}

function NumericCheck({ block }: { block: CheckBlock }) {
  const [raw, setRaw] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const answer = typeof block.answer === 'number' ? block.answer : NaN;
  const tol = block.tolerance ?? 0;
  const parsed = Number(raw.replace(',', '.'));
  const ok =
    Number.isFinite(parsed) &&
    Math.abs(parsed - answer) <= Math.max(tol * Math.abs(answer), Number.EPSILON);

  return (
    <div>
      <div className="flex items-center gap-2">
        <input
          inputMode="decimal"
          value={raw}
          onChange={(e) => {
            setRaw(e.target.value);
            setSubmitted(false);
          }}
          onKeyDown={(e) => e.key === 'Enter' && setSubmitted(true)}
          className="w-32 rounded border border-black/15 bg-paper-sink px-2 py-1 font-mono text-ink outline-none focus:border-accent"
          placeholder="Wert"
        />
        {block.unit && block.unit !== '-' && (
          <span className="font-mono text-sm text-ink-faint">{block.unit}</span>
        )}
        <button
          type="button"
          onClick={() => setSubmitted(true)}
          className="rounded border border-black/10 bg-accent px-3 py-1 text-sm text-paper transition-opacity hover:opacity-90"
        >
          Prüfen
        </button>
      </div>
      {submitted && raw !== '' && <Verdict ok={ok} explanation={block.explanation} />}
    </div>
  );
}

function ChoiceCheck({ block }: { block: CheckBlock }) {
  const multi = block.kind === 'multi';
  const [picked, setPicked] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const options = block.options ?? [];

  const correct = new Set(
    multi
      ? Array.isArray(block.answer)
        ? block.answer
        : []
      : typeof block.answer === 'number'
        ? [block.answer]
        : [],
  );

  const toggle = (i: number) => {
    setSubmitted(false);
    setPicked((prev) =>
      multi ? (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]) : [i],
    );
  };

  const ok =
    picked.length === correct.size && picked.every((i) => correct.has(i));

  return (
    <div>
      <div className="flex flex-col gap-2">
        {options.map((opt, i) => {
          const sel = picked.includes(i);
          const reveal = submitted && (correct.has(i) || sel);
          const tone = !reveal
            ? sel
              ? 'border-accent text-ink'
              : 'border-black/10 text-ink-2 hover:border-black/25'
            : correct.has(i)
              ? 'border-viz-low text-ink'
              : 'border-viz-high text-ink-2';
          return (
            <button
              key={i}
              type="button"
              onClick={() => toggle(i)}
              className={`flex items-center gap-2 rounded border bg-paper-sink/40 px-3 py-2 text-left text-sm transition-colors ${tone}`}
            >
              <span className="font-mono text-xs text-ink-faint">
                {multi ? (sel ? '☑' : '☐') : sel ? '◉' : '○'}
              </span>
              {opt}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => setSubmitted(true)}
        disabled={picked.length === 0}
        className="mt-3 rounded border border-black/10 bg-accent px-3 py-1 text-sm text-paper transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        Prüfen
      </button>
      {submitted && <Verdict ok={ok} explanation={block.explanation} />}
    </div>
  );
}

// ── Dispatcher ────────────────────────────────────────────────────────────────

function Missing({ what }: { what: string }) {
  return (
    <p className="rounded border border-viz-high/40 bg-paper-2 p-3 font-mono text-sm text-viz-high">
      {what} nicht gefunden.
    </p>
  );
}

function Placeholder({ label }: { label: string }) {
  return (
    <p className="rounded border border-dashed border-black/15 px-3 py-2 font-mono text-xs uppercase tracking-wide text-ink-faint">
      ▸ {label} · folgt in einer späteren Phase
    </p>
  );
}

export function BlockRenderer({ block }: { block: Block }) {
  switch (block.type) {
    case 'text':
      return <TextBlockView block={block} />;
    case 'formula':
      return <FormulaBlockView block={block} />;
    case 'calc':
      return <CalcBlockView block={block} />;
    case 'check':
      return <CheckBlockView block={block} />;
    case 'interactive':
      return <InteractiveRenderer block={block} />;
    case 'build':
      return <Placeholder label={`CAD-Bauteil: ${block.cadModel}`} />;
    default:
      return null;
  }
}
