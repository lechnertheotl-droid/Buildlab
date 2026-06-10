// ValueSlider — generischer Slider, der EINE Formel-Variable treibt; weitere
// Variablen kommen als feste Inputs (`fixed`). Ergebnis live aus der Engine,
// publiziert für Rechner & target-Aufgaben (Registry: value-slider).

import { useState } from 'react';
import { Latex } from '../Latex';
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

const fmt = (n: number) =>
  new Intl.NumberFormat('de-DE', { maximumFractionDigits: 3 }).format(n);

export function ValueSlider({ params, caption }: { params: ValueSliderParams; caption?: string }) {
  const { formulas } = useContent();
  const formula = formulas.get(params.formulaId);
  const [value, setValue] = useState(() =>
    Math.min(params.max, Math.max(params.min, (params.min + params.max) / 2)),
  );

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
            {engine.unit && engine.unit !== '-' ? ` ${engine.unit.replace('*', '·')}` : ''}
          </span>
        )}
      </p>
      {caption && <p className="mt-2 text-sm text-ink-2">{caption}</p>}
    </div>
  );
}
