// task/TaskView.tsx — Renderer für alle neun Aufgabenarten (LERNMODELL.md §8)
// mit dreistufigem Feedback (§7): heuristischer Hinweis → gezielter Hinweis →
// Lösungsweg (engine-gerechnet, nie hartkodiert). Persistenz-agnostisch:
// Zustand kommt als Prop, Ergebnisse gehen über onResult nach draußen.

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { evaluateById } from '@buildlab/engine';
import { Latex } from '../Latex';
import { useContent } from '../content-context';
import { useAnnounce } from '../primitives/announce';
import { buttonClass } from '../primitives/Button';
import { Collapse } from '../primitives/Collapse';
import { SegmentedControl } from '../primitives/SegmentedControl';
import { useWorkspaceStore } from '../store';
import {
  HEURISTIC_TEXT, classifyMiss, isWithin, parseGermanNumber, praise,
} from './feedback';
import type { Layer, TaskBlock, TaskResult, TaskStage } from '../types';

const fmt = (n: number) =>
  new Intl.NumberFormat('de-DE', { maximumFractionDigits: 4 }).format(n);
const unitLabel = (unit?: string) => (unit && unit !== '-' ? ` ${unit}` : '');

export interface TaskViewProps {
  block: TaskBlock;
  /** Persistierter Zustand (undefined = unbearbeitet). */
  state?: TaskResult;
  onResult?: (result: TaskResult) => void;
  /** Aktive Tiefen-Ebene (für minDepth-Vertiefungsaufgaben). */
  depth?: Layer;
}

interface Flow {
  attempts: number;
  helpUsed: boolean;
  message: string | null;
  messageTone: 'ok' | 'warn' | 'fehl';
  solved: boolean;
  solvedWithHelp: boolean;
}

function useFlow(block: TaskBlock, state: TaskResult | undefined, onResult?: (r: TaskResult) => void) {
  // Verknüpft Eingabefelder mit der Feedback-Zeile (aria-describedby, §7).
  const msgId = useId();
  const [flow, setFlow] = useState<Flow>({
    attempts: state?.attempts ?? 0,
    helpUsed: state?.usedHelp ?? false,
    message: null,
    messageTone: 'warn',
    solved: state?.solved ?? false,
    solvedWithHelp: (state?.solved && state?.usedHelp) ?? false,
  });
  const [showSolution, setShowSolution] = useState(false);

  const fail = (heuristicText: string) =>
    setFlow((f) => ({
      ...f,
      attempts: f.attempts + 1,
      message: heuristicText,
      messageTone: 'fehl',
    }));

  // Für mehrstufige Aufgaben: die ✗-Meldung eines Fehlversuchs räumen, sobald
  // die Stufe geschafft ist — sonst steht sie als Stale-Feedback unter der
  // nächsten Stufe.
  const clearMessage = () => setFlow((f) => (f.message === null ? f : { ...f, message: null }));

  const succeed = (confirmation?: string) =>
    setFlow((f) => {
      const attempts = f.attempts + 1;
      const usedHelp = f.helpUsed || attempts > 2;
      onResult?.({ solved: true, attempts, usedHelp });
      return {
        ...f,
        attempts,
        solved: true,
        solvedWithHelp: usedHelp,
        message: confirmation ?? praise(),
        messageTone: 'ok',
      };
    });

  const openSolution = () => {
    setShowSolution(true);
    setFlow((f) => ({ ...f, helpUsed: true }));
  };

  // Stufe 2: nach dem 2. Fehlversuch zählt der gezeigte Hinweis als Hilfe.
  const hintVisible = !flow.solved && flow.attempts >= 2 && !!block.hint;
  useEffect(() => {
    if (hintVisible) setFlow((f) => (f.helpUsed ? f : { ...f, helpUsed: true }));
  }, [hintVisible]);

  return { flow, fail, succeed, clearMessage, hintVisible, showSolution, openSolution, msgId };
}

// ── Gemeinsame Bausteine ─────────────────────────────────────────────────────

function StatusCorner({ flow }: { flow: Flow }) {
  if (!flow.solved) return null;
  return (
    <span
      className={`bl-quittung-pop absolute right-3 top-3 inline-flex h-6 w-6 items-center justify-center rounded-full font-mono text-xs text-paper ${
        flow.solvedWithHelp ? 'bg-ok/70 ring-2 ring-ok/40' : 'bg-ok'
      }`}
      title={flow.solvedWithHelp ? 'gelöst mit Hilfe' : 'gelöst'}
      aria-label={flow.solvedWithHelp ? 'gelöst mit Hilfe' : 'gelöst'}
    >
      ✓
    </span>
  );
}

function Message({ flow, id }: { flow: Flow; id?: string }) {
  // Farbe nie allein (DESIGN.md §5): Symbol trägt die Bedeutung mit.
  const tone =
    flow.messageTone === 'ok' ? 'text-ok' : flow.messageTone === 'warn' ? 'text-warn' : 'text-fehl';
  const symbol = flow.messageTone === 'ok' ? '✓' : flow.messageTone === 'warn' ? '⚠' : '✗';
  return (
    <p id={id} className={`bl-quittung mt-3 font-mono text-sm ${tone} ${flow.message ? '' : 'hidden'}`} aria-live="polite">
      {flow.message && (
        <>
          <span aria-hidden>{symbol} </span>
          {flow.message}
        </>
      )}
    </p>
  );
}

function HintAndSolution({
  block, flow, hintVisible, showSolution, openSolution,
}: {
  block: TaskBlock;
  flow: Flow;
  hintVisible: boolean;
  showSolution: boolean;
  openSolution: () => void;
}) {
  const { formulas } = useContent();
  if (flow.solved && !showSolution) return null;

  const solutionCalc = () => {
    const list = [...formulas.values()];
    const rows: { latex: string; inputs: Record<string, number>; value: number; unit: string }[] = [];
    const push = (formulaId: string, inputs: Record<string, number>) => {
      const formula = formulas.get(formulaId);
      if (!formula) return;
      try {
        const { value, unit } = evaluateById(list, formulaId, inputs);
        rows.push({ latex: formula.latex, inputs, value, unit });
      } catch {
        /* Lösungsweg ohne Rechnung, wenn Inputs unvollständig */
      }
    };
    if (block.source) push(block.source.formulaId, block.source.inputs);
    if (block.target) push(block.target.formulaId, block.target.proof.pass);
    if (block.steps) {
      let prev: number | undefined;
      for (const stage of block.steps) {
        const inputs: Record<string, number> = {};
        for (const [k, v] of Object.entries(stage.inputs)) {
          inputs[k] = v === '$prev' ? (prev ?? NaN) : v;
        }
        const formula = formulas.get(stage.formulaId);
        if (!formula) continue;
        try {
          const { value, unit } = evaluateById(list, stage.formulaId, inputs);
          rows.push({ latex: formula.latex, inputs, value, unit });
          prev = value;
        } catch {
          break;
        }
      }
    }
    if (block.rows) {
      for (const row of block.rows) push(row.formulaId, row.inputs);
    }
    return rows;
  };

  return (
    <div className="mt-3 space-y-2">
      <Collapse open={hintVisible}>
        <p className="rounded border border-black/10 bg-paper-sink/60 p-2 text-sm text-ink-2">
          <span className="font-mono text-xs uppercase tracking-wider text-ink-faint">Hinweis · </span>
          {block.hint}
        </p>
      </Collapse>
      {!flow.solved && flow.attempts >= 3 && !showSolution && (
        <button type="button" onClick={openSolution} className={buttonClass({ variant: 'secondary' })}>
          Zeig mir den Weg
        </button>
      )}
      {showSolution && (
        <div className="bl-quittung rounded border border-black/10 bg-paper-sink/60 p-3 text-sm">
          <p className="text-ink-2">
            <span className="font-mono text-xs uppercase tracking-wider text-ink-faint">
              Gut gescheitert — hier ist der Weg ·{' '}
            </span>
            {block.explanation}
          </p>
          {solutionCalc().map((row, i) => (
            <p key={i} className="mt-2 flex flex-wrap items-baseline gap-2 font-mono text-sm">
              <Latex src={row.latex} />
              <span className="text-ink-faint">mit {Object.entries(row.inputs).map(([k, v]) => `${k} = ${fmt(v)}`).join(', ')}</span>
              <span className="text-accent-ink">→ {fmt(row.value)}{unitLabel(row.unit)}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

const inputClass =
  'min-h-11 w-36 rounded border border-black/15 bg-paper-sink px-3 font-mono text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60';
const checkButtonClass = buttonClass();

// ── single / multi ───────────────────────────────────────────────────────────

function ChoiceBody({ block, flowApi }: { block: TaskBlock; flowApi: ReturnType<typeof useFlow> }) {
  const { flow, fail, succeed } = flowApi;
  const multi = block.kind === 'multi';
  const [picked, setPicked] = useState<number[]>([]);
  const options = block.options ?? [];
  const correct = new Set(
    multi ? (Array.isArray(block.answer) ? block.answer : []) : [block.answer as number],
  );

  const toggle = (i: number) => {
    if (flow.solved) return;
    setPicked((prev) =>
      multi ? (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]) : [i],
    );
  };

  const submit = () => {
    const ok = picked.length === correct.size && picked.every((i) => correct.has(i));
    if (ok) {
      succeed();
      return;
    }
    // Stufe 1 bei Wahl-Aufgaben: das `why` der gewählten falschen Option.
    const wrongPick = picked.find((i) => !correct.has(i));
    const why = wrongPick !== undefined ? options[wrongPick]?.why : undefined;
    fail(why ?? (multi ? 'Da fehlt noch etwas — oder eine ist zu viel.' : HEURISTIC_TEXT.neutral));
  };

  return (
    <div>
      <div className="flex flex-col gap-2" role={multi ? 'group' : 'radiogroup'} aria-label={block.question}>
        {options.map((opt, i) => {
          const sel = picked.includes(i);
          const reveal = flow.solved && correct.has(i);
          return (
            <button
              key={i}
              type="button"
              role={multi ? 'checkbox' : 'radio'}
              aria-checked={sel}
              disabled={flow.solved}
              onClick={() => toggle(i)}
              className={`flex min-h-11 items-center gap-2 rounded border bg-paper-sink/40 px-3 py-2 text-left text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-default ${
                reveal ? 'border-ok text-ink' : sel ? 'border-accent text-ink' : 'border-black/10 text-ink-2 hover:border-black/25'
              }`}
            >
              <span className="font-mono text-xs text-ink-faint" aria-hidden>
                {multi ? (sel ? '☑' : '☐') : sel ? '◉' : '○'}
              </span>
              {opt.text}
            </button>
          );
        })}
      </div>
      {!flow.solved && (
        <button type="button" onClick={submit} disabled={picked.length === 0} className={`mt-3 ${checkButtonClass}`}>
          Prüfen
        </button>
      )}
    </div>
  );
}

// ── numeric (mit optionaler Einheiten-Wahl) ──────────────────────────────────

function NumericBody({ block, flowApi }: { block: TaskBlock; flowApi: ReturnType<typeof useFlow> }) {
  const { flow, fail, succeed, msgId } = flowApi;
  const [raw, setRaw] = useState('');
  const [unitPick, setUnitPick] = useState<string | null>(null);
  const setAnswerSink = useWorkspaceStore((s) => s.setAnswerSink);
  // Beim Unmount den Einsetzen-Kanal räumen (kein veralteter Sink im Rechner).
  useEffect(() => () => setAnswerSink(null), [setAnswerSink]);
  const answer = block.answer as number;
  const tol = block.tolerance ?? 1e-2;

  const submit = () => {
    const value = parseGermanNumber(raw);
    if (!Number.isFinite(value)) {
      fail('Das ist keine Zahl — Komma oder Punkt sind beide ok.');
      return;
    }
    const valueOk = isWithin(value, answer, tol);
    if (block.unitChoices) {
      if (!unitPick) {
        fail('Wähle auch die Einheit — sie ist Teil der Antwort.');
        return;
      }
      if (valueOk && unitPick !== block.unit) {
        fail('Die Zahl stimmt — aber ist das wirklich die richtige Einheit für diese Größe?');
        return;
      }
      if (!valueOk) {
        fail(HEURISTIC_TEXT[classifyMiss(value, answer, tol)]);
        return;
      }
      succeed(`${fmt(answer)}${unitLabel(block.unit)} ✓ · ${praise()}`);
      return;
    }
    if (valueOk) succeed(`${fmt(answer)}${unitLabel(block.unit)} ✓ · ${praise()}`);
    else fail(HEURISTIC_TEXT[classifyMiss(value, answer, tol)]);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          inputMode="decimal"
          value={raw}
          disabled={flow.solved}
          onChange={(e) => setRaw(e.target.value)}
          onFocus={() => setAnswerSink((v) => setRaw(String(v).replace('.', ',')))}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          className={inputClass}
          placeholder="Wert"
          aria-label="Antwort"
          aria-describedby={msgId}
          aria-invalid={!flow.solved && flow.messageTone === 'fehl' && !!flow.message}
        />
        {block.unitChoices ? (
          <SegmentedControl
            value={unitPick ?? ''}
            onChange={(u) => setUnitPick(u)}
            options={block.unitChoices.map((u) => ({ id: u, label: u.replace('*', '·') }))}
            ariaLabel="Einheit"
            disabled={flow.solved}
          />
        ) : (
          block.unit && block.unit !== '-' && (
            <span className="font-mono text-sm text-ink-faint">{block.unit.replace('*', '·')}</span>
          )
        )}
        {!flow.solved && (
          <button type="button" onClick={submit} className={checkButtonClass}>
            Prüfen
          </button>
        )}
      </div>
    </div>
  );
}

// ── estimate (Log-Skala, Faktor-Bänder) ──────────────────────────────────────

function EstimateBody({ block, flowApi }: { block: TaskBlock; flowApi: ReturnType<typeof useFlow> }) {
  const { flow, fail, succeed } = flowApi;
  const { formulas } = useContent();
  const announce = useAnnounce();
  const scale = block.scale!;
  const [pos, setPos] = useState(0.5);
  const reference = useMemo(() => {
    try {
      return evaluateById([...formulas.values()], block.source!.formulaId, block.source!.inputs).value;
    } catch {
      return null;
    }
  }, [formulas, block.source]);

  const toValue = (t: number) =>
    scale.log
      ? scale.min * (scale.max / scale.min) ** t
      : scale.min + t * (scale.max - scale.min);
  const value = toValue(pos);

  const submit = () => {
    if (reference === null) return;
    const factor = Math.max(value / reference, reference / value);
    const [good, okBand] = [scale.bands[0], scale.bands[1] ?? scale.bands[0] * 2.5];
    if (factor <= good) {
      succeed(`Gutes Gefühl! Tatsächlich: ${fmt(reference)} — du lagst um Faktor ${fmt(factor)} daneben.`);
    } else if (factor <= okBand) {
      succeed(`Richtung stimmt (Faktor ${fmt(factor)} daneben). Tatsächlich: ${fmt(reference)}.`);
    } else {
      fail(`Um Faktor ${fmt(factor)} daneben — trau dich näher ran. In welcher Größenordnung spielt das?`);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs text-ink-faint">{fmt(scale.min)}</span>
        <input
          type="range"
          min={0}
          max={1000}
          value={Math.round(pos * 1000)}
          disabled={flow.solved}
          onChange={(e) => {
            const t = Number(e.target.value) / 1000;
            setPos(t);
            // Debounced ansagen — Screenreader nicht mit Zwischenwerten fluten.
            announce(`Schätzung ${fmt(toValue(t))}`);
          }}
          className="bl-range w-full"
          aria-label="Schätzung"
          aria-valuetext={fmt(value)}
        />
        <span className="font-mono text-xs text-ink-faint">{fmt(scale.max)}</span>
      </div>
      <p className="mt-1 text-center font-mono text-lg text-accent-ink" aria-live="polite">
        ≈ {fmt(value)}
      </p>
      {!flow.solved && (
        <button type="button" onClick={submit} className={`mt-2 ${checkButtonClass}`}>
          So schätze ich
        </button>
      )}
    </div>
  );
}

// ── target (Stellaufgabe, gekoppelt an die Canvas) ───────────────────────────

function TargetBody({ block, flowApi }: { block: TaskBlock; flowApi: ReturnType<typeof useFlow> }) {
  const { flow, succeed } = flowApi;
  const { formulas } = useContent();
  const canvasInputs = useWorkspaceStore((s) => s.canvasInputs);
  const target = block.target!;
  const formula = formulas.get(target.formulaId);
  const doneRef = useRef(flow.solved);

  let value: number | null = null;
  if (formula && canvasInputs) {
    const haveAll = formula.variables.every((v) => typeof canvasInputs[v.var] === 'number');
    if (haveAll) {
      try {
        value = evaluateById([...formulas.values()], target.formulaId, canvasInputs).value;
      } catch {
        value = null;
      }
    }
  }
  const hit = value !== null && isWithin(value, target.goal.value, target.goal.tolerance);

  useEffect(() => {
    if (!hit || doneRef.current) return;
    // Beim Schrittwechsel rendert die Aufgabe einmal mit den Canvas-Werten des
    // VORHERIGEN Schritts (Clear + Neu-Publizieren passieren erst in der
    // Effect-Phase). Deshalb hier gegen den Live-Store nachprüfen — sonst
    // „löst" ein Treffer des Vorschritts die neue Aufgabe.
    const live = useWorkspaceStore.getState().canvasInputs;
    if (!formula || !live) return;
    if (!formula.variables.every((v) => typeof live[v.var] === 'number')) return;
    let liveValue: number;
    try {
      liveValue = evaluateById([...formulas.values()], target.formulaId, live).value;
    } catch {
      return;
    }
    if (!isWithin(liveValue, target.goal.value, target.goal.tolerance)) return;
    doneRef.current = true;
    succeed(`${fmt(target.goal.value)}${unitLabel(formula?.result.unit)} getroffen ✓ · ${praise()}`);
    // succeed ist stabil genug für diesen Zweck (setState-Wrapper).
  }, [hit]);

  return (
    <div className="font-mono text-sm" aria-live="polite">
      <p className="text-ink-2">
        Ziel: <Latex src={formula?.result.symbol ?? ''} /> = {fmt(target.goal.value)}
        {unitLabel(formula?.result.unit)} (±{fmt(target.goal.tolerance * 100)} %)
      </p>
      <p className="mt-1">
        aktuell:{' '}
        {value === null ? (
          <span className="text-ink-faint">— stell die Regler in der Ansicht rechts</span>
        ) : (
          <span className={hit || flow.solved ? 'text-ok' : 'text-warn'}>
            {fmt(value)}
            {unitLabel(formula?.result.unit)} {hit || flow.solved ? '✓' : ''}
          </span>
        )}
      </p>
    </div>
  );
}

// ── error-find ───────────────────────────────────────────────────────────────

function ErrorFindBody({ block, flowApi }: { block: TaskBlock; flowApi: ReturnType<typeof useFlow> }) {
  const { flow, fail, succeed } = flowApi;
  const { formulas } = useContent();
  const wrongIndex = useMemo(() => {
    const list = [...formulas.values()];
    return (block.rows ?? []).findIndex((row) => {
      try {
        const { value } = evaluateById(list, row.formulaId, row.inputs);
        return !isWithin(row.shown, value, 1e-6);
      } catch {
        return false;
      }
    });
  }, [formulas, block.rows]);

  const pick = (i: number) => {
    if (flow.solved) return;
    if (i === wrongIndex) succeed('Erwischt — diese Zeile lügt.');
    else fail('Diese Zeile stimmt. Rechne jede kurz nach: Welche passt nicht zur Formel?');
  };

  return (
    <div className="flex flex-col gap-2">
      {(block.rows ?? []).map((row, i) => (
        <button
          key={i}
          type="button"
          disabled={flow.solved}
          onClick={() => pick(i)}
          className={`min-h-11 rounded border px-3 py-2 text-left font-mono text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-default ${
            flow.solved && i === wrongIndex
              ? 'border-fehl text-fehl line-through'
              : 'border-black/10 bg-paper-sink/40 text-ink-2 hover:border-black/25'
          }`}
        >
          {row.label}
        </button>
      ))}
    </div>
  );
}

// ── order ────────────────────────────────────────────────────────────────────

function shuffledStart(correct: number[]): number[] {
  // Deterministisch und garantiert ≠ korrekt: umgedreht, sonst rotiert.
  const reversed = [...correct].reverse();
  if (reversed.some((v, i) => v !== correct[i])) return reversed;
  return [...correct.slice(1), correct[0]];
}

function OrderBody({ block, flowApi }: { block: TaskBlock; flowApi: ReturnType<typeof useFlow> }) {
  const { flow, fail, succeed } = flowApi;
  const items = block.items ?? [];
  const correct = block.correctOrder ?? [];
  const [order, setOrder] = useState<number[]>(() => shuffledStart(correct));

  const move = (pos: number, dir: -1 | 1) => {
    if (flow.solved) return;
    setOrder((prev) => {
      const next = [...prev];
      const swap = pos + dir;
      if (swap < 0 || swap >= next.length) return prev;
      [next[pos], next[swap]] = [next[swap], next[pos]];
      return next;
    });
  };

  const submit = () => {
    const ok = order.every((v, i) => v === correct[i]);
    if (ok) succeed();
    else fail('Noch nicht in Reihenfolge. Was muss logisch zuerst passieren?');
  };

  return (
    <div>
      <ol className="flex flex-col gap-2">
        {order.map((itemIndex, pos) => (
          <li key={itemIndex} className="flex min-h-11 items-center gap-2 rounded border border-black/10 bg-paper-sink/40 px-3 py-1.5 text-sm">
            <span className="font-mono text-xs text-ink-faint">{pos + 1}.</span>
            <span className="flex-1">{items[itemIndex]}</span>
            <button
              type="button"
              onClick={() => move(pos, -1)}
              disabled={flow.solved || pos === 0}
              aria-label={`„${items[itemIndex]}“ nach oben`}
              className="min-h-9 min-w-9 rounded border border-black/10 font-mono text-xs outline-none hover:border-ink-2 focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-30"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => move(pos, 1)}
              disabled={flow.solved || pos === order.length - 1}
              aria-label={`„${items[itemIndex]}“ nach unten`}
              className="min-h-9 min-w-9 rounded border border-black/10 font-mono text-xs outline-none hover:border-ink-2 focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-30"
            >
              ↓
            </button>
          </li>
        ))}
      </ol>
      {!flow.solved && (
        <button type="button" onClick={submit} className={`mt-3 ${checkButtonClass}`}>
          Prüfen
        </button>
      )}
    </div>
  );
}

// ── match ────────────────────────────────────────────────────────────────────

function MatchBody({ block, flowApi }: { block: TaskBlock; flowApi: ReturnType<typeof useFlow> }) {
  const { flow, fail, succeed } = flowApi;
  const pairs = block.pairs ?? [];
  const rights = useMemo(() => [...pairs.map((p) => p.right)].reverse(), [pairs]);
  const [chosen, setChosen] = useState<(string | null)[]>(() => pairs.map(() => null));

  const submit = () => {
    const ok = pairs.every((p, i) => chosen[i] === p.right);
    if (ok) succeed();
    else fail('Mindestens ein Paar passt noch nicht. Welche Einheit misst was?');
  };

  return (
    <div>
      <div className="flex flex-col gap-2">
        {pairs.map((p, i) => (
          <label key={i} className="flex min-h-11 items-center gap-3 text-sm">
            <span className="w-40 shrink-0">{p.left}</span>
            <span aria-hidden className="text-ink-faint">→</span>
            <select
              value={chosen[i] ?? ''}
              disabled={flow.solved}
              onChange={(e) =>
                setChosen((prev) => prev.map((v, j) => (j === i ? e.target.value || null : v)))
              }
              className="min-h-11 rounded border border-black/15 bg-paper-sink px-2 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label={`Zuordnung für ${p.left}`}
            >
              <option value="">…</option>
              {rights.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      {!flow.solved && (
        <button
          type="button"
          onClick={submit}
          disabled={chosen.some((c) => c === null)}
          className={`mt-3 ${checkButtonClass}`}
        >
          Prüfen
        </button>
      )}
    </div>
  );
}

// ── steps (geführter Rechenweg, $prev = Lernenden-Wert) ──────────────────────

function StepsBody({ block, flowApi }: { block: TaskBlock; flowApi: ReturnType<typeof useFlow> }) {
  const { flow, fail, succeed, clearMessage, msgId } = flowApi;
  const { formulas } = useContent();
  const stages = block.steps ?? [];
  const [stageIndex, setStageIndex] = useState(0);
  const [accepted, setAccepted] = useState<number[]>([]);
  const [raw, setRaw] = useState('');
  const [stageMsg, setStageMsg] = useState<string | null>(null);

  const expectedFor = (stage: TaskStage, prevValue: number | undefined): number | null => {
    const inputs: Record<string, number> = {};
    for (const [k, v] of Object.entries(stage.inputs)) {
      if (v === '$prev') {
        if (prevValue === undefined) return null;
        inputs[k] = prevValue; // Folgefehler nicht doppelt bestrafen (ENGINE_SPEC §3)
      } else {
        inputs[k] = v;
      }
    }
    try {
      return evaluateById([...formulas.values()], stage.formulaId, inputs).value;
    } catch {
      return null;
    }
  };

  const submit = () => {
    const stage = stages[stageIndex];
    const tol = stage.tolerance ?? block.tolerance ?? 1e-2;
    const expected = expectedFor(stage, accepted[stageIndex - 1]);
    const value = parseGermanNumber(raw);
    if (expected === null || !Number.isFinite(value)) {
      fail('Das ist keine Zahl — Komma oder Punkt sind beide ok.');
      return;
    }
    if (isWithin(value, expected, tol)) {
      const nextAccepted = [...accepted, value];
      setAccepted(nextAccepted);
      setRaw('');
      setStageMsg(null);
      if (stageIndex + 1 >= stages.length) {
        succeed(`Rechenweg komplett ✓ · ${praise()}`);
      } else {
        clearMessage(); // ✗-Meldung des Fehlversuchs gehört zur alten Stufe
        setStageIndex(stageIndex + 1);
      }
    } else {
      setStageMsg(HEURISTIC_TEXT[classifyMiss(value, expected, tol)]);
      fail(HEURISTIC_TEXT[classifyMiss(value, expected, tol)]);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {stages.map((stage, i) => {
        const formula = formulas.get(stage.formulaId);
        if (i > stageIndex && !flow.solved) return null;
        const done = i < stageIndex || flow.solved;
        return (
          <div key={i} className={`rounded border px-3 py-2 ${done ? 'border-ok/40' : 'border-black/10'}`}>
            <p className="text-sm text-ink-2">
              <span className="font-mono text-xs text-ink-faint">Stufe {i + 1} · </span>
              {stage.prompt}
            </p>
            {formula && <Latex className="mt-1 text-ink-2" src={formula.latex} />}
            {done ? (
              <p className="mt-1 font-mono text-sm text-ok">
                = {fmt(accepted[i])}
                {unitLabel(formula?.result.unit)} ✓
              </p>
            ) : (
              <div className="mt-2 flex items-center gap-2">
                <input
                  inputMode="decimal"
                  value={raw}
                  onChange={(e) => setRaw(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submit()}
                  className={inputClass}
                  placeholder="Wert"
                  aria-label={`Antwort Stufe ${i + 1}`}
                  aria-describedby={msgId}
                  aria-invalid={!!stageMsg}
                />
                <span className="font-mono text-sm text-ink-faint">
                  {formula?.result.unit && formula.result.unit !== '-' ? formula.result.unit.replace('*', '·') : ''}
                </span>
                <button type="button" onClick={submit} className={checkButtonClass}>
                  Prüfen
                </button>
              </div>
            )}
            {i === stageIndex && stageMsg && !flow.solved && (
              <p className="bl-quittung mt-2 font-mono text-xs text-fehl">{stageMsg}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Karte + Dispatcher ───────────────────────────────────────────────────────

export function TaskView({ block, state, onResult, depth }: TaskViewProps) {
  const flowApi = useFlow(block, state, onResult);
  const { flow, hintVisible, showSolution, openSolution, msgId } = flowApi;

  // Vertiefungsaufgaben nur auf Ebene „genau“ (LERNMODELL.md §2.3).
  if (block.minDepth === 'rigorous' && depth !== 'rigorous') return null;

  const body = () => {
    switch (block.kind) {
      case 'single':
      case 'multi':
        return <ChoiceBody block={block} flowApi={flowApi} />;
      case 'numeric':
        return <NumericBody block={block} flowApi={flowApi} />;
      case 'estimate':
        return <EstimateBody block={block} flowApi={flowApi} />;
      case 'target':
        return <TargetBody block={block} flowApi={flowApi} />;
      case 'error-find':
        return <ErrorFindBody block={block} flowApi={flowApi} />;
      case 'order':
        return <OrderBody block={block} flowApi={flowApi} />;
      case 'match':
        return <MatchBody block={block} flowApi={flowApi} />;
      case 'steps':
        return <StepsBody block={block} flowApi={flowApi} />;
      default:
        return null;
    }
  };

  return (
    <div className="relative rounded border border-black/10 border-l-4 border-l-black/15 bg-paper-2 p-5 pl-4 shadow">
      <StatusCorner flow={flow} />
      <p className="pr-8 font-display text-base text-ink">
        {block.minDepth === 'rigorous' && (
          <span className="mr-2 rounded border border-black/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-faint">
            Vertiefung · überspringbar
          </span>
        )}
        {block.question}
      </p>
      <div className="mt-3">{body()}</div>
      <Message flow={flow} id={msgId} />
      <HintAndSolution
        block={block}
        flow={flow}
        hintVisible={hintVisible}
        showSolution={showSolution}
        openSolution={openSolution}
      />
    </div>
  );
}
