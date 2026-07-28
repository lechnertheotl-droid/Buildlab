// ValueSlider — generischer Slider, der EINE Formel-Variable treibt; weitere
// Variablen kommen als feste Inputs (`fixed`). Ergebnis live aus der Engine,
// publiziert für Rechner & target-Aufgaben (Registry: value-slider).

import { useMemo, useState } from 'react';
import { evaluateFormula } from '@buildlab/engine';
import { Latex } from '../Latex';
import { formatUnit } from '../units';
import { Slider } from '../Slider';
import { useContent } from '../content-context';
import { useEngineValue } from '../iso-scene';

export interface ValueSliderParams {
  formulaId: string;
  var: string;
  min: number;
  max: number;
  step: number;
  fixed?: Record<string, number>;
}

const fmt = (n: number) => {
  // Kleine Beträge brauchen signifikante Stellen, sonst wird aus A = 0,000452
  // schlicht „0" — genau die Zahl, die den Luftwiderstand erklärt.
  const abs = Math.abs(n);
  const digits = abs !== 0 && abs < 0.01 ? Math.min(8, Math.ceil(-Math.log10(abs)) + 2) : 3;
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: digits }).format(n);
};

const r2 = (n: number) => Math.round(n * 100) / 100;

// Kennlinien-Diagramm im Millimeterpapier-Stil (DESIGN §3), wie bei FlightSim.
const W = 440;
const H = 150;
const M = { left: 52, right: 16, top: 26, bottom: 30 };

/**
 * Startwert: die Mitte des Reglerwegs, aber auf DESSEN Raster eingerastet.
 * Ohne das Einrasten stand der Regler auf einem Wert, den er selbst nie wieder
 * erreicht — bei „Anzahl tragender Seilstränge" (1…8, Schritt 1) begrüßte er
 * den Lernenden mit n = 4,5, was es nicht gibt.
 */
export function rasterMitte({ min, max, step }: { min: number; max: number; step: number }): number {
  const mitte = (min + max) / 2;
  if (!(step > 0)) return Math.min(max, Math.max(min, mitte));
  const stufen = Math.round((mitte - min) / step);
  const nachkomma = (String(step).split('.')[1] ?? '').length;
  const wert = Number((min + stufen * step).toFixed(nachkomma + 3));
  return Math.min(max, Math.max(min, wert));
}

export function ValueSlider({ params, caption }: { params: ValueSliderParams; caption?: string }) {
  const { formulas } = useContent();
  const formula = formulas.get(params.formulaId);
  const [value, setValue] = useState(() => rasterMitte(params));

  const inputs = { ...(params.fixed ?? {}), [params.var]: value };
  const engine = useEngineValue(params.formulaId, inputs, formula?.result.name ?? params.formulaId);

  if (!formula) {
    return (
      <p className="rounded border border-fehl/40 bg-paper-2 p-3 font-mono text-sm text-fehl">
        Formel „{params.formulaId}" nicht gefunden.
      </p>
    );
  }
  const variable = formula.variables.find((v) => v.var === params.var);

  return (
    <div className="rounded border border-black/10 bg-paper-2 p-4 shadow">
      <Latex className="text-lg text-ink-2" src={formula.latex} />
      <Kennlinie formula={formula} params={params} value={value} current={engine.value} />
      <div className="mt-3">
        <Slider
          label={variable?.name ?? params.var}
          symbol={variable ? <Latex src={variable.symbol} /> : undefined}
          value={value}
          min={params.min}
          max={params.max}
          step={params.step}
          unit={variable?.unit}
          onChange={setValue}
        />
      </div>
      {Object.keys(params.fixed ?? {}).length > 0 && (
        <p className="mt-2 font-mono text-xs text-ink-faint">
          fest:{' '}
          {Object.entries(params.fixed!)
            .map(([k, v]) => `${k} = ${fmt(v)}`)
            .join(' · ')}
        </p>
      )}
      <p className="mt-3 border-t border-black/10 pt-3 font-mono text-lg" aria-live="polite">
        <Latex className="text-ink" src={formula.result.symbol} />{' '}
        <span className="text-ink">=</span>{' '}
        {engine.value === null ? (
          <span className="text-fehl">—</span>
        ) : (
          <span className="text-accent-ink">
            {fmt(engine.value)}
            {engine.unit && engine.unit !== '-' ? ` ${formatUnit(engine.unit)}` : ''}
          </span>
        )}
      </p>
      {caption && <p className="mt-2 text-sm text-ink-2">{caption}</p>}
    </div>
  );
}

/**
 * Die Kennlinie der Formel über den Reglerbereich — die Komponente hatte bisher
 * überhaupt kein Bild, obwohl Pseudo-3D-Anschauung das Alleinstellungsmerkmal
 * der App ist. Erst hier wird sichtbar, DASS ein Zusammenhang nichtlinear ist
 * (etwa der Luftwiderstand mit v²) statt nur eine Zahl zu ändern.
 *
 * Eiserne Regel 1: jeder Kurvenpunkt kommt aus der Engine (evaluateFormula).
 */
function Kennlinie({
  formula,
  params,
  value,
  current,
}: {
  formula: import('../types').Formula;
  params: ValueSliderParams;
  value: number;
  current: number | null;
}) {
  const punkte = useMemo(() => {
    const n = 64;
    const out: { x: number; y: number }[] = [];
    for (let i = 0; i <= n; i++) {
      const x = params.min + ((params.max - params.min) * i) / n;
      try {
        const y = evaluateFormula(formula, { ...(params.fixed ?? {}), [params.var]: x });
        if (Number.isFinite(y)) out.push({ x, y });
      } catch {
        /* Definitionslücke — Punkt einfach auslassen */
      }
    }
    return out;
  }, [formula, params]);

  if (punkte.length < 2) return null;

  const ys = punkte.map((p) => p.y);
  let yMin = Math.min(...ys);
  let yMax = Math.max(...ys);
  if (yMax - yMin < 1e-9) {
    // Konstante Kennlinie: trotzdem eine lesbare Skala aufspannen.
    yMin -= Math.max(1, Math.abs(yMin) * 0.1);
    yMax += Math.max(1, Math.abs(yMax) * 0.1);
  }
  const sx = (x: number) =>
    M.left + ((x - params.min) / (params.max - params.min || 1)) * (W - M.left - M.right);
  const sy = (y: number) => H - M.bottom - ((y - yMin) / (yMax - yMin)) * (H - M.top - M.bottom);

  const pfad = punkte.map((p) => `${r2(sx(p.x))},${r2(sy(p.y))}`).join(' ');
  const variable = formula.variables.find((v) => v.var === params.var);
  const einheit = (u?: string) => (u && u !== '-' ? ` [${formatUnit(u)}]` : '');
  const yTicks = [yMin, (yMin + yMax) / 2, yMax];
  const xTicks = [params.min, (params.min + params.max) / 2, params.max];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="mt-3 w-full"
      role="img"
      aria-label={`Kennlinie: ${formula.result.name} über ${variable?.name ?? params.var}, aktuell ${
        current === null ? 'unbestimmt' : fmt(current)
      }`}
    >
      <desc>
        Diagramm des Formelergebnisses über dem Reglerbereich; ein Punkt markiert die aktuelle
        Einstellung.
      </desc>
      {yTicks.map((y, i) => (
        <line key={`gy${i}`} x1={M.left} y1={r2(sy(y))} x2={W - M.right} y2={r2(sy(y))} stroke="var(--ink)" strokeOpacity={0.08} />
      ))}
      {xTicks.map((x, i) => (
        <line key={`gx${i}`} x1={r2(sx(x))} y1={M.top} x2={r2(sx(x))} y2={H - M.bottom} stroke="var(--ink)" strokeOpacity={0.08} />
      ))}
      <line x1={M.left} y1={M.top} x2={M.left} y2={H - M.bottom} stroke="var(--ink)" strokeOpacity={0.45} />
      <line x1={M.left} y1={H - M.bottom} x2={W - M.right} y2={H - M.bottom} stroke="var(--ink)" strokeOpacity={0.45} />
      {yTicks.map((y, i) => (
        <text key={`yl${i}`} x={M.left - 6} y={r2(sy(y)) + 3} textAnchor="end" fontSize="9" className="fill-[color:var(--ink-faint)] font-mono">
          {fmt(Math.round(y * 100) / 100)}
        </text>
      ))}
      {xTicks.map((x, i) => (
        <text key={`xl${i}`} x={r2(sx(x))} y={H - M.bottom + 12} textAnchor="middle" fontSize="9" className="fill-[color:var(--ink-faint)] font-mono">
          {fmt(x)}
        </text>
      ))}
      <text x={M.left - 44} y={M.top - 10} fontSize="9" className="fill-[color:var(--ink-faint)] font-mono">
        {formula.result.symbol.replace(/[\\{}]/g, '')}
        {einheit(formula.result.unit)}
      </text>
      <text x={W - M.right} y={H - 6} textAnchor="end" fontSize="9" className="fill-[color:var(--ink-faint)] font-mono">
        {params.var}
        {einheit(variable?.unit)}
      </text>

      <polyline points={pfad} fill="none" stroke="var(--accent)" strokeWidth={1.8} />
      {current !== null && (
        <g>
          <line x1={r2(sx(value))} y1={M.top} x2={r2(sx(value))} y2={H - M.bottom} stroke="var(--accent)" strokeOpacity={0.35} strokeDasharray="3 3" />
          <circle cx={r2(sx(value))} cy={r2(sy(current))} r={4} fill="var(--accent)" stroke="var(--paper)" strokeWidth={1.4} />
        </g>
      )}
    </svg>
  );
}
